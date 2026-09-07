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
    settings: { getDecryptedCategory: mocks.config },
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
import { syncContactToMailchimp } from "./mailchimp.service";

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
