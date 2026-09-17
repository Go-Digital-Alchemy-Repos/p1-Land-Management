import { randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import {
  prepareCrmPayloads,
  digestCrmValue,
  parseCrmJson,
} from "./prepare-crm-payloads.mjs";
const uuid = (v) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const fail = (code) => {
  throw Error(code);
};
/** Operational import, not an HTTP endpoint. Caller supplies a privileged pool and reviewed frozen export. */
export async function importCrmPayloads(
  pool,
  input,
  review,
  { dryRun = true } = {},
) {
  if (typeof dryRun !== "boolean") fail("crm_import_mode_required");
  const manifest = prepareCrmPayloads(input);
  if (
    !review ||
    Object.keys(review).sort().join(",") !==
      "manifestSha256,operation,reviewedBy,schemaVersion" ||
    review.schemaVersion !== 1 ||
    review.operation !== "import_reviewed_crm" ||
    review.manifestSha256 !== manifest.manifestSha256 ||
    typeof review.reviewedBy !== "string" ||
    !review.reviewedBy
  )
    fail("crm_import_review_mismatch");
  if (manifest.counts.blocked || manifest.records.length > 10000)
    fail("crm_import_unresolved_or_oversized");
  if (
    manifest.records.some(
      (r) => !uuid(r.targetId) || r.targetId !== r.targetId.toLowerCase(),
    )
  )
    fail("crm_import_invalid_target");
  const client = await pool.connect();
  let broken = false;
  let created = 0,
    replayed = 0;
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout='10s'");
    await client.query("SET LOCAL statement_timeout='60s'");
    const owner = (
      await client.query(
        "SELECT role,active FROM staff_profile WHERE user_id=$1 FOR SHARE",
        [review.reviewedBy],
      )
    ).rows[0];
    if (!owner?.active || owner.role !== "owner")
      fail("crm_import_owner_required");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      "crm-import:" + manifest.sourceInstanceId,
    ]);
    const expectedReceipts = new Set(
      input.targetInventory.receipts
        .filter((row) => row.sourceInstanceId === manifest.sourceInstanceId)
        .map((row) => row.submissionId),
    );
    const parents = new Map(),
      users = new Set(),
      eligible = new Set();
    const proposals = new Map(
      manifest.reconciliation.proposals.map((p) => [
        p.entity + ":" + p.sourceId,
        p,
      ]),
    );
    const sources = {
      lead: new Map(input.records.leads.map((r) => [r.id, r])),
      client: new Map(input.records.clients.map((r) => [r.id, r])),
    };
    async function user(id) {
      if (!id || users.has(id)) return;
      if (
        !(
          await client.query(
            'SELECT id FROM "user" WHERE id=$1 FOR KEY SHARE',
            [id],
          )
        ).rowCount
      )
        fail("crm_import_identity_missing");
      users.add(id);
    }
    async function assignee(id, entity) {
      if (!id || eligible.has(entity + ":" + id)) return;
      const profile = (
        await client.query(
          "SELECT role,active FROM staff_profile WHERE user_id=$1 FOR SHARE",
          [id],
        )
      ).rows[0];
      const access = (
        await client.query(
          "SELECT capabilities FROM business_account_access WHERE user_id=$1 FOR SHARE",
          [id],
        )
      ).rows[0];
      if (
        !profile?.active ||
        (profile.role !== "owner" &&
          (["crew", "client"].includes(profile.role) ||
            !access?.capabilities?.includes(
              entity === "lead" ? "revenue.sales" : "customers.clients",
            )))
      )
        fail("crm_import_assignee_ineligible");
      eligible.add(entity + ":" + id);
    }
    async function parent(entity, sourceId, targetId) {
      const key = entity + ":" + sourceId;
      if (parents.has(key)) return parents.get(key);
      const row = (
        await client.query(
          `SELECT ${entity === "lead" ? "id,converted_client_id" : "id,archived"} FROM ${entity === "lead" ? "lead" : "client"} WHERE id=$1 FOR SHARE`,
          [targetId],
        )
      ).rows[0];
      if (!row || (entity === "client" && row.archived))
        fail("crm_import_parent_unavailable");
      const source = sources[entity].get(sourceId);
      if (!source) fail("crm_import_parent_missing");
      if (entity === "lead" && source.formSubmissionId) {
        const receipts =
          uuid(manifest.sourceInstanceId) && uuid(source.formSubmissionId)
            ? (
                await client.query(
                  "SELECT lead_id FROM commercial_intake_receipt WHERE source_instance_id=$1::uuid AND submission_id=$2::uuid FOR SHARE",
                  [manifest.sourceInstanceId, source.formSubmissionId],
                )
              ).rows
            : [];
        const expected = expectedReceipts.has(source.formSubmissionId);
        if (
          (expected && receipts.length !== 1) ||
          receipts.some((r) => r.lead_id !== targetId)
        )
          fail("crm_import_receipt_changed");
      }
      if (entity === "client" && source.sourceLeadId) {
        const proposal = proposals.get("lead:" + source.sourceLeadId);
        if (!proposal?.targetId) fail("crm_import_parent_mapping_missing");
        const lead = await parent(
          "lead",
          source.sourceLeadId,
          proposal.targetId,
        );
        const basis = proposals.get(key)?.basis;
        if (
          (lead.converted_client_id && lead.converted_client_id !== targetId) ||
          (basis === "converted_lead_client" &&
            lead.converted_client_id !== targetId)
        )
          fail("crm_import_conversion_changed");
      }
      parents.set(key, row);
      return row;
    }
    for (const record of manifest.records) {
      const {
        collection,
        sourceId,
        entity,
        kind,
        targetId,
        sourceParentId,
        sourceDigest,
        sourceSnapshot,
        nativeProjection: projection,
      } = record;
      const projectionDigest = digestCrmValue({ entity, targetId, projection });
      const archived = (
        await client.query(
          "SELECT source_sha256,projection_sha256,lead_id,client_id,native_record_id FROM crm_source_record WHERE source_instance_id=$1 AND source_table=$2 AND source_id=$3",
          [manifest.sourceInstanceId, collection, sourceId],
        )
      ).rows[0];
      if (archived) {
        if (
          archived.source_sha256 !== sourceDigest ||
          archived.projection_sha256 !== projectionDigest ||
          archived[entity + "_id"] !== targetId
        )
          fail("crm_import_source_conflict");
        if (kind !== "parent") {
          const table =
            kind === "task"
              ? "crm_task"
              : entity === "lead"
                ? "lead_note"
                : "client_note";
          if (
            !(
              await client.query(
                `SELECT id FROM ${table} WHERE id=$1 AND ${entity + "_id"}=$2 AND source_instance_id=$3 AND ${kind === "task" ? "source_task_id" : "source_note_id"}=$4`,
                [
                  archived.native_record_id,
                  targetId,
                  manifest.sourceInstanceId,
                  sourceId,
                ],
              )
            ).rowCount
          )
            fail("crm_import_native_record_missing");
        }
        replayed++;
        continue;
      }
      await parent(entity, sourceParentId, targetId);
      let nativeId = null;
      if (kind === "note") {
        await user(projection.authorId);
        nativeId = randomUUID();
        await client.query(
          `INSERT INTO ${entity === "lead" ? "lead_note" : "client_note"}(id,${entity + "_id"},author_id,body,created_at,source_instance_id,source_note_id,source_author_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            nativeId,
            targetId,
            projection.authorId,
            projection.body,
            projection.createdAt,
            manifest.sourceInstanceId,
            sourceId,
            projection.sourceAuthorId,
          ],
        );
      } else if (kind === "task") {
        await user(projection.createdById);
        await user(projection.assignedToId);
        if (!projection.completed)
          await assignee(projection.assignedToId, entity);
        nativeId = randomUUID();
        await client.query(
          `INSERT INTO crm_task(id,${entity + "_id"},title,due_at,completed,assigned_to_id,created_by_id,changed_by_id,created_at,updated_at,source_instance_id,source_task_id,source_created_by_id,source_assigned_to_id) VALUES($1,$2,$3,$4,$5,$6,$7,NULL,$8,$9,$10,$11,$12,$13)`,
          [
            nativeId,
            targetId,
            projection.title,
            projection.dueAt,
            projection.completed,
            projection.assignedToId,
            projection.createdById,
            projection.createdAt,
            projection.updatedAt,
            manifest.sourceInstanceId,
            sourceId,
            projection.sourceCreatedById,
            projection.sourceAssignedToId,
          ],
        );
      }
      await client.query(
        `INSERT INTO crm_source_record(source_instance_id,source_table,source_id,source_sha256,source_payload,${entity + "_id"},native_record_id,projection_sha256,review_sha256,imported_by_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          manifest.sourceInstanceId,
          collection,
          sourceId,
          sourceDigest,
          JSON.stringify(sourceSnapshot),
          targetId,
          nativeId,
          projectionDigest,
          manifest.manifestSha256,
          review.reviewedBy,
        ],
      );
      await client.query(
        "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'crm.source_imported',$3,$4)",
        [
          randomUUID(),
          review.reviewedBy,
          nativeId || targetId,
          {
            sourceInstanceId: manifest.sourceInstanceId,
            sourceTable: collection,
            sourceId,
            sourceSha256: sourceDigest,
            reviewSha256: manifest.manifestSha256,
          },
        ],
      );
      created++;
    }
    await client.query(dryRun ? "ROLLBACK" : "COMMIT");
    return {
      mode: dryRun ? "dry-run" : "apply",
      records: manifest.records.length,
      replayed,
      created: dryRun ? 0 : created,
      wouldCreate: dryRun ? created : 0,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      broken = true;
    }
    throw error;
  } finally {
    client.release(broken ? Error("CRM import connection failed") : undefined);
  }
}
async function privateJson(path) {
  if ((await stat(path)).size > 32 * 1024 * 1024)
    fail("crm_import_file_too_large");
  const raw = await readFile(path);
  if (raw.length > 32 * 1024 * 1024) fail("crm_import_file_too_large");
  return parseCrmJson(raw);
}
export async function main(args) {
  if (
    args.length !== 6 ||
    args[0] !== "--input" ||
    args[2] !== "--review" ||
    args[4] !== "--mode" ||
    !["dry-run", "apply"].includes(args[5])
  )
    fail("crm_import_arguments");
  if (!process.env.DASHBOARD_DATABASE_URL) fail("crm_import_database_required");
  const input = await privateJson(args[1]),
    review = await privateJson(args[3]);
  const require = createRequire(
    new URL("../../artifacts/api-server/package.json", import.meta.url),
  );
  const { Pool } = require("pg");
  const pool = new Pool({
    connectionString: process.env.DASHBOARD_DATABASE_URL,
    max: 1,
  });
  try {
    return await importCrmPayloads(pool, input, review, {
      dryRun: args[5] === "dry-run",
    });
  } finally {
    await pool.end();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main(process.argv.slice(2))
    .then((result) => process.stdout.write(JSON.stringify(result) + "\n"))
    .catch(() => {
      process.stderr.write(
        "CRM import could not be confirmed. Retain the reviewed files and reconcile with the identical batch before retrying changes.\n",
      );
      process.exitCode = 1;
    });
