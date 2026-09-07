import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Actor } from "./access";
import { pool, transaction } from "./database";
import { HttpError, requireRole } from "./policy";
import { prepareAgreementChargeInTransaction } from "./service-agreement.billing";

const kind = "agreement.prepare_charge";
const payloadSchema = z.object({
  version: z.literal(1),
  agreementId: z.string().uuid(),
  source: z.union([
    z.object({ periodStart: z.string().date() }).strict(),
    z.object({ workOrderId: z.string().uuid() }).strict(),
  ]),
}).strict();
type Payload = z.infer<typeof payloadSchema>;
type Family = "fixed_agreements" | "reviewed_work";
const retryMinutes = [1, 5, 15, 60, 240];

function dedupKey(payload: Payload) {
  return "periodStart" in payload.source
    ? `${kind}:${payload.agreementId}:period:${payload.source.periodStart}`
    : `${kind}:${payload.agreementId}:work:${payload.source.workOrderId}`;
}
async function enqueue(c: any, payload: Payload) {
  const inserted = await c.query(
    "INSERT INTO outbox(id,kind,payload,dedup_key) VALUES($1,$2,$3,$4) ON CONFLICT(dedup_key) DO NOTHING RETURNING id",
    [randomUUID(), kind, payload, dedupKey(payload)],
  );
  if (!inserted.rowCount) return 0;
  await c.query("INSERT INTO agreement_preparation_job(job_id) VALUES($1)", [inserted.rows[0].id]);
  return 1;
}

async function startOrReadCycle(c: any, family: Family) {
  // PostgreSQL timestamps carry microseconds while the node pg default parser
  // rounds them through Date milliseconds. Keep cursor values as strings so a
  // row committed in the same millisecond never falls beyond a captured bound.
  const scan = (await c.query(
    `SELECT s.*,
      to_char(s.upper_created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS upper_created_at,
      to_char(s.last_created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS last_created_at
     FROM agreement_preparation_scan s WHERE family=$1 FOR UPDATE SKIP LOCKED`,
    [family],
  )).rows[0];
  if (!scan || (scan.phase === "idle" && new Date(scan.next_cycle_at).getTime() > Date.now())) return null;
  if (scan.phase === "running") return scan;
  const table = family === "fixed_agreements" ? "service_agreement" : "work_order";
  const upper = (await c.query(
    `SELECT id,to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at FROM ${table} ORDER BY created_at DESC,id DESC LIMIT 1`,
  )).rows[0];
  if (!upper) {
    await c.query("UPDATE agreement_preparation_scan SET completed_cycles=completed_cycles+1,last_completed_at=now(),next_cycle_at=now()+interval '60 seconds',last_error_code=NULL WHERE family=$1", [family]);
    return null;
  }
  const snapshot = (await c.query("SELECT (now() AT TIME ZONE 'America/New_York')::date::text AS due_through")).rows[0];
  const cycle = randomUUID();
  await c.query(
    "UPDATE agreement_preparation_scan SET cycle_id=$2,phase='running',cycle_started_at=now(),due_through=$3,upper_created_at=$4::timestamptz,upper_id=$5,last_created_at=NULL,last_id=NULL,pages_completed=0,records_visited=0,jobs_enqueued=0,last_progress_at=now(),last_error_code=NULL WHERE family=$1",
    [family, cycle, snapshot.due_through, upper.created_at, upper.id],
  );
  return { ...scan, cycle_id: cycle, phase: "running", due_through: snapshot.due_through,
    upper_created_at: upper.created_at, upper_id: upper.id, last_created_at: null, last_id: null };
}

async function sourcePage(c: any, family: Family, scan: any) {
  const table = family === "fixed_agreements" ? "service_agreement" : "work_order";
  const limit = family === "fixed_agreements" ? 1 : 100;
  return (await c.query(
    `SELECT id,to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at
     FROM ${table}
     WHERE ($1::timestamptz IS NULL OR (created_at,id)>($1::timestamptz,$2::uuid))
       AND (created_at,id)<=($3::timestamptz,$4::uuid)
     ORDER BY created_at,id LIMIT $5`,
    [scan.last_created_at, scan.last_id, scan.upper_created_at, scan.upper_id, limit],
  )).rows;
}

