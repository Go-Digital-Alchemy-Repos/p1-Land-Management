import { expect, it } from "vitest";
import {
  PAGE_TEMPLATES,
  LANDING_PAGE_GOALS,
  AUDIENCE_OPTIONS,
  getRecommendedBlocks,
  generateLandingPageBlocks,
} from "./page-templates";
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

it("generates every offered block with campaign values, selection order and independent data", () => {
  for (const goal of LANDING_PAGE_GOALS) {
    const choices = getRecommendedBlocks(goal.id);
    const selected = choices.map((item) => item.id).reverse();
    const generate = () =>
      generateLandingPageBlocks(
        goal.id,
        "Campaign headline",
        "Campaign introduction",
        AUDIENCE_OPTIONS.map((item) => item.id),
        selected,
        "Contact us",
        "/contact",
      );
    const blocks = generate();
    const second = generate();
    expect(blocks.map((block) => block.type)).toEqual(
      [...choices].reverse().map((item) => item.type),
    );
    expect(new Set(blocks.map((block) => block.id)).size).toBe(blocks.length);
    for (const [index, block] of blocks.entries()) {
      expect(getBlockDef(block.type)).toBeDefined();
      expect(block.id).not.toBe(second[index].id);
      expect(block.props).toEqual(second[index].props);
    }
    expect(blocks.find((block) => block.type === "hero")?.props).toMatchObject({
      heading: "Campaign headline",
      subheading: "Campaign introduction",
      ctaText: "Contact us",
      ctaLink: "/contact",
    });
    expect(blocks.find((block) => block.type === "cta")?.props).toMatchObject({
      primaryText: "Contact us",
      primaryLink: "/contact",
    });
  }
});
