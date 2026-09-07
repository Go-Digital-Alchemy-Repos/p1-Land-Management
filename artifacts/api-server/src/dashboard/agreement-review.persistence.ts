import { createHash } from "node:crypto";
import type pg from "pg";
import { HttpError } from "./policy";
import { lockedAgreement } from "./service-agreement.persistence";
import {
  currentReview,
  reviewReceipt,
  reviewSnapshot,
} from "./agreement-review.contract";
// Stable recursive JSON ordering also covers provider payloads stored as jsonb.
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value))
    return "[" + value.map(canonicalJson).join(",") + "]";
  if (value !== null && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(
          (k) =>
            JSON.stringify(k) +
            ":" +
            canonicalJson((value as Record<string, unknown>)[k]),
        )
        .join(",") +
      "}"
    );
  const result = JSON.stringify(value);
  if (result === undefined)
    throw new Error("Review snapshot contains an undefined value");
  return result;
}
export const fingerprint = (value: unknown) =>
  createHash("sha256").update(canonicalJson(value)).digest("hex");
export function eventReceipt(row: Record<string, any>) {
  return reviewReceipt.parse({
    eventId: row.id,
    chargeId: row.charge_id,
    reviewVersion: row.review_version,
    outcome: row.outcome,
    recordedAt: row.recorded_at,
  });
}
export const eventTimestamp =
  "to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"')";
export async function lockedChargeReview(c: pg.PoolClient, chargeId: string) {
  const identity = (
    await c.query(
      "SELECT agreement_id,source_key FROM agreement_charge WHERE id=$1",
      [chargeId],
    )
  ).rows[0];
  if (!identity) throw new HttpError(404, "Agreement charge not found");
  await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    "agreement-charge:" + identity.agreement_id + ":" + identity.source_key,
  ]);
  const { agreement } = await lockedAgreement(c, identity.agreement_id);
  const charge = (
    await c.query(
      "SELECT * FROM agreement_charge WHERE id=$1 AND agreement_id=$2 AND source_key=$3 FOR UPDATE",
      [chargeId, identity.agreement_id, identity.source_key],
    )
  ).rows[0];
  if (!charge) throw new HttpError(409, "Agreement charge identity changed");
  const draft = (
    await c.query("SELECT * FROM billing_draft WHERE id=$1 FOR UPDATE", [
      charge.billing_draft_id,
    ])
  ).rows[0];
  if (
    !draft ||
    draft.property_id !== agreement.property_id ||
    draft.estimate_id !== agreement.estimate_id
  )
    throw new HttpError(
      409,
      "Agreement charge billing references require review",
    );
  let affected = false;
  if (agreement.cancellation_effective_on) {
    if (charge.fixed_period_id) {
      const period = (
        await c.query(
          "SELECT ends_on::text FROM fixed_charge_period WHERE id=$1 AND agreement_id=$2",
          [charge.fixed_period_id, agreement.id],
        )
      ).rows[0];
      if (!period) throw new HttpError(409, "Charge period requires review");
      affected = period.ends_on >= agreement.cancellation_effective_on;
    } else {
      const work = (
        await c.query(
          "SELECT occurrence_date::text FROM work_order WHERE id=$1",
          [charge.work_order_id],
        )
      ).rows[0];
      if (!work?.occurrence_date)
        throw new HttpError(409, "Charge occurrence requires review");
      affected = work.occurrence_date >= agreement.cancellation_effective_on;
    }
  }
  const snapshot = reviewSnapshot.parse({
    agreement: {
      id: agreement.id,
      version: agreement.version,
      cancellationDate: agreement.cancellation_effective_on,
      cancellationReason: agreement.cancellation_reason,
    },
    charge: {
      id: charge.id,
      sourceKey: charge.source_key,
      amountCents: Number(charge.amount_cents),
    },
    draft: {
      id: draft.id,
      propertyId: draft.property_id,
      estimateId: draft.estimate_id,
      title: draft.title,
      kind: draft.kind,
      amountCents: Number(draft.amount_cents),
      status: draft.status,
      postingRequestId: draft.posting_request_id,
      postingPayloadSha256:
        draft.posting_payload === null
          ? null
          : fingerprint(draft.posting_payload),
      quickbooksId: draft.quickbooks_id,
      balanceCents:
        draft.balance_cents === null ? null : Number(draft.balance_cents),
      ownershipVerified: draft.ownership_verified,
    },
  });
  const hash = fingerprint(snapshot);
  const latest = (
    await c.query(
      `SELECT *,${eventTimestamp} AS recorded_at FROM agreement_charge_review_event WHERE charge_id=$1 ORDER BY review_version DESC LIMIT 1`,
      [chargeId],
    )
  ).rows[0];
  const correctionPending = (
    await c.query(
      "SELECT EXISTS(SELECT 1 FROM agreement_charge_review_event WHERE charge_id=$1 AND outcome='correction_required') AS pending",
      [chargeId],
    )
  ).rows[0].pending as boolean;
  const state = correctionPending
    ? "correction_required"
    : !latest
      ? "unreviewed"
      : latest.snapshot_sha256 === hash
        ? "kept_due"
        : "stale_review";
  const postingBlockReason = correctionPending
    ? "A financial correction is still required. Posting is blocked."
    : affected && state !== "kept_due"
      ? "Review this cancellation-affected charge before posting."
      : null;
  const review = currentReview.parse({
    chargeId,
    agreementId: agreement.id,
    reviewVersion: latest?.review_version || 0,
    latestReceipt: latest ? eventReceipt(latest) : null,
    correctionPending,
    cancellationVersion: agreement.version,
    snapshot,
    snapshotSha256: hash,
    allowedOutcomes: affected
      ? correctionPending
        ? ["correction_required"]
        : ["keep_due", "correction_required"]
      : [],
    postingBlockReason,
    reviewState: state,
  });
  return { agreement, charge, draft, affected, review };
}
// Call before taking any operational-parent or draft lock. Existing standalone
// drafts never gain an agreement association through an application mutation.
export async function guardAgreementPosting(c: pg.PoolClient, draftId: string) {
  const charge = (
    await c.query("SELECT id FROM agreement_charge WHERE billing_draft_id=$1", [
      draftId,
    ])
  ).rows[0];
  if (!charge) return;
  const context = await lockedChargeReview(c, charge.id);
  if (context.draft.status !== "posted" && context.review.postingBlockReason)
    throw new HttpError(409, context.review.postingBlockReason);
}
