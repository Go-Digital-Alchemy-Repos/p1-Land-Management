import { describe, it, expect } from "vitest";
import { createFederationClient, federationConfig } from "./federation-client";
const env = {
  NODE_ENV: "test",
  CORE_FEDERATION_ALLOW_SYNTHETIC_HTTP: "true",
  DASHBOARD_FEDERATION_ISSUER: "http://127.0.0.1:4190",
  APP_URL: "http://127.0.0.1:4191",
  CORE_FEDERATION_CLIENT_ID: "test-client",
  CORE_FEDERATION_CLIENT_SECRET_CURRENT: "s".repeat(43),
};
describe("federation client trust boundary", () => {
  it("rejects deployed HTTP exceptions and nonorigin URLs", () => {
    expect(() => federationConfig({ ...env, NODE_ENV: "production" })).toThrow();
    expect(() =>
      federationConfig({ ...env, DASHBOARD_FEDERATION_ISSUER: "http://evil.example" }),
    ).toThrow();
    expect(() => federationConfig({ ...env, APP_URL: "https://example.test/admin" })).toThrow();
  });
  it("sends only confidential service auth, rejects redirects and oversized/malformed DTO", async () => {
    const cfg = federationConfig(env);
    let calls = 0;
    const transport = async (_input: unknown, init?: RequestInit) => {
      calls++;
      expect(init?.redirect).toBe("error");
      expect(init?.headers).not.toHaveProperty("cookie");
      expect(init?.headers).not.toHaveProperty("origin");
      expect(JSON.parse(String(init?.body))).toEqual({
        grant_id: "11111111-1111-4111-8111-111111111111",
        purpose: "p1-core-cms-v1",
        require_owner_attestation: false,
      });
      return new Response("x".repeat(8193));
    };
    await expect(
      createFederationClient(cfg, transport as typeof fetch).introspect(
        "11111111-1111-4111-8111-111111111111",
      ),
    ).rejects.toMatchObject({ status: 503 });
    expect(calls).toBe(1);
  });
  it("uses only the current client secret even when provider-only previous configuration has expired", async () => {
    const cfg = federationConfig({
      ...env,
      CORE_FEDERATION_CLIENT_SECRET_PREVIOUS: "old".repeat(16),
      CORE_FEDERATION_CLIENT_SECRET_PREVIOUS_EXPIRES_AT: "2000-01-01T00:00:00Z",
    });
    let header: unknown;
    const client = createFederationClient(cfg, async (_url, init) => {
      header = (init?.headers as Record<string, string>).authorization;
      return new Response(null, { status: 401 });
    });
    await expect(client.introspect("11111111-1111-4111-8111-111111111111")).rejects.toMatchObject({
      status: 401,
    });
    expect(header).toBe(
      "Basic " +
        Buffer.from("test-client:" + env.CORE_FEDERATION_CLIENT_SECRET_CURRENT).toString("base64"),
    );
  });
  it.each([401, 403, 500])("maps provider status %s fail closed", async (status) => {
    await expect(
      createFederationClient(
        federationConfig(env),
        async () => new Response(null, { status }),
      ).introspect("11111111-1111-4111-8111-111111111111"),
    ).rejects.toMatchObject({ status: status === 500 ? 503 : status });
  });
});
