# Agreement cancellation review — proposal

Status: proposed, not an approved schema or API change. Existing cancellation records preserve charges, but the action queue currently has no way to record a financial review outcome. This proposal adds a review record without changing posted accounting history.

## Decisions and boundaries

Management or finance can review a cancellation-affected charge. Dispatch, sales, crew and clients cannot resolve financial exceptions. An owner is subject to the configured authentication assurance policy. Every action rechecks the operational property, agreement, charge and billing draft on the server.

Root-approved bounded outcomes:

- **Keep due (`keep_due`):** record the contractual reason and reviewer. Preserve the original amount, charge receipt and billing draft. Resolve only the matching cancellation/financial snapshot; do not approve posting or send/charge anything.
- **Correction required (`correction_required`):** record the reason, keep the item open and block new posting attempts. This subset cannot edit amounts, issue credits, release approved cap, supersede drafts or close a correction-required decision. A later separately reviewed accounting-resolution feature must do that.

Management (owner/manager) and finance have identical review authority for these two outcomes. A failed posting request with an immutable request ID/payload is ambiguous and is never treated as an untouched draft.

Do not add a generic “dismiss” action. Acknowledging an exception must not erase an unresolved monetary difference. Do not subtract original charges from the approved cap merely because an exception was reviewed. Accounting credits and replacement amounts require their own accepted cap policy before implementation.

## Minimal persistent model

An append-only review-event record identifies the charge, agreement cancellation version, billing-draft version or financial fingerprint, outcome, reason, actor and timestamp. A stable client operation UUID and request fingerprint make identical retries return the same event; changed reuse returns a conflict. The current review state is derived from events or maintained as a versioned projection in the same transaction. Historical events are never edited or deleted.

A “charge remains due” decision closes only the exception bound to the reviewed cancellation and financial snapshot. A later accounting change invalidates that matching snapshot and returns the item to review. The queue must retain a visible audit link for resolved history. Closure does not reopen a cancelled agreement or remove source uniqueness.

## Transaction and API proposal

Use a preview endpoint to show current cancellation terms, accepted scope, original charge, posting state and the effect of the requested decision without writing. The explicit review endpoint accepts an operation ID, expected review version, cancellation version and financial fingerprint plus outcome/reason. It uses the existing source/agreement/parent/estimate/recurrence lock order and locks the draft before checking posting state.

A concurrent cancellation, draft posting, reconciliation update or review rejects stale submission with 409. The UI retains entered reason and offers comparison with the current state. It never silently advances a version or repeats a financially different action.

For unposted draft correction, a separate design must specify replacement/supersession, cap accounting and posting guards together. Adding an amount-edit endpoint alone would violate immutable request and duplicate-billing protections. Until those transitions are reviewed, the queue continues to show the unresolved item and explicitly blocks posting of an affected draft.

## Required acceptance

Validate role and property isolation, zero-write previews, concurrent review/posting/reconciliation, retry identity, changed-operation rejection, event immutability, reopened review after financial changes, and source uniqueness after cancellation/replacement. Verify that resolved review does not post/send/charge or mark an invoice paid. Exercise the complete UI with a retained conflicting reason and include review events in the populated database recovery test.

The actor/outcome boundaries above are approved; the following concrete schema/API/locking contract still requires root review before implementation. Cap release and draft supersession remain out of scope for this subset. Posted invoice numbers, taxes, balances, payments and credits remain owned by QuickBooks.

## Concrete additive SQL proposal

Use the next available migration number; do not assume0014 is unclaimed. One append-only table is sufficient; derive the current projection from its highest review version. The existing charge unique constraints remain unchanged.

