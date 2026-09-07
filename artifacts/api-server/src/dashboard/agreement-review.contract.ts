import { z } from "zod";
const cents = z.number().int().safe();
export const reviewOutcome = z.enum(["keep_due", "correction_required"]);
export const reviewState = z.enum([
  "unreviewed",
  "kept_due",
  "correction_required",
  "stale_review",
]);
export const reviewSnapshot = z
  .object({
    agreement: z
      .object({
        id: z.string().uuid(),
        version: z.number().int().positive(),
        cancellationDate: z.string().date().nullable(),
        cancellationReason: z.string().nullable(),
      })
      .strict(),
    charge: z
      .object({
        id: z.string().uuid(),
        sourceKey: z.string(),
        amountCents: cents,
      })
      .strict(),
    draft: z
      .object({
        id: z.string().uuid(),
        propertyId: z.string().uuid(),
        estimateId: z.string().uuid().nullable(),
        title: z.string(),
        kind: z.string(),
        amountCents: cents,
        status: z.string(),
        postingRequestId: z.string().nullable(),
        postingPayloadSha256: z.string().nullable(),
        quickbooksId: z.string().nullable(),
        balanceCents: cents.nullable(),
        ownershipVerified: z.boolean(),
      })
      .strict(),
  })
  .strict();
export const reviewInput = z
  .object({
    expectedReviewVersion: z.number().int().min(0),
    cancellationVersion: z.number().int().positive(),
    snapshotSha256: z.string().regex(/^[0-9a-f]{64}$/),
    outcome: reviewOutcome,
    reason: z.string().trim().min(1).max(2000),
  })
  .strict();
export const recordReviewInput = reviewInput
  .extend({ operationId: z.string().uuid() })
  .strict();
export const reviewReceipt = z
  .object({
    eventId: z.string().uuid(),
    chargeId: z.string().uuid(),
    reviewVersion: z.number().int().positive(),
    outcome: reviewOutcome,
    recordedAt: z.string(),
  })
  .strict();
export const currentReview = z
  .object({
    chargeId: z.string().uuid(),
    agreementId: z.string().uuid(),
    reviewVersion: z.number().int().min(0),
    latestReceipt: reviewReceipt.nullable(),
    correctionPending: z.boolean(),
    cancellationVersion: z.number().int().positive(),
    snapshot: reviewSnapshot,
    snapshotSha256: z.string(),
    allowedOutcomes: z.array(reviewOutcome),
    postingBlockReason: z.string().nullable(),
    reviewState,
  })
  .strict();
export const previewReview = z
  .object({
    current: currentReview,
    wouldResolveSnapshot: z.boolean(),
    postingWouldRemainBlocked: z.boolean(),
  })
  .strict();
export const historyQuery = z
  .object({
    afterVersion: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();
export const reviewHistoryEvent = reviewReceipt
  .extend({
    reason: z.string(),
    reviewerId: z.string(),
    snapshot: reviewSnapshot,
  })
  .strict();
export const reviewHistoryPage = z
  .object({
    items: z.array(reviewHistoryEvent),
    nextVersion: z.number().int().nullable(),
  })
  .strict();
export const chargeListQuery = z
  .object({
    after: z.string().max(600).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();
export const chargeHistoryItem = z
  .object({
    chargeId: z.string().uuid(),
    agreementId: z.string().uuid(),
    sourceKey: z.string(),
    createdAt: z.string(),
    amountCents: cents,
    billingDraftId: z.string().uuid(),
    reviewVersion: z.number().int().min(0),
    reviewState,
    latestReceipt: reviewReceipt.nullable(),
  })
  .strict();
export const chargeHistoryPage = z
  .object({
    items: z.array(chargeHistoryItem),
    nextCursor: z.string().nullable(),
  })
  .strict();
