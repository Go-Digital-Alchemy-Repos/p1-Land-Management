import { test } from "node:test";
import assert from "node:assert/strict";
import { nativeRoleHome } from "../src/core/role-home.ts";

test("each authorized role receives a scoped native home description", () => {
  assert.match(nativeRoleHome("crew").title, /Assigned field work/);
  assert.match(nativeRoleHome("client").detail, /published updates/);
  assert.match(nativeRoleHome("dispatch").detail, /office dashboard/);
  assert.match(nativeRoleHome("sales").title, /Sales workspace/);
  assert.match(nativeRoleHome("finance").detail, /billing and payments/);
  assert.match(nativeRoleHome(null).detail, /permissions determine/);
});
