import { createSign } from "node:crypto";
import type {
  GADateRange,
  GAReport,
  GAReportKey,
  GAReportsResponse,
  GARealtimeResponse,
  GAErrorResponse,
} from "../../shared/p1-google-analytics";

export class GAError extends Error {
  constructor(public code: GAErrorResponse["code"]) {
    super(
      code === "invalid_date_range"
        ? "Use a valid date range of at most 93 days."
        : code === "not_configured"
          ? "Google Analytics reporting is not configured."
          : "Google Analytics reporting is temporarily unavailable.",
    );
  }
}
const DAY = 86400000;
export function dateRanges(start: unknown, end: unknown, now = Date.now()) {
  const parse = (v: unknown) => {
    if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v))
      throw new GAError("invalid_date_range");
    const ms = Date.parse(v + "T00:00:00Z");
    if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== v)
      throw new GAError("invalid_date_range");
    return ms;
  };
  const a = parse(start),
    b = parse(end),
    days = (b - a) / DAY + 1;
  if (a < Date.UTC(2005, 0, 1) || days < 1 || days > 93 || b > Math.floor(now / DAY) * DAY)
    throw new GAError("invalid_date_range");
  const format = (v: number) => new Date(v).toISOString().slice(0, 10);
  return {
    dateRange: { startDate: start as string, endDate: end as string },
    previousDateRange: { startDate: format(a - days * DAY), endDate: format(a - DAY) },
  };
}
const traffic = ["sessions", "totalUsers", "engagementRate", "keyEvents"];
const specs: Record<GAReportKey, { dimensions: string[]; metrics: string[] }> = {
  totals: {
    dimensions: [],
    metrics: [
      "activeUsers",
      "totalUsers",
      "newUsers",
      "sessions",
      "screenPageViews",
      "engagedSessions",
      "engagementRate",
      "averageSessionDuration",
      "userEngagementDuration",
      "keyEvents",
      "eventCount",
    ],
  },
  previousTotals: {
    dimensions: [],
    metrics: [
      "activeUsers",
      "totalUsers",
      "newUsers",
      "sessions",
      "screenPageViews",
      "engagedSessions",
      "engagementRate",
      "averageSessionDuration",
      "userEngagementDuration",
      "keyEvents",
      "eventCount",
    ],
  },
  daily: {
    dimensions: ["date"],
    metrics: ["activeUsers", "totalUsers", "sessions", "screenPageViews"],
  },
  channels: { dimensions: ["sessionDefaultChannelGroup"], metrics: traffic },
  sourceMedium: { dimensions: ["sessionSourceMedium"], metrics: traffic },
  campaigns: { dimensions: ["sessionCampaignName"], metrics: traffic },
  pages: {
    dimensions: ["pagePath"],
    metrics: ["screenPageViews", "totalUsers", "userEngagementDuration"],
  },
  landingPages: { dimensions: ["landingPage"], metrics: traffic },
  countries: { dimensions: ["country"], metrics: traffic },
  regions: { dimensions: ["region"], metrics: traffic },
  cities: { dimensions: ["city"], metrics: traffic },
  devices: { dimensions: ["deviceCategory"], metrics: traffic },
  browsers: { dimensions: ["browser"], metrics: traffic },
  events: { dimensions: ["eventName"], metrics: ["eventCount", "totalUsers"] },
};
export function normalizeReport(
  raw: any,
  spec: { dimensions: string[]; metrics: string[] },
): GAReport {
  if (
    !raw ||
    !Array.isArray(raw.metricHeaders) ||
    raw.metricHeaders.map((x: any) => x.name).join() !== spec.metrics.join() ||
    (raw.dimensionHeaders || []).map((x: any) => x.name).join() !== spec.dimensions.join()
  )
    throw new GAError("provider_unavailable");
  const rows = (raw.rows || []).map((row: any) => ({
    dimensions: Object.fromEntries(
      spec.dimensions.map((name, i) => [name, String(row.dimensionValues?.[i]?.value ?? "")]),
    ),
    metrics: Object.fromEntries(
      spec.metrics.map((name, i) => {
        const n = Number(row.metricValues?.[i]?.value);
        if (!Number.isFinite(n)) throw new GAError("provider_unavailable");
        return [name, n];
      }),
    ),
  }));
  const metadata: GAReport["metadata"] = {};
  for (const key of ["dataLossFromOtherRow", "subjectToThresholding"] as const)
    if (typeof raw.metadata?.[key] === "boolean") metadata[key] = raw.metadata[key];
  for (const key of ["emptyReason", "timeZone", "currencyCode"] as const)
    if (typeof raw.metadata?.[key] === "string") metadata[key] = raw.metadata[key];
  if (Array.isArray(raw.metadata?.samplingMetadatas))
    metadata.samplingMetadatas = raw.metadata.samplingMetadatas.map((m: any) => ({
      samplesReadCount: String(m.samplesReadCount),
      samplingSpaceSize: String(m.samplingSpaceSize),
    }));
  const rowCount = Number(raw.rowCount ?? rows.length);
  if (!Number.isSafeInteger(rowCount) || rowCount < 0) throw new GAError("provider_unavailable");
  return {
    dimensions: spec.dimensions,
    metrics: spec.metrics,
    rows,
    rowCount,
    truncated: rowCount > rows.length,
    metadata,
  };
}

