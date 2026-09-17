import { test } from "node:test";
import assert from "node:assert/strict";
import { adjacentWorkday, validateWorkday } from "../src/core/workday.ts";

test("workday controls reject malformed dates and preserve calendar boundaries", () => {
  assert.equal(validateWorkday("2026-02-28"), "2026-02-28");
  assert.throws(() => validateWorkday("2026-02-29"), /real calendar date/);
  assert.throws(() => validateWorkday("02/28/2026"), /YYYY-MM-DD/);
  assert.equal(adjacentWorkday("2026-03-08", -1), "2026-03-07");
  assert.equal(adjacentWorkday("2026-11-01", 1), "2026-11-02");
  assert.equal(adjacentWorkday("2026-12-31", 1), "2027-01-01");
  assert.throws(() => adjacentWorkday("2026-09-08", 32), /nearby/);
});
