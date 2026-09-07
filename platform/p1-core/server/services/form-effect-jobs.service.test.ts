import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  complete: vi.fn(),
  retry: vi.fn(),
  crm: vi.fn(),
  contact: vi.fn(),
  mailchimp: vi.fn(),
  email: vi.fn(),
  enabled: vi.fn(),
}));
vi.mock("../storage", () => ({
  storage: {
    forms: {
      claimNextEffectJob: mocks.claim,
      completeEffectJob: mocks.complete,
      retryEffectJob: mocks.retry,
    },
    crm: { createOrUpdateInboundLead: mocks.crm },
    contacts: { createMessage: mocks.contact },
  },
}));
vi.mock("./site-features.service", () => ({ isSiteFeatureEnabled: mocks.enabled }));
vi.mock("./mailchimp.service", () => ({ syncContactToMailchimp: mocks.mailchimp }));
vi.mock("./email.service", () => ({ deliverManagedFormNotification: mocks.email }));
vi.mock("../utils/logger", () => ({ logger: { app: { warn: vi.fn(), error: vi.fn() } } }));
import { runFormEffectJobs } from "./form-effect-jobs.service";
const tx = { transaction: "test" };
const submission = {
  id: "submission-1",
  data: { name: "Lin", email: "lin@example.com", subject: "Hi", message: "Hello" },
};
const job = (id: string, payload: object, attemptCount = 1) => ({
  id,
  submissionId: submission.id,
  payload,
  processingToken: `token-${id}`,
  attemptCount,
});
const mail = {
  kind: "mailchimp_sync",
  email: "lin@example.com",
  firstName: "Lin",
  lastName: "",
  tag: "launch",
};
const notification = {
  kind: "admin_notification",
  recipient: "admin@example.com",
  formName: "Lead",
  summary: "Hi",
  dashboardUrl: "https://example.com/admin",
  contact: null,
};

describe("form effect worker", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.claim.mockResolvedValue(undefined);
    mocks.enabled.mockResolvedValue(true);
    mocks.complete.mockImplementation(async (_id, _token, _outcome, _clock, apply) => {
      if (apply) await apply(tx, submission);
      return true;
    });
    mocks.retry.mockResolvedValue({ status: "queued" });
    mocks.email.mockResolvedValue("completed");
  });
  afterEach(() => vi.useRealTimers());
  it("keeps failed Mailchimp independent of CRM and contact effects", async () => {
    mocks.claim
      .mockResolvedValueOnce(job("mail", mail))
      .mockResolvedValueOnce(job("crm", { kind: "crm_intake", formName: "Lead" }))
      .mockResolvedValueOnce(job("contact", { kind: "contact_message" }));
    mocks.mailchimp.mockRejectedValue(new Error("transport failed"));
    expect(await runFormEffectJobs()).toEqual({ completed: 2, retried: 1, failed: 0 });
    expect(mocks.mailchimp).toHaveBeenCalledWith(expect.objectContaining({ tags: ["launch"] }), {
      requireConfigured: true,
    });
    expect(mocks.crm).toHaveBeenCalledWith(
      expect.objectContaining({
        formSubmissionId: submission.id,
        source: "website_form",
        name: "Lin",
      }),
      undefined,
      tx,
    );
    expect(mocks.contact).toHaveBeenCalledWith(submission.data, tx);
  });
  it("preserves disabled CRM intake for retry without writing or silently skipping", async () => {
    mocks.enabled.mockResolvedValue(false);
    mocks.claim.mockResolvedValueOnce(job("crm", { kind: "crm_intake", formName: "Lead" }));
    expect(await runFormEffectJobs()).toEqual({ completed: 0, retried: 1, failed: 0 });
    expect(mocks.crm).not.toHaveBeenCalled();
    expect(mocks.complete).not.toHaveBeenCalled();
  });
  it("does not complete failed internal mutations", async () => {
    mocks.claim.mockResolvedValueOnce(job("crm", { kind: "crm_intake", formName: "Lead" }));
    mocks.crm.mockRejectedValue(new Error("database unavailable"));
    expect(await runFormEffectJobs()).toEqual({ completed: 0, retried: 1, failed: 0 });
  });
  it("does not report completion when a token has been replaced", async () => {
    mocks.claim.mockResolvedValueOnce(job("crm", { kind: "crm_intake", formName: "Lead" }));
    mocks.complete.mockResolvedValue(false);
    expect(await runFormEffectJobs()).toEqual({ completed: 0, retried: 0, failed: 0 });
    expect(mocks.crm).not.toHaveBeenCalled();
  });
  it("retries only the failed recipient and records explicit inactive-template skips", async () => {
    mocks.claim
      .mockResolvedValueOnce(job("a", notification))
      .mockResolvedValueOnce(job("b", { ...notification, recipient: "other@example.com" }));
    mocks.email
      .mockRejectedValueOnce(new Error("transport failed"))
      .mockResolvedValueOnce("skipped");
    expect(await runFormEffectJobs()).toEqual({ completed: 1, retried: 1, failed: 0 });
    expect(mocks.retry).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a" }),
      expect.any(Date),
    );
    expect(mocks.complete).toHaveBeenCalledWith("b", "token-b", "skipped", expect.any(Function));
  });
  it("uses fresh claim and failure times across a slow batch and counts dead letters", async () => {
    vi.useFakeTimers();
    const start = new Date("2026-09-05T10:00:00Z");
    const later = new Date("2026-09-05T10:11:00Z");
    vi.setSystemTime(start);
    mocks.claim
      .mockResolvedValueOnce(job("a", mail, 5))
      .mockResolvedValueOnce(job("b", notification));
    mocks.mailchimp.mockImplementation(async () => {
      vi.setSystemTime(later);
      throw new Error("timeout");
    });
    mocks.retry.mockResolvedValue({ status: "failed" });
    expect(await runFormEffectJobs()).toEqual({ completed: 1, retried: 0, failed: 1 });
    expect(mocks.claim).toHaveBeenNthCalledWith(1, start);
    expect(mocks.claim).toHaveBeenNthCalledWith(2, later);
    expect(mocks.retry).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }), later);
  });
  it("finishes and fences its claimed effect after stop, without claiming the next job", async () => {
    let stopping = false;
    mocks.claim.mockResolvedValue(job("a", notification));
    mocks.email.mockImplementationOnce(async () => {
      stopping = true;
      return "completed";
    });
    expect(await runFormEffectJobs(undefined, 25, () => stopping)).toEqual({
      completed: 1,
      retried: 0,
      failed: 0,
    });
    expect(mocks.complete).toHaveBeenCalledWith("a", "token-a", "completed", expect.any(Function));
    expect(mocks.claim).toHaveBeenCalledTimes(1);
  });
});
