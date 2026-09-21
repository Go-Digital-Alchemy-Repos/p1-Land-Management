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
    expect(
      commercial.fields
        .find((field: { key: string; options: Array<{ value: string }> }) => field.key === "services")
        .options.map((option: { value: string }) => option.value),
    ).toEqual([
      "grounds_vegetation",
      "stormwater_drainage",
      "grading_erosion",
      "tree_land",
      "roads_access",
      "emergency_corrective",
      "recurring_site_management",
      "commercial_snow_ice",
      "general_site_assessment",
    ]);
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
  it("repairs only missing options on the managed commercial services checkbox", async () => {
    forms.getBySlug.mockImplementation(async (slug) =>
      slug === "p1-commercial-assessment"
        ? {
            id: slug,
            slug,
            name: "Commercial",
            isActive: true,
            fields: [
              { id: "services", key: "services", label: "My services", type: "checkbox", options: [] },
              { id: "notes", key: "notes", label: "Notes", type: "textarea", options: [] },
            ],
            settings: {},
          }
        : undefined,
    );

    await ensureSystemForms();

    const commercialUpdate = forms.update.mock.calls.find(([id]) => id === "p1-commercial-assessment");
    const fields = commercialUpdate?.[1].fields ?? [];
    const services = fields.find(
      (field: { key: string; options: Array<{ value: string }> }) => field.key === "services",
    );
    expect(services?.label).toBe("My services");
    expect(services?.options.map((option: { value: string }) => option.value)).toContain(
      "grounds_vegetation",
    );
    expect(fields.find((field: { key: string }) => field.key === "notes")).toMatchObject({
      label: "Notes",
      options: [],
    });
  });
  it("preserves editor-defined commercial service choices", async () => {
    const editorOptions = [{ label: "Owner-defined service", value: "owner_service", imageUrl: "" }];
    forms.getBySlug.mockImplementation(async (slug) =>
      slug === "p1-commercial-assessment"
        ? {
            id: slug,
            slug,
            name: "Commercial",
            isActive: true,
            fields: [
              {
                id: "services",
                key: "services",
                label: "My services",
                type: "checkbox",
                options: editorOptions,
              },
            ],
            settings: {},
          }
        : undefined,
    );

    await ensureSystemForms();

    const commercialUpdate = forms.update.mock.calls.find(([id]) => id === "p1-commercial-assessment");
    expect(commercialUpdate?.[1].fields).toEqual([
      {
        id: "services",
        key: "services",
        label: "My services",
        type: "checkbox",
        options: editorOptions,
      },
    ]);
  });
});
