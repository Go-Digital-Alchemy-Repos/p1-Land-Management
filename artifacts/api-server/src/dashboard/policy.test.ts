import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { verifyCode, transition, requireRole, boundedMoney } from "./policy";
test("setup grant is expiring, exact, and fails closed", () => {
  const hash = createHash("sha256").update("correct").digest("hex");
  assert.equal(verifyCode("correct", hash, "2030-01-01", 0), true);
  for (const [code, h, exp] of [
    ["wrong", hash, "2030-01-01"],
    ["correct", hash, "bad"],
    ["correct", hash, "1970-01-01"],
    ["correct", "bad", "2030-01-01"],
  ])
    assert.equal(verifyCode(code, h, exp, 1), false);
});
test("dispatch checks prerequisites and explicit override", () => {
  assert.throws(
    () =>
      transition("draft", "scheduled", "dispatch", [
        { label: "Deposit", done: false },
      ]),
    /prerequisites/,
  );
  assert.doesNotThrow(() =>
    transition(
      "draft",
      "scheduled",
      "owner",
      [{ label: "Deposit", done: false }],
      "Owner authorized",
    ),
  );
});
test("crew cannot publish and terminal records cannot reopen silently", () => {
  assert.throws(
    () => transition("completed", "reviewed", "crew", []),
    /denied/,
  );
  assert.throws(
    () => transition("cancelled", "scheduled", "owner", []),
    /not allowed/,
  );
  assert.throws(() => requireRole("client", ["owner", "finance"]), /denied/);
});
test("money rejects fractional cents, negatives and unsafe values", () => {
  for (const v of [-1, 0, 1.5, Infinity, Number.MAX_SAFE_INTEGER])
    assert.throws(() => boundedMoney(v));
  assert.equal(boundedMoney(12500), 12500);
});
