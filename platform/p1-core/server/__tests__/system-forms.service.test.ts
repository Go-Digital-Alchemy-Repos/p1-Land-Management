import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
const { forms } = vi.hoisted(() => ({
  forms: { getBySlug: vi.fn(), create: vi.fn(), update: vi.fn() },
}));
vi.mock("../storage", () => ({ storage: { forms } }));
import { ensureSystemForms } from "../services/system-forms.service";

const estimateOptions = [
  { label: "Grounds maintenance contract", value: "maintenance", imageUrl: "" },
  { label: "Clearing, grading or drainage project", value: "sitework", imageUrl: "" },
  { label: "Farm or large acreage", value: "farm", imageUrl: "" },
  { label: "Pond or waterway", value: "pond", imageUrl: "" },
  { label: "Snow and ice", value: "snow", imageUrl: "" },
  { label: "Not sure yet", value: "unsure", imageUrl: "" },
];
describe("P1 managed system forms", () => {
  beforeEach(() => vi.resetAllMocks());
  it("keeps estimate choices aligned with the public contact journey labels and submitted values", async () => {
    const contact = readFileSync(
      new URL("../../../../artifacts/p1-website/src/pages/contact.tsx", import.meta.url),
      "utf8",
    );
    const workTypes = contact.match(/const WORK_TYPES = \[([\s\S]*?)\] as const;/)?.[1];
    expect(workTypes).toBeDefined();
    const options = Array.from(
      workTypes!.matchAll(/\["([^"]+)", "([^"]+)"\]/g),
      ([, value, label]) => ({ value, label, imageUrl: "" }),
    );
    expect(options).toEqual(estimateOptions);
    await ensureSystemForms();
    const estimate = forms.create.mock.calls.find(([form]) => form.slug === "p1-estimate")![0];
    expect(
      estimate.fields.find((field: { key: string }) => field.key === "services").options,
    ).toEqual(options);
  });
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
    expect(
      forms.create.mock.calls[0][0].fields.find(
        (field: { key: string }) => field.key === "services",
      ),
    ).toMatchObject({
      id: "services",
      key: "services",
      type: "checkbox",
      required: false,
      options: estimateOptions,
    });
    expect(commercial.fields.find((field: { key: string }) => field.key === "email").required).toBe(
      false,
    );
    expect(
      commercial.fields.find((field: { key: string }) => field.key === "message").required,
    ).toBe(false);
    expect(
      commercial.fields
        .find(
          (field: { key: string; options: Array<{ value: string }> }) => field.key === "services",
        )
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
  it("repairs empty or omitted options only on the managed commercial services checkbox", async () => {
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
                options: [],
              },
              { id: "notes", key: "notes", label: "Notes", type: "textarea", options: [] },
            ],
            settings: {},
          }
        : undefined,
    );

    await ensureSystemForms();

    const commercialUpdate = forms.update.mock.calls.find(
      ([id]) => id === "p1-commercial-assessment",
    );
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
  it("repairs an omitted managed options array without changing another services field", async () => {
    forms.getBySlug.mockImplementation(async (slug) =>
      slug === "p1-commercial-assessment"
        ? {
            id: slug,
            slug,
            name: "Commercial",
            isActive: true,
            fields: [
              { id: "services", key: "services", label: "Managed", type: "checkbox" },
              {
                id: "other-services",
                key: "services",
                label: "Unrelated duplicate",
                type: "text",
                options: [],
              },
            ],
            settings: {},
          }
        : undefined,
    );

    await ensureSystemForms();

    const commercialUpdate = forms.update.mock.calls.find(
      ([id]) => id === "p1-commercial-assessment",
    );
    expect(commercialUpdate?.[1].fields).toEqual([
      expect.objectContaining({
        id: "services",
        key: "services",
        type: "checkbox",
        options: expect.arrayContaining([expect.objectContaining({ value: "grounds_vegetation" })]),
      }),
      {
        id: "other-services",
        key: "services",
        label: "Unrelated duplicate",
        type: "text",
        options: [],
      },
    ]);
  });
  it("preserves editor-defined commercial service choices", async () => {
    const editorOptions = [
      { label: "Owner-defined service", value: "owner_service", imageUrl: "" },
    ];
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

    const commercialUpdate = forms.update.mock.calls.find(
      ([id]) => id === "p1-commercial-assessment",
    );
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

  it.each([[], undefined])(
    "repairs missing estimate choices (%j) without replacing editor fields or settings",
    async (options) => {
      const services = {
        id: "services",
        key: "services",
        type: "checkbox",
        label: "Edited services",
        helpText: "Owner guidance",
        required: true,
        width: "half",
        options,
        config: { custom: "retained" },
      };
      const unrelated = {
        id: "custom",
        key: "services",
        type: "checkbox",
        label: "Custom field",
        options: [],
      };
      const editedSettings = {
        submitButtonText: "Edited button",
        notifyAdmins: false,
        createCrmLead: false,
        successMessage: "Edited confirmation",
      };
      const existing = {
        id: "estimate-id",
        slug: "p1-estimate",
        name: "Edited name",
        description: "Edited description",
        kind: "contact",
        isSystem: true,
        isActive: false,
        fields: [unrelated, services],
        settings: editedSettings,
      };
      forms.getBySlug.mockImplementation(async (slug) =>
        slug === "p1-estimate" ? existing : undefined,
      );
      await ensureSystemForms();
      const update = forms.update.mock.calls.find(([id]) => id === "estimate-id")![1];
      expect(update).toEqual({
        name: existing.name,
        description: existing.description,
        kind: existing.kind,
        isSystem: true,
        isActive: false,
        fields: [unrelated, { ...services, options: estimateOptions }],
        settings: {
          mailchimpEnabled: false,
          mailchimpTag: "",
          storeAsContactMessage: false,
          ...editedSettings,
        },
      });
      expect(update.fields[0]).toBe(unrelated);
      expect(existing.fields[1].options).toBe(options);

      forms.getBySlug.mockImplementation(async (slug) =>
        slug === "p1-estimate" ? { ...existing, ...update } : undefined,
      );
      await ensureSystemForms();
      const repeated = forms.update.mock.calls.filter(([id]) => id === "estimate-id")[1][1];
      expect(repeated).toEqual(update);
      expect(repeated.fields).toBe(update.fields);
    },
  );

  it.each([
    {
      id: "services",
      key: "services",
      type: "checkbox",
      options: [{ label: "Owner service", value: "owner-service", imageUrl: "" }],
    },
    { id: "services", key: "services", type: "text", options: [] },
    { id: "custom-services", key: "services", type: "checkbox", options: [] },
    { id: "services", key: "custom-services", type: "checkbox", options: [] },
  ])("preserves customized estimate field %j", async (field) => {
    const fields = [field];
    forms.getBySlug.mockImplementation(async (slug) =>
      slug === "p1-estimate"
        ? {
            id: "estimate-id",
            slug,
            fields,
            settings: {},
          }
        : undefined,
    );
    await ensureSystemForms();
    expect(forms.update.mock.calls.find(([id]) => id === "estimate-id")![1].fields).toBe(fields);
  });
});
