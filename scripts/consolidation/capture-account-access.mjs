import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Explicit projections deliberately omit names, email addresses, credentials,
// authentication secrets, sessions, provider connections and message contents.
export const queries = {
  core: {
    accounts: `SELECT id, role, is_suspended AS "isSuspended", admin_permissions AS "adminPermissions", form_notification_form_ids AS "formNotificationIds" FROM users WHERE role IN ('admin','editor') ORDER BY id`,
    links: `SELECT core_user_id AS "coreUserId", canonical_user_id AS "canonicalUserId", revoked_at AS "revokedAt" FROM p1_identity_link ORDER BY core_user_id`,
    forms: `SELECT id, is_active AS active FROM cms_forms ORDER BY id`,
  },
  dashboard: {
    accounts: `SELECT u.id, p.role, p.active, u."emailVerified", p.mfa_required AS "mfaRequired", u."twoFactorEnabled", a.capabilities, a.form_notification_ids AS "formNotificationIds", a.version AS "accessVersion", a.reviewed_at AS "reviewedAt", a.reviewed_by AS "reviewedBy" FROM "user" u LEFT JOIN staff_profile p ON p.user_id=u.id LEFT JOIN business_account_access a ON a.user_id=u.id ORDER BY u.id`,
    clients: `SELECT id FROM client ORDER BY id`,
    properties: `SELECT id, client_id AS "clientId", lifecycle FROM property ORDER BY id`,
    clientAccess: `SELECT user_id AS "userId", client_id AS "clientId" FROM client_access ORDER BY user_id,client_id`,
    workAssignments: `SELECT id, assigned_to AS "userId", property_id AS "propertyId", status FROM work_order WHERE assigned_to IS NOT NULL ORDER BY id`,
  },
};
export async function captureSource(client, source) {
  if (!Object.hasOwn(queries, source)) throw Error('Unknown capture source');
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    await client.query("SET LOCAL statement_timeout = '15s'");
    await client.query("SET LOCAL lock_timeout = '3s'");
    const evidence = (await client.query(`SELECT current_timestamp AS "capturedAt", current_setting('transaction_read_only') AS "readOnly", current_setting('transaction_isolation') AS isolation`)).rows[0];
    if (evidence.readOnly !== 'on' || evidence.isolation !== 'repeatable read') throw Error('Read-only snapshot not established');
    const records = {};
    for (const [key, sql] of Object.entries(queries[source])) records[key] = (await client.query(sql)).rows;
    await client.query('COMMIT');
    const snapshot = { source, ...evidence, records };
    return { ...snapshot, sha256: createHash('sha256').update(JSON.stringify(snapshot)).digest('hex') };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
export async function captureInventory(core, dashboard, canonicalEnabled = false) {
  // Separate snapshot times are intentional; this is not a cross-store freeze.
  return {
    schemaVersion: 1,
    purpose: 'unreviewed-account-access-capture',
    core: await captureSource(core, 'core'),
    dashboard: await captureSource(dashboard, 'dashboard'),
    notificationRouting: { canonicalEnabled, legacyRecipientsDisposition: 'pending' },
    review: null,
    sourceFreezeVerified: false,
    releaseApproval: false,
  };
}
export async function writeCapture(path, inventory) {
  await writeFile(path, JSON.stringify(inventory, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
async function main() {
  const output = process.argv[2];
  if (!output || !process.env.P1_CAPTURE_CORE_DATABASE_URL || !process.env.P1_CAPTURE_DASHBOARD_DATABASE_URL) throw Error('Capture configuration incomplete');
  const require = createRequire(new URL('../../artifacts/api-server/package.json', import.meta.url));
  const { Client } = require('pg');
  const clients = ['CORE', 'DASHBOARD'].map(source => new Client({
    connectionString: process.env[`P1_CAPTURE_${source}_DATABASE_URL`],
    connectionTimeoutMillis: 10000,
    application_name: 'p1-account-metadata-readonly',
  }));
  try {
    for (const client of clients) await client.connect();
    const inventory = await captureInventory(...clients, process.env.P1_CAPTURE_CANONICAL_NOTIFICATIONS === 'true');
    await writeCapture(output, inventory);
    console.log(JSON.stringify({ captured: true, core: Object.fromEntries(Object.entries(inventory.core.records).map(([key, rows]) => [key, rows.length])), dashboard: Object.fromEntries(Object.entries(inventory.dashboard.records).map(([key, rows]) => [key, rows.length])), reviewed: false }));
  } finally { await Promise.allSettled(clients.map(client => client.end())); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error('Account metadata capture failed; no account changes were attempted.'); process.exitCode = 1; });
}
