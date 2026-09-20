import { describe, it, expect, vi } from "vitest";
import { createTurnstileService } from "./turnstile.service";
const env = {
  TURNSTILE_ENABLED: "true",
  TURNSTILE_SECRET_KEY: "synthetic-private",
  TURNSTILE_SITE_KEY: "synthetic-public",
  TURNSTILE_ALLOWED_HOSTNAMES: "www.p1landmanagement.com,p1landmanagement.com",
};
const response = (value: unknown) =>
  new Response(JSON.stringify(value), { headers: { "content-type": "application/json" } });
const valid = { success: true, hostname: "www.p1landmanagement.com", action: "public_form" };
describe("Turnstile verification", () => {
  it("publishes only safe widget config and makes no request while disabled", async () => {
    const fetcher = vi.fn();
    const disabled = createTurnstileService({}, fetcher);
    expect(disabled.publicConfiguration()).toEqual({
      enabled: false,
      siteKey: null,
      action: "public_form",
    });
    await disabled.verify(undefined);
    expect(fetcher).not.toHaveBeenCalled();
    expect(createTurnstileService(env).publicConfiguration()).toEqual({
      enabled: true,
      siteKey: "synthetic-public",
      action: "public_form",
    });
  });
  it("fails closed on incomplete or invalid enabled configuration", async () => {
    for (const changed of [
      { TURNSTILE_SECRET_KEY: "" },
      { TURNSTILE_SITE_KEY: "" },
      { TURNSTILE_ALLOWED_HOSTNAMES: "" },
      { TURNSTILE_ALLOWED_HOSTNAMES: "evil.test" },
      { TURNSTILE_ENABLED: "yes" },
    ]) {
      const fetcher = vi.fn(),
        service = createTurnstileService({ ...env, ...changed }, fetcher);
      expect(() => service.publicConfiguration()).toThrow();
      await expect(service.verify("token")).rejects.toMatchObject({ statusCode: 503 });
      expect(fetcher).not.toHaveBeenCalled();
    }
  });
  it("bounds tokens before network and validates exact hostname/action/boolean", async () => {
    for (const token of [undefined, "", " ", "x".repeat(2049)]) {
      const fetcher = vi.fn();
      await expect(createTurnstileService(env, fetcher).verify(token)).rejects.toMatchObject({
        statusCode: 403,
      });
      expect(fetcher).not.toHaveBeenCalled();
    }
    for (const invalid of [
      { ...valid, success: "true" },
      { ...valid, success: false },
      { ...valid, hostname: "evil.p1landmanagement.com" },
      { ...valid, hostname: "www.p1landmanagement.com.evil.test" },
      { ...valid, action: "login" },
    ])
      await expect(
        createTurnstileService(
          env,
          vi.fn(async () => response(invalid)),
        ).verify("token"),
      ).rejects.toMatchObject({ statusCode: 403 });
  });
  it("uses fixed verification endpoint, timeout and fresh attempt UUID without caching admission", async () => {
    const fetcher = vi.fn(async () => response(valid));
    const service = createTurnstileService(env, fetcher);
    await service.verify("token");
    await service.verify("new-token");
    expect(fetcher).toHaveBeenCalledTimes(2);
    const calls = fetcher.mock.calls as unknown as [string, RequestInit][];
    for (const [url, options] of calls) {
      expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
      expect(options.signal).toBeInstanceOf(AbortSignal);
      expect(options.redirect).toBe("error");
      expect(JSON.parse(String(options.body))).toMatchObject({
        secret: "synthetic-private",
        idempotency_key: expect.stringMatching(/^[a-f0-9-]{36}$/),
      });
    }
    expect(JSON.parse(String(calls[0][1].body)).idempotency_key).not.toBe(
      JSON.parse(String(calls[1][1].body)).idempotency_key,
    );
  });
  it("bounds provider responses and sanitizes errors including timeouts", async () => {
    for (const fetcher of [
      vi.fn(async () => {
        throw new Error("synthetic-private");
      }),
      vi.fn(async () => new Response("synthetic-private", { status: 500 })),
      vi.fn(
        async () => new Response("not JSON", { headers: { "content-type": "application/json" } }),
      ),
      vi.fn(async () => response({ padding: "x".repeat(8193) })),
      vi.fn(async () => response(null)),
    ]) {
      await expect(createTurnstileService(env, fetcher).verify("token")).rejects.toMatchObject({
        statusCode: 503,
      });
      await expect(createTurnstileService(env, fetcher).verify("token")).rejects.not.toThrow(
        "synthetic-private",
      );
    }
  });
});