export function createGAService(
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch,
  now = Date.now,
) {
  const propertyId = env.P1_GA_PROPERTY_ID || "554712298";
  let token: { value: string; expires: number } | undefined;
  let tokenFlight: Promise<string> | undefined;
  const cache = new Map<string, { expires: number; value: any }>(),
    flights = new Map<string, Promise<any>>();
  let running = 0;
  async function json(url: string, options: RequestInit) {
    const response = await fetcher(url, { ...options, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new GAError("provider_unavailable");
    return response.json();
  }
  async function accessToken(): Promise<string> {
    if (token && token.expires > now()) return token.value;
    if (tokenFlight) return tokenFlight;
    tokenFlight = (async () => {
      let body: URLSearchParams;
      if (env.P1_GA_SERVICE_ACCOUNT_JSON) {
        let credentials: any;
        try {
          credentials = JSON.parse(env.P1_GA_SERVICE_ACCOUNT_JSON);
        } catch {
          throw new GAError("not_configured");
        }
        if (
          typeof credentials.client_email !== "string" ||
          typeof credentials.private_key !== "string"
        )
          throw new GAError("not_configured");
        const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
        const issued = Math.floor(now() / 1000);
        const unsigned =
          encode({ alg: "RS256", typ: "JWT" }) +
          "." +
          encode({
            iss: credentials.client_email,
            scope: "https://www.googleapis.com/auth/analytics.readonly",
            aud: "https://oauth2.googleapis.com/token",
            iat: issued,
            exp: issued + 3600,
          });
        const signature = createSign("RSA-SHA256")
          .update(unsigned)
          .sign(credentials.private_key, "base64url");
        body = new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: unsigned + "." + signature,
        });
      } else if (env.P1_GA_CLIENT_ID && env.P1_GA_CLIENT_SECRET && env.P1_GA_REFRESH_TOKEN) {
        body = new URLSearchParams({
          grant_type: "refresh_token",
          client_id: env.P1_GA_CLIENT_ID,
          client_secret: env.P1_GA_CLIENT_SECRET,
          refresh_token: env.P1_GA_REFRESH_TOKEN,
        });
      } else throw new GAError("not_configured");
      const result = await json("https://oauth2.googleapis.com/token", { method: "POST", body });
      if (typeof result.access_token !== "string" || !Number.isFinite(Number(result.expires_in)))
        throw new GAError("provider_unavailable");
      token = {
        value: result.access_token,
        expires: now() + Math.max(0, Number(result.expires_in) - 60) * 1000,
      };
      return token.value;
    })();
    try {
      return await tokenFlight;
    } finally {
      tokenFlight = undefined;
    }
  }
  async function provider(method: string, body: unknown) {
    if (!/^\d+$/.test(propertyId)) throw new GAError("not_configured");
    const bearer = await accessToken();
    return json(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:${method}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }
  async function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
    const hit = cache.get(key);
    if (hit && hit.expires > now()) return hit.value;
    if (flights.has(key)) return flights.get(key)!;
    if (running >= 2) throw new GAError("provider_unavailable");
    running++;
    const flight = (async () => {
      try {
        const value = await load();
        if (cache.size >= 24) cache.delete(cache.keys().next().value!);
        cache.set(key, { value, expires: now() + ttl });
        return value;
      } catch (error) {
        throw error instanceof GAError ? error : new GAError("provider_unavailable");
      } finally {
        running--;
        flights.delete(key);
      }
    })();
    flights.set(key, flight);
    return flight;
  }
  return {
    reports(start: unknown, end: unknown): Promise<GAReportsResponse> {
      const ranges = dateRanges(start, end, now());
      return cached(`report:${start}:${end}`, 300000, async () => {
        const keys = Object.keys(specs) as GAReportKey[],
          reports = {} as Record<GAReportKey, GAReport>;
        // Sequential batches keep provider concurrency and quota use bounded (max 5 reports/batch).
        for (let i = 0; i < keys.length; i += 5) {
          const group = keys.slice(i, i + 5);
          const result = await provider("batchRunReports", {
            requests: group.map((key) => ({
              dimensions: specs[key].dimensions.map((name) => ({ name })),
              metrics: specs[key].metrics.map((name) => ({ name })),
              dateRanges: [key === "previousTotals" ? ranges.previousDateRange : ranges.dateRange],
              limit: "10000",
              orderBys:
                key === "daily"
                  ? [{ dimension: { dimensionName: "date" } }]
                  : [{ metric: { metricName: specs[key].metrics[0] }, desc: true }],
            })),
          });
          if (result.reports?.length !== group.length) throw new GAError("provider_unavailable");
          group.forEach(
            (key, j) => (reports[key] = normalizeReport(result.reports[j], specs[key])),
          );
        }
        return {
          status: reports.totals.rows.some((r) => Object.values(r.metrics).some((v) => v > 0))
            ? "ok"
            : "empty",
          propertyId,
          fetchedAt: new Date(now()).toISOString(),
          ...ranges,
          reports,
        };
      });
    },
    realtime(): Promise<GARealtimeResponse> {
      return cached("realtime", 30000, async () => {
        const reports = {} as GARealtimeResponse["reports"];
        for (const [key, dimensions] of [
          ["totals", []],
          ["countries", ["country"]],
          ["devices", ["deviceCategory"]],
        ] as const) {
          const spec = { dimensions: [...dimensions], metrics: ["activeUsers"] };
          reports[key] = normalizeReport(
            await provider("runRealtimeReport", {
              dimensions: spec.dimensions.map((name) => ({ name })),
              metrics: [{ name: "activeUsers" }],
              limit: "10000",
            }),
            spec,
          );
        }
        return {
          status: reports.totals.rows.some((r) => r.metrics.activeUsers > 0) ? "ok" : "empty",
          propertyId,
          fetchedAt: new Date(now()).toISOString(),
          windowMinutes: 30,
          reports,
        };
      });
    },
  };
}
export const p1GoogleAnalytics = createGAService();
