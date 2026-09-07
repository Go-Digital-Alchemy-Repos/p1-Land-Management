import { randomUUID } from "node:crypto";
import type pg from "pg";
import { z } from "zod";
import type { Actor } from "./access";
import { transaction } from "./database";
import { HttpError, requireRole } from "./policy";
import { prepareChargeInput } from "./service-agreement.contract";
import { lockedAgreement, localToday, billedTotal, agreementAudit } from "./service-agreement.persistence";

export const agreementChargeReceipt = z.object({
  id: z.string().uuid(), agreementId: z.string().uuid(), billingDraftId: z.string().uuid(),
  sourceKey: z.string(), amountCents: z.number().int().positive().max(10_000_000_000),
}).strict();
export type ChargePrincipal =
  | { kind: "staff"; actor: Actor }
  | { kind: "agreement_worker"; jobId: string; attempt: number };
function receipt(row: Record<string, unknown>) {
  return agreementChargeReceipt.parse({ id: row.id, agreementId: row.agreement_id,
    billingDraftId: row.billing_draft_id, sourceKey: row.source_key, amountCents: Number(row.amount_cents) });
}
export const chargePreview = z.object({
  agreementId: z.string().uuid(), sourceKey: z.string(), amountCents: z.number().int().positive(),
  alreadyPrepared: z.boolean(), billingDraftId: z.string().uuid().nullable(),
  approvedCents: z.number().int().nonnegative(), billedCents: z.number().int().nonnegative(),
  remainingCents: z.number().int().nonnegative(),
}).strict();
type ChargeResult = z.infer<typeof chargePreview> | { receipt: z.infer<typeof agreementChargeReceipt>; created: boolean };