```sql
CREATE TABLE agreement_charge_review_event (
  id uuid PRIMARY KEY,
  charge_id uuid NOT NULL REFERENCES agreement_charge(id),
  review_version integer NOT NULL CHECK (review_version > 0),
  outcome text NOT NULL CHECK (outcome IN ('keep_due','correction_required')),
  cancellation_version integer NOT NULL CHECK (cancellation_version > 0),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  snapshot_sha256 text NOT NULL CHECK (snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 2000),
  actor_id text NOT NULL REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (charge_id, review_version)
);
CREATE FUNCTION reject_agreement_review_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Agreement review history is append-only'
    USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER agreement_review_immutable
BEFORE UPDATE OR DELETE ON agreement_charge_review_event
FOR EACH ROW EXECUTE FUNCTION reject_agreement_review_mutation();
```

`id` is the caller's operation UUID, not a new random ID on retries. The request hash binds the actor, charge, expected review version, cancellation version, snapshot hash, outcome and normalized reason. It does not include timestamps. The immutable receipt is reconstructed from the inserted event, so an identical retry returns the original event even after later financial changes. It does not claim that the old review is still current.

The snapshot is server-built with a documented canonical key order: agreement ID/version/cancellation date/reason, charge ID/source/amount, and draft ID/property/estimate/title/kind/amount/status/posting request ID/posting-payload SHA256/QuickBooks ID/balance/ownership-verification flag. Null is distinct from missing. Do not accept arbitrary client snapshot JSON. The client sends only the server-issued hash. Monetary values are integer cents; dates are ISO local dates; payload hashing uses canonical JSON.

Conservative matching is explicit: any change in these reviewed fields invalidates a keep-due decision. This includes subsequent posting-state or balance changes, which can return a charge to review. Root must accept this behavior or approve a narrower obligation-only fingerprint before implementation; do not silently exempt financial fields. `correction_required` is sticky in this subset: finding any such event for the charge keeps posting blocked even if the snapshot later changes. No later keep-due request can close it here.

## Exact API contract proposal

All endpoints use `/api/v1`, authenticated actor authorization, `Cache-Control: no-store`, strict Zod input and generated OpenAPI clients. IDs are UUIDs; reason is trimmed, nonempty and at most2000 characters.

- `GET /agreement-charges/:chargeId/review`: return current `reviewVersion` (0 before any event), latest receipt or null, `correctionPending`, current cancellation version, server snapshot/hash, allowed outcomes and posting-block reason. Reading does not insert an event or audit row.
- `POST /agreement-charges/:chargeId/review-preview`: input `{expectedReviewVersion,cancellationVersion,snapshotSha256,outcome,reason}`. Return the current comparison and `{wouldResolveSnapshot,postingWouldRemainBlocked}` without writes. A stale version/hash returns409; a non-cancellation-affected charge returns409.
- `POST /agreement-charges/:chargeId/reviews`: same input plus `operationId`. Return201 for the new immutable receipt `{eventId,chargeId,reviewVersion,outcome,recordedAt}` and200 for identical operation reuse. Reuse by another actor, another charge, or changed body returns409. The receipt is historical; clients separately reload current review/queue state.
- `GET /agreement-charges/:chargeId/reviews?afterVersion=N&limit=L`: ascending per-charge event history, default25/max100. Return immutable receipts, reason, reviewer and recorded snapshot for management/finance only. No client publication is introduced.

The existing queue adds optional `chargeId`, `reviewVersion`, `reviewState` and latest review receipt. Preserve old fields and cursor identity. A matching keep-due item leaves the open queue but remains discoverable through agreement charge history. Correction-required and stale/missing keep-due entries remain visible. Proposed review states: `unreviewed`, `kept_due`, `correction_required`, `stale_review`.

## Lock order and posting integration

Review write order: operation advisory lock; existing agreement/source advisory lock; agreement identity lock; operational property lock; approved estimate; recurrence; agreement row; charge row; billing draft row; then review events/version. Use the existing lock helpers where their invariants apply. Look up immutable charge identity before locking, then recheck it after locking. An archived/non-operational property fails current access checks even on an idempotent event retry. Insert the event and its audit record in one transaction.

Posting currently locks the operational parent and billing draft, commits an immutable posting intent, and then calls QuickBooks outside the transaction. For an agreement-backed draft, determine its charge identity first, acquire the same source/agreement lock hierarchy before the parent/draft lock, then evaluate cancellation/review state under those locks. Do not acquire an agreement lock after already locking the draft. Non-agreement billing retains its existing behavior.

