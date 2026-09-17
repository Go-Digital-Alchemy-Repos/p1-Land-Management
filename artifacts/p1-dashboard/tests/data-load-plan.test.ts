import { test } from "node:test";
import assert from "node:assert/strict";
import { dataLoadPlan } from "../src/data-load-plan";

test("data loading never infers business data access from old roles or reporting access", () => {
  for (const role of ["member", "manager", "finance", "sales", "dispatch"]) {
    assert.deepEqual(dataLoadPlan({ role }), { paths: [], references: false });
    assert.deepEqual(dataLoadPlan({ role, capabilities: ["marketing.analytics.view", "marketing.search-console.view", "workspace.overview"] }), { paths: [], references: false });
  }
});
test("Sales uses minimal references instead of full Customers or security data", () => {
  assert.deepEqual(dataLoadPlan({ role: "member", capabilities: ["revenue.sales"] }), { paths: ["estimates", "agreement-templates"], references: true });
  assert.deepEqual(dataLoadPlan({ role: "member", capabilities: ["revenue.agreement-templates.manage"] }), { paths: ["agreement-templates"], references: false });
  const owner = dataLoadPlan({ role: "owner" });
  assert(owner.paths.includes("account-mfa-policies"));
  assert(owner.paths.includes("integrations"));
});
