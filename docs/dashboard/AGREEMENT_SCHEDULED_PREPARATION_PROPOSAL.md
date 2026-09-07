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

A later eligible state must not lose work because a permanent-failure dedup row exists. An authorized staff retry requeues the same job identity after server-side eligibility preview; it cannot reset an already completed receipt. The exact retry endpoint, role contract and audit are specified below and still require approval. Until reviewed, staff may explicitly prepare the source through the existing manual flow; a future job retry returns that receipt.

Scheduler selection scans pages of due source identities and uses `INSERT ... ON CONFLICT(dedup_key) DO NOTHING`. Blocked sources cannot monopolize a fixed first page. Proposal: persist a scan cursor per scan cycle, finish the cycle before restarting, and bound each transaction by page size. The concrete cursor storage, bounded scan and operational health contracts are specified below for review.

## Approval still required

Review the exact preparation attribution column/check, job-row-first lock order, atomic acknowledgment, retry classification and scanner cursor representation before implementation. No automatic posting, invoice sending, payments or customer publication is introduced. This document is a contract proposal, not an implemented capability.

## Durable scan cycles — concrete contract

Use two persisted scan families, `fixed_agreements` and `reviewed_work`. Scan existing source records in immutable `(created_at,id)` order, including temporarily ineligible records, rather than repeatedly starting from the first eligible queue item. Fixed scanning visits one agreement per transaction and inspects its at-most120 active fixed periods; work scanning visits at most100 work orders per transaction and associates each with at most one eligible agreement using the existing occurrence/term rules. Fixed periods are immutable after activation; a changed draft is rechecked at execution. The scanner does not evaluate approved monetary caps or prepare drafts.

```sql
CREATE TABLE agreement_preparation_scan (
 family text PRIMARY KEY CHECK(family IN ('fixed_agreements','reviewed_work')),
 cycle_id uuid,
 phase text NOT NULL DEFAULT 'idle' CHECK(phase IN ('idle','running')),
 cycle_started_at timestamptz,
 due_through date,
 upper_created_at timestamptz,
 upper_id uuid,
 last_created_at timestamptz,
 last_id uuid,
 pages_completed bigint NOT NULL DEFAULT 0 CHECK(pages_completed>=0),
 records_visited bigint NOT NULL DEFAULT 0 CHECK(records_visited>=0),
 jobs_enqueued bigint NOT NULL DEFAULT 0 CHECK(jobs_enqueued>=0),
 completed_cycles bigint NOT NULL DEFAULT 0 CHECK(completed_cycles>=0),
 last_progress_at timestamptz,
 last_completed_at timestamptz,
 next_cycle_at timestamptz NOT NULL DEFAULT now(),
 last_error_code text,
 CHECK((upper_created_at IS NULL)=(upper_id IS NULL)),
 CHECK((last_created_at IS NULL)=(last_id IS NULL)),
 CHECK(phase='idle' OR (cycle_id IS NOT NULL AND cycle_started_at IS NOT NULL
   AND due_through IS NOT NULL AND upper_id IS NOT NULL))
);
INSERT INTO agreement_preparation_scan(family)
VALUES('fixed_agreements'),('reviewed_work');
CREATE INDEX service_agreement_scan_order ON service_agreement(created_at,id);
CREATE INDEX work_order_preparation_scan_order ON work_order(created_at,id);
```

A scanner transaction locks one family row with `FOR UPDATE SKIP LOCKED`. An idle, due family starts a new cycle: generate its UUID, persist the database clock and New York local due date, and capture the greatest source `(created_at,id)` visible at cycle start. Reset the cursor and per-cycle counters in that transaction. If the source table is empty, immediately record completion without a running cycle. Running cycles always resume the persisted upper bound and cursor after restart; another replica may process the next page only after the current transaction commits. Do not use a process-local cursor or long-lived database snapshot.

Read the next raw source page with `tuple > last_tuple AND tuple <= upper_tuple ORDER BY created_at,id LIMIT page_size`. Preserve PostgreSQL microseconds in all internal cursor parameters; never round through a JavaScript Date. The fixed-family page contains one agreement, even if it is currently draft, archived or has no due periods. The work-family page contains at most100 work orders, even when not reviewed, outside term or unmatched. Resolve eligibility and enqueue at most120 fixed jobs or100 work jobs. Missing association, future dates, cancellation exclusions and existing dedup rows advance the raw cursor normally. Source revalidation in the charge transaction remains authoritative.

Insert new outbox rows and their job metadata, advance the scan cursor/counters and record progress in the same transaction. Use the existing unique dedup key with `ON CONFLICT DO NOTHING`; never reset a failed or completed job during scanning. A permanently blocked or already-enqueued source cannot hold the cursor in place. If the page contains fewer than the family limit, or a bounded following probe finds no raw record through the upper bound, mark the cycle complete and schedule the next cycle no later than60 seconds afterward.

