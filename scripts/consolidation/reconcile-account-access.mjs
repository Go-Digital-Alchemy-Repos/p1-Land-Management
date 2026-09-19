import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { CAPABILITIES } from "../../lib/api-zod/src/business-access.ts";

const roles = ["owner", "member", "manager", "dispatch", "sales", "finance", "crew", "client"];
const knownCapabilities = new Set(CAPABILITIES);
const fail = () => { throw Error("Invalid account-access inventory; check the documented metadata-only contract"); };
const id = value => typeof value === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(value);
const digest = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const date = value => typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19);
const bool = value => typeof value === "boolean";
const positive = value => Number.isSafeInteger(value) && value > 0;
const nullable = check => value => value === null || check(value);
function exact(value, fields) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join("|") !== Object.keys(fields).sort().join("|")) fail();
  for (const [key, check] of Object.entries(fields)) if (!check(value[key])) fail();
  return true;
}
function array(value, check, key = value => JSON.stringify(value)) {
  if (!Array.isArray(value) || value.length > 100000) fail();
  const seen = new Set();
  for (const item of value) { if (!check(item) || seen.has(key(item))) fail(); seen.add(key(item)); }
  return true;
}
const ids = value => array(value, id);
const grants = value => array(value, item => typeof item === "string" && /^[a-z][a-z0-9.-]{0,100}$/.test(item));
const unavailable = value => exact(value, { representation: item => item === "not_represented" });
const snapshot = value => exact(value, { sha256: digest, capturedAt: date, complete: item => item === true });
const targetFields = {
  role: value => roles.includes(value), active: bool, emailVerified: bool, mfaRequired: bool, twoFactorEnabled: bool,
  capabilities: grants, formNotificationIds: ids,
};
function validate(input) {
  exact(input, {
    schemaVersion: value => value === 1,
    provenance: value => exact(value, { core: snapshot, dashboard: snapshot, identityInventorySha256: digest }),
    coreAccounts: value => array(value, row => exact(row, { id, role: value => ["admin", "editor"].includes(value),
      isSuspended: bool, emailVerification: unavailable, mfa: unavailable, adminPermissions: grants, formNotificationIds: ids }), row => row.id),
    dashboardAccounts: value => array(value, row => exact(row, { id, ...targetFields, accessVersion: positive, reviewedAt: nullable(date), reviewedBy: nullable(id) }), row => row.id),
    links: value => array(value, row => exact(row, { coreUserId: id, canonicalUserId: id, revokedAt: nullable(date) })),
    forms: value => array(value, row => exact(row, { id, active: bool }), row => row.id),
    clients: value => array(value, row => exact(row, { id }), row => row.id),
    properties: value => array(value, row => exact(row, { id, clientId: nullable(id), lifecycle: item => ["operational", "prospect"].includes(item) }), row => row.id),
    clientAccess: value => array(value, row => exact(row, { userId: id, clientId: id })),
    workAssignments: value => array(value, row => exact(row, { id, userId: id, propertyId: id, status: item => ["draft", "scheduled", "in_progress", "completed", "reviewed", "cancelled", "skipped", "delayed"].includes(item) }), row => row.id),
    notificationRouting: value => exact(value, { canonicalEnabled: bool, legacyRecipientsDisposition: item => ["pending", "reviewed"].includes(item) }),
    review: value => exact(value, { reviewedBy: id, reviewedAt: date, coreSnapshotSha256: digest, dashboardSnapshotSha256: digest,
      expectedCanonicalNotificationsEnabled: bool,
      accounts: rows => array(rows, row => exact(row, { canonicalUserId: id, coreUserId: nullable(id), coreRole: nullable(value => ["admin", "editor"].includes(value)), coreSuspended: nullable(bool), coreAdminPermissions: grants,
        coreFormNotificationIds: ids, accessVersion: positive, ...targetFields, clientIds: ids, propertyIds: ids }), row => row.canonicalUserId) }),
  });
}
const sorted = items => [...items].sort();
const sameSet = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
const hash = raw => createHash("sha256").update(raw).digest("hex");

