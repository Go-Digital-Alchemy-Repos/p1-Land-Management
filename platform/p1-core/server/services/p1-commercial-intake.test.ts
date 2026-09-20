import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  getPublicBySlug: vi.fn(),
  createSubmissionWithEffects: vi.fn(),
  getFormNotificationUsers: vi.fn(),
  getUsersByRole: vi.fn(),
}));
vi.mock("../storage", () => ({
  storage: {
    forms: {
      getPublicBySlug: mocks.getPublicBySlug,
      createSubmissionWithEffects: mocks.createSubmissionWithEffects,
    },
    users: {
      getFormNotificationUsers: mocks.getFormNotificationUsers,
      getUsersByRole: mocks.getUsersByRole,
    },
  },
}));
vi.mock("./mailchimp.service", () => ({ syncContactToMailchimp: vi.fn() }));
import { submitManagedFormBySlug } from "./forms.service";
const form = {
  id: "commercial-form",
  slug: "p1-commercial-assessment",
  name: "P1 Commercial Site Assessment",
  fields: [],
  settings: { createCrmLead: true, notifyAdmins: true },
};
const payload = {
  inquiryType: "commercial_site_assessment",
  name: "Pat",
  company: "Example",
  phone: "7045550100",
  address: "York County",
  services: ["general_site_assessment"],
  projectStage: "unknown",
  serviceTiming: "both",
  website: "",
};
describe("P1 managed intake integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("CORE_DASHBOARD_FORM_NOTIFICATIONS_ENABLED", "false");
    vi.stubEnv("P1_FORM_NOTIFICATION_RECIPIENTS", "owner-one@example.test,owner-two@example.test");
    mocks.getPublicBySlug.mockResolvedValue(form);
    mocks.getFormNotificationUsers.mockResolvedValue([]);
    mocks.getUsersByRole.mockResolvedValue([{ email: "synthetic@example.test" }]);
    mocks.createSubmissionWithEffects.mockResolvedValue({
      submission: { id: "receipt-1" },
      created: true,
    });
  });
  afterEach(() => vi.unstubAllEnvs());
  it("queues canonical dispatch atomically without resolving recipients during public acceptance", async () => {
    vi.stubEnv("CORE_DASHBOARD_FORM_NOTIFICATIONS_ENABLED", "true");
    vi.stubEnv("CORE_FEDERATION_ENABLED", "false");
    const result = await submitManagedFormBySlug(form.slug, payload, {
      idempotencyKey: "canonical-intent",
    });
    expect(result.submission.id).toBe("receipt-1");
    const effects = mocks.createSubmissionWithEffects.mock.calls[0][1];
    expect(effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "commercial_dashboard_intake" }),
        expect.objectContaining({ kind: "dashboard_form_notification_dispatch", formId: form.id }),
      ]),
    );
    expect(effects.some((effect: { kind: string }) => effect.kind === "admin_notification")).toBe(
      false,
    );
    expect(mocks.getFormNotificationUsers).not.toHaveBeenCalled();
    expect(mocks.getUsersByRole).not.toHaveBeenCalled();
  });
  it("validates then queues receipt, CRM and notification atomically through existing storage", async () => {
    const result = await submitManagedFormBySlug(form.slug, payload, {
      idempotencyKey: "intent-1",
      baseUrl: "https://www.p1landmanagement.com",
    });
    expect(result.submission.id).toBe("receipt-1");
    expect(mocks.createSubmissionWithEffects).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: form.id,
        idempotencyKey: "intent-1",
        data: expect.objectContaining({
          inquiryType: "commercial_site_assessment",
          phone: "7045550100",
          email: "",
          message: "",
          serviceTiming: "both",
        }),
      }),
      expect.arrayContaining([
        expect.objectContaining({ kind: "crm_intake" }),
        expect.objectContaining({
          kind: "admin_notification",
          recipient: "owner-one@example.test",
          dashboardUrl: "https://www.p1landmanagement.com/admin/forms",
        }),
        expect.objectContaining({
          kind: "admin_notification",
          recipient: "owner-two@example.test",
        }),
      ]),
    );
    expect(mocks.getFormNotificationUsers).not.toHaveBeenCalled();
    expect(mocks.getUsersByRole).not.toHaveBeenCalled();
    expect(mocks.createSubmissionWithEffects.mock.calls[0][0].data).not.toHaveProperty("website");
  });
  it("routes estimate submissions to the same private two-recipient audience", async () => {
    mocks.getPublicBySlug.mockResolvedValue({
      ...form,
      id: "estimate-form",
      slug: "p1-estimate",
      name: "P1 Estimate Request",
    });
    await submitManagedFormBySlug("p1-estimate", {
      name: "Pat",
      email: "pat@example.test",
      address: "York County",
      message: "Estimate request",
      website: "",
    });
    const effects = mocks.createSubmissionWithEffects.mock.calls[0][1];
    expect(effects).toEqual(expect.arrayContaining([expect.objectContaining({kind:"estimate_dashboard_intake",inquiry:expect.objectContaining({inquiryType:"general",email:"pat@example.test"})})]));
    expect(
      effects
        .filter((effect: { kind: string }) => effect.kind === "admin_notification")
        .map((effect: { recipient: string }) => effect.recipient),
    ).toEqual(["owner-one@example.test", "owner-two@example.test"]);
    expect(mocks.getFormNotificationUsers).not.toHaveBeenCalled();
    expect(mocks.getUsersByRole).not.toHaveBeenCalled();
  });
  it("rejects oversized UTF-8 estimates before durable acceptance", async () => {
    mocks.getPublicBySlug.mockResolvedValue({...form,id:"estimate-form",slug:"p1-estimate",name:"Estimate"});
    await expect(submitManagedFormBySlug("p1-estimate", {name:"Pat",email:"pat@example.test",address:"Test",message:"Estimate",attribution:Object.fromEntries(Array.from({length:12},(_,i)=>["key"+i,"界".repeat(2048)]))})).rejects.toMatchObject({statusCode:400});
    expect(mocks.createSubmissionWithEffects).not.toHaveBeenCalled();
  });
  it("returns the storage duplicate outcome with the original receipt", async () => {
    mocks.createSubmissionWithEffects.mockResolvedValue({
      submission: { id: "receipt-1" },
      created: false,
    });
    expect(
      await submitManagedFormBySlug(form.slug, payload, { idempotencyKey: "intent-1" }),
    ).toMatchObject({ duplicate: true, submission: { id: "receipt-1" } });
  });
  it("does not accept invalid or nondurable requests", async () => {
    await expect(
      submitManagedFormBySlug(form.slug, { ...payload, phone: "" }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.createSubmissionWithEffects).not.toHaveBeenCalled();
    mocks.createSubmissionWithEffects.mockRejectedValue(new Error("storage unavailable"));
    await expect(submitManagedFormBySlug(form.slug, payload)).rejects.toThrow(
      "storage unavailable",
    );
  });
});