Each page has bounded application work: at most100 raw work records or one agreement with120 periods, bounded inserts, a two-second statement timeout and a five-second transaction deadline. A lock timeout or database error rolls back inserts and cursor advancement together. After rollback, record only a sanitized error code in a separate short transaction if available; never advance a failed page. Use a per-family round-robin attempt so a slow family does not prevent the other family from progressing. Alert on repeated timeouts rather than silently skipping a source.

The captured upper bound prevents an ever-growing tail from extending the current cycle indefinitely. A new source inserted behind the cursor, a transaction committed late with an earlier timestamp, or an existing record becoming eligible after it was visited is reconsidered in the next complete cycle. New records above the upper bound also wait for that next cycle. This is an eventual-completeness scan, not an assertion that all eligibility was atomically observed at cycle start. With a finite source set and successful page execution, a persistently eligible record is considered within the current or following cycle. Repeated database failure is exposed as degraded health, not claimed as successful progress.

## Job metadata, claim fencing and retry receipts

```sql
CREATE TABLE agreement_preparation_job (
 job_id uuid PRIMARY KEY REFERENCES outbox(id),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 retry_epoch integer NOT NULL DEFAULT 0 CHECK(retry_epoch>=0),
 attempts_in_epoch integer NOT NULL DEFAULT 0 CHECK(attempts_in_epoch>=0),
 failure_code text CHECK(failure_code IN
   ('eligibility_changed','invalid_payload','unsupported_version','transient_exhausted')),
 charge_id uuid REFERENCES agreement_charge(id),
 completed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((charge_id IS NULL)=(completed_at IS NULL))
);
CREATE TABLE agreement_preparation_retry_event (
 operation_id uuid PRIMARY KEY,
 job_id uuid NOT NULL REFERENCES outbox(id),
 request_sha256 text NOT NULL CHECK(length(request_sha256)=64),
 resulting_revision integer NOT NULL CHECK(resulting_revision>0),
 retry_epoch integer NOT NULL CHECK(retry_epoch>0),
 actor_id text NOT NULL REFERENCES "user"(id),
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(job_id,resulting_revision)
);
```

Apply an UPDATE/DELETE rejection trigger to retry events using the same append-only pattern as agreement review events. Event insertion, outbox transition, metadata revision and the privileged audit event commit together. There is no public claim endpoint. Worker claiming is an internal process capability: lock one due pending financial job with SKIP LOCKED, validate its kind and metadata, increment the existing outbox `attempts` monotonically and metadata `attempts_in_epoch`/`revision`, set processing/locked_at, then commit the lease. Do not reset the global attempt counter on manual retry.

Preparation reacquires the job row and metadata, verifies the claimed global attempt and revision, then obtains the existing source/agreement/parent locks. It rechecks eligibility and prepares or recovers the original source receipt. Commit charge/draft/audit, `charge_id`, `completed_at`, outbox sent status and metadata revision together. If a staff-prepared receipt already exists, acknowledge it without rewriting its preparer or creating another charge. Distinguish newly prepared and already-existing receipts in the system audit. No transaction holds locks over a provider call.

Stale-lease reclamation locks the job with SKIP LOCKED and checks its age and attempt again. A live preparation transaction holding that row is skipped. An old claimant arriving after reclamation fails the attempt/revision check before business writes. Automatic retry permits six attempts per epoch (the initial attempt and five delayed retries at1,5,15,60 and240 minutes). An invalid payload, unsupported version or stable eligibility conflict fails immediately with its typed code; exhausted transient failures become `transient_exhausted`. Error details shown to users contain no secrets or raw provider response. A missing acknowledgment after a connection failure is resolved by rereading the job/receipt; never assume rollback merely from a lost client response.

## Exact staff retry and discovery API

All paths are under `/api/v1`, require authenticated owner, manager or finance with current required assurance, use strict Zod parsing and no-store, and recheck the job's agreement/property access. Dispatch, sales, crew and clients receive403; anonymous requests receive401. A UUID belonging to another job kind is not a financial job and returns404. No endpoint accepts a system actor, arbitrary outbox payload, amount, destination, provider action or attempt counter.

