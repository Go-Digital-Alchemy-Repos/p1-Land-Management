import { expect, it, vi } from "vitest";
vi.mock("../storage", () => ({ storage: { settings: { getCategorySnapshot: vi.fn() } } }));
import { createGoogleReportingConfiguration } from "./google-reporting-config.service";
import { googleReportingKeys as keys } from "@shared/google-reporting-config";
it("preserves deployment credentials, ignores legacy settings, and never exposes secrets", async () => {
  const env = {
    P1_GA_CLIENT_ID: "client",
    P1_GA_CLIENT_SECRET: "PRIVATE_SECRET",
    P1_GA_REFRESH_TOKEN: "PRIVATE_REFRESH",
  };
  const analytics = vi.fn(() => ({})) as any,
    searchConsole = vi.fn(() => ({})) as any;
  const config = createGoogleReportingConfiguration(
    async () => ({ version: "a".repeat(64), values: { ga4_property_id: "999" } }),
    env,
    { analytics, searchConsole },
  );
  const view = await config.view();
  expect(view.propertyId).toBe("554712298");
  expect(view.credentialMode).toBe("oauth");
  expect(JSON.stringify(view)).not.toContain("PRIVATE");
  await config.services();
  expect(analytics.mock.calls[0][0]).toMatchObject({ ...env, P1_GA_PROPERTY_ID: "554712298" });
  expect(env.P1_GA_REFRESH_TOKEN).toBe("PRIVATE_REFRESH");
});
it("isolates old inflight caches, retains overrides when disabled and observes external env changes", async () => {
  let values: Record<string, string> = {
    [keys.targetSource]: "managed",
    [keys.propertyId]: "123",
    [keys.searchConsoleSite]: "sc-domain:p1landmanagement.com",
  };
  let version = "a".repeat(64);
  let finish: (v: string) => void = () => {};
  const oldFlight = new Promise<string>((resolve) => (finish = resolve));
  const analytics = vi
    .fn()
    .mockImplementationOnce(() => ({ reports: () => oldFlight }))
    .mockImplementation((env) => ({ reports: async () => env.P1_GA_PROPERTY_ID }));
  const env = { P1_GA_PROPERTY_ID: "456" };
  const config = createGoogleReportingConfiguration(async () => ({ version, values }), env, {
    analytics: analytics as any,
    searchConsole: vi.fn(() => ({})) as any,
  });
  const old = await config.services();
  const pending = old.analytics.reports("x", "y");
  version = "b".repeat(64);
  values = { ...values, [keys.propertyId]: "789" };
  const current = await config.services();
  expect(await current.analytics.reports("x", "y")).toBe("789");
  finish("old");
  expect(await pending).toBe("old");
  expect(await config.services()).toBe(current);
  values = { ...values, [keys.targetSource]: "deployment" };
  version = "c".repeat(64);
  expect((await config.view()).managedTargets.propertyId).toBe("789");
  expect((await config.view()).propertyId).toBe("456");
  const deployed = await config.services();
  env.P1_GA_PROPERTY_ID = "999";
  expect(await config.services()).not.toBe(deployed);
  expect((await config.view()).propertyId).toBe("999");
  values = {
    ...values,
    [keys.targetSource]: "managed",
    [keys.searchConsoleSite]: "https://attacker.example/",
  };
  await expect(config.services()).rejects.toMatchObject({ code: "not_configured" });
});
