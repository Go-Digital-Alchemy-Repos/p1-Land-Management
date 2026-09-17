# Reviewed CRM archive and native history import

Status: implemented and tested with synthetic records in disposable PostgreSQL. No production import or cutover has run. This is an operational CLI, not an HTTP route or a replacement for dashboard authentication.

## Scope

Migration `0044_crm_source_archive.sql` adds an immutable `crm_source_record` archive keyed by source instance, source table and source ID. It preserves each full source snapshot, content hash, reviewed projection hash, review digest, destination parent, generated native record ID, reviewer and import time. Target foreign keys and unique mappings prevent silent parent coalescing. No existing dashboard lead/client fields are overwritten. Parent snapshots retain source fields without native counterparts; those fields still need product-level reconciliation and authorized archive access before full CRM retirement.

The importer creates lead/customer notes and tasks using their existing provenance columns. It preserves exact text, source microsecond timestamps, completion state and source actor IDs. It does not create parents, properties, portal accounts, agreement drafts, invoices, notifications or access grants. Won stages are preserved in the archive without triggering onboarding. Unknown historical identities retain source IDs and null canonical projections. Creation paths with no source modifier use null `changed_by_id`, rather than attributing historical changes to the operator.

## Preparation and review

1. Verify the timestamp convention and arrange identity reconciliation and a source freeze. Use the [read-only exporter](crm-payload-export.md) to capture the source and matching inventory. Run [payload preparation](crm-payload-preservation.md) on the exact export. Preserve the source file and generated manifest in protected storage.
2. Resolve all payload blockers. Review every reconciliation issue, candidate identity and matched target. This version supports existing matched parents only. A unique exported identity link does not prove the live Core link remains active: the release operator must verify/freeze those links as part of cutover preparation. The dashboard database does not own Core's identity-link table.
3. Record explicit review using the generated `manifestSha256` (not `sourceContentSha256` or the file digest):

```json
{
  "schemaVersion": 1,
  "operation": "import_reviewed_crm",
  "manifestSha256": "64-character manifest digest",
  "reviewedBy": "canonical-owner-user-id"
}
```

The review file is an operator-supplied assertion, not a cryptographic signature or authenticated web session. The command requires privileged database connectivity and checks that the recorded reviewer is still an active Owner. Protect both files and retain actual review/release evidence separately. The hash binds source snapshots, projections, targets and reconciliation results; it is not release authority. Existing preparation manifests without `manifestSha256` must be regenerated.

## Rehearsal and application

Against an explicitly selected rehearsal database, set `DASHBOARD_DATABASE_URL` using the established secret mechanism, apply the reviewed migrations, then run:

```sh
node scripts/consolidation/import-crm-payloads.mjs --input /absolute/private/crm-export.json --review /absolute/private/crm-review.json --mode dry-run
```

Dry-run executes the same transaction, eligibility checks and constraints, then rolls it back. It reports `wouldCreate` and no committed creations. It briefly takes database locks and does not simulate a source freeze.

After separate production release authority, the same command can use `--mode apply`. No default CLI mode exists. Inputs are capped at 32 MiB and a batch at 10,000 total source rows. To split a larger export, retain required parent rows/inventory in each batch and prepare/review each batch independently; immutable parent snapshots replay rather than duplicate.

The transaction:

- Recomputes the manifest from the full export and checks the exact review digest; edited projections are never trusted as input.
- Locks the Owner profile and serializes imports per source instance with a transaction advisory lock.
- For new records, checks/locks current target parents, receipt matches and converted-client relationships. Archived/missing clients and stale mappings abort the batch.
- Checks canonical identity existence. Open-task assignments additionally require an active Owner or the appropriate Sales/Customers capability. Completed historical tasks may retain an existing inactive canonical assignee without granting access or creating new assigned work.
- Inserts notes/tasks, trigger-generated task revisions, immutable archives and audit metadata in one transaction. Any constraint or audit failure rolls back the entire batch.

Standard output contains counts only. Errors do not expose customer contents, source JSON or connection credentials. A connection failure during commit can leave its outcome uncertain; retain and rerun the identical reviewed batch to reconcile rather than modifying files or manually inserting replacements.

## Replay and conflicts

Exact archived source/projection/target matches replay without writing again. The native record must still exist with the same provenance and parent. Replays deliberately do not reapply old task text, assignment or completion: later native edits remain intact, even if the historical assignee is now inactive. Current Owner eligibility is still required. Existing archives are immutable and new source changes or mapping changes conflict rather than replacing history. A future incremental-sync contract would require separate design; this importer expects a frozen source.

Preexisting native provenance without its reviewed archive is rejected, not automatically adopted. Duplicate target-parent mappings across batches are blocked by database constraints. Audit rows retain source identifiers/hashes and the review digest without copying contact/message payloads into logs.

## Verification and rollback

`node scripts/test-dashboard.mjs` runs the importer tests against a disposable PostgreSQL instance and replays migrations. Coverage includes dry-run, simultaneous apply/replay, exact source storage, original target/receipt preservation, task edits surviving replay, stale target/identity/assignment checks, immutable archives, late audit-failure rollback, provenance conflicts, cross-batch parent uniqueness and actual CLI behavior. Offline preparation/reconciliation tests remain separate.

Before production cutover, verify per-source counts/content hashes, note/task projection counts, role-separated UI/API visibility and all reconciliation exceptions against the frozen source. Retain a database backup and rehearse restoration. Application rollback should retain the additive archive and native history; deleting immutable source/history records is not a rollback mechanism. Correcting an erroneous applied mapping requires an explicitly reviewed recovery procedure or restoration, not a casual rerun with changed inputs.

Production source extraction/freezing, unmatched parent creation policy, complete source-field functionality, archive access, full import reconciliation/restoration rehearsals and `/admin/` retirement remain open release gates.
