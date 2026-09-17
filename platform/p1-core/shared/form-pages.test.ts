import { expect, it } from "vitest";
import { splitFormPages } from "./form-pages";
it("preserves public page-break behavior without mutating field definitions", () => {
  const fields = [
    { type: "text", id: "first" },
    { type: "page", id: "second" },
    { type: "email", id: "email" },
    { type: "page", id: "empty" },
    { type: "page", id: "last" },
  ];
  const before = structuredClone(fields),
    pages = splitFormPages(fields);
  expect(pages.map((page) => [page.meta?.id, page.fields.map((field) => field.id)])).toEqual([
    [undefined, ["first"]],
    ["second", ["email"]],
    ["empty", []],
    ["last", []],
  ]);
  expect(fields).toEqual(before);
  expect(splitFormPages([])).toEqual([{ meta: null, fields: [] }]);
  expect(splitFormPages([{ type: "page", id: "start" }])).toEqual([
    { meta: { type: "page", id: "start" }, fields: [] },
  ]);
});
