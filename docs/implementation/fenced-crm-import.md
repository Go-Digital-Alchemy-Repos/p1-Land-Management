# Bounded source-fenced CRM preservation

Implemented runner: `scripts/consolidation/fenced-crm-import.mjs`. This is an operational CLI, not an endpoint, permanent source ownership transfer, or production release authority. It reuses the reviewed additive inquiry importer and independent verifier. No live execution is authorized by this document.

## Scope and admission

The initial scope is a complete reviewed export containing 1–100 Core leads and **zero clients, notes or tasks**. Every source lead must have a distinct existing form submission. Source timezone must explicitly be UTC; schema-version 2 review, exact source instance and complete plan digest are required. Additive inquiries must come from `p1-estimate`, with no commercial handoff effects. All existing effects for the batch must be terminal (`completed` or `skipped`). Broader CRM batches need a separately reviewed relationship-locking contract; the runner refuses them.

The private review remains the exact `create_separate_inquiry` mapping plan described in [CRM import](crm-payload-import.md). Its `sourceFreezeVerified` assertion refers to this scoped temporary fence only when this runner is used; standalone importer execution still requires an independently verified freeze. Existing synthetic-only review files are never production approval. Staff must direct subsequent operational edits to the dashboard; this runner does not disable Core editing after completion or claim incremental synchronization.

## Lock order and fresh source check

The dedicated Core connection starts READ COMMITTED, with a five-second lock timeout, fifteen-second statement timeout and ninety-second idle transaction timeout. It acquires:

1. Referenced form rows `FOR SHARE` in stable order. New public submissions can still acquire compatible foreign-key locks; form edits/deletes and commercial backfill wait.
2. Existing effect job rows `FOR UPDATE`, before submissions/leads, matching the worker’s job-first completion path. Pending/processing jobs fail closed; already claimed external delivery cannot be cancelled by this lock.
3. Exact submission rows `FOR UPDATE`, followed by a form relationship and complete job-ID-set recheck.
4. Exact source lead rows `FOR UPDATE`, then checks that no source clients, notes or tasks reference them. Parent foreign-key locks prevent new relationships while held.

A separate read-only exporter connection performs all existing source table/column, JSON and timestamp checks. Its complete source content hash and identity-link inventory must equal the reviewed export. Extra source records appearing before that check require a refreshed plan. Unrelated new submissions can still be accepted during the fence; no public form or worker is globally disabled.

The source connection is checked, including its exact transaction ID, before each target statement. No source values are written. The temporary source transaction is rolled back to release locks only after target import and, for apply mode, independent verification.

## Invocation and private output

Provide `CORE_DATABASE_URL`, `DASHBOARD_DATABASE_URL`, `CRM_SOURCE_INSTANCE_ID` and `CRM_SOURCE_TIMEZONE=UTC` through the approved private environment mechanism. Never paste credentials into a command or evidence file. Both pools need two connections for the held fence and read-only export.

```sh
node scripts/consolidation/fenced-crm-import.mjs \
  --input /absolute/private/export.json \
  --review /absolute/private/review.json \
  --output /absolute/private/new-fenced-result.json
```

Mode defaults to dry-run. Explicit `--mode apply` requires separately accepted review and release authority. Output is reserved with exclusive creation and mode0600 before database work; an incomplete marker remains if the run fails. It contains metadata/hashes/counts only. Input JSON retains existing 32MiB limits. Protect all review/export/evidence files in a mode0700 directory.

Dry-run exercises target writes inside a rollback and reports expected creation counts; it does not claim persisted verification. Apply runs the independent verifier while source locks remain held. Later legitimate target inquiry edits cause current-value differences requiring review; they are never overwritten.

## Cross-database uncertainty

This is **not two-phase commit**. A source connection loss near target commit or a lost target commit response can leave the target applied. No compensating delete, archive rewrite or guessed rollback is attempted. Once target work starts, errors report `crm_fence_target_outcome_requires_exact_reconciliation`; retain the identical source export, mapping UUIDs and review digest. Independently inspect the target and replay the same plan under a re-established source fence when safe. A changed source snapshot fails admission and requires an explicit reconciliation decision, not a newly generated target UUID.

The exact source transaction-ID check catches a lost/replaced source transaction; no distributed system can make the final source check and remote target commit one atomic event using these connections alone. Successful execution establishes a checked point-in-time copy, not permanent CRM retirement.

## Validation and remaining gates

Focused disposable PostgreSQL tests exercise source drift, pending/commercial jobs, form eligibility, relationship changes, exact-row edit blocking, unrelated public submission+outbox insertion, dry-run/apply/replay and a simulated lost COMMIT response after an actual committed transaction. Existing importer tests cover archive rollback, receipt changes and target collisions.

Required before live execution: independent implementation review, fresh reviewed source/target evidence, current protected backup and restoration evidence, operator context/Owner validation, and release authorization. Permanent source write fencing, broader CRM relationships, pipeline settings reconciliation and `/admin/` retirement remain separate work.
