import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  getBySlug: vi.fn(),
  getById: vi.fn(),
  persist: vi.fn(),
  recipients: vi.fn(),
}));
vi.mock("../storage", () => ({
  storage: {
    forms: {
      getPublicBySlug: mocks.getBySlug,
      getPublicById: mocks.getById,
      createSubmissionWithEffects: mocks.persist,
    },
    users: {
      getFormNotificationUsers: mocks.recipients,
      getUsersByRole: vi.fn().mockResolvedValue([]),
    },
  },
}));
vi.mock("../services/mailchimp.service", () => ({ syncContactToMailchimp: vi.fn() }));
const form = {
  id: "form-1",
  name: "Lead Form",
  slug: "lead-form",
  kind: "custom",
  isActive: true,
  fields: [
    {
      id: "name",
      key: "name",
      label: "Name",
      type: "text",
      required: true,
      options: [],
      config: {},
    },
    {
      id: "email",
      key: "email",
      label: "Email",
      type: "email",
      required: true,
      options: [],
      config: {},
    },
  ],
  settings: {
    submitButtonText: "Submit",
    successMessage: "Thanks",
    createCrmLead: true,
  },
};

describe("durable managed form acceptance", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getBySlug.mockResolvedValue(form);
    mocks.getById.mockResolvedValue(form);
    mocks.recipients.mockResolvedValue([]);
    mocks.persist.mockResolvedValue({ submission: { id: "submission-1" }, created: true });
  });
  it("accepts CRM intake by atomically queuing it with the submission", async () => {
    const { submitManagedFormBySlug } = await import("../services/forms.service");
    await submitManagedFormBySlug("lead-form", { name: "Lin", email: "lin@example.com" });
    expect(mocks.persist).toHaveBeenCalledWith(
      {
        formId: "form-1",
        data: { name: "Lin", email: "lin@example.com" },
        source: null,
        idempotencyKey: null,
      },
      [{ kind: "crm_intake", formName: "Lead Form" }],
    );
  });
  it("does not enqueue disabled CRM effects", async () => {
    mocks.getBySlug.mockResolvedValue({
      ...form,
      settings: { ...form.settings, createCrmLead: false },
    });
    const { submitManagedFormBySlug } = await import("../services/forms.service");
    await submitManagedFormBySlug("lead-form", { name: "Lin", email: "lin@example.com" });
    expect(mocks.persist).toHaveBeenCalledWith(expect.any(Object), []);
  });
  it("preserves duplicate result and key for durable retries", async () => {
    mocks.persist.mockResolvedValue({ submission: { id: "submission-1" }, created: false });
    const { submitManagedFormBySlug } = await import("../services/forms.service");
    const result = await submitManagedFormBySlug(
      "lead-form",
      { name: "Lin", email: "lin@example.com" },
      { idempotencyKey: "retry-1" },
    );
    expect(result.duplicate).toBe(true);
    expect(mocks.persist).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "retry-1" }),
      expect.any(Array),
    );
  });
  it("uses the durable path and optional key for event form intake by ID", async () => {
    const { submitManagedFormById } = await import("../services/forms.service");
    await submitManagedFormById(
      "form-1",
      { name: "Lin", email: "lin@example.com" },
      { source: "event:event-1", idempotencyKey: "event-attempt-1" },
    );
    expect(mocks.persist).toHaveBeenCalledWith(
      expect.objectContaining({ source: "event:event-1", idempotencyKey: "event-attempt-1" }),
      [{ kind: "crm_intake", formName: "Lead Form" }],
    );
  });
  it("snapshots independent audience and per-recipient jobs without duplicate recipients", async () => {
    mocks.getBySlug.mockResolvedValue({
      ...form,
      settings: {
        ...form.settings,
        notifyAdmins: true,
        mailchimpEnabled: true,
        mailchimpTag: "launch",
      },
    });
    mocks.recipients.mockResolvedValue([
      { email: "A@example.com" },
      { email: "a@example.com" },
      { email: "b@example.com" },
    ]);
    const { submitManagedFormBySlug } = await import("../services/forms.service");
    await submitManagedFormBySlug(
      "lead-form",
      { name: "Lin", email: "lin@example.com" },
      { baseUrl: "https://dashboard.example.com" },
    );
    const effects = mocks.persist.mock.calls[0][1];
    expect(effects).toHaveLength(4);
    expect(effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "crm_intake" }),
        expect.objectContaining({
          kind: "mailchimp_sync",
          tag: "launch",
          email: "lin@example.com",
        }),
        expect.objectContaining({
          kind: "admin_notification",
          recipient: "a@example.com",
          summary: "Name: Lin\nEmail: lin@example.com",
          dashboardUrl: "https://dashboard.example.com/admin/forms",
        }),
        expect.objectContaining({ kind: "admin_notification", recipient: "b@example.com" }),
      ]),
    );
  });
  it("does not persist on invalid input", async () => {
    const { submitManagedFormBySlug } = await import("../services/forms.service");
    await expect(
      submitManagedFormBySlug("lead-form", { name: "Lin", email: "bad" }),
    ).rejects.toThrow();
    expect(mocks.persist).not.toHaveBeenCalled();
  });
});