async function enqueueForFixedAgreement(c: any, agreementId: string, dueThrough: string) {
  const agreement = (await c.query(
    "SELECT id,billing_mode,status FROM service_agreement WHERE id=$1",
    [agreementId],
  )).rows[0];
  if (!agreement || agreement.billing_mode !== "fixed_monthly" || !["active", "cancelled"].includes(agreement.status)) return 0;
  const periods = (await c.query(
    "SELECT starts_on::text FROM fixed_charge_period WHERE agreement_id=$1 AND active=true AND starts_on<=$2 ORDER BY starts_on LIMIT 120",
    [agreementId, dueThrough],
  )).rows;
  let count = 0;
  for (const period of periods)
    count += await enqueue(c, { version: 1, agreementId, source: { periodStart: period.starts_on } });
  return count;
}
async function enqueueForReviewedWork(c: any, workId: string) {
  const work = (await c.query(
    "SELECT id,property_id,recurring_service_id,occurrence_date::text,status FROM work_order WHERE id=$1",
    [workId],
  )).rows[0];
  if (!work || work.status !== "reviewed" || !work.recurring_service_id || !work.occurrence_date) return 0;
  const agreement = (await c.query(
    `SELECT id FROM service_agreement WHERE property_id=$1 AND recurring_service_id=$2
       AND billing_mode='per_visit' AND status IN ('active','cancelled')
       AND $3::date BETWEEN starts_on AND ends_on AND $3::date>=activated_on
       AND (cancellation_effective_on IS NULL OR $3::date<cancellation_effective_on)
       ORDER BY created_at,id LIMIT 1`,
    [work.property_id, work.recurring_service_id, work.occurrence_date],
  )).rows[0];
  if (!agreement) return 0;
  return enqueue(c, { version: 1, agreementId: agreement.id, source: { workOrderId: work.id } });
}

async function scanFamily(family: Family) {
  return transaction(async (c) => {
    await c.query("SET LOCAL statement_timeout='2s'");
    const scan = await startOrReadCycle(c, family);
    if (!scan) return 0;
    const sources = await sourcePage(c, family, scan);
    if (!sources.length) {
      await c.query("UPDATE agreement_preparation_scan SET phase='idle',completed_cycles=completed_cycles+1,last_completed_at=now(),next_cycle_at=now()+interval '60 seconds',last_progress_at=now(),last_error_code=NULL WHERE family=$1", [family]);
      return 0;
    }
    let count = 0;
    for (const source of sources)
      count += family === "fixed_agreements"
        ? await enqueueForFixedAgreement(c, source.id, scan.due_through)
        : await enqueueForReviewedWork(c, source.id);
    const last = sources.at(-1);
    await c.query(
      "UPDATE agreement_preparation_scan SET last_created_at=$2::timestamptz,last_id=$3,pages_completed=pages_completed+1,records_visited=records_visited+$4,jobs_enqueued=jobs_enqueued+$5,last_progress_at=now(),last_error_code=NULL WHERE family=$1",
      [family, last.created_at, last.id, sources.length, count],
    );
    return count;
  });
}

export async function scanAgreementPreparation() {
  const [fixed, work] = await Promise.all([scanFamily("fixed_agreements"), scanFamily("reviewed_work")]);
  return fixed + work;
}

