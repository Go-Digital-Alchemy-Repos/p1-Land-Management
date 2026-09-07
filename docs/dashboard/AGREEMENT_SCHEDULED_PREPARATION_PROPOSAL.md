# Scheduled agreement draft preparation — implementation outline

Current evidence: worker.ts only dispatches email, SMS and QuickBooks reconciliation jobs; it separately generates recurring work orders. service-agreement.billing.ts currently requires a staff Actor. The agreement queue lists due sources but does not enqueue scheduled preparation. Automatic recurring billing drafts therefore remain unimplemented.

The approved product allows automatic draft preparation while requiring staff review before posting. Schedule only due fixed periods and reviewed eligible per-visit work. Fixed monthly billing remains independent of paused/skipped visit generation. Partial cancellation, unmatched work, missing prerequisites for billing and exhausted approved caps remain explicit office review items.

Use the existing PostgreSQL outbox with a dedicated job kind and minimal source identifiers. Enqueue one job per stable agreement/source identity using a persistent uniqueness constraint, not a time-window NOT EXISTS check alone. The existing charge receipt/source constraints still enforce one monetary draft even if a job is delivered more than once. Recheck all eligibility and approved caps under existing domain locks at execution time.

Refactor the charge domain's internal principal to distinguish authenticated staff from a worker job. Preserve role enforcement on staff endpoints. Worker audit entries must identify the job/system origin with no fabricated staff user or false attribution to the activating manager. Expose no unauthenticated public system-preparation route. Keep one shared financial eligibility/receipt implementation for previews, manual preparation and worker preparation.

A local transactional charge job can retry after process interruption because stable receipts make its outcome discoverable. This differs from an email with an unknown provider outcome. Do not apply the email-unknown-outcome rule indiscriminately to agreement jobs. Use bounded retries/backoff for transient database failures, and route permanent eligibility conflicts to the agreement action queue with a useful reason. A crash after draft commit but before job acknowledgment must return the same receipt on redelivery.

Worker source selection must paginate beyond blocked items so one unmatched/capped item cannot starve later eligible agreements. Claim work with SKIP LOCKED; coordinate due scanning across worker replicas using durable uniqueness. Persist completion or failure receipts and expose counts/last-success time in integration health. No job may post to QuickBooks, send an invoice, charge a customer or publish crew content.

Required tests: two concurrent schedulers and workers; crash before/after draft commit; stale cancellation or agreement changes; fixed billing during paused visits; reviewed-only per-visit eligibility; original occurrence versus rescheduled date; cap races with manual project billing; retry exhaustion/action visibility; and recovered outbox redelivery after database restore. Extend the populated recovery fixture with a pending and an acknowledged preparation job.

Root decisions before implementation: outbox uniqueness representation and event lifecycle, explicit worker principal/audit representation, and eligibility-conflict queue integration. This is a proposal only; no worker/schema/API changes were made.

## Concrete additive schema and attribution proposal

Reuse `outbox.dedup_key text UNIQUE` from migration0005. A preparation job has kind `agreement.prepare_charge` and payload `{version:1,agreementId,source:{periodStart}}` or `{version:1,agreementId,source:{workOrderId}}`. Its canonical dedup key is `agreement.prepare_charge:<agreement UUID>:period:<YYYY-MM-DD>` or `agreement.prepare_charge:<agreement UUID>:work:<work UUID>`. The key remains after successful processing. Source identity is revalidated against locked business records; the payload never grants permission or supplies a charge amount.

Proposed migration (number assigned only after review):

```sql
ALTER TABLE agreement_charge
  ADD COLUMN prepared_job_id uuid REFERENCES outbox(id),
  ADD CONSTRAINT agreement_charge_preparation_actor
    CHECK (prepared_by IS NULL OR prepared_job_id IS NULL);
CREATE UNIQUE INDEX agreement_charge_job_once
  ON agreement_charge(prepared_job_id) WHERE prepared_job_id IS NOT NULL;
```

The check preserves any existing nullable attribution and prevents claiming both a staff actor and a job. New staff writes require `prepared_by`; new worker writes require `prepared_job_id`. Do not rewrite old records to invent attribution. The worker audit uses a null user ID and explicit `{origin:"agreement_worker",jobId,attempt,sourceKey,billingDraftId,amountCents,estimateId,estimateRevision}` details. Existing staff audit shape remains compatible. Whether to enforce at-least-one attribution for historical rows requires a separate data check before strengthening the constraint.

No public route accepts a worker principal. An internal entry point receives a claimed job identifier/attempt, locks that outbox row, verifies its kind/status/attempt and derives the principal there. It calls the same eligibility and receipt logic as manual preparation. Because this is a local database operation, hold the job row through the business transaction and write its `sent` acknowledgment in that same transaction as charge, draft and audit. Preserve the minimal job payload for reconciliation; do not apply the generic email payload-clearing branch to these jobs.

The additional lock is first: claimed outbox row, then the existing source/agreement/property/estimate/recurrence hierarchy. Manual preparation never waits on an outbox row, so it must not gain a reverse dependency. A stale claimant must match the incremented attempt before making business writes or changing completion state. A process crash rolls back the whole local preparation transaction. A previously committed source receipt is returned on redelivery without another draft.

## Retry and office action policy

Lease reclamation excludes agreement jobs from the generic unknown-email-outcome failure rule. After five minutes, reclaim a stale preparation job only while holding its row lock; increment attempts on the next claim. Retry transient serialization/deadlock/connection failures with bounded backoff (proposed 1, 5, 15, 60 and 240 minutes). Classify stable eligibility failures separately and keep a failed job plus the existing agreement action queue reason. Do not retry malformed payloads or unsupported versions automatically.

A later eligible state must not lose work because a permanent-failure dedup row exists. An authorized staff retry requeues the same job identity after server-side eligibility preview; it cannot reset an already completed receipt. This retry endpoint, role contract and audit are not yet approved. Until reviewed, staff may explicitly prepare the source through the existing manual flow; a future job retry returns that receipt.

Scheduler selection scans pages of due source identities and uses `INSERT ... ON CONFLICT(dedup_key) DO NOTHING`. Blocked sources cannot monopolize a fixed first page. Proposal: persist a scan cursor per scan cycle, finish the cycle before restarting, and bound each transaction by page size. The cursor storage schema and operational health response are deliberately still unresolved; do not implement an in-memory-only cursor and claim durable completeness.

## Approval still required

Review the exact preparation attribution column/check, job-row-first lock order, atomic acknowledgment, retry classification and scanner cursor representation before implementation. No automatic posting, invoice sending, payments or customer publication is introduced. This document is a contract proposal, not an implemented capability.
