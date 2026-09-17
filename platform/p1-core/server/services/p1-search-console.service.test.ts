import { expect, it, vi } from "vitest";
import { createSearchConsoleService, normalizeSearchReport } from "./p1-search-console.service";
const env = {
  P1_GSC_SITE_URL: "https://p1landmanagement.com/",
  P1_GA_CLIENT_ID: "client",
  P1_GA_CLIENT_SECRET: "secret",
  P1_GA_REFRESH_TOKEN: "refresh",
};
it("requests final web search data, preserves provider totals and caches concurrent reads", async () => {
  const fetcher = vi.fn(async (url: string, options: any) => {
    if (url.includes("oauth2"))
      return new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }));
    const body = JSON.parse(options.body);
    expect(body.dataState).toBe("final");
    expect(body.type).toBe("web");
    expect(body.rowLimit).toBe(10000);
    expect(url).toContain(encodeURIComponent(env.P1_GSC_SITE_URL));
    return new Response(
      JSON.stringify({
        rows: [
          {
            keys: body.dimensions.map(() => "test"),
            clicks: 10,
            impressions: 100,
            ctr: 0.1,
            position: 2.5,
          },
        ],
      }),
    );
  });
  const service = createSearchConsoleService(env, fetcher as any);
  const [a, b] = await Promise.all([
    service.reports("2026-09-01", "2026-09-03"),
    service.reports("2026-09-01", "2026-09-03"),
  ]);
  expect(a).toEqual(b);
  expect(fetcher).toHaveBeenCalledTimes(8);
  expect(a.reports.totals.rows[0].metrics.ctr).toBe(0.1);
  expect(a.previousDateRange).toEqual({ startDate: "2026-08-29", endDate: "2026-08-31" });
  await service.reports("2026-09-01", "2026-09-03");
  expect(fetcher).toHaveBeenCalledTimes(8);
});
it("rejects missing configuration, invalid dates, unsafe properties and provider failures", async () => {
  await expect(
    createSearchConsoleService({}).reports("2026-09-01", "2026-09-03"),
  ).rejects.toMatchObject({ code: "not_configured" });
  await expect(
    createSearchConsoleService(env).reports("2026-02-30", "2026-03-01"),
  ).rejects.toMatchObject({ code: "invalid_date_range" });
  await expect(
    createSearchConsoleService({ ...env, P1_GSC_SITE_URL: "https://evil.example/" }).reports(
      "2026-09-01",
      "2026-09-03",
    ),
  ).rejects.toMatchObject({ code: "not_configured" });
  const service = createSearchConsoleService(
    env,
    vi.fn(async () => new Response("private-error", { status: 403 })) as any,
  );
  await expect(service.reports("2026-09-01", "2026-09-03")).rejects.toMatchObject({
    code: "provider_unavailable",
  });
});
it("keeps empty results empty and rejects malformed metrics", () => {
  expect(normalizeSearchReport({}, ["query"]).rows).toEqual([]);
  expect(() =>
    normalizeSearchReport(
      { rows: [{ keys: ["term"], clicks: 1, impressions: 2, ctr: "invalid", position: 1 }] },
      ["query"],
    ),
  ).toThrow();
  expect(() =>
    normalizeSearchReport(
      { rows: [{ keys: [], clicks: 1, impressions: 2, ctr: 0.5, position: 1 }] },
      ["query"],
    ),
  ).toThrow();
});