type Claim = { id: string; payload: unknown; attempt: number; revision: number };
async function reclaimStale() {
  await transaction(async (c) => {
    const rows = await c.query(
      `SELECT o.id FROM outbox o JOIN agreement_preparation_job j ON j.job_id=o.id
       WHERE o.kind=$1 AND o.status='processing' AND o.locked_at<now()-interval '5 minutes'
       FOR UPDATE OF o SKIP LOCKED`, [kind],
    );
    for (const row of rows.rows)
      await c.query("UPDATE outbox SET status='pending',locked_at=NULL,available_at=now(),last_error='Preparation lease expired and was reclaimed' WHERE id=$1", [row.id]);
  });
}
async function claim(): Promise<Claim | null> {
  await reclaimStale();
  return transaction(async (c) => {
    const row = (await c.query(
      `SELECT o.id,o.payload,o.attempts,j.revision FROM outbox o JOIN agreement_preparation_job j ON j.job_id=o.id
       WHERE o.kind=$1 AND o.status='pending' AND o.available_at<=now()
       ORDER BY o.created_at FOR UPDATE OF o,j SKIP LOCKED LIMIT 1`, [kind],
    )).rows[0];
    if (!row) return null;
    const attempt = Number(row.attempts) + 1, revision = Number(row.revision) + 1;
    await c.query("UPDATE outbox SET status='processing',locked_at=now(),attempts=$2 WHERE id=$1", [row.id, attempt]);
    await c.query("UPDATE agreement_preparation_job SET revision=$2,attempts_in_epoch=attempts_in_epoch+1,updated_at=now() WHERE job_id=$1", [row.id, revision]);
    return { id: row.id, payload: row.payload, attempt, revision };
  });
}
function failure(error: unknown) {
  if (error instanceof z.ZodError) return { code: "invalid_payload", message: "Stored preparation job has an invalid payload", stable: true };
  if (error instanceof HttpError) return { code: "eligibility_changed", message: error.message, stable: true };
  return { code: "transient_exhausted", message: "Preparation failed; worker will retry or require review", stable: false };
}
async function recordFailure(claimed: Claim, error: unknown) {
  const result = failure(error);
  await transaction(async (c) => {
    const row = (await c.query("SELECT o.status,o.attempts,j.revision,j.attempts_in_epoch FROM outbox o JOIN agreement_preparation_job j ON j.job_id=o.id WHERE o.id=$1 FOR UPDATE OF o,j", [claimed.id])).rows[0];
    if (!row || row.status !== "processing" || Number(row.attempts) !== claimed.attempt || Number(row.revision) !== claimed.revision) return;
    const exhausted = Number(row.attempts_in_epoch) >= 6;
    if (result.stable || exhausted) {
      await c.query("UPDATE outbox SET status='failed',locked_at=NULL,last_error=$2 WHERE id=$1", [claimed.id, result.message]);
      await c.query("UPDATE agreement_preparation_job SET failure_code=$2,updated_at=now() WHERE job_id=$1", [claimed.id, result.stable ? result.code : "transient_exhausted"]);
      return;
    }
    const delay = retryMinutes[Math.max(0, Number(row.attempts_in_epoch) - 1)];
    await c.query("UPDATE outbox SET status='pending',locked_at=NULL,available_at=now()+$2::interval,last_error=$3 WHERE id=$1", [claimed.id, `${delay} minutes`, result.message]);
  });
}
async function process(claimed: Claim) {
  try {
    const payload = payloadSchema.parse(claimed.payload);
    return await transaction(async (c) => {
      const current = (await c.query("SELECT o.status,o.attempts,j.revision FROM outbox o JOIN agreement_preparation_job j ON j.job_id=o.id WHERE o.id=$1 FOR UPDATE OF o,j", [claimed.id])).rows[0];
      if (!current || current.status !== "processing" || Number(current.attempts) !== claimed.attempt || Number(current.revision) !== claimed.revision) return false;
      const result = await prepareAgreementChargeInTransaction(c, { kind: "agreement_worker", jobId: claimed.id, attempt: claimed.attempt }, payload.agreementId, payload.source, false);
      if (!("receipt" in result)) throw new Error("Expected preparation receipt");
      await c.query("UPDATE outbox SET status='sent',locked_at=NULL,last_error=NULL WHERE id=$1", [claimed.id]);
      await c.query("UPDATE agreement_preparation_job SET charge_id=$2,completed_at=now(),failure_code=NULL,updated_at=now() WHERE job_id=$1", [claimed.id, result.receipt.id]);
      await c.query("INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,NULL,$2,$3,$4)", [randomUUID(), result.created ? "agreement.preparation_completed" : "agreement.preparation_acknowledged", payload.agreementId, { origin: "agreement_worker", jobId: claimed.id, attempt: claimed.attempt, chargeId: result.receipt.id }]);
      return true;
    });
  } catch (error) {
    await recordFailure(claimed, error);
    return false;
  }
}
export async function runAgreementPreparationOnce() {
  const claimed = await claim();
  if (!claimed) return false;
  return process(claimed);
}
export async function agreementPreparationHealth() {
  const [jobs, scans] = await Promise.all([
    pool.query(`SELECT o.status,COUNT(*)::int AS count FROM outbox o WHERE o.kind=$1 GROUP BY o.status`, [kind]),
    pool.query("SELECT family,phase,last_progress_at,last_completed_at,last_error_code FROM agreement_preparation_scan ORDER BY family"),
  ]);
  return { jobs: jobs.rows, scans: scans.rows };
}

