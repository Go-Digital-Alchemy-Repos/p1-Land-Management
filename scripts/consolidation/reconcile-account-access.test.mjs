import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CAPABILITIES } from "../../lib/api-zod/src/business-access.ts";
import { reconcileAccountAccess, main } from "./reconcile-account-access.mjs";

function fixture() {
  const at = "2026-09-19T00:00:00Z";
  const owner = { id: "owner", role: "owner", active: true, emailVerified: true, mfaRequired: true, twoFactorEnabled: true,
    capabilities: [], formNotificationIds: [], accessVersion: 1, reviewedAt: at, reviewedBy: "owner" };
  const member = { ...owner, id: "member", role: "member", capabilities: ["marketing.content.forms"], formNotificationIds: ["form"] };
  const client = { ...owner, id: "client-user", role: "client", mfaRequired: false, twoFactorEnabled: false };
  const crew = { ...client, id: "crew", role: "crew" };
  const review = row => ({ canonicalUserId: row.id, coreUserId: null, coreRole: null, coreSuspended: null, coreAdminPermissions: [], coreFormNotificationIds: [],
    accessVersion: row.accessVersion, role: row.role, active: row.active, emailVerified: row.emailVerified, mfaRequired: row.mfaRequired, twoFactorEnabled: row.twoFactorEnabled,
    capabilities: row.role === "owner" ? [...CAPABILITIES] : [...row.capabilities], formNotificationIds: [...row.formNotificationIds], clientIds: [], propertyIds: ["property-a", "property-b"] });
  return {
    schemaVersion: 1,
    provenance: { core: { sha256: "a".repeat(64), capturedAt: at, complete: true }, dashboard: { sha256: "b".repeat(64), capturedAt: at, complete: true }, identityInventorySha256: "c".repeat(64) },
    coreAccounts: [{ id: "core-member", role: "editor", isSuspended: false, emailVerification: { representation: "not_represented" }, mfa: { representation: "not_represented" }, adminPermissions: ["content"], formNotificationIds: ["form"] }],
    dashboardAccounts: [owner, member, client, crew], links: [{ coreUserId: "core-member", canonicalUserId: "member", revokedAt: null }],
    forms: [{ id: "form", active: true }], clients: [{ id: "client-a" }, { id: "client-b" }],
    properties: [{ id: "property-a", clientId: "client-a", lifecycle: "operational" }, { id: "property-b", clientId: "client-b", lifecycle: "operational" }, { id: "prospect", clientId: null, lifecycle: "prospect" }],
    clientAccess: [{ userId: "client-user", clientId: "client-a" }], workAssignments: [{ id: "work", userId: "crew", propertyId: "property-b", status: "scheduled" }],
    notificationRouting: { canonicalEnabled: false, legacyRecipientsDisposition: "reviewed" },
    review: { reviewedBy: "owner", reviewedAt: at, coreSnapshotSha256: "a".repeat(64), dashboardSnapshotSha256: "b".repeat(64), expectedCanonicalNotificationsEnabled: false,
      accounts: [review(owner), { ...review(member), coreUserId: "core-member", coreRole: "editor", coreSuspended: false, coreAdminPermissions: ["content"], coreFormNotificationIds: ["form"] },
        { ...review(client), clientIds: ["client-a"], propertyIds: ["property-a"] }, { ...review(crew), propertyIds: ["property-b"] }] },
  };
}
const codes = input => reconcileAccountAccess(input).findings.map(row => row.code);

test("faithful metadata comparison preserves Owner access, separate scope rules and all acceptance limits", () => {
  const report = reconcileAccountAccess(fixture());
  assert.equal(report.metadataMatchesReviewedExpectations, true);
  assert.equal(report.counts.findings, 0);
  for (const key of ["sessionAssuranceVerified", "notificationDeliveryVerified", "endpointAccessVerified", "sourceFreezeVerified", "automaticChangesAllowed", "releaseApproval"]) assert.equal(report[key], false);
  assert(report.limitations.includes("core_email_verification_not_represented"));
});

test("suspension, canonical verification and MFA are separate discrepancies, never repaired", () => {
  const input = fixture();
  input.coreAccounts[0].isSuspended = true;
  input.dashboardAccounts[1].emailVerified = false;
  input.dashboardAccounts[1].twoFactorEnabled = false;
  const before = structuredClone(input);
  for (const code of ["core_suspension_mismatch", "suspended_core_linked_to_active_account", "active_account_email_unverified", "required_mfa_not_enrolled", "emailVerified_mismatch", "twoFactorEnabled_mismatch", "notification_recipient_ineligible"]) assert(codes(input).includes(code), code);
  assert.deepEqual(input, before);
});

