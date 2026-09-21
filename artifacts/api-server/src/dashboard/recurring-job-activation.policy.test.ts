import test from "node:test";
import assert from "node:assert/strict";
import type { Actor } from "./access";
import { activateRecurringJob } from "./recurring-job-activation";
import { requireAgreementManagement } from "./service-agreement.policy";
import { HttpError } from "./policy";

for (const role of ["manager", "finance", "dispatch"] as const) {
  test(`${role} cannot activate via Operations without agreement management authority`, async () => {
    const actor: Actor = { id: "permission-test", name: "Permission test", role,
      capabilities: role === "dispatch" ? ["operations.recurring", "revenue.agreements"] : ["operations.recurring"] };
    // Invalid input must never be parsed, and no database connection is needed.
    await assert.rejects(activateRecurringJob(actor, "not-a-record", null),
      (error: unknown) => error instanceof HttpError && error.status === 403);
  });
}
for (const role of ["manager", "finance", "owner"] as const) {
  test(`${role} retains agreement management with the required grant`, () => {
    assert.doesNotThrow(() => requireAgreementManagement({ id: "permission-test", name: "Permission test", role, capabilities: ["revenue.agreements"] }));
  });
}
test("agreement permission alone does not grant Operations activation", async () => {
  await assert.rejects(activateRecurringJob({ id: "permission-test", name: "Permission test", role: "manager", capabilities: ["revenue.agreements"] }, "not-a-record", null),
    (error: unknown) => error instanceof HttpError && error.status === 403);
});