const jobStatus = z.enum(["pending", "processing", "sent", "failed"]);
const listInput = z.object({
  agreementId: z.string().uuid().optional(), status: jobStatus.optional(),
  after: z.string().optional(), limit: z.coerce.number().int().min(1).max(100).default(25),
}).strict();
const retryPreviewInput = z.object({ expectedRevision: z.coerce.number().int().positive() }).strict();
const retryInput = z.object({
  operationId: z.string().uuid(), expectedRevision: z.number().int().positive(),
  eligibilityFingerprint: z.string().regex(/^[0-9a-f]{64}$/), reason: z.string().trim().min(1).max(2000),
}).strict();
const office = ["owner", "manager", "finance"] as const;
function authorize(actor: Actor) { requireRole(actor.role, [...office]); }
function encodeCursor(value: unknown) { return Buffer.from(JSON.stringify(value)).toString("base64url"); }
function parseCursor(value: string | undefined, agreementId: string | undefined, status: string | undefined) {
  if (!value) return null;
  try {
    const parsed = z.object({ version: z.literal(1), agreementId: z.string().uuid().nullable(), status: jobStatus.nullable(), createdAt: z.string().datetime({ precision: 6 }), jobId: z.string().uuid() }).strict().parse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    if (parsed.agreementId !== (agreementId || null) || parsed.status !== (status || null)) throw Error();
    return parsed;
  } catch { throw new HttpError(400, "Invalid agreement preparation cursor"); }
}
function publicJob(row: any) {
  let source: { periodStart?: string; workOrderId?: string } | null = null;
  let agreementId: string | null = null;
  try {
    const payload = payloadSchema.parse(row.payload);
    agreementId = payload.agreementId;
    source = payload.source;
  } catch {}
  return {
    jobId: row.id, agreementId, source, status: row.status, failureCode: row.failure_code,
    revision: Number(row.revision), retryEpoch: Number(row.retry_epoch), attempts: Number(row.attempts),
    attemptsInEpoch: Number(row.attempts_in_epoch), availableAt: row.available_at,
    createdAt: row.created_at, completedAt: row.completed_at, chargeId: row.charge_id,
  };
}
async function lockedJob(c: any, jobId: string) {
  const row = (await c.query(
    `SELECT o.*,j.revision,j.retry_epoch,j.attempts_in_epoch,j.failure_code,j.charge_id,j.completed_at
       FROM outbox o JOIN agreement_preparation_job j ON j.job_id=o.id
       WHERE o.id=$1 AND o.kind=$2 FOR UPDATE OF o,j`, [jobId, kind],
  )).rows[0];
  if (!row) throw new HttpError(404, "Agreement preparation job not found");
  const payload = payloadSchema.parse(row.payload);
  return { row, payload };
}
async function eligibility(c: any, actor: Actor, row: any, payload: Payload) {
  const source = await prepareAgreementChargeInTransaction(c, { kind: "staff", actor }, payload.agreementId, payload.source, true);
  if ("receipt" in source) throw new Error("Expected preparation preview");
  const agreement = (await c.query("SELECT version,estimate_revision FROM service_agreement WHERE id=$1", [payload.agreementId])).rows[0];
  const fingerprint = createHash("sha256").update(JSON.stringify({
    jobId: row.id, revision: Number(row.revision), payload, agreementVersion: agreement?.version,
    estimateRevision: agreement?.estimate_revision, preview: source,
  })).digest("hex");
  return { source, fingerprint };
}
export async function listAgreementPreparationJobs(actor: Actor, input: unknown) {
  authorize(actor);
  const query = listInput.parse(input), cursor = parseCursor(query.after, query.agreementId, query.status);
  const rows = (await pool.query(
    `SELECT o.*,j.revision,j.retry_epoch,j.attempts_in_epoch,j.failure_code,j.charge_id,
       to_char(j.completed_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS completed_at,
       to_char(o.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at,
       to_char(o.available_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS available_at
       FROM outbox o JOIN agreement_preparation_job j ON j.job_id=o.id
       WHERE o.kind=$1 AND ($2::uuid IS NULL OR o.payload->>'agreementId'=$2::text)
       AND ($3::text IS NULL OR o.status=$3)
       AND ($4::timestamptz IS NULL OR (o.created_at,o.id)<($4::timestamptz,$5::uuid))
       ORDER BY o.created_at DESC,o.id DESC LIMIT $6`,
    [kind, query.agreementId || null, query.status || null, cursor?.createdAt || null, cursor?.jobId || null, query.limit + 1],
  )).rows;
  const last = rows[query.limit - 1];
  return { items: rows.slice(0, query.limit).map(publicJob), nextCursor: rows.length > query.limit && last
    ? encodeCursor({ version: 1, agreementId: query.agreementId || null, status: query.status || null, createdAt: last.created_at, jobId: last.id }) : null };
}
export async function readAgreementPreparationJob(actor: Actor, id: string) {
  authorize(actor);
  return transaction(async (c) => {
    const { row } = await lockedJob(c, id);
    return publicJob({ ...row, created_at: row.created_at.toISOString(), available_at: row.available_at.toISOString(), completed_at: row.completed_at?.toISOString() || null });
  });
}
export async function previewAgreementPreparationRetry(actor: Actor, id: string, input: unknown) {
  authorize(actor);
  const body = retryPreviewInput.parse(input);
  return transaction(async (c) => {
    const { row, payload } = await lockedJob(c, id);
    if (Number(row.revision) !== body.expectedRevision) throw new HttpError(409, "Preparation job changed; reload before retrying");
    if (row.status !== "failed") throw new HttpError(409, "Only failed preparation jobs can be retried");
    try {
      const result = await eligibility(c, actor, row, payload);
      return { revision: Number(row.revision), eligibilityFingerprint: result.fingerprint,
        eligible: !result.source.alreadyPrepared, alreadyPrepared: result.source.alreadyPrepared,
        reasonCode: result.source.alreadyPrepared ? "already_prepared" : null,
        sourceReceipt: result.source.billingDraftId, nextRetryEpoch: Number(row.retry_epoch) + 1 };
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      const fingerprint = createHash("sha256").update(JSON.stringify({ jobId: row.id, revision: Number(row.revision), payload, error: error.message })).digest("hex");
      return { revision: Number(row.revision), eligibilityFingerprint: fingerprint, eligible: false, alreadyPrepared: false,
        reasonCode: "eligibility_changed", sourceReceipt: null, nextRetryEpoch: Number(row.retry_epoch) + 1 };
    }
  });
}
export async function retryAgreementPreparation(actor: Actor, id: string, input: unknown) {
  authorize(actor);
  const body = retryInput.parse(input);
  const request = createHash("sha256").update(JSON.stringify({ actorId: actor.id, jobId: id, ...body })).digest("hex");
  return transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", ["agreement-preparation-retry:" + body.operationId]);
    const { row, payload } = await lockedJob(c, id);
    const historical = (await c.query("SELECT * FROM agreement_preparation_retry_event WHERE operation_id=$1", [body.operationId])).rows[0];
    if (historical) {
      if (historical.request_sha256 !== request || historical.actor_id !== actor.id || historical.job_id !== id)
        throw new HttpError(409, "This operation ID was used for a different preparation retry");
      return { created: false, operationId: historical.operation_id, jobId: id, resultingRevision: Number(historical.resulting_revision), retryEpoch: Number(historical.retry_epoch), recordedAt: historical.created_at };
    }
    if (row.status !== "failed" || Number(row.revision) !== body.expectedRevision)
      throw new HttpError(409, "Preparation job changed; reload before retrying");
    const preview = await eligibility(c, actor, row, payload);
    if (preview.fingerprint !== body.eligibilityFingerprint || preview.source.alreadyPrepared || !preview.source.amountCents)
      throw new HttpError(409, "Preparation eligibility changed; refresh the retry preview");
    const revision = Number(row.revision) + 1, epoch = Number(row.retry_epoch) + 1;
    const event = (await c.query(
      "INSERT INTO agreement_preparation_retry_event(operation_id,job_id,request_sha256,resulting_revision,retry_epoch,actor_id,reason) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING created_at",
      [body.operationId, id, request, revision, epoch, actor.id, body.reason],
    )).rows[0];
    await c.query("UPDATE outbox SET status='pending',available_at=now(),locked_at=NULL,last_error=NULL WHERE id=$1", [id]);
    await c.query("UPDATE agreement_preparation_job SET revision=$2,retry_epoch=$3,attempts_in_epoch=0,failure_code=NULL,updated_at=now() WHERE job_id=$1", [id, revision, epoch]);
    await c.query("INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'agreement.preparation_retry_requested',$3,$4)", [randomUUID(), actor.id, payload.agreementId, { operationId: body.operationId, jobId: id, reason: body.reason }]);
    return { created: true, operationId: body.operationId, jobId: id, resultingRevision: revision, retryEpoch: epoch, recordedAt: event.created_at };
  });
}
