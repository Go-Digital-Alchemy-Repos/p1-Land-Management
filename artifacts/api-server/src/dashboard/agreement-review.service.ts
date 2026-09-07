import { z } from "zod";
import type { Actor } from "./access";
import { transaction } from "./database";
import { HttpError, requireRole } from "./policy";
import {
  agreementAudit,
  lockedAgreement,
} from "./service-agreement.persistence";
import {
  reviewInput,
  recordReviewInput,
  previewReview,
  historyQuery,
  reviewHistoryPage,
  chargeListQuery,
  chargeHistoryPage,
} from "./agreement-review.contract";
import {
  lockedChargeReview,
  eventReceipt,
  eventTimestamp,
  fingerprint,
} from "./agreement-review.persistence";
const authorize = (a: Actor) =>
  requireRole(a.role, ["owner", "manager", "finance"]);
export async function readAgreementChargeReview(a: Actor, id: string) {
  authorize(a);
  return transaction(async (c) => (await lockedChargeReview(c, id)).review);
}
function validateReview(
  context: Awaited<ReturnType<typeof lockedChargeReview>>,
  body: z.infer<typeof reviewInput>,
) {
  const current = context.review;
  if (!context.affected)
    throw new HttpError(409, "This charge is not affected by cancellation");
  if (
    body.expectedReviewVersion !== current.reviewVersion ||
    body.cancellationVersion !== current.cancellationVersion ||
    body.snapshotSha256 !== current.snapshotSha256
  )
    throw new HttpError(
      409,
      "The review or financial snapshot changed. Compare the current state before submitting again.",
    );
  if (!current.allowedOutcomes.includes(body.outcome))
    throw new HttpError(
      409,
      "A correction-required decision cannot be closed by keeping the charge due",
    );
}
export async function previewAgreementChargeReview(
  a: Actor,
  id: string,
  input: unknown,
) {
  authorize(a);
  const b = reviewInput.parse(input);
  return transaction(async (c) => {
    const ctx = await lockedChargeReview(c, id);
    validateReview(ctx, b);
    return previewReview.parse({
      current: ctx.review,
      wouldResolveSnapshot: b.outcome === "keep_due",
      postingWouldRemainBlocked: b.outcome === "correction_required",
    });
  });
}
export async function recordAgreementChargeReview(
  a: Actor,
  id: string,
  input: unknown,
) {
  authorize(a);
  const b = recordReviewInput.parse(input);
  const requestHash = fingerprint({ actorId: a.id, chargeId: id, ...b });
  return transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      "agreement-review-operation:" + b.operationId,
    ]);
    const ctx = await lockedChargeReview(c, id);
    const prior = (
      await c.query(
        `SELECT *,${eventTimestamp} AS recorded_at FROM agreement_charge_review_event WHERE id=$1`,
        [b.operationId],
      )
    ).rows[0];
    if (prior) {
      if (
        prior.request_sha256 !== requestHash ||
        prior.actor_id !== a.id ||
        prior.charge_id !== id
      )
        throw new HttpError(
          409,
          "This operation ID was used for a different review",
        );
      return { created: false, receipt: eventReceipt(prior) };
    }
    validateReview(ctx, b);
    const row = (
      await c.query(
        `INSERT INTO agreement_charge_review_event(id,charge_id,review_version,outcome,cancellation_version,snapshot,snapshot_sha256,request_sha256,reason,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *,${eventTimestamp} AS recorded_at`,
        [
          b.operationId,
          id,
          ctx.review.reviewVersion + 1,
          b.outcome,
          b.cancellationVersion,
          ctx.review.snapshot,
          ctx.review.snapshotSha256,
          requestHash,
          b.reason,
          a.id,
        ],
      )
    ).rows[0];
    await agreementAudit(
      c,
      a.id,
      "agreement.charge_reviewed",
      ctx.agreement.id,
      {
        eventId: row.id,
        chargeId: id,
        reviewVersion: row.review_version,
        outcome: b.outcome,
        snapshotSha256: ctx.review.snapshotSha256,
      },
    );
    return { created: true, receipt: eventReceipt(row) };
  });
}
export async function listAgreementChargeReviews(
  a: Actor,
  id: string,
  input: unknown,
) {
  authorize(a);
  const b = historyQuery.parse(input);
  return transaction(async (c) => {
    await lockedChargeReview(c, id);
    const rows = (
      await c.query(
        `SELECT *,${eventTimestamp} AS recorded_at FROM agreement_charge_review_event WHERE charge_id=$1 AND review_version>$2 ORDER BY review_version LIMIT $3`,
        [id, b.afterVersion, b.limit + 1],
      )
    ).rows;
    return reviewHistoryPage.parse({
      items: rows.slice(0, b.limit).map((row) => ({
        ...eventReceipt(row),
        reason: row.reason,
        reviewerId: row.actor_id,
        snapshot: row.snapshot,
      })),
      nextVersion:
        rows.length > b.limit ? rows[b.limit - 1].review_version : null,
    });
  });
}
const cursorSchema = z
  .object({
    version: z.literal(1),
    agreementId: z.string().uuid(),
    createdAt: z.string().datetime({ precision: 6 }),
    chargeId: z.string().uuid(),
  })
  .strict();
export async function listAgreementCharges(
  a: Actor,
  id: string,
  input: unknown,
) {
  authorize(a);
  const b = chargeListQuery.parse(input);
  let cursor: z.infer<typeof cursorSchema> | null = null;
  if (b.after) {
    try {
      if (
        !/^[A-Za-z0-9_-]+$/.test(b.after) ||
        Buffer.from(b.after, "base64url").toString("base64url") !== b.after
      )
        throw Error();
      cursor = cursorSchema.parse(
        JSON.parse(Buffer.from(b.after, "base64url").toString("utf8")),
      );
      if (cursor.agreementId !== id) throw Error();
    } catch {
      throw new HttpError(400, "Invalid agreement charge cursor");
    }
  }
  const rows = await transaction(async (c) => {
    await lockedAgreement(c, id);
    return (
      await c.query(
        `SELECT *,${eventTimestamp} AS recorded_at FROM agreement_charge WHERE agreement_id=$1 AND ($2::timestamptz IS NULL OR (created_at,id)<($2::timestamptz,$3::uuid)) ORDER BY created_at DESC,id DESC LIMIT $4`,
        [id, cursor?.createdAt || null, cursor?.chargeId || null, b.limit + 1],
      )
    ).rows;
  });
  // Separate transactions retain source-before-agreement lock order across
  // charges: holding one agreement while taking the next source could deadlock.
  const items = [];
  for (const row of rows.slice(0, b.limit)) {
    const current = await readAgreementChargeReview(a, row.id);
    items.push({
      chargeId: row.id,
      agreementId: id,
      sourceKey: row.source_key,
      createdAt: row.recorded_at,
      amountCents: Number(row.amount_cents),
      billingDraftId: row.billing_draft_id,
      reviewVersion: current.reviewVersion,
      reviewState: current.reviewState,
      latestReceipt: current.latestReceipt,
    });
  }
  const last = rows[b.limit - 1];
  return chargeHistoryPage.parse({
    items,
    nextCursor:
      rows.length > b.limit
        ? Buffer.from(
            JSON.stringify({
              version: 1,
              agreementId: id,
              createdAt: last.recorded_at,
              chargeId: last.id,
            }),
          ).toString("base64url")
        : null,
  });
}
