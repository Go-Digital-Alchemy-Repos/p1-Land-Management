import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  config: vi.fn(),
  fetch: vi.fn(),
  claim: vi.fn(),
  complete: vi.fn(),
  retry: vi.fn(),
  email: vi.fn(),
}));
vi.mock("../storage", () => ({
  storage: {
    settings: { getCategorySnapshot: async () => ({ values: await mocks.config(), version: "test-revision" }) },
    forms: {
      claimNextEffectJob: mocks.claim,
      completeEffectJob: mocks.complete,
      retryEffectJob: mocks.retry,
    },
  },
}));
vi.mock("../utils/logger", () => ({
  logger: { email: { info: vi.fn() }, app: { warn: vi.fn(), error: vi.fn() } },
}));
vi.mock("./site-features.service", () => ({
  isSiteFeatureEnabled: vi.fn().mockResolvedValue(true),
}));
vi.mock("./email.service", () => ({ deliverManagedFormNotification: mocks.email }));
import { runFormEffectJobs } from "./form-effect-jobs.service";
import { syncContactToMailchimp, testMailchimpConnection } from "./mailchimp.service";

describe("durable Mailchimp sync", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it("fails explicitly for enabled durable jobs with no configuration and preserves legacy optional sync", async () => {
    mocks.config.mockResolvedValue({});
    await expect(
      syncContactToMailchimp({ email: "test@example.com" }, { requireConfigured: true }),
    ).rejects.toThrow("mailchimp_not_configured");
    await expect(syncContactToMailchimp({ email: "test@example.com" })).resolves.toBeUndefined();
  });
  it.each(["fetch", "body"])(
    "aborts a hanging %s and frees the worker for independent jobs",
    async (phase) => {
      vi.useFakeTimers();
      vi.stubGlobal("fetch", mocks.fetch);
      mocks.config.mockResolvedValue({
        mailchimp_api_key: "synthetic-us1",
        mailchimp_audience_id: "test",
        mailchimp_server_prefix: "us1",
      });
      let signal: AbortSignal | undefined;
      mocks.fetch.mockImplementation(async (_url, init: RequestInit) => {
        signal = init.signal!;
        const pending = () =>
          new Promise((_resolve, reject) => {
            signal!.addEventListener("abort", () => reject(signal!.reason), { once: true });
          });
        if (phase === "fetch") return pending();
        return { ok: true, status: 200, json: pending };
      });
      mocks.claim
        .mockResolvedValueOnce({
          id: "mail",
          processingToken: "mail-token",
          attemptCount: 1,
          payload: {
            kind: "mailchimp_sync",
            email: "test@example.com",
            firstName: "Test",
            lastName: "",
            tag: "launch",
          },
        })
        .mockResolvedValueOnce({
          id: "email",
          processingToken: "email-token",
          attemptCount: 1,
          payload: {
            kind: "admin_notification",
            recipient: "admin@example.com",
            formName: "Lead",
            summary: "Hi",
            dashboardUrl: "https://example.com/admin",
            contact: null,
          },
        })
        .mockResolvedValue(undefined);
      mocks.retry.mockResolvedValue({ status: "queued" });
      mocks.complete.mockResolvedValue(true);
      mocks.email.mockResolvedValue("completed");
      const running = runFormEffectJobs();
      await vi.advanceTimersByTimeAsync(29_999);
      expect(mocks.email).not.toHaveBeenCalled();
      expect(signal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(signal?.aborted).toBe(true);
      await expect(running).resolves.toEqual({ completed: 1, retried: 1, failed: 0 });
      expect(mocks.retry).toHaveBeenCalledWith(
        expect.objectContaining({ id: "mail" }),
        expect.any(Date),
      );
      expect(mocks.email).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    },
  );
});

