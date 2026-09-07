import { test } from "node:test";
import assert from "node:assert/strict";
import { requiresAccountMfa } from "../src/core/mfa-required.ts";
test("new per-user and legacy assurance flags both lock without role-based bypass", () => {
  for (const role of ["owner", "manager", "crew", "client"]) {
    assert.equal(
      requiresAccountMfa({
        mfaRequired: true,
        ownerMfaRequired: false,
        ...{ role },
      }),
      true,
    );
    assert.equal(
      requiresAccountMfa({ ownerMfaRequired: true, ...{ role } }),
      true,
    );
    assert.equal(
      requiresAccountMfa({
        mfaRequired: false,
        ownerMfaRequired: false,
        ...{ role },
      }),
      false,
    );
  }
});