A cancellation-affected charge with no matching keep-due review or with any unresolved correction-required event rejects a new posting intent with409 before any provider call. Already-posted idempotent reads may return existing status; they do not make another POST. Failed/ambiguous posting attempts remain blocked from re-POST while correction is pending; read-only reconciliation may still discover an existing invoice.

The posting-intent transaction is the ordering boundary. If review/cancellation wins first, posting makes zero provider calls. If posting intent commits first, a later correction cannot retroactively cancel a request already authorized for dispatch; the UI must show that posting may already be in flight. Do not hold a database transaction over the network or claim atomic cancellation of an external call. The in-flight result remains preserved and the correction stays open.

Reconciliation may update draft financial fields under its existing draft-row lock, causing the next queue read to detect a stale snapshot. If reconciliation is later extended to take agreement locks, it must adopt the full ordering above rather than taking them after a draft lock. No reconciliation update can erase review events or turn correction-required into resolved.

## Acceptance additions for this exact subset

Test update/delete rejection on review events, charge/version uniqueness, identical and changed-operation replay, and rollback when audit insertion fails. Cover two competing reviewers, stale cancellation/snapshot, keep-due followed by correction-required, and rejection of keep-due after correction-required. Race review/cancellation against posting-intent creation and verify provider-call counts for both ordering outcomes. Confirm historical receipts remain readable while the current queue reopens on changed snapshots. Include resolved and correction-required events in the populated restore/retry regression.

## Accepted fingerprint decision

The Project Orchestrator approved the conservative full financial snapshot on September7: any later financial status or balance change invalidates a matching keep-due decision and returns the charge to review. The reviewer UI must state this explicitly before submission and explain the changed fields when a review becomes stale. This decision does not approve implementation of the remaining schema, endpoint or posting changes; those still require the contract review described above.

## Charge discovery after queue resolution

Add `GET /service-agreements/:agreementId/charges?after=<cursor>&limit=<limit>` so a resolved keep-due decision remains discoverable from the agreement's charge history. Owner, manager and finance may use this endpoint; dispatch, sales, crew and client requests return403. Recheck current actor assurance and the existing agreement/property read boundary server-side before any charge or review lookup. Anonymous requests return401. Every response is no-store.

Return `{items,nextCursor}`. Each item contains `chargeId`, `agreementId`, `sourceKey`, `createdAt`, `amountCents`, `billingDraftId`, current `reviewVersion` and `reviewState`, and the latest immutable review receipt or null. It includes all prepared charges for that agreement, including kept-due, stale-review and correction-required entries, independently of whether the action queue currently shows them. It does not expose unreviewed crew material or add client publication. The UI links each entry to the existing proposed charge review/detail and paginated review-event history endpoints.

Use strict query parsing, default25/max100 records and descending `(created_at,id)` keyset pagination. An opaque cursor encodes version1, agreementId and the last `(createdAt,chargeId)` tuple. Reject malformed, unsupported-version or cross-agreement cursors with400; cursor data never grants access. Query by the requested agreement plus tuple, fetch limit+1 and derive the next cursor from the last returned row. Newer concurrent inserts appear on refresh rather than displacing older pages; timestamp ties are ordered by immutable UUID. Do not use offset pagination or an unbounded charge list.

Proposed additive index: `CREATE INDEX agreement_charge_history ON agreement_charge(agreement_id,created_at DESC,id DESC);`. Include this with the review migration only after schema approval. The existing agreement detail endpoint stays compatible; the new list supplies discovery without inflating every detail response.

Acceptance adds owner/manager/finance access; all other role denial; cross-property/account isolation; strict cursor and limit validation; same-timestamp multi-page completeness; stable traversal during newer inserts; discovery of keep-due charges removed from the queue; and current-state recalculation after accounting changes invalidate a review. Charge/history reads and cursor errors must insert no review or audit records.
