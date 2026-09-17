import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import {
  payloadShapes,
  prepareCrmPayloads,
  parseCrmJson,
} from "./prepare-crm-payloads.mjs";
export const sourceTables = {
  leads: "crm_leads",
  clients: "crm_clients",
  leadNotes: "crm_lead_notes",
  clientNotes: "crm_client_notes",
  leadTasks: "crm_lead_tasks",
  clientTasks: "crm_client_tasks",
};
const jsonFields = new Set(["formData", "metadata", "internalTags"]);
const dateFields = new Set([
  "nextFollowUpAt",
  "createdAt",
  "updatedAt",
  "serviceStartDate",
  "renewalDate",
  "clientSince",
  "dueAt",
]);
const column = (key) =>
  ({ addressLine1: "address_line_1", addressLine2: "address_line_2" })[key] ||
  key.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const limit = 100000,
  maxBytes = 32 * 1024 * 1024;
const fail = (code) => {
  throw Error(code);
};
const stamp = (sql) => `to_char(${sql},'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
async function transactionStart(c) {
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await c.query("SET LOCAL statement_timeout='60s'");
  await c.query("SET LOCAL lock_timeout='10s'");
  const row = (
    await c.query(
      `SELECT current_setting('transaction_read_only') read_only,pg_current_snapshot()::text snapshot,${stamp("transaction_timestamp() AT TIME ZONE 'UTC'")} started_at,current_setting('TimeZone') session_timezone`,
    )
  ).rows[0];
  if (row.read_only !== "on") fail("crm_export_read_only_required");
  return row;
}
async function bounded(c, sql, params = []) {
  const rows = (await c.query(sql + ` LIMIT ${limit + 1}`, params)).rows;
  if (rows.length > limit) fail("crm_export_collection_too_large");
  return rows;
}
/** Two read-only consistent database snapshots; caller must arrange an external source freeze. */
export async function exportCrmPayloads(
  sourcePool,
  targetPool,
  { sourceInstanceId, sourceTimezone } = {},
) {
  if (
    typeof sourceInstanceId !== "string" ||
    !/^[A-Za-z0-9_-]{1,200}$/.test(sourceInstanceId) ||
    typeof sourceTimezone !== "string" ||
    sourceTimezone.length > 100 ||
    !sourceTimezone
  )
    fail("crm_export_explicit_source_convention_required");
  const source = await sourcePool.connect();
  let target;
  let sourceBroken = false,
    targetBroken = false;
  try {
    target = await targetPool.connect();
    const sourceSnapshot = await transactionStart(source),
      targetSnapshot = await transactionStart(target);
    if (
      !(
        await source.query("SELECT name FROM pg_timezone_names WHERE name=$1", [
          sourceTimezone,
        ])
      ).rowCount
    )
      fail("crm_export_unknown_timezone");
    const inventory = (
      await source.query(
        "SELECT tablename FROM pg_tables WHERE schemaname=current_schema() AND left(tablename,4)='crm_' ORDER BY tablename",
      )
    ).rows.map((r) => r.tablename);
    if (inventory.join(",") !== Object.values(sourceTables).sort().join(","))
      fail("crm_export_source_table_drift");
    const records = {};
    let bytes = 0;
    for (const [collection, table] of Object.entries(sourceTables)) {
      const keys = Object.keys(payloadShapes[collection]);
      const columns = (
        await source.query(
          "SELECT attname,atttypid::regtype::text AS type FROM pg_attribute WHERE attrelid=to_regclass($1) AND attnum>0 AND NOT attisdropped ORDER BY attname",
          [table],
        )
      ).rows;
      if (
        columns.map((c) => c.attname).join(",") !==
        keys.map(column).sort().join(",")
      )
        fail("crm_export_source_column_drift");
      if (
        keys.some(
          (key) =>
            jsonFields.has(key) &&
            columns.find((c) => c.attname === column(key))?.type !== "jsonb",
        )
      )
        fail("crm_export_json_type_drift");
      const dates = keys.filter((k) => dateFields.has(k));
      if (
        dates.some(
          (k) =>
            columns.find((c) => c.attname === column(k))?.type !==
            "timestamp without time zone",
        )
      )
        fail("crm_export_timestamp_type_drift");
      // Estimate uncompressed row JSON before transferring it to the client.
      const size = (
        await source.query(
          `SELECT count(*)::text n,coalesce(sum(octet_length(to_jsonb(t)::text)),0)::text bytes FROM ${table} t`,
        )
      ).rows[0];
      bytes += Number(size.bytes);
      if (Number(size.n) > limit || bytes > maxBytes)
        fail("crm_export_payload_too_large");
      if (sourceTimezone !== "UTC" && dates.length) {
        // Check offsets on both sides of the local timestamp. Reject gaps and folds instead of accepting PostgreSQL's default disambiguation.
        const values = dates.map((k) => `(${column(k)})`).join(",");
        const invalid = (
          await source.query(
            `WITH times AS (SELECT DISTINCT v FROM ${table} CROSS JOIN LATERAL (VALUES ${values}) dates(v) WHERE v IS NOT NULL)
 SELECT 1 FROM times WHERE (SELECT count(*) FROM (
 SELECT DISTINCT (sample AT TIME ZONE $1)-(sample AT TIME ZONE 'UTC') AS utc_offset
 FROM generate_series((v AT TIME ZONE $1)-interval '72 hours',(v AT TIME ZONE $1)+interval '72 hours',interval '6 hours') sample
 ) offsets WHERE ((v-utc_offset) AT TIME ZONE 'UTC') AT TIME ZONE $1 = v) <> 1 LIMIT 1`,
            [sourceTimezone],
          )
        ).rowCount;
        if (invalid) fail("crm_export_ambiguous_source_time");
      }
      const projection = keys
        .map((key) =>
          dateFields.has(key)
            ? `${stamp(`(${column(key)} AT TIME ZONE $1) AT TIME ZONE 'UTC'`)} AS "${key}"`
            : `${column(key)}${jsonFields.has(key) ? "::text" : ""} AS "${key}"`,
        )
        .join(",");
      records[collection] = await bounded(
        source,
        `SELECT ${projection} FROM ${table} ORDER BY id`,
        [sourceTimezone],
      );
    }
    for (const rows of Object.values(records))
      for (const row of rows)
        for (const key of jsonFields)
          if (Object.hasOwn(row, key)) row[key] = parseCrmJson(row[key]);
    const linkType = (
      await source.query(
        "SELECT atttypid::regtype::text type FROM pg_attribute WHERE attrelid=to_regclass('p1_identity_link') AND attname='revoked_at' AND NOT attisdropped",
      )
    ).rows[0];
    const identityLinksAvailable = !!(
      await source.query(
        "SELECT to_regclass('p1_identity_link') IS NOT NULL present",
      )
    ).rows[0].present;
    if (identityLinksAvailable && linkType?.type !== "timestamp with time zone")
      fail("crm_export_identity_schema_required");
    const identityLinks = identityLinksAvailable
      ? await bounded(
          source,
          `SELECT core_user_id AS "coreUserId",canonical_user_id AS "canonicalUserId",${stamp("revoked_at AT TIME ZONE 'UTC'")} AS "revokedAt" FROM p1_identity_link ORDER BY core_user_id,canonical_user_id`,
        )
      : [];
    const archiveAvailable = !!(
      await target.query(
        "SELECT to_regclass('crm_source_record') IS NOT NULL present",
      )
    ).rows[0].present;
    const targetInventory = {
      dashboardLeads: await bounded(
        target,
        'SELECT id,status,converted_client_id AS "convertedClientId" FROM lead ORDER BY id',
      ),
      dashboardClients: await bounded(
        target,
        "SELECT id FROM client ORDER BY id",
      ),
      canonicalUsers: await bounded(
        target,
        'SELECT id FROM "user" ORDER BY id',
      ),
      identityLinks,
      recordLinks: archiveAvailable
        ? await bounded(
            target,
            `SELECT CASE source_table WHEN 'leads' THEN 'lead' ELSE 'client' END entity,source_id AS "sourceId",coalesce(lead_id,client_id) AS "targetId" FROM crm_source_record WHERE source_instance_id=$1 AND source_table IN ('leads','clients') ORDER BY source_table,source_id`,
            [sourceInstanceId],
          )
        : [],
      receipts: await bounded(
        target,
        'SELECT source_instance_id::text AS "sourceInstanceId",submission_id::text AS "submissionId",lead_id AS "leadId" FROM commercial_intake_receipt WHERE source_instance_id::text=$1 ORDER BY submission_id',
        [sourceInstanceId],
      ),
    };
    const input = {
      schemaVersion: 1,
      sourceInstanceId,
      records,
      targetInventory,
    };
    if (Buffer.byteLength(JSON.stringify(input)) > maxBytes)
      fail("crm_export_payload_too_large");
    const manifest = prepareCrmPayloads(input);
    await source.query("ROLLBACK");
    await target.query("ROLLBACK");
    return {
      input,
      manifest,
      evidence: {
        schemaVersion: 1,
        mode: "read_only_export",
        sourceInstanceId,
        sourceTimezone,
        sourceSnapshot,
        targetSnapshot,
        archiveMappingsAvailable: archiveAvailable,
        identityLinksAvailable,
        counts: manifest.counts,
        manifestSha256: manifest.manifestSha256,
        sourceFreezeVerified: false,
        releaseApproval: false,
      },
    };
  } catch (error) {
    try {
      await source.query("ROLLBACK");
    } catch {
      sourceBroken = true;
    }
    if (target)
      try {
        await target.query("ROLLBACK");
      } catch {
        targetBroken = true;
      }
    throw error;
  } finally {
    source.release(
      sourceBroken ? Error("Source export connection failed") : undefined,
    );
    target?.release(
      targetBroken ? Error("Target export connection failed") : undefined,
    );
  }
}
export async function writeExportBundle(directory, result) {
  const input = JSON.stringify(result.input) + "\n",
    manifest = JSON.stringify(result.manifest, null, 2) + "\n";
  const sha = (value) => createHash("sha256").update(value).digest("hex");
  const evidence = {
    ...result.evidence,
    files: { "export.json": sha(input), "manifest.json": sha(manifest) },
  };
  await mkdir(directory, { mode: 0o700 });
  await writeFile(join(directory, "export.json"), input, {
    flag: "wx",
    mode: 0o600,
  });
  await writeFile(join(directory, "manifest.json"), manifest, {
    flag: "wx",
    mode: 0o600,
  });
  // Evidence is written last: an interrupted/partial bundle is not ready for review.
  await writeFile(
    join(directory, "evidence.json"),
    JSON.stringify(evidence, null, 2) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  return result.evidence.counts;
}
export async function main(args) {
  if (
    args.length !== 6 ||
    args[0] !== "--source-instance" ||
    args[2] !== "--source-timezone" ||
    args[4] !== "--output"
  )
    fail("crm_export_arguments");
  if (
    !process.env.CRM_SOURCE_DATABASE_URL ||
    !process.env.DASHBOARD_DATABASE_URL
  )
    fail("crm_export_connections_required");
  const require = createRequire(
    new URL("../../artifacts/api-server/package.json", import.meta.url),
  );
  const { Pool } = require("pg");
  const source = new Pool({
      connectionString: process.env.CRM_SOURCE_DATABASE_URL,
      max: 1,
    }),
    target = new Pool({
      connectionString: process.env.DASHBOARD_DATABASE_URL,
      max: 1,
    });
  try {
    return await writeExportBundle(
      args[5],
      await exportCrmPayloads(source, target, {
        sourceInstanceId: args[1],
        sourceTimezone: args[3],
      }),
    );
  } finally {
    await Promise.allSettled([source.end(), target.end()]);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main(process.argv.slice(2))
    .then((counts) => process.stdout.write(JSON.stringify(counts) + "\n"))
    .catch(() => {
      process.stderr.write(
        "CRM export failed. Check the source contract and timestamp convention; use a new output directory. Do not use partial bundles without evidence.\n",
      );
      process.exitCode = 1;
    });