- `GET /agreement-preparation-jobs?agreementId=<optional UUID>&status=<optional pending|processing|sent|failed>&after=<cursor>&limit=<n>` returns `{items,nextCursor}` with jobId, agreementId, source reference, typed state/failure, revision, retry epoch, attempt counts, next available time, created/completed time and charge receipt ID. Default25/max100; newest-first microsecond-safe `(created_at,id)` pagination with cursor version and filters bound to the cursor. No message payloads or other job kinds are exposed.
- `GET /agreement-preparation-jobs/:jobId` returns the same state plus allowed actions and the original source receipt, if one exists. Read access never changes the job or inserts audit records.
- `POST /agreement-preparation-jobs/:jobId/retry-preview` accepts `{expectedRevision}` and returns `{revision,eligibilityFingerprint,eligible,alreadyPrepared,reasonCode,sourceReceipt,nextRetryEpoch}`. Evaluate the shared charge eligibility within the caller's transaction, not through a nested transaction that might wait on its own locks. This preview writes nothing and makes no provider call.
- `POST /agreement-preparation-jobs/:jobId/retries` accepts `{operationId,expectedRevision,eligibilityFingerprint,reason}`. Require failed state, matching revision and a matching freshly calculated server eligibility fingerprint. The fingerprint binds immutable source identity, relevant current agreement/version/dates, work version where applicable, approved estimate/cap state and prior receipt identity. Reject changed eligibility or concurrently claimed/retried/completed state with409. Unsupported or malformed stored jobs cannot be retried through this endpoint.

Retry-write lock order is operation advisory lock, outbox row, metadata row, then the existing financial source/agreement hierarchy. Identical operation reuse by the same actor/job/body returns200 with the historical immutable retry receipt; changed reuse returns409. A new accepted retry returns201 with `{operationId,jobId,resultingRevision,retryEpoch,recordedAt}`, changes only that existing job to pending/available-now, clears failure and resets per-epoch attempts to zero, and appends `agreement.preparation_retry_requested` audit. It does not prepare a draft synchronously. A newly submitted operation against a completed job returns409 with its current receipt; the UI offers that receipt instead of a retry. After any historical idempotent response, clients reload current job state rather than assuming it is still pending.

The existing generic `/delivery-jobs/:id/retry` must explicitly exclude `agreement.prepare_charge`, because its current unqualified outbox update would bypass these financial checks. Existing email/SMS behavior stays unchanged. The integration UI directs failed agreement jobs to the financial preparation view rather than the generic delivery retry button.

## Operational health contract

`GET /agreement-preparation/health` has the same financial roles/no-store policy and makes no writes. Return `asOf`, `enabled`, two family summaries (`phase`, `cycleStartedAt`, `lastProgressAt`, `lastCompletedAt`, `completedCycles`, per-cycle visited/enqueued counters, `lastErrorCode`), and disjoint job counts: pendingDue, pendingFuture, processing, failedEligibility, failedInvalid, failedTransientExhausted and completed. Include oldestPendingDueAt, staleProcessingCount and lastCompletedJobAt. `pendingDue` includes delayed retries only after their available time; retry-epoch/attempt detail belongs to job discovery. Keep the raw durable cursor out of the ordinary staff display.

Show preparation as disabled when its feature configuration is off, idle when no due work exists, or delayed when due work is pending and no scan/job progress has occurred for10 minutes. Report long-running scan cycles explicitly instead of inventing a completion percentage. Owner/management alerts use the existing approved operational alert adapter; this proposal does not itself authorize sending alerts or adding an unconfigured provider. Health metrics cannot claim that a draft was posted or an invoice was paid.

## Restoration and required proof

Include both scan rows, pending/processing/failed/completed financial jobs, retry events and charge links in the populated recovery fixture and full table/hash comparison. After restoration, resume the saved cycle and reclaim expired leases through the same row/attempt fencing. Prove that committed charge receipts are reused, manual preparation is not reattributed, retry history remains immutable, and failed sources do not prevent later work from being enqueued. Restore never clears dedup keys or resets completed jobs to pending.

Add actual database tests for two scanner replicas, process restart at each page boundary, new earlier-sorting sources, newly eligible already-visited records, a growing tail above the saved bound, permanent failures ahead of eligible sources, family fairness, transaction timeout rollback, six-attempt exhaustion, stale claimant versus manual retry, duplicate/changed retry operations, generic-delivery retry rejection, health count partitioning and source-receipt recovery. Financial guard tests must verify zero external POST/send calls.

Automatic preparation remains local operational draft work. A database restore may precede a later accounting event that still exists in QuickBooks; run reconciliation and resolve ambiguities before staff posting resumes. No worker auto-posts to compensate for restored state. Physical-device, Railway volume/object restoration and full recovery targets remain separate acceptance requirements.

These additions resolve the proposal's previously unspecified cursor, retry and health contracts for review. They are not approved schema/API changes until the Project Orchestrator accepts them. Migration numbering follows the separately reserved0014 identity and0015 correction migrations.