test("exact canonical vocabulary rejects unknown grants as findings without inferring grants from roles", () => {
  const input = fixture();
  input.coreAccounts[0].role = "admin";
  input.coreAccounts[0].adminPermissions.push("future-tool");
  assert(codes(input).includes("core_role_mismatch"));
  assert(codes(input).includes("unknown_legacy_permission"));
  input.dashboardAccounts[1].role = "manager";
  input.dashboardAccounts[1].capabilities = ["marketing.content.formz"];
  assert(codes(input).includes("unknown_canonical_capability"));
  assert(codes(input).includes("effective_capabilities_mismatch"));
  input.review.accounts[1].capabilities = ["marketing.content.formz"];
  assert(codes(input).includes("unknown_reviewed_capability"));
  input.dashboardAccounts[2].capabilities = ["customers.clients"];
  assert(codes(input).includes("scoped_account_has_office_grants"));
});

test("reviews bind capture hashes, account version, reviewer and time", () => {
  const input = fixture();
  input.review.coreSnapshotSha256 = "d".repeat(64);
  input.review.reviewedAt = "2025-01-01T00:00:00Z";
  input.review.reviewedBy = "member";
  input.review.accounts[1].accessVersion = 2;
  for (const code of ["review_snapshot_mismatch", "review_predates_snapshot", "reviewer_not_eligible", "stale_access_review"]) assert(codes(input).includes(code));
  input.review.accounts.pop();
  assert(codes(input).includes("account_review_missing"));
});

test("revoked, dangling, duplicate target and missing identity links remain explicit", () => {
  const input = fixture();
  input.links[0].revokedAt = "2026-09-19T01:00:00Z";
  input.links.push({ coreUserId: "unknown-source", canonicalUserId: "member", revokedAt: null });
  for (const code of ["revoked_identity_link_requires_disposition", "dangling_identity_link", "ambiguous_dashboard_identity_link", "reviewed_identity_link_missing"]) assert(codes(input).includes(code));
  input.links = [];
  assert(codes(input).includes("unlinked_core_account"));
});

test("notification routing and subscription eligibility do not claim provider delivery", () => {
  const input = fixture();
  input.forms[0].active = false;
  input.notificationRouting.canonicalEnabled = true;
  input.notificationRouting.legacyRecipientsDisposition = "pending";
  input.dashboardAccounts[1].formNotificationIds.push("missing-form");
  for (const code of ["notification_routing_mismatch", "legacy_recipient_disposition_missing", "notification_form_missing_or_inactive", "notification_subscriptions_mismatch"]) assert(codes(input).includes(code));
});

test("cross-client changes, dangling grants, prospective properties and closed crew work cannot hide scope drift", () => {
  const input = fixture();
  input.clientAccess[0].clientId = "client-b";
  input.workAssignments[0].status = "reviewed";
  assert(codes(input).includes("client_scope_mismatch"));
  assert.equal(reconcileAccountAccess(input).findings.filter(row => row.code === "property_relationship_scope_mismatch").length, 2);
  input.clientAccess.push({ userId: "absent", clientId: "missing" });
  input.properties[0].clientId = null;
  assert(codes(input).includes("dangling_client_access"));
  assert(codes(input).includes("invalid_property_client_relationship"));
});

test("strict input excludes credentials, email, false represented Core assurances, duplicate IDs and invalid dates", () => {
  for (const change of [
    input => { input.coreAccounts[0].password = "secret"; },
    input => { input.dashboardAccounts[0].email = "private@example.test"; },
    input => { input.coreAccounts[0].mfa = { representation: "represented", enabled: true }; },
    input => { input.dashboardAccounts.push(structuredClone(input.dashboardAccounts[0])); },
    input => { input.review.reviewedAt = "2026-02-30T00:00:00Z"; },
    input => { input.provenance.core.complete = false; },
    input => { input.dashboardAccounts[0].accessVersion = Number.MAX_SAFE_INTEGER + 1; },
  ]) { const input = fixture(); change(input); assert.throws(() => reconcileAccountAccess(input), /metadata-only/); }
});

test("reordered inventories and set values produce identical privacy-safe reports", () => {
  const input = fixture(); input.dashboardAccounts[1].active = false;
  const reordered = structuredClone(input);
  for (const value of Object.values(reordered)) if (Array.isArray(value)) value.reverse();
  reordered.review.accounts.reverse();
  reordered.review.accounts[3].capabilities.reverse();
  assert.deepEqual(reconcileAccountAccess(reordered), reconcileAccountAccess(input));
  assert(!JSON.stringify(reconcileAccountAccess(input)).includes("capabilities"));
});

test("CLI evidence is private, source-bound and exclusive; malformed UTF-8 fails", async () => {
  const directory = await mkdtemp(join(tmpdir(), "p1-access-test-"));
  const input = join(directory, "input.json"), output = join(directory, "report.json");
  try {
    await writeFile(input, JSON.stringify(fixture()));
    assert.equal((await main(["--input", input, "--output", output])).metadataMatchesReviewedExpectations, true);
    assert.equal((await stat(output)).mode & 0o777, 0o600);
    assert.match(JSON.parse(await readFile(output, "utf8")).inputFileSha256, /^[a-f0-9]{64}$/);
    await assert.rejects(main(["--input", input, "--output", output]));
    await writeFile(input, Buffer.from([0xff]));
    await assert.rejects(main(["--input", input, "--output", join(directory, "invalid.json")]));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
