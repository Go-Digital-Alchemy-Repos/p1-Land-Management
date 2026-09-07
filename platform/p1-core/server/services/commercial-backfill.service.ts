import { createHash } from "node:crypto";
import { z } from "zod";
import { pool } from "../db";
import { commercialInquirySnapshot } from "./commercial-inquiry-snapshot";

const receiptId = z.string().uuid();
const previewReceipt = z.object({ submissionId: receiptId }).strict();
const applyReceipt = previewReceipt.extend({
  expectedSnapshotSha256: z.string().regex(/^[0-9a-f]{64}$/),
});
const batch = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .array(schema)
    .min(1)
    .max(100)
    .refine(
      (values) => new Set(values.map((value) => value.submissionId)).size === values.length,
      "Receipt IDs must be unique",
    );
export const commercialBackfillRequest = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("dry_run"), receipts: batch(previewReceipt) }).strict(),
  z.object({ mode: z.literal("apply"), receipts: batch(applyReceipt) }).strict(),
]);
type Status =
  | "eligible"
  | "existing"
  | "enqueued"
  | "missing"
  | "not_commercial"
  | "invalid_snapshot"
  | "snapshot_changed";
type Item = { submissionId: string; status: Status; snapshotSha256?: string; jobId?: string };
const effectKey = "commercial_dashboard_intake";

export async function backfillCommercialInquiries(input: unknown, actorId: string) {
  const request = commercialBackfillRequest.parse(input);
  const ids = request.receipts.map((receipt) => receipt.submissionId).sort();
  const client = await pool.connect();
  try {
    await client.query(
      request.mode === "dry_run" ? "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY" : "BEGIN",
    );
    if (request.mode === "apply") {
      // Match parent-before-child locking used by form edits/deletes and FK cascades.
      const parents = (
        await client.query(
          "SELECT DISTINCT form_id FROM cms_form_submissions WHERE id=ANY($1::varchar[])",
          [ids],
        )
      ).rows.map((row) => row.form_id);
      await client.query(
        "SELECT id FROM cms_forms WHERE id=ANY($1::varchar[]) ORDER BY id FOR UPDATE",
        [parents],
      );
      await client.query(
        "SELECT id FROM cms_form_submissions WHERE id=ANY($1::varchar[]) ORDER BY id FOR UPDATE",
        [ids],
      );
    }
    const rows = (
      await client.query(
        "SELECT s.id,s.data,s.created_at,f.slug,j.id AS job_id FROM cms_form_submissions s JOIN cms_forms f ON f.id=s.form_id LEFT JOIN cms_form_effect_jobs j ON j.submission_id=s.id AND j.deduplication_key=$2 WHERE s.id=ANY($1::varchar[])",
        [ids, effectKey],
      )
    ).rows;
    const items: Item[] = [];
    const snapshots = new Map<string, ReturnType<typeof commercialInquirySnapshot>>();
    for (const requested of request.receipts) {
      const row = rows.find((row) => row.id === requested.submissionId);
      const item: Item = { submissionId: requested.submissionId, status: "missing" };
      if (row) {
        if (row.slug !== "p1-commercial-assessment") item.status = "not_commercial";
        else {
          try {
            if (!row.created_at) throw new Error("Missing acceptance time");
            const inquiry = commercialInquirySnapshot(row.data);
            // Fixed schema field order plus sorted attribution keys makes review hashes deterministic.
            inquiry.attribution = Object.fromEntries(
              Object.entries(inquiry.attribution).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
            );
            item.snapshotSha256 = createHash("sha256")
              .update(
                JSON.stringify({
                  submissionId: row.id,
                  acceptedAt: new Date(row.created_at).toISOString(),
                  formSlug: row.slug,
                  inquiry,
                }),
              )
              .digest("hex");
            snapshots.set(row.id, inquiry);
            item.status = row.job_id ? "existing" : "eligible";
            if (row.job_id) item.jobId = row.job_id;
            if (
              request.mode === "apply" &&
              "expectedSnapshotSha256" in requested &&
              item.snapshotSha256 !== requested.expectedSnapshotSha256
            )
              item.status = "snapshot_changed";
          } catch {
            item.status = "invalid_snapshot";
          }
        }
      }
      items.push(item);
    }
    const rejected = items.some((item) => !["eligible", "existing"].includes(item.status));
    if (request.mode === "apply" && !rejected) {
      for (const item of [...items].sort((a, b) => a.submissionId.localeCompare(b.submissionId))) {
        if (item.status !== "eligible") continue;
        const inserted = await client.query(
          "INSERT INTO cms_form_effect_jobs(submission_id,deduplication_key,payload) VALUES($1,$2,$3) ON CONFLICT(submission_id,deduplication_key) DO NOTHING RETURNING id",
          [
            item.submissionId,
            effectKey,
            JSON.stringify({ kind: effectKey, inquiry: snapshots.get(item.submissionId) }),
          ],
        );
        if (inserted.rowCount) {
          item.status = "enqueued";
          item.jobId = inserted.rows[0].id;
        } else {
          item.status = "existing";
          item.jobId = (
            await client.query(
              "SELECT id FROM cms_form_effect_jobs WHERE submission_id=$1 AND deduplication_key=$2",
              [item.submissionId, effectKey],
            )
          ).rows[0].id;
        }
      }
    }
    const outcome = request.mode === "dry_run" ? "preview" : rejected ? "rejected" : "applied";
    const counts = Object.fromEntries(
      [...new Set(items.map((item) => item.status))].map((status) => [
        status,
        items.filter((item) => item.status === status).length,
      ]),
    );
    if (request.mode === "apply")
      await client.query("INSERT INTO activity_logs(user_id,action,details) VALUES($1,$2,$3)", [
        actorId,
        `commercial_backfill_${outcome}`,
        JSON.stringify({ mode: request.mode, outcome, items, counts }),
      ]);
    await client.query("COMMIT");
    return { mode: request.mode, outcome, items, counts };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
