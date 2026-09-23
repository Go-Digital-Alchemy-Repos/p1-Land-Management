import { strict as assert } from "node:assert";
import test from "node:test";
import { formatLeadDateTime } from "../src/lead-date";

test("lead due times use compact Eastern month/day/year format across daylight saving", () => {
  assert.equal(formatLeadDateTime("2030-01-01T15:00:00Z"), "1/1/2030, 10:00am");
  assert.equal(formatLeadDateTime("2030-07-01T14:00:00Z"), "7/1/2030, 10:00am");
  assert.equal(formatLeadDateTime(null), "Not set");
});
