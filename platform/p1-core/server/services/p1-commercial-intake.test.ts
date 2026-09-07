import { beforeEach, describe, expect, it, vi } from "vitest";
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
describe("commercial managed intake integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getPublicBySlug.mockResolvedValue(form);
    mocks.getFormNotificationUsers.mockResolvedValue([]);
    mocks.getUsersByRole.mockResolvedValue([{ email: "synthetic@example.test" }]);
    mocks.createSubmissionWithEffects.mockResolvedValue({
      submission: { id: "receipt-1" },
      created: true,
    });
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
          dashboardUrl: "https://www.p1landmanagement.com/admin/forms",
        }),
      ]),
    );
    expect(mocks.createSubmissionWithEffects.mock.calls[0][0].data).not.toHaveProperty("website");
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
