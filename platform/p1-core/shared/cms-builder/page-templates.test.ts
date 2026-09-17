import { expect, it } from "vitest";
import { PAGE_TEMPLATES } from "./page-templates";
import { getBlockDef } from "./block-registry";
import { PAGE_TEMPLATES as retainedTemplates } from "../../client/src/features/admin/cms/builder/page-templates";

it("keeps retained starters canonical and gives each draft independent block data", () => {
  expect(retainedTemplates).toBe(PAGE_TEMPLATES);
  for (const template of PAGE_TEMPLATES) {
    const first = template.blocks();
    const second = template.blocks();
    expect(first).toHaveLength(template.blockCount);
    expect(new Set(first.map((block) => block.id)).size).toBe(first.length);
    for (const [index, block] of first.entries()) {
      expect(getBlockDef(block.type)).toBeDefined();
      expect(block.id).not.toBe(second[index].id);
      expect(block.props).toEqual(second[index].props);
      expect(block.props).not.toBe(second[index].props);
      for (const [key, value] of Object.entries(block.props)) {
        if (value && typeof value === "object") {
          expect(value).not.toBe(second[index].props[key]);
          expect(value).not.toBe(getBlockDef(block.type)!.defaultProps[key]);
        }
      }
    }
  }
});