describe("Mailchimp fresh configuration boundary", () => {
  const valid = { mailchimp_api_key: "synthetic-us1", mailchimp_audience_id: "audience1", mailchimp_server_prefix: "us1" };
  beforeEach(() => {
    vi.resetAllMocks(); vi.stubGlobal("fetch", mocks.fetch);
    mocks.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    mocks.config.mockResolvedValue(valid);
  });
  afterEach(() => vi.unstubAllGlobals());
  it("observes rotation and clear on consecutive requests", async () => {
    expect((await testMailchimpConnection()).success).toBe(true);
    mocks.config.mockResolvedValue({ ...valid, mailchimp_api_key: "rotated-us2", mailchimp_server_prefix: "us2" });
    expect((await testMailchimpConnection()).success).toBe(true);
    expect(mocks.fetch.mock.calls.map(args => args[0])).toEqual(["https://us1.api.mailchimp.com/3.0/lists/audience1", "https://us2.api.mailchimp.com/3.0/lists/audience1"]);
    mocks.config.mockResolvedValue({ ...valid, mailchimp_api_key: "" });
    expect((await testMailchimpConnection()).success).toBe(false); expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("fails closed and sanitizes a fresh database failure", async () => {
    await testMailchimpConnection(); mocks.config.mockRejectedValue(new Error("private database values"));
    expect(await testMailchimpConnection()).toEqual({ success: false, message: "Mailchimp connection failed" });
    await expect(syncContactToMailchimp({ email: "test@example.com" }, { requireConfigured: true })).rejects.toThrow("mailchimp_configuration_unavailable");
    expect(mocks.fetch).toHaveBeenCalledOnce();
  });
  it.each([
    { mailchimp_server_prefix: "https://evil.test/us1.api.mailchimp.com" },
    { mailchimp_server_prefix: "https://us1.api.mailchimp.com.evil.test" },
    { mailchimp_server_prefix: "https://user:pass@us1.api.mailchimp.com" },
    { mailchimp_server_prefix: "https://us1.api.mailchimp.com?secret=1" },
    { mailchimp_server_prefix: "us1/../../" },
    { mailchimp_server_prefix: "", mailchimp_api_key: "key-us1-ignored" },
    { mailchimp_server_prefix: "", mailchimp_api_key: "key-evil.test/" },
    { mailchimp_audience_id: "../other" },
    { mailchimp_audience_id: "audience?x=y" },
  ])("rejects malformed saved or inferred identifiers before fetch: %j", async bad => {
    mocks.config.mockResolvedValue({ ...valid, ...bad });
    expect((await testMailchimpConnection()).success).toBe(false);
    await expect(syncContactToMailchimp({ email: "test@example.com" }, { requireConfigured: true })).rejects.toThrow("mailchimp_not_configured");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each(["https://us1.api.mailchimp.com/3.0", "us1.api.mailchimp.com", "http://us1.api.mailchimp.com/", ""])("retains safe host normalization or API-key inference: %s", async prefix => {
    mocks.config.mockResolvedValue({ ...valid, mailchimp_server_prefix: prefix });
    expect((await testMailchimpConnection()).success).toBe(true);
    expect(mocks.fetch).toHaveBeenCalledWith("https://us1.api.mailchimp.com/3.0/lists/audience1", expect.objectContaining({ method: "GET", redirect: "error" }));
  });
  it("retains member upsert and tag sync with one operation snapshot", async () => {
    await syncContactToMailchimp({ email: " Test@Example.com ", firstName: " Test ", lastName: " Person ", tags: ["launch"] }, { requireConfigured: true });
    expect(mocks.config).toHaveBeenCalledOnce();
    const [member, tags] = mocks.fetch.mock.calls;
    expect(member[0]).toMatch(/^https:\/\/us1\.api\.mailchimp\.com\/3\.0\/lists\/audience1\/members\/[a-f0-9]{32}$/);
    expect(member[1].method).toBe("PUT");
    expect(JSON.parse(member[1].body)).toEqual({ email_address: "Test@Example.com", status_if_new: "subscribed", merge_fields: { FNAME: "Test", LNAME: "Person" } });
    expect(tags[0]).toBe(`${member[0]}/tags`); expect(tags[1].method).toBe("POST");
    expect(JSON.parse(tags[1].body)).toEqual({ tags: [{ name: "launch", status: "active" }] });
  });
  it("never reads or exposes a provider error body or network exception", async () => {
    const text = vi.fn(); const cancel = vi.fn();
    mocks.fetch.mockResolvedValue({ ok: false, status: 401, body: { cancel }, text });
    await expect(syncContactToMailchimp({ email: "test@example.com" })).rejects.toThrow("mailchimp_provider_unavailable");
    expect(text).not.toHaveBeenCalled(); expect(cancel).toHaveBeenCalledOnce();
    mocks.fetch.mockRejectedValue(new Error("private provider details"));
    expect(await testMailchimpConnection()).toEqual({ success: false, message: "Mailchimp connection failed" });
  });
});
