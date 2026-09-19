import { describe, it, expect } from "vitest";
import {
  createBlankForm,
  createField,
  normalizeEditableForm,
  moveItem,
  FIELD_LIBRARY,
} from "./forms-workspace";
import type { CmsForm } from "../../../../shared/schema/forms";
describe("retained shared Forms model", () => {
  it("preserves unedited extension settings and option/config metadata", () => {
    const field = createField("select");
    field.options = [
      {
        label: "A",
        value: "a",
        imageUrl: "",
        vendorMetadata: "keep",
      } as (typeof field.options)[number],
    ];
    const form = {
      ...createBlankForm(),
      settings: { ...createBlankForm().settings, customRouting: { key: "keep" } },
      fields: [{ ...field, config: { ...field.config, customRule: "keep" } }],
      createdAt: null,
      updatedAt: new Date("2026-09-19T12:00:00Z"),
    } as CmsForm;
    const normalized = normalizeEditableForm(form);
    expect(normalized.settings).toHaveProperty("customRouting", { key: "keep" });
    expect(normalized.fields[0].config).toHaveProperty("customRule", "keep");
    expect(normalized.fields[0].options[0]).toHaveProperty("vendorMetadata", "keep");
    expect(normalized.expectedUpdatedAt).toBe("2026-09-19T12:00:00.000Z");
  });
  it("creates every retained palette field with independent identifiers and valid defaults", () => {
    const fields = FIELD_LIBRARY.map((item) => createField(item.type));
    expect(fields).toHaveLength(21);
    expect(new Set(fields.map((field) => field.id)).size).toBe(21);
    for (const field of fields) {
      expect(field.config).toHaveProperty("choiceLayout");
      expect(field.key).toBeTruthy();
    }
  });
  it("moves a dragged field to the original drop boundary without modifying input", () => {
    const fields = ["a", "b", "c"];
    expect(moveItem(fields, 0, 3)).toEqual(["b", "c", "a"]);
    expect(fields).toEqual(["a", "b", "c"]);
  });
});
