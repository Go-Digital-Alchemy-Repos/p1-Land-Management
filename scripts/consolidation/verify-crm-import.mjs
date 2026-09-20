import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import {
  prepareCrmPayloads,
  digestCrmValue,
  parseCrmJson,
} from "./prepare-crm-payloads.mjs";
import { reviewedCrmImportPlan } from "./import-crm-payloads.mjs";
const key = (table, id) => table + ":" + id;
const stamp = (sql) =>
  `to_char(${sql} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const normalized = (value) =>
  value === null
    ? null
    : value.slice(0, 19) +
      "." +
      value.slice(19, -1).replace(/^\./, "").padEnd(6, "0") +
      "Z";
/** Read-only verification of archived source and immutable native origin. Not a cutover/release approval. */
export async function verifyCrmImport(pool, input, review) {
  const manifest = review
      ? reviewedCrmImportPlan(input, review)
      : prepareCrmPayloads(input),
    issues = [],
    byCollection = Object.fromEntries(
      Object.entries(input.records).map(([name, rows]) => [
        name,
        { expected: rows.length, archived: 0, verified: 0 },
      ]),
    );
  const add = (code, collection, sourceId) =>
    issues.push({ code, collection, sourceId });
  const expected = new Map(
    manifest.records.map((r) => [key(r.collection, r.sourceId), r]),
  );
  const c = await pool.connect();
  let broken = false,
    nativeChecked = 0,
    nativeTasksChanged = 0;
  try {
    await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await c.query("SET LOCAL statement_timeout='60s'");
    await c.query("SET LOCAL lock_timeout='10s'");
    const snapshot = (
      await c.query(
        `SELECT current_setting('transaction_read_only') read_only,pg_current_snapshot()::text snapshot,${stamp("transaction_timestamp()")} checked_at`,
      )
    ).rows[0];
    if (snapshot.read_only !== "on")
      throw Error("crm_verify_read_only_required");
    const archived = (
      await c.query(
        "SELECT source_table,source_id,source_sha256,projection_sha256,review_sha256,imported_by_id,lead_id,client_id,native_record_id FROM crm_source_record WHERE source_instance_id=$1 ORDER BY source_table,source_id LIMIT 600001",
        [manifest.sourceInstanceId],
      )
    ).rows;
    if (archived.length > 600000) throw Error("crm_verify_archive_limit");
    const archiveMap = new Map(
      archived.map((r) => [key(r.source_table, r.source_id), r]),
    );
    for (const row of archived) {
      if (Object.hasOwn(byCollection, row.source_table))
        byCollection[row.source_table].archived++;
      if (!expected.has(key(row.source_table, row.source_id)))
        add("unexpected_archive", row.source_table, row.source_id);
    }
    const natives = (
      await c.query(
        `SELECT 'leadNotes' collection,id,source_note_id source_id FROM lead_note WHERE source_instance_id=$1
      UNION ALL SELECT 'clientNotes',id,source_note_id FROM client_note WHERE source_instance_id=$1
      UNION ALL SELECT CASE WHEN lead_id IS NOT NULL THEN 'leadTasks' ELSE 'clientTasks' END,id,source_task_id FROM crm_task WHERE source_instance_id=$1 LIMIT 600001`,
        [manifest.sourceInstanceId],
      )
    ).rows;
    if (natives.length > 600000) throw Error("crm_verify_native_limit");
    for (const row of natives)
      if (
        archiveMap.get(key(row.collection, row.source_id))?.native_record_id !==
        row.id
      )
        add("unexpected_native_record", row.collection, row.source_id);
    const audit = (
      await c.query(
        `SELECT entity_id,user_id,details->>'sourceTable' source_table,details->>'sourceId' source_id,details->>'sourceSha256' source_sha256,details->>'reviewSha256' review_sha256 FROM audit_event WHERE action='crm.source_imported' AND details->>'sourceInstanceId'=$1 ORDER BY id LIMIT 600001`,
        [manifest.sourceInstanceId],
      )
    ).rows;
    if (audit.length > 600000) throw Error("crm_verify_audit_limit");
    const auditMap = new Map();
    for (const row of audit) {
      const k = key(row.source_table, row.source_id);
      if (!auditMap.has(k)) auditMap.set(k, []);
      auditMap.get(k).push(row);
      if (!expected.has(k))
        add("unexpected_import_audit", row.source_table, row.source_id);
    }
    const receiptRows = (
      await c.query(
        "SELECT submission_id::text submission_id,lead_id FROM commercial_intake_receipt WHERE source_instance_id::text=$1 LIMIT 600001",
        [manifest.sourceInstanceId],
      )
    ).rows;
    if (receiptRows.length > 600000) throw Error("crm_verify_receipt_limit");
    const receipts = new Map(
      receiptRows.map((row) => [row.submission_id, row.lead_id]),
    );
    for (const receipt of input.targetInventory.receipts)
      if (
        receipt.sourceInstanceId === manifest.sourceInstanceId &&
        receipts.get(receipt.submissionId) !== receipt.leadId
      )
        add("receipt_mapping_mismatch", "receipts", receipt.submissionId);
    for (const record of manifest.records) {
      const {
        collection,
        sourceId,
        entity,
        kind,
        targetId,
        nativeProjection: p,
      } = record;
      const before = issues.length;
      if (record.blockers.length)
        add("source_payload_blocked", collection, sourceId);
      const row = archiveMap.get(key(collection, sourceId));
      if (!row) {
        add("missing_archive", collection, sourceId);
        continue;
      }
      if (
        row[entity + "_id"] !== targetId ||
        row[entity === "lead" ? "client_id" : "lead_id"] !== null
      )
        add("target_mapping_mismatch", collection, sourceId);
      const stored = (
        await c.query(
          "SELECT source_payload::text payload FROM crm_source_record WHERE source_instance_id=$1 AND source_table=$2 AND source_id=$3",
          [manifest.sourceInstanceId, collection, sourceId],
        )
      ).rows[0];
      try {
        const actualHash = digestCrmValue(parseCrmJson(stored.payload));
        if (
          actualHash !== row.source_sha256 ||
          actualHash !== record.sourceDigest
        )
          add("source_content_mismatch", collection, sourceId);
      } catch {
        add("source_payload_unreadable", collection, sourceId);
      }
      if (
        row.projection_sha256 !==
        digestCrmValue({ entity, targetId, projection: p })
      )
        add("projection_hash_mismatch", collection, sourceId);
      const events = auditMap.get(key(collection, sourceId)) || [];
      if (
        events.length !== 1 ||
        events[0].source_sha256 !== row.source_sha256 ||
        events[0].review_sha256 !== row.review_sha256 ||
        events[0].user_id !== row.imported_by_id ||
        events[0].entity_id !== (row.native_record_id || targetId)
      )
        add("audit_mismatch", collection, sourceId);
      if (kind === "parent") {
        if (
          row.native_record_id !== null ||
          !(
            await c.query(
              `SELECT id FROM ${entity === "lead" ? "lead" : "client"} WHERE id=$1`,
              [targetId],
            )
          ).rowCount
        )
          add("parent_missing_or_invalid", collection, sourceId);
        if (record.action === "create_separate_inquiry") {
          nativeChecked++;
          const native = (
            await c.query(
              `SELECT name,email,phone,location,description,source,status,
             reported_company_name AS "reportedCompanyName",contact_title AS "contactTitle",
             reported_property_name AS "reportedPropertyName",property_type AS "propertyType",
             acreage_description AS "acreageDescription",project_stage AS "projectStage",
             service_timing AS "serviceTiming",services,attribution,owner_id AS "ownerId",next_action AS "nextAction",
             ${stamp("next_action_due_at")} AS "nextActionDueAt",${stamp("created_at")} AS "createdAt",
             ${stamp("last_activity_at")} AS "lastActivityAt" FROM lead WHERE id=$1`,
              [targetId],
            )
          ).rows[0];
          const expectedProjection = {
            ...p,
            createdAt: normalized(p.createdAt),
            lastActivityAt: normalized(p.lastActivityAt),
            nextActionDueAt: normalized(p.nextActionDueAt),
          };
          if (
            !native ||
            digestCrmValue(native) !== digestCrmValue(expectedProjection)
          )
            add("native_inquiry_current_values_differ", collection, sourceId);
          const origin = (
            await c.query(
              "SELECT kind,fields FROM lead_detail_revision WHERE lead_id=$1 AND version=1",
              [targetId],
            )
          ).rows[0];
          if (
            !origin ||
            origin.kind !== "created" ||
            digestCrmValue(origin.fields) !==
              digestCrmValue({
                name: p.name,
                email: p.email,
                phone: p.phone,
                location: p.location,
                description: p.description,
                reported_company_name: p.reportedCompanyName,
              })
          )
            add("native_inquiry_origin_mismatch", collection, sourceId);
          // No receipt is invented for these generic historical inquiries. A newly
          // delivered handoff for the same submission requires reconciliation.
          if (
            record.sourceSnapshot.formSubmissionId &&
            receipts.has(record.sourceSnapshot.formSubmissionId)
          )
            add("unexpected_created_inquiry_receipt", collection, sourceId);
        }
      } else if (kind === "note") {
        const native = (
          await c.query(
            `SELECT ${entity + "_id"} parent_id,author_id,body,${stamp("created_at")} created_at,source_instance_id,source_note_id,source_author_id FROM ${entity === "lead" ? "lead_note" : "client_note"} WHERE id=$1`,
            [row.native_record_id],
          )
        ).rows[0];
        nativeChecked++;
        if (!native) add("native_note_missing", collection, sourceId);
        else if (
          digestCrmValue(native) !==
          digestCrmValue({
            parent_id: targetId,
            author_id: p.authorId,
            body: p.body,
            created_at: normalized(p.createdAt),
            source_instance_id: manifest.sourceInstanceId,
            source_note_id: sourceId,
            source_author_id: p.sourceAuthorId,
          })
        )
          add("native_note_mismatch", collection, sourceId);
      } else {
        const native = (
          await c.query(
            `SELECT ${entity + "_id"} parent_id,created_by_id,${stamp("created_at")} created_at,${stamp("updated_at")} updated_at,source_instance_id,source_task_id,source_created_by_id,source_assigned_to_id,version,title,${stamp("due_at")} due_at,completed,assigned_to_id,changed_by_id FROM crm_task WHERE id=$1`,
            [row.native_record_id],
          )
        ).rows[0];
        const origin = (
          await c.query(
            `SELECT title,${stamp("due_at")} due_at,completed,assigned_to_id,changed_by_id FROM crm_task_revision WHERE task_id=$1 AND version=1`,
            [row.native_record_id],
          )
        ).rows[0];
        nativeChecked++;
        if (!native || !origin)
          add("native_task_origin_missing", collection, sourceId);
        else {
          const {
            version,
            updated_at,
            title,
            due_at,
            completed,
            assigned_to_id,
            changed_by_id,
            ...immutable
          } = native;
          const current = {
            title,
            due_at,
            completed,
            assigned_to_id,
            changed_by_id,
          };
          const latest = (
            await c.query(
              `SELECT title,${stamp("due_at")} due_at,completed,assigned_to_id,changed_by_id FROM crm_task_revision WHERE task_id=$1 AND version=$2`,
              [row.native_record_id, version],
            )
          ).rows[0];
          if (!latest || digestCrmValue(latest) !== digestCrmValue(current))
            add("native_task_current_revision_mismatch", collection, sourceId);
          if (
            digestCrmValue(immutable) !==
              digestCrmValue({
                parent_id: targetId,
                created_by_id: p.createdById,
                created_at: normalized(p.createdAt),
                source_instance_id: manifest.sourceInstanceId,
                source_task_id: sourceId,
                source_created_by_id: p.sourceCreatedById,
                source_assigned_to_id: p.sourceAssignedToId,
              }) ||
            digestCrmValue(origin) !==
              digestCrmValue({
                title: p.title,
                due_at: normalized(p.dueAt),
                completed: p.completed,
                assigned_to_id: p.assignedToId,
                changed_by_id: null,
              }) ||
            (version === 1 && updated_at !== normalized(p.updatedAt))
          )
            add("native_task_origin_mismatch", collection, sourceId);
          const history = (
            await c.query(
              "SELECT count(*)::int n,min(version) first,max(version) last FROM crm_task_revision WHERE task_id=$1",
              [row.native_record_id],
            )
          ).rows[0];
          if (
            history.n !== version ||
            history.first !== 1 ||
            history.last !== version
          )
            add("native_task_history_gap", collection, sourceId);
          if (version > 1) nativeTasksChanged++;
        }
      }
      if (issues.length === before) byCollection[collection].verified++;
    }
    await c.query("ROLLBACK");
    issues.sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b), "en"),
    );
    return {
      schemaVersion: 1,
      scope: "crm_archive_and_native_origin",
      sourceInstanceId: manifest.sourceInstanceId,
      sourceContentSha256: manifest.sourceContentSha256,
      manifestSha256: manifest.manifestSha256,
      snapshot,
      verified: issues.length === 0,
      counts: {
        expected: manifest.records.length,
        archived: archived.length,
        verified: Object.values(byCollection).reduce(
          (n, r) => n + r.verified,
          0,
        ),
        nativeChecked,
        nativeRecords: natives.length,
        nativeTasksChanged,
        issues: issues.length,
        reconciliationFindings: manifest.reconciliation.issues.length,
      },
      byCollection,
      issues,
      sourceFreezeVerified: false,
      releaseApproval: false,
    };
  } catch (error) {
    try {
      await c.query("ROLLBACK");
    } catch {
      broken = true;
    }
    throw error;
  } finally {
    c.release(broken ? Error("CRM verification connection failed") : undefined);
  }
}
export async function main(args) {
  if (
    ![4, 6].includes(args.length) ||
    (args.length === 6 && (args[4] !== "--review" || args[5] === args[3])) ||
    args[0] !== "--input" ||
    args[2] !== "--output" ||
    args[1] === args[3] ||
    !process.env.DASHBOARD_DATABASE_URL
  )
    throw Error("crm_verify_arguments");
  if ((await stat(args[1])).size > 32 * 1024 * 1024)
    throw Error("crm_verify_input_limit");
  const raw = await readFile(args[1]);
  if (raw.length > 32 * 1024 * 1024) throw Error("crm_verify_input_limit");
  const require = createRequire(
      new URL("../../artifacts/api-server/package.json", import.meta.url),
    ),
    { Pool } = require("pg");
  const pool = new Pool({
    connectionString: process.env.DASHBOARD_DATABASE_URL,
    max: 1,
  });
  try {
    let review;
    if (args.length === 6) {
      if ((await stat(args[5])).size > 32 * 1024 * 1024)
        throw Error("crm_verify_input_limit");
      const reviewRaw = await readFile(args[5]);
      if (reviewRaw.length > 32 * 1024 * 1024)
        throw Error("crm_verify_input_limit");
      review = parseCrmJson(reviewRaw);
    }
    const report = await verifyCrmImport(pool, parseCrmJson(raw), review);
    report.inputFileSha256 = createHash("sha256").update(raw).digest("hex");
    await writeFile(args[3], JSON.stringify(report, null, 2) + "\n", {
      flag: "wx",
      mode: 0o600,
    });
    return { verified: report.verified, counts: report.counts };
  } finally {
    await pool.end();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main(process.argv.slice(2))
    .then((result) => {
      process.stdout.write(JSON.stringify(result) + "\n");
      process.exitCode = result.verified ? 0 : 2;
    })
    .catch(() => {
      process.stderr.write(
        "CRM verification failed. No complete verification report was produced; check the input and use a new output path.\n",
      );
      process.exitCode = 1;
    });
