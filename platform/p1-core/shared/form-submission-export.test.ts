import { expect, it } from "vitest";
import { buildSubmissionCsv } from "./form-submission-export";
it("exports all historical keys, quotes data and preserves nested answers as JSON", () => {
  const csv = buildSubmissionCsv([
    {
      id: "one",
      createdAt: "2026-09-17T00:00:00Z",
      data: { old: 'A,"B"\nC', nested: { items: ["x", 2] } },
    },
    { id: "two", data: { new: false, zero: 0 } },
  ]);
  expect(csv).toContain('"Submission ID","Submitted At","Source","old","nested","new","zero"');
  expect(csv).toContain('"A,""B""\nC"');
  expect(csv).toContain('"{""items"":[""x"",2]}"');
  expect(csv).toContain('"two","","","","","false","0"');
});
it("neutralizes formula-like headers, metadata and values without changing the source", () => {
  const row = {
    id: "=identifier",
    source: "@source",
    data: { "=header": "  =SUM(1,2)", plus: "+cmd", minus: "-4", tab: "\tvalue", normal: "hello" },
  };
  const copy = structuredClone(row);
  const csv = buildSubmissionCsv([row]);
  for (const value of [
    "'=identifier",
    "'@source",
    "'=header",
    "'  =SUM(1,2)",
    "'+cmd",
    "'-4",
    "'\tvalue",
  ])
    expect(csv).toContain(value);
  expect(row).toEqual(copy);
});
it("retains invalid legacy timestamps and handles an empty export", () => {
  expect(buildSubmissionCsv([{ id: "one", createdAt: "legacy date", data: {} }])).toContain(
    '"legacy date"',
  );
  expect(buildSubmissionCsv([])).toBe('"Submission ID","Submitted At","Source"');
});
