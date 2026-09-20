import { it, expect, vi } from "vitest";
vi.mock("../storage", () => ({ storage: {} }));
import { createWebsiteScriptManagement } from "./website-script-management.service";
const snapshot = (source?: string, measurementId?: string) => ({
  version: "a".repeat(64),
  values: {
    ...(source === undefined ? {} : { google_analytics_source: source }),
    ...(measurementId === undefined ? {} : { google_analytics_measurement_id: measurementId }),
  },
});
const head = async () => ({
  version: "b".repeat(64),
  values: { public_head_html: "<meta name='test'>" },
});
const challenge = () => ({
  enabled: true,
  siteKey: "public-site",
  action: "public_form" as const,
  secret: "must-not-escape",
});
it("preserves deployment default and explicit env without using VITE or leaking secrets", async () => {
  const service = createWebsiteScriptManagement(async () => snapshot(), head, challenge, {
    VITE_GA_MEASUREMENT_ID: "G-WRONG",
    TURNSTILE_SECRET_KEY: "must-not-escape",
  });
  expect(await service.publicConfiguration()).toEqual({
    schemaVersion: 1,
    googleAnalytics: { source: "deployment", measurementId: "G-YX69CJ1QNJ" },
  });
  const view = await service.ownerConfiguration();
  expect(view.googleAnalytics).toEqual({ source: "deployment", measurementId: "" });
  expect(view.turnstile.siteKey).toBe("public-site");
  expect(JSON.stringify(view)).not.toContain("must-not-escape");
  expect(
    (
      await createWebsiteScriptManagement(async () => snapshot(), head, challenge, {
        WEBSITE_GA_MEASUREMENT_ID: "G-EXPLICIT",
      }).publicConfiguration()
    ).googleAnalytics.measurementId,
  ).toBe("G-EXPLICIT");
});
it("managed/disabled choices preserve drafts and empty IDs disable emission", async () => {
  for (const [source, id, expected] of [
    ["managed", "G-MANAGED", "G-MANAGED"],
    ["disabled", "G-RETAIN", null],
    ["managed", "", null],
  ] as const) {
    const service = createWebsiteScriptManagement(
      async () => snapshot(source, id),
      head,
      challenge,
      { WEBSITE_GA_MEASUREMENT_ID: "G-DEPLOY" },
    );
    expect((await service.ownerConfiguration()).googleAnalytics.measurementId).toBe(id);
    expect((await service.publicConfiguration()).googleAnalytics.measurementId).toBe(expected);
  }
  expect(
    (
      await createWebsiteScriptManagement(async () => snapshot(), head, challenge, {
        WEBSITE_GA_MEASUREMENT_ID: "",
      }).publicConfiguration()
    ).googleAnalytics.measurementId,
  ).toBeNull();
});
it("fresh reads reflect changed targets and malformed targets fail closed", async () => {
  const read = vi
    .fn()
    .mockResolvedValueOnce(snapshot("managed", "G-ONE"))
    .mockResolvedValueOnce(snapshot("managed", "G-TWO"));
  const service = createWebsiteScriptManagement(read, head, challenge, {});
  expect((await service.publicConfiguration()).googleAnalytics.measurementId).toBe("G-ONE");
  expect((await service.publicConfiguration()).googleAnalytics.measurementId).toBe("G-TWO");
  for (const data of [
    snapshot("other", "G-A"),
    snapshot("managed", "<script>"),
    snapshot("deployment", "G-"),
    snapshot("managed", "G-a"),
  ])
    await expect(
      createWebsiteScriptManagement(async () => data, head, challenge, {}).publicConfiguration(),
    ).rejects.toMatchObject({ statusCode: 503 });
});
it("reports raw markup collisions without returning or changing raw markup", async () => {
  for (const html of [
    '<script src="https://www.googletagmanager.com/gtag/js"></script>',
    'gtag("config")',
    "dataLayer.push({})",
    "turnstile.render()",
    "https://challenges.cloudflare.com/turnstile/v0/api.js",
  ]) {
    const service = createWebsiteScriptManagement(
      async () => snapshot(),
      async () => ({ version: "b", values: { public_head_html: html } }),
      challenge,
      {},
    );
    const view = await service.ownerConfiguration();
    expect(view.rawMarkupConflict).toBe(true);
    expect(view).not.toHaveProperty("html");
  }
});
it("public analytics projection is independent of unavailable Turnstile configuration", async () => {
  const service = createWebsiteScriptManagement(
    async () => snapshot(),
    head,
    () => {
      throw new Error("private");
    },
    {},
  );
  expect((await service.publicConfiguration()).schemaVersion).toBe(1);
  await expect(service.ownerConfiguration()).rejects.toThrow();
});
