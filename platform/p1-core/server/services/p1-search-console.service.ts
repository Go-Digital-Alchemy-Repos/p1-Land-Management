import { googleReportingToken } from "./google-reporting-auth";
import { GAError, dateRanges } from "./p1-google-analytics.service";
import type { GAReport } from "../../shared/p1-google-analytics";
import type { SearchConsoleResponse, SearchReportKey } from "../../shared/p1-search-console";
const specs: Record<SearchReportKey, string[]> = {
  totals: [],
  previousTotals: [],
  daily: ["date"],
  queries: ["query"],
  pages: ["page"],
  countries: ["country"],
  devices: ["device"],
};
const metrics = ["clicks", "impressions", "ctr", "position"];
export function normalizeSearchReport(raw: any, dimensions: string[]): GAReport {
  if (!raw || (raw.rows !== undefined && !Array.isArray(raw.rows)))
    throw new GAError("provider_unavailable");
  const rows = (raw.rows || []).map((row: any) => {
    if (dimensions.length && (!Array.isArray(row.keys) || row.keys.length !== dimensions.length))
      throw new GAError("provider_unavailable");
    if (
      metrics.some(
        (key) => typeof row[key] !== "number" || !Number.isFinite(row[key]) || row[key] < 0,
      )
    )
      throw new GAError("provider_unavailable");
    return {
      dimensions: Object.fromEntries(dimensions.map((key, i) => [key, String(row.keys[i])])),
      metrics: Object.fromEntries(metrics.map((key) => [key, row[key]])),
    };
  });
  return {
    dimensions,
    metrics,
    rows,
    rowCount: rows.length,
    truncated: rows.length >= 10000,
    metadata: { timeZone: "America/Los_Angeles" },
  };
}
export function createSearchConsoleService(
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch,
  now = Date.now,
) {
  const siteUrl = env.P1_GSC_SITE_URL;
  const cache = new Map<string, { expires: number; value: SearchConsoleResponse }>();
  const flights = new Map<string, Promise<SearchConsoleResponse>>();
  async function json(url: string, options: RequestInit) {
    const res = await fetcher(url, { ...options, signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new GAError("provider_unavailable");
    return res.json();
  }
  const token = googleReportingToken(
    env,
    "https://www.googleapis.com/auth/webmasters.readonly",
    json,
    now,
  );
  return {
    async reports(start: unknown, end: unknown): Promise<SearchConsoleResponse> {
      const ranges = dateRanges(start, end, now());
      // Server-configured property only. No caller-controlled URL or Google endpoint.
      if (
        !siteUrl ||
        !/^(sc-domain:p1landmanagement\.com|https:\/\/(www\.)?p1landmanagement\.com\/)$/i.test(
          siteUrl,
        )
      )
        throw new GAError("not_configured");
      const key = `${start}:${end}`,
        hit = cache.get(key);
      if (hit && hit.expires > now()) return hit.value;
      if (flights.has(key)) return flights.get(key)!;
      if (flights.size >= 2) throw new GAError("provider_unavailable");
      const flight = (async () => {
        try {
          const bearer = await token();
          const reports = {} as Record<SearchReportKey, GAReport>;
          for (const reportKey of Object.keys(specs) as SearchReportKey[]) {
            const range =
              reportKey === "previousTotals" ? ranges.previousDateRange : ranges.dateRange;
            const raw = await json(
              `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
              {
                method: "POST",
                headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...range,
                  dimensions: specs[reportKey],
                  type: "web",
                  dataState: "final",
                  rowLimit: 10000,
                }),
              },
            );
            reports[reportKey] = normalizeSearchReport(raw, specs[reportKey]);
          }
          const value: SearchConsoleResponse = {
            siteUrl,
            fetchedAt: new Date(now()).toISOString(),
            ...ranges,
            status: reports.totals.rows.length ? "ok" : "empty",
            reports,
          };
          if (cache.size >= 24) cache.delete(cache.keys().next().value!);
          cache.set(key, { expires: now() + 300000, value });
          return value;
        } catch (error) {
          throw error instanceof GAError ? error : new GAError("provider_unavailable");
        }
      })();
      flights.set(key, flight);
      try {
        return await flight;
      } finally {
        flights.delete(key);
      }
    },
  };
}
export const p1SearchConsole = createSearchConsoleService();