// A worker acquires its outbox row before calling this function. This shared
// implementation deliberately never takes an outbox lock, preserving the
// source -> agreement lock order used by manual financial preparation.
export async function prepareAgreementChargeInTransaction(
  c: pg.PoolClient, principal: ChargePrincipal, agreementId: string, input: unknown, preview: boolean,
): Promise<ChargeResult> {
  if (principal.kind === "staff") requireRole(principal.actor.role, ["owner", "manager", "finance"]);
  if (preview && principal.kind !== "staff") throw new Error("Worker charge preparation cannot preview");
  const b = prepareChargeInput.parse(input);
  const sourceKey = "periodStart" in b ? "period:" + b.periodStart : "work:" + b.workOrderId;
  await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", ["agreement-charge:" + agreementId + ":" + sourceKey]);
  const { agreement, estimate } = await lockedAgreement(c, agreementId);
  const prior = (await c.query("SELECT * FROM agreement_charge WHERE agreement_id=$1 AND source_key=$2", [agreementId, sourceKey])).rows[0];
  if (prior) {
    if (!preview) return { receipt: receipt(prior), created: false };
    const billed = await billedTotal(c, estimate.id);
    return chargePreview.parse({ agreementId, sourceKey, amountCents: Number(prior.amount_cents), alreadyPrepared: true,
      billingDraftId: prior.billing_draft_id, approvedCents: Number(estimate.amount_cents), billedCents: billed,
      remainingCents: Math.max(0, Number(estimate.amount_cents) - billed) });
  }
  if (agreement.status === "draft") throw new HttpError(409, "Activate the reviewed agreement before preparing charges");
  const today = await localToday(c);
  let periodId: string | null = null, workId: string | null = null, amount: number, label: string;
  if ("periodStart" in b) {
    if (agreement.billing_mode !== "fixed_monthly") throw new HttpError(409, "This agreement bills reviewed visits");
    const period = (await c.query("SELECT *,starts_on::text,ends_on::text FROM fixed_charge_period WHERE agreement_id=$1 AND starts_on=$2 AND active=true FOR UPDATE", [agreementId, b.periodStart])).rows[0];
    if (!period) throw new HttpError(404, "Agreement charge period not found");
    if (period.starts_on < agreement.starts_on || period.ends_on > agreement.ends_on || period.starts_on < agreement.activated_on)
      throw new HttpError(409, "Period is outside activated authorization");
    if (period.starts_on > today) throw new HttpError(409, "Charge period is not yet due");
    if (agreement.cancellation_effective_on && period.ends_on >= agreement.cancellation_effective_on)
      throw new HttpError(409, period.starts_on < agreement.cancellation_effective_on
        ? "Cancellation affects part of this period; explicit financial review required" : "Period is after cancellation");
    periodId = period.id; amount = Number(period.amount_cents); label = period.starts_on + " – " + period.ends_on;
  } else {
    if (agreement.billing_mode !== "per_visit") throw new HttpError(409, "This agreement bills explicit monthly periods");
    const work = (await c.query("SELECT *,occurrence_date::text FROM work_order WHERE id=$1 FOR UPDATE", [b.workOrderId])).rows[0];
    if (!work || work.property_id !== agreement.property_id || work.recurring_service_id !== agreement.recurring_service_id)
      throw new HttpError(404, "Work is not part of this agreement recurrence");
    if ((await c.query("SELECT id FROM agreement_charge WHERE work_order_id=$1", [work.id])).rowCount)
      throw new HttpError(409, "This visit already has an agreement charge; financial review is required before reassignment");
    if (work.status !== "reviewed") throw new HttpError(409, "Only manager-reviewed visits may be billed");
    if (!work.occurrence_date || work.occurrence_date < agreement.starts_on || work.occurrence_date > agreement.ends_on ||
      work.occurrence_date < agreement.activated_on || work.occurrence_date > today ||
      (agreement.cancellation_effective_on && work.occurrence_date >= agreement.cancellation_effective_on))
      throw new HttpError(409, "Visit occurrence is outside eligible agreement dates");
    workId = work.id; amount = Number(agreement.unit_amount_cents); label = work.occurrence_date + " · " + work.title;
  }
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 10_000_000_000) throw new HttpError(409, "Charge amount requires review");
  const billed = await billedTotal(c, estimate.id);
  if (billed + amount > Number(estimate.amount_cents)) throw new HttpError(409, "Charge exceeds the remaining approved estimate; financial review required");
  if (preview) return chargePreview.parse({ agreementId, sourceKey, amountCents: amount, alreadyPrepared: false,
    billingDraftId: null, approvedCents: Number(estimate.amount_cents), billedCents: billed,
    remainingCents: Number(estimate.amount_cents) - billed });
  const draftId = randomUUID(), chargeId = randomUUID();
  await c.query("INSERT INTO billing_draft(id,property_id,estimate_id,title,amount_cents,kind,status) VALUES($1,$2,$3,$4,$5,'service','draft')",
    [draftId, agreement.property_id, estimate.id, agreement.title + " · " + label, amount]);
  const row = (await c.query("INSERT INTO agreement_charge(id,agreement_id,source_key,fixed_period_id,work_order_id,billing_draft_id,amount_cents,prepared_by,prepared_job_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
    [chargeId, agreementId, sourceKey, periodId, workId, draftId, amount,
      principal.kind === "staff" ? principal.actor.id : null, principal.kind === "agreement_worker" ? principal.jobId : null])).rows[0];
  const details = { sourceKey, billingDraftId: draftId, amountCents: amount, estimateId: estimate.id, estimateRevision: agreement.estimate_revision };
  await agreementAudit(c, principal.kind === "staff" ? principal.actor.id : null, "agreement.charge_prepared", agreementId,
    principal.kind === "staff" ? details : { ...details, origin: "agreement_worker", jobId: principal.jobId, attempt: principal.attempt });
  return { receipt: receipt(row), created: true };
}
export async function prepareAgreementCharge(a: Actor, id: string, input: unknown) {
  return transaction(async (c) => {
    const result = await prepareAgreementChargeInTransaction(c, { kind: "staff", actor: a }, id, input, false);
    if ("receipt" in result) return result.receipt;
    throw new Error("Expected a charge receipt");
  });
}
export async function previewAgreementCharge(a: Actor, id: string, input: unknown) {
  return transaction(async (c) => {
    const result = await prepareAgreementChargeInTransaction(c, { kind: "staff", actor: a }, id, input, true);
    if (!("receipt" in result)) return result;
    throw new Error("Expected a charge preview");
  });
}
