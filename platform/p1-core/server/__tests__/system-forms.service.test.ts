import { beforeEach, describe, expect, it, vi } from "vitest";
const { forms } = vi.hoisted(() => ({
  forms: { getBySlug: vi.fn(), create: vi.fn(), update: vi.fn() },
}));
vi.mock("../storage", () => ({ storage: { forms } }));
import { ensureSystemForms } from "../services/system-forms.service";
describe("P1 managed system forms", () => {
  beforeEach(() => vi.resetAllMocks());
  it("seeds estimate and commercial intake with durable CRM and notifications", async () => {
    forms.getBySlug.mockResolvedValue(undefined);
    await ensureSystemForms();
    expect(forms.create.mock.calls.map(([form]) => form.slug)).toEqual([
      "p1-estimate",
      "p1-commercial-assessment",
    ]);
    for (const [form] of forms.create.mock.calls)
      expect(form.settings).toMatchObject({
        createCrmLead: true,
        notifyAdmins: true,
        mailchimpEnabled: false,
      });
    const commercial = forms.create.mock.calls[1][0];
    expect(commercial.fields.find((field: { key: string }) => field.key === "email").required).toBe(
      false,
    );
    expect(
      commercial.fields.find((field: { key: string }) => field.key === "message").required,
    ).toBe(false);
  });
  it("preserves editor fields, settings and disabled state for each existing form", async () => {
    forms.getBySlug.mockImplementation(async (slug) => ({
      id: slug,
      slug,
      name: "Edited",
      isActive: false,
      fields: [{ key: "name" }],
      settings: { submitButtonText: "Send inquiry", notifyAdmins: false },
    }));
    await ensureSystemForms();
    expect(forms.create).not.toHaveBeenCalled();
    for (const slug of ["p1-estimate", "p1-commercial-assessment"])
      expect(forms.update).toHaveBeenCalledWith(
        slug,
        expect.objectContaining({
          name: "Edited",
          isActive: false,
          fields: [{ key: "name" }],
          settings: expect.objectContaining({
            submitButtonText: "Send inquiry",
            notifyAdmins: false,
          }),
        }),
      );
  });
});
