import { test } from "node:test";
import assert from "node:assert/strict";
import { NATIVE_SUPPORT_GUIDANCE } from "../src/core/support-guidance.ts";

test("native support guidance covers account, MFA, expiry and unrecoverable keys", () => {
  assert.equal(NATIVE_SUPPORT_GUIDANCE.length, 5);
  const details = NATIVE_SUPPORT_GUIDANCE.map(({ detail }) => detail).join(" ");
  assert.match(details, /office administrator/);
  assert.match(details, /authenticator code or one of your recovery codes/);
  assert.match(details, /Offline work expires/);
  assert.match(details, /cannot be reconstructed/);
  assert.match(details, /without exposing its contents/);
  assert.doesNotMatch(details, /http|password reset link|support@/i);
});
