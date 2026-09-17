import { getBlockDef } from "./block-registry";
import { expect, it } from "vitest";
import { cloneSavedSectionBlocks, isInsertableSavedSection } from "./section-library";

it("copies saved section blocks with independent data and fresh identities", () => {
  const source = [
    {
      id: "original",
      type: "legacy",
      extra: { retained: true },
      props: { items: [{ value: "saved" }] },
    },
  ];
  let id = 0;
  const first = cloneSavedSectionBlocks(source, () => `copy-${++id}`);
  const second = cloneSavedSectionBlocks(source, () => `copy-${++id}`);
  first[0].props.items[0].value = "edited";
  expect(source[0].props.items[0].value).toBe("saved");
  expect(second[0].props.items[0].value).toBe("saved");
  expect(first[0].extra).toEqual({ retained: true });
  expect(first[0].id).not.toBe(second[0].id);
});

it("retains the legacy library exclusion of dynamic system starters", () => {
  expect(
    isInsertableSavedSection(
      { name: "Starter - Blog", blocks: [{ type: "blog-post-feed" }] },
      (type) => Boolean(getBlockDef(type)?.isDynamic),
    ),
  ).toBe(false);
  expect(
    isInsertableSavedSection(
      { name: "Custom Blog", blocks: [{ type: "blog-post-feed" }] },
      (type) => Boolean(getBlockDef(type)?.isDynamic),
    ),
  ).toBe(true);
  expect(
    isInsertableSavedSection(
      { name: "Starter - Legacy", blocks: [{ type: "future-block" }] },
      (type) => Boolean(getBlockDef(type)?.isDynamic),
    ),
  ).toBe(true);
});