/** Metadata-only, read-only comparison. Review assertions are not authenticated approvals. */
export function reconcileAccountAccess(input) {
  validate(input);
  const findings = [];
  const add = (code, accountId = null, relatedId = null) => findings.push({ code, accountId, relatedId });
  const core = new Map(input.coreAccounts.map(row => [row.id, row]));
  const accounts = new Map(input.dashboardAccounts.map(row => [row.id, row]));
  const forms = new Map(input.forms.map(row => [row.id, row]));
  const clients = new Set(input.clients.map(row => row.id));
  const properties = new Map(input.properties.map(row => [row.id, row]));
  const clientGrants = new Map(), assignedProperties = new Map();
  for (const grant of input.clientAccess) {
    if (!clientGrants.has(grant.userId)) clientGrants.set(grant.userId, new Set());
    clientGrants.get(grant.userId).add(grant.clientId);
  }
  for (const work of input.workAssignments) if (!["cancelled", "skipped", "reviewed"].includes(work.status)) {
    if (!assignedProperties.has(work.userId)) assignedProperties.set(work.userId, new Set());
    assignedProperties.get(work.userId).add(work.propertyId);
  }
  const operationalProperties = input.properties.filter(p => p.lifecycle === "operational" && p.clientId !== null && clients.has(p.clientId));
  const expected = new Map(input.review.accounts.map(row => [row.canonicalUserId, row]));
  const reviewer = accounts.get(input.review.reviewedBy);
  if (!reviewer || reviewer.role !== "owner" || !reviewer.active || !reviewer.emailVerified || !reviewer.mfaRequired || !reviewer.twoFactorEnabled) add("reviewer_not_eligible", input.review.reviewedBy);
  if (input.review.coreSnapshotSha256 !== input.provenance.core.sha256 || input.review.dashboardSnapshotSha256 !== input.provenance.dashboard.sha256) add("review_snapshot_mismatch");
  if (Date.parse(input.review.reviewedAt) < Math.max(Date.parse(input.provenance.core.capturedAt), Date.parse(input.provenance.dashboard.capturedAt))) add("review_predates_snapshot");
  if (input.notificationRouting.canonicalEnabled !== input.review.expectedCanonicalNotificationsEnabled) add("notification_routing_mismatch");
  if (input.notificationRouting.legacyRecipientsDisposition !== "reviewed") add("legacy_recipient_disposition_missing");
  const coreLinks = new Map(), dashboardLinks = new Map();
  for (const link of input.links) {
    coreLinks.set(link.coreUserId, [...(coreLinks.get(link.coreUserId) || []), link]);
    dashboardLinks.set(link.canonicalUserId, [...(dashboardLinks.get(link.canonicalUserId) || []), link]);
    if (!core.has(link.coreUserId) || !accounts.has(link.canonicalUserId)) add("dangling_identity_link", link.canonicalUserId, link.coreUserId);
    if (link.revokedAt !== null) add("revoked_identity_link_requires_disposition", link.canonicalUserId, link.coreUserId);
  }
  for (const [source, links] of coreLinks) if (links.length !== 1) add("ambiguous_core_identity_link", null, source);
  for (const [account, links] of dashboardLinks) if (links.length !== 1) add("ambiguous_dashboard_identity_link", account);
  for (const source of core.values()) {
    if (!coreLinks.has(source.id)) add("unlinked_core_account", null, source.id);
    if (source.adminPermissions.some(permission => !["directory", "content", "design", "crm"].includes(permission))) add("unknown_legacy_permission", null, source.id);
  }
  for (const p of properties.values()) {
    if ((p.lifecycle === "operational" && (!p.clientId || !clients.has(p.clientId))) || (p.lifecycle === "prospect" && p.clientId !== null)) add("invalid_property_client_relationship", null, p.id);
  }
  for (const grant of input.clientAccess) {
    if (!accounts.has(grant.userId) || !clients.has(grant.clientId)) add("dangling_client_access", grant.userId, grant.clientId);
    if (accounts.get(grant.userId)?.role !== "client") add("client_access_on_nonclient", grant.userId, grant.clientId);
  }
  for (const work of input.workAssignments) {
    if (!accounts.has(work.userId) || !properties.has(work.propertyId)) add("dangling_work_assignment", work.userId, work.propertyId);
  }
  for (const row of accounts.values()) {
    const plan = expected.get(row.id);
    if (!plan) add("account_review_missing", row.id);
    for (const grant of row.capabilities) if (!knownCapabilities.has(grant)) add("unknown_canonical_capability", row.id);
    if (["client", "crew"].includes(row.role) && (row.capabilities.length || row.formNotificationIds.length)) add("scoped_account_has_office_grants", row.id);
    if (row.active && !row.emailVerified) add("active_account_email_unverified", row.id);
    if (row.active && row.mfaRequired && !row.twoFactorEnabled) add("required_mfa_not_enrolled", row.id);
    if (row.role === "owner" && !row.mfaRequired) add("owner_mfa_not_required", row.id);
    if (row.active && !["owner", "client", "crew"].includes(row.role) && (!row.reviewedAt || !row.reviewedBy)) add("grant_review_missing", row.id);
    if (row.reviewedBy && !accounts.has(row.reviewedBy)) add("dangling_grant_reviewer", row.id, row.reviewedBy);
    for (const formId of row.formNotificationIds) {
      if (!forms.get(formId)?.active) add("notification_form_missing_or_inactive", row.id, formId);
      if (!row.active || !row.emailVerified || ["client", "crew"].includes(row.role) || (row.mfaRequired && !row.twoFactorEnabled) || (row.role !== "owner" && !row.capabilities.includes("marketing.content.forms"))) add("notification_recipient_ineligible", row.id, formId);
    }
    if (!plan) continue;
    if (plan.accessVersion !== row.accessVersion) add("stale_access_review", row.id);
    for (const field of ["role", "active", "emailVerified", "mfaRequired", "twoFactorEnabled"]) if (plan[field] !== row[field]) add(`${field}_mismatch`, row.id);
    for (const grant of plan.capabilities) if (!knownCapabilities.has(grant)) add("unknown_reviewed_capability", row.id);
    // Owners have known full effective access; source roles never imply grants.
    const effective = row.role === "owner" ? CAPABILITIES : ["crew", "client"].includes(row.role) ? [] : row.capabilities;
    if (!sameSet(effective, plan.capabilities)) add("effective_capabilities_mismatch", row.id);
    if (!sameSet(row.formNotificationIds, plan.formNotificationIds)) add("notification_subscriptions_mismatch", row.id);
    const linked = dashboardLinks.get(row.id) || [];
    if (plan.coreUserId === null) {
      if (linked.length) add("unexpected_core_identity_link", row.id);
      if (plan.coreRole !== null || plan.coreSuspended !== null || plan.coreAdminPermissions.length || plan.coreFormNotificationIds.length) add("reviewed_core_state_without_source", row.id);
    } else {
      const source = core.get(plan.coreUserId);
      if (!source || linked.length !== 1 || linked[0].coreUserId !== plan.coreUserId || linked[0].revokedAt !== null) add("reviewed_identity_link_missing", row.id, plan.coreUserId);
      if (source) {
        if (source.role !== plan.coreRole) add("core_role_mismatch", row.id, source.id);
        if (source.isSuspended !== plan.coreSuspended) add("core_suspension_mismatch", row.id, source.id);
        if (source.isSuspended && row.active) add("suspended_core_linked_to_active_account", row.id, source.id);
        if (!sameSet(source.adminPermissions, plan.coreAdminPermissions)) add("legacy_permissions_mismatch", row.id, source.id);
        if (!sameSet(source.formNotificationIds, plan.coreFormNotificationIds)) add("legacy_subscriptions_mismatch", row.id, source.id);
      }
      if (!row.active || ["client", "crew"].includes(row.role)) add("linked_account_not_cms_eligible", row.id);
    }
    const grantedClients = clientGrants.get(row.id) || new Set();
    const clientIds = [...grantedClients];
    if (!sameSet(clientIds, plan.clientIds)) add("client_scope_mismatch", row.id);
    for (const clientId of plan.clientIds) if (!clients.has(clientId)) add("reviewed_client_missing", row.id, clientId);
    // This comparison is the propertyAccess relationship projection, not proof
    // of endpoint authorization. Office callers still need endpoint grants.
    const propertyIds = operationalProperties.filter(p => row.role === "client" ? grantedClients.has(p.clientId) :
      row.role === "crew" ? assignedProperties.get(row.id)?.has(p.id) : true).map(p => p.id);
    if (!sameSet(propertyIds, plan.propertyIds)) add("property_relationship_scope_mismatch", row.id);
    for (const propertyId of plan.propertyIds) if (!properties.has(propertyId)) add("reviewed_property_missing", row.id, propertyId);
  }
  for (const row of input.review.accounts) if (!accounts.has(row.canonicalUserId)) add("reviewed_account_missing", row.canonicalUserId);
  const unique = [...new Map(findings.map(item => [JSON.stringify(item), item])).values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return { schemaVersion: 1, mode: "read_only", scope: "account_access_metadata_comparison", provenance: input.provenance,
    counts: { coreAccounts: core.size, dashboardAccounts: accounts.size, reviewedAccounts: expected.size, findings: unique.length }, findings: unique,
    metadataMatchesReviewedExpectations: unique.length === 0,
    limitations: ["core_email_verification_not_represented", "core_mfa_not_represented", "reviewer_identity_not_authenticated", "snapshot_completeness_is_supplied_evidence", "cross_database_snapshot_not_atomic", "property_relationship_projection_not_endpoint_authorization"],
    sessionAssuranceVerified: false, notificationDeliveryVerified: false, endpointAccessVerified: false,
    sourceFreezeVerified: false, automaticChangesAllowed: false, releaseApproval: false };
}

export async function main(args) {
  if (args.length !== 4 || args[0] !== "--input" || args[2] !== "--output" || args[1] === args[3]) fail();
  if ((await stat(args[1])).size > 32 * 1024 * 1024) fail();
  const raw = await readFile(args[1]);
  if (raw.length > 32 * 1024 * 1024) fail();
  const report = reconcileAccountAccess(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw)));
  report.inputFileSha256 = hash(raw);
  await writeFile(args[3], JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  return { metadataMatchesReviewedExpectations: report.metadataMatchesReviewedExpectations, counts: report.counts };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2)).then(result => {
  process.stdout.write(JSON.stringify(result) + "\n"); process.exitCode = result.metadataMatchesReviewedExpectations ? 0 : 2;
}).catch(() => { process.stderr.write("Account-access reconciliation failed; no complete new report was produced.\n"); process.exitCode = 1; });
