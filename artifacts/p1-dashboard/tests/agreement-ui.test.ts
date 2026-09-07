import test from "node:test";
import assert from "node:assert/strict";
import { agreementCents, agreementMonths } from "../src/agreement-ui";
test("amounts preserve exact cents and reject ambiguous or excessive input", () => {
  assert.equal(agreementCents("12.50"), 1250);
  assert.equal(agreementCents(" 0.01 "), 1);
  for (const value of ["0", "-1", "1e3", "1.001", "100,000", "100000000.01"])
    assert.throws(() => agreementCents(value));
});
test("monthly periods partition partial and leap months without timezone shifts", () => {
  assert.deepEqual(agreementMonths("2028-02-15", "2028-03-10"), [
    { startsOn: "2028-02-15", endsOn: "2028-02-29" },
    { startsOn: "2028-03-01", endsOn: "2028-03-10" },
  ]);
  assert.equal(agreementMonths("2020-01-01", "2029-12-31").length, 120);
  assert.throws(() => agreementMonths("2020-01-01", "2030-01-01"));
  assert.deepEqual(agreementMonths("2028-03-01", "2028-02-01"), []);
});
