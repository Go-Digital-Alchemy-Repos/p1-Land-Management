import assert from "node:assert/strict";
import test from "node:test";
import { formatPhoneNumber } from "../src/phone";

test("phone presentation formats North American numbers without corrupting other values", () => {
  assert.equal(formatPhoneNumber("8035550199"), "(803) 555-0199");
  assert.equal(formatPhoneNumber("+1 (704) 221-8928"), "(704) 221-8928");
  assert.equal(formatPhoneNumber("+44 20 7946 0958"), "+44 20 7946 0958");
  assert.equal(formatPhoneNumber("not a phone"), "not a phone");
  assert.equal(formatPhoneNumber(null), "");
});
