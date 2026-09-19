import { createHash } from "node:crypto";
const LIMIT = 100000;
const id = (value) =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(value);
// Metadata only: deliberately excludes contact details, bodies, task titles,
// form payloads, credentials, sessions, and content archives.
export const projections = {
  coreLeads: `SELECT id,stage,form_submission_id AS "formSubmissionId",owner_id AS "ownerId" FROM crm_leads ORDER BY id`,
  coreClients: `SELECT id,source_lead_id AS "sourceLeadId",owner_id AS "ownerId",account_owner_id AS "accountOwnerId" FROM crm_clients ORDER BY id`,
  coreNotes: `SELECT id,'lead' AS entity,lead_id AS "parentId",created_by_id AS "createdById" FROM crm_lead_notes UNION ALL SELECT id,'client' AS entity,client_id AS "parentId",created_by_id AS "createdById" FROM crm_client_notes ORDER BY entity,id`,
  coreTasks: `SELECT id,'lead' AS entity,lead_id AS "parentId",created_by_id AS "createdById",assigned_to_id AS "assignedToId",completed FROM crm_lead_tasks UNION ALL SELECT id,'client' AS entity,client_id AS "parentId",created_by_id AS "createdById",assigned_to_id AS "assignedToId",completed FROM crm_client_tasks ORDER BY entity,id`,
  identityLinks: `SELECT core_user_id AS "coreUserId",canonical_user_id AS "canonicalUserId",revoked_at AS "revokedAt" FROM p1_identity_link ORDER BY core_user_id,canonical_user_id`,
  dashboardLeads: `SELECT id,status,converted_client_id AS "convertedClientId" FROM lead ORDER BY id`,
  dashboardClients: `SELECT id FROM client ORDER BY id`,
  canonicalUsers: `SELECT id FROM "user" ORDER BY id`,
  recordLinks: `SELECT CASE source_table WHEN 'leads' THEN 'lead' ELSE 'client' END AS entity,source_id AS "sourceId",coalesce(lead_id,client_id) AS "targetId" FROM crm_source_record WHERE source_instance_id=$1 AND source_table IN ('leads','clients') ORDER BY source_table,source_id`,
  receipts: `SELECT source_instance_id::text AS "sourceInstanceId",submission_id::text AS "submissionId",lead_id AS "leadId" FROM commercial_intake_receipt WHERE source_instance_id::text=$1 ORDER BY submission_id`,
};
export async function captureCrmMetadata(client, source, sourceInstanceId) {
  if (!["core", "dashboard"].includes(source) || !id(sourceInstanceId))
    throw Error("CRM capture source configuration invalid");
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    await client.query("SET LOCAL statement_timeout='15s'");
    await client.query("SET LOCAL lock_timeout='3s'");
    const evidence = (
      await client.query(
        `SELECT current_timestamp AS "capturedAt",current_setting('transaction_read_only') AS "readOnly",current_setting('transaction_isolation') AS isolation,pg_current_snapshot()::text AS snapshot`,
      )
    ).rows[0];
    if (evidence.readOnly !== "on" || evidence.isolation !== "repeatable read")
      throw Error("Read-only snapshot not established");
    const records = {};
    async function read(key, params = []) {
      const rows = (
        await client.query(projections[key] + ` LIMIT ${LIMIT + 1}`, params)
      ).rows;
      if (rows.length > LIMIT) throw Error("CRM metadata row limit exceeded");
      records[key] = rows;
    }
    if (source === "core") {
      const tables = (
        await client.query(
          "SELECT tablename FROM pg_tables WHERE schemaname=current_schema() AND left(tablename,4)='crm_' ORDER BY tablename",
        )
      ).rows.map((row) => row.tablename);
      const expected = [
        "crm_client_notes",
        "crm_client_tasks",
        "crm_clients",
        "crm_lead_notes",
        "crm_lead_tasks",
        "crm_leads",
      ];
      if (JSON.stringify(tables) !== JSON.stringify(expected))
        throw Error(
          "CRM source table inventory differs from supported contract",
        );
      evidence.sourceTables = tables;
      for (const key of ["coreLeads", "coreClients", "coreNotes", "coreTasks"])
        await read(key);
      evidence.identityLinksAvailable = (
        await client.query(
          "SELECT to_regclass('p1_identity_link') IS NOT NULL AS present",
        )
      ).rows[0].present;
      if (evidence.identityLinksAvailable) await read("identityLinks");
      else records.identityLinks = [];
    } else {
      for (const key of [
        "dashboardLeads",
        "dashboardClients",
        "canonicalUsers",
      ])
        await read(key);
      evidence.archiveMappingsAvailable = (
        await client.query(
          "SELECT to_regclass('crm_source_record') IS NOT NULL AS present",
        )
      ).rows[0].present;
      if (evidence.archiveMappingsAvailable)
        await read("recordLinks", [sourceInstanceId]);
      else records.recordLinks = [];
      await read("receipts", [sourceInstanceId]);
      evidence.receiptSourceCount = Number(
        (
          await client.query(
            "SELECT count(DISTINCT source_instance_id)::text AS count FROM commercial_intake_receipt",
          )
        ).rows[0].count,
      );
      evidence.otherSourceReceiptCount = Number(
        (
          await client.query(
            "SELECT count(*)::text AS count FROM commercial_intake_receipt WHERE source_instance_id::text<>$1",
            [sourceInstanceId],
          )
        ).rows[0].count,
      );
    }
    const result = {
      schemaVersion: 1,
      source,
      sourceInstanceId,
      evidence,
      records,
      sourceFreezeVerified: false,
      releaseApproval: false,
    };
    const serialized = JSON.stringify(result);
    if (Buffer.byteLength(serialized) > 32 * 1024 * 1024)
      throw Error("CRM metadata byte limit exceeded");
    await client.query("COMMIT");
    return {
      ...result,
      sha256: createHash("sha256").update(serialized).digest("hex"),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
export function combineCrmMetadata(core, dashboard) {
  if (
    core.source !== "core" ||
    dashboard.source !== "dashboard" ||
    core.sourceInstanceId !== dashboard.sourceInstanceId
  )
    throw Error("CRM capture sources differ");
  for (const capture of [core, dashboard]) {
    const { sha256, ...body } = capture;
    if (
      createHash("sha256").update(JSON.stringify(body)).digest("hex") !== sha256
    )
      throw Error("CRM capture digest mismatch");
  }
  return {
    schemaVersion: 1,
    sourceInstanceId: core.sourceInstanceId,
    ...core.records,
    ...dashboard.records,
  };
}
