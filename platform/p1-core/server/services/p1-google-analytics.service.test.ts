import { it, expect, vi } from "vitest";
import { createGAService, dateRanges, normalizeReport } from "./p1-google-analytics.service";
const env = {
  P1_GA_PROPERTY_ID: "554712298",
  P1_GA_CLIENT_ID: "client",
  P1_GA_CLIENT_SECRET: "secret",
  P1_GA_REFRESH_TOKEN: "refresh",
};
const mockProvider = () =>
  vi.fn(async (url: string, options: any) => {
    if (url.includes("oauth2"))
      return new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }));
    const body = JSON.parse(options.body),
      report = (r: any) => ({
        dimensionHeaders: r.dimensions,
        metricHeaders: r.metrics,
        rows: [
          {
            dimensionValues: r.dimensions.map(() => ({ value: "test" })),
            metricValues: r.metrics.map(() => ({ value: "12" })),
          },
        ],
        rowCount: 1,
        metadata: {
          subjectToThresholding: true,
          samplingMetadatas: [{ samplesReadCount: "10", samplingSpaceSize: "100" }],
        },
      });
    return new Response(
      JSON.stringify(body.requests ? { reports: body.requests.map(report) } : report(body)),
    );
  });
it("validates calendar dates, cap, future and equal previous period", () => {
  expect(dateRanges("2026-03-01", "2026-03-03").previousDateRange).toEqual({
    startDate: "2026-02-26",
    endDate: "2026-02-28",
  });
  for (const [a, b] of [
    ["2026-02-30", "2026-03-01"],
    ["2026-03-02", "2026-03-01"],
    ["2026-01-01", "2026-05-01"],
    ["2099-01-01", "2099-01-02"],
    ["today", "today"],
  ])
    expect(() => dateRanges(a, b)).toThrow();
  expect(() => dateRanges(["2026-01-01"], "2026-01-02")).toThrow();
});
it("batches fixed reports, singleflights, expires cache and preserves metadata", async () => {
  let now = Date.parse("2026-09-17");
  const fetcher = mockProvider(),
    s = createGAService(env, fetcher as any, () => now);
  const [a, b] = await Promise.all([
    s.reports("2026-09-01", "2026-09-02"),
    s.reports("2026-09-01", "2026-09-02"),
  ]);
  expect(a).toEqual(b);
  expect(fetcher).toHaveBeenCalledTimes(4);
  expect(a.reports.channels.rows[0].metrics.sessions).toBe(12);
  expect(a.reports.totals.metadata.subjectToThresholding).toBe(true);
  expect(a.reports.totals.metadata.samplingMetadatas?.[0].samplesReadCount).toBe("10");
  await s.reports("2026-09-01", "2026-09-02");
  expect(fetcher).toHaveBeenCalledTimes(4);
  now += 300001;
  await s.reports("2026-09-01", "2026-09-02");
  expect(fetcher).toHaveBeenCalledTimes(7);
  for (const [url, opts] of fetcher.mock.calls.filter(([url]) => !url.includes("oauth2"))) {
    expect(url).toContain("properties/554712298:batchRunReports");
    expect(JSON.parse(opts.body).requests.length).toBeLessThanOrEqual(5);
    for (const request of JSON.parse(opts.body).requests) {
      expect(request.metrics.length).toBeLessThanOrEqual(10);
      expect(request.dimensions.length).toBeLessThanOrEqual(9);
    }
    expect(opts.signal).toBeInstanceOf(AbortSignal);
  }
});
it("caches realtime for 30 seconds", async () => {
  let now = Date.parse("2026-09-17");
  const f = mockProvider(),
    s = createGAService(env, f as any, () => now);
  expect((await s.realtime()).windowMinutes).toBe(30);
  await s.realtime();
  expect(f).toHaveBeenCalledTimes(4);
  now += 30001;
  await s.realtime();
  expect(f).toHaveBeenCalledTimes(7);
});
it("distinguishes empty, unavailable and misconfiguration without leaking errors", async () => {
  await expect(createGAService({}).realtime()).rejects.toMatchObject({ code: "not_configured" });
  const f = vi.fn(async () => new Response("secret-provider-message", { status: 403 }));
  await expect(createGAService(env, f as any).realtime()).rejects.toMatchObject({
    code: "provider_unavailable",
    message: "Google Analytics reporting is temporarily unavailable.",
  });
  const empty = vi.fn(async (url: string, opts: any) =>
    url.includes("oauth2")
      ? new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }))
      : new Response(
          JSON.stringify({
            dimensionHeaders: JSON.parse(opts.body).dimensions,
            metricHeaders: [{ name: "activeUsers" }],
            rowCount: 0,
          }),
        ),
  );
  expect((await createGAService(env, empty as any).realtime()).status).toBe("empty");
  expect(
    normalizeReport(
      { metricHeaders: [{ name: "activeUsers" }], rowCount: 5 },
      { dimensions: [], metrics: ["activeUsers"] },
    ).truncated,
  ).toBe(true);
  expect(() =>
    normalizeReport(
      { metricHeaders: [{ name: "wrong" }] },
      { dimensions: [], metrics: ["activeUsers"] },
    ),
  ).toThrow();
});
it("limits concurrent uncached reports without creating an unbounded queue", async () => {
  let release!: () => void;
  const pending = new Promise<void>((r) => (release = r)),
    base = mockProvider();
  const f = vi.fn(async (url: string, opts: any) => {
    if (!url.includes("oauth2")) await pending;
    return base(url, opts);
  });
  const s = createGAService(env, f as any);
  const a = s.reports("2026-09-01", "2026-09-02"),
    b = s.reports("2026-09-02", "2026-09-03");
  await expect(s.reports("2026-09-03", "2026-09-04")).rejects.toMatchObject({
    code: "provider_unavailable",
  });
  release();
  await Promise.all([a, b]);
});
it("uses signed service-account JWT with readonly scope and fixed token endpoint", async () => {
  const { generateKeyPairSync, verify } = await import("node:crypto");
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const base = mockProvider();
  const f = vi.fn(async (url: string, opts: any) => {
    if (url.includes("oauth2")) {
      expect(url).toBe("https://oauth2.googleapis.com/token");
      const assertion = (opts.body as URLSearchParams).get("assertion")!;
      const [header, claims, signature] = assertion.split(".");
      const payload = JSON.parse(Buffer.from(claims, "base64url").toString());
      expect(payload.scope).toBe("https://www.googleapis.com/auth/analytics.readonly");
      expect(payload.aud).toBe("https://oauth2.googleapis.com/token");
      expect(
        verify(
          "RSA-SHA256",
          Buffer.from(header + "." + claims),
          publicKey,
          Buffer.from(signature, "base64url"),
        ),
      ).toBe(true);
    }
    return base(url, opts);
  });
  await createGAService(
    {
      P1_GA_SERVICE_ACCOUNT_JSON: JSON.stringify({
        client_email: "test@example.invalid",
        private_key: privateKey.export({ format: "pem", type: "pkcs8" }),
        token_uri: "https://untrusted.invalid",
      }),
    },
    f as any,
  ).realtime();
  expect(f).toHaveBeenCalledTimes(4);
});
