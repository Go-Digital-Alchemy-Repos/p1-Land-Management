# Reviewed CRM archive and native history import

Status: implemented and tested with synthetic records in disposable PostgreSQL. No production import or cutover has run. This is an operational CLI, not an HTTP route or a replacement for dashboard authentication.

## Scope

Migration `0044_crm_source_archive.sql` adds an immutable `crm_source_record` archive keyed by source instance, source table and source ID. It preserves each full source snapshot, content hash, reviewed projection hash, review digest, destination parent, generated native record ID, reviewer and import time. Target foreign keys and unique mappings prevent silent parent coalescing. No existing dashboard lead/client fields are overwritten. Parent snapshots retain source fields without native counterparts; those fields still need product-level reconciliation before full CRM retirement. Staff can inspect preserved snapshots through the capability-scoped [imported CRM history endpoints and dashboard viewer](../dashboard/API.md#imported-crm-history).

The importer creates lead/customer notes and tasks using their existing provenance columns. It preserves exact text, source microsecond timestamps, completion state and source actor IDs. Schema-version 1 reviews do not create parents. Schema-version 2 reviews may explicitly create separate inquiry leads as described below. Neither mode creates clients, properties, portal accounts, agreement drafts, invoices, notifications or access grants. Won stages do not trigger onboarding. Unknown historical identities retain source IDs and null canonical projections. Creation paths with no source modifier use null `changed_by_id`, rather than attributing historical changes to the operator.

## Preparation and review

1. Verify the timestamp convention and arrange identity reconciliation and a source freeze. Use the [read-only exporter](crm-payload-export.md) to capture the source and matching inventory. Run [payload preparation](crm-payload-preservation.md) on the exact export. Preserve the source file and generated manifest in protected storage.
2. Resolve all payload blockers. Review every reconciliation issue, candidate identity and matched target. Schema-version 1 supports existing matched parents; unmatched inquiry creation requires the separate schema-version 2 plan below. A unique exported identity link does not prove the live Core link remains active: the release operator must verify/freeze those links as part of cutover preparation. The dashboard database does not own Core's identity-link table.
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

## Explicit unmatched inquiry creation

`prepareCrmImportPlan(input, inquiryMappings)` is exported by `scripts/consolidation/import-crm-payloads.mjs`. It returns a private, deterministic schema-version 2 plan for review. Supply an explicit mapping for each desired **separate inquiry**, with a newly generated lowercase UUID retained unchanged for replay:

```json
{
  "schemaVersion": 2,
  "operation": "import_reviewed_crm",
  "manifestSha256": "digest returned by prepareCrmImportPlan",
  "reviewedBy": "canonical-owner-user-id",
  "sourceFreezeVerified": true,
  "inquiryMappings": [
    {
      "action": "create_separate_inquiry",
      "sourceId": "exact-source-lead-id",
      "targetId": "new-lowercase-uuid"
    }
  ]
}
```

The digest covers the original preservation manifest, mapping identities and derived native projections. Mapping order does not change it. The importer recomputes the plan; callers cannot supply arbitrary projected fields. The original source export/preparation format and schema-version 1 digest remain unchanged. The `sourceFreezeVerified` assertion must reflect an actual verified freeze, including any pending commercial handoff/outbox deliveries; it does not itself stop Core writes or future delivery.

Only `review_unmapped` lead proposals qualify. Matched records, clients, duplicate destinations, unsupported stages, oversized or incompatible submitted fields and all remaining blockers fail closed. This is not contact matching: shared names, addresses, email, phone or company do not merge submissions. Existing target UUIDs are never adopted by creation. The source-instance/source-ID archive and reviewed destination UUID provide replay identity; an already archived submission under another source ID is rejected.

Projection preserves contact name/email/phone, source message and channel, submitted company/address/property name/type/acreage/services/project stage/timing and attribution. Contact name never becomes a project/property title. Missing address or message uses the native empty-string representation; full null/unknown source values remain in the immutable archive. Required source creation/update timestamps and supported stage are preserved, including microseconds. Source `nextFollowUpAt` becomes `next_action_due_at`; `next_action` and `owner_id` stay null. No task text, assignee, property, client, or commercial receipt is invented. Source owner/external IDs, unknown metadata and all original fields remain archived. Staff can subsequently choose a genuine next action and assignment through the existing versioned workflow.

New leads, original source archives, existing note/task projections and audit records commit atomically. Exact replay preserves subsequent inquiry edits and uses the existing archive rather than recreating records. The importer takes the existing commercial submission advisory lock before checking live receipt identity, but does not replace the mandatory source/outbox freeze. A receipt that appears before import is an actionable mapping conflict; later unfrozen handoff delivery is outside this importer’s protection.

## Rehearsal and application

Against an explicitly selected rehearsal database, set `DASHBOARD_DATABASE_URL` using the established secret mechanism, apply the reviewed migrations, then run:

```sh
node scripts/consolidation/import-crm-payloads.mjs --input /absolute/private/crm-export.json --review /absolute/private/crm-review.json --mode dry-run
```

Dry-run executes the same transaction, eligibility checks and constraints, then rolls it back. It reports `wouldCreate` and no committed creations. It briefly takes database locks and does not simulate a source freeze.

After separate production release authority, the same command can use `--mode apply`. No default CLI mode exists. Target IDs must use canonical lowercase UUID spelling so stored mappings and replay hashes agree. Malformed UTF-8 input is rejected. Inputs are capped at 32 MiB and a batch at 10,000 total source rows. To split a larger export, retain required parent rows/inventory in each batch and prepare/review each batch independently; immutable parent snapshots replay rather than duplicate.

The transaction:

- Recomputes the manifest from the full export and checks the exact review digest; edited projections are never trusted as input.
- Locks the Owner profile and serializes imports per source instance with a transaction advisory lock.
- For new records, checks/locks current target parents, receipt matches and converted-client relationships. Archived/missing clients and stale mappings abort the batch.
- Checks canonical identity existence. Open-task assignments additionally require an active Owner or the appropriate Sales/Customers capability. Completed historical tasks may retain an existing inactive canonical assignee without granting access or creating new assigned work.
- Inserts explicitly reviewed new inquiries when applicable, notes/tasks, trigger-generated revisions, immutable archives and audit metadata in one transaction. Any constraint or audit failure rolls back the entire batch.

Standard output contains counts only. Errors do not expose customer contents, source JSON or connection credentials. A connection failure during commit can leave its outcome uncertain; retain and rerun the identical reviewed batch to reconcile rather than modifying files or manually inserting replacements.

## Replay and conflicts

Exact archived source/projection/target matches replay without writing again. The native record must still exist with the same provenance and parent. Replays deliberately do not reapply old task text, assignment or completion: later native edits remain intact, even if the historical assignee is now inactive. Current Owner eligibility is still required. Existing archives are immutable and new source changes or mapping changes conflict rather than replacing history. A future incremental-sync contract would require separate design; this importer expects a frozen source.

Preexisting native provenance without its reviewed archive is rejected, not automatically adopted. Duplicate target-parent mappings across batches are blocked by database constraints. Audit rows retain source identifiers/hashes and the review digest without copying contact/message payloads into logs.

## Verification and rollback

`node scripts/test-dashboard.mjs` runs the importer tests against a disposable PostgreSQL instance and replays migrations. Coverage includes dry-run, simultaneous apply/replay, exact source storage, original target/receipt preservation, task edits surviving replay, stale target/identity/assignment checks, immutable archives, late audit-failure rollback, provenance conflicts, cross-batch parent uniqueness and actual CLI behavior. Offline preparation/reconciliation tests remain separate.

For additive plans, pass the exact review file to the read-only verifier:

```sh
node scripts/consolidation/verify-crm-import.mjs --input /absolute/private/crm-export.json --output /absolute/private/new-verification.json --review /absolute/private/crm-review.json
```

This independently checks actual inquiry values, microsecond dates, the original contact-field revision, source archive contents, audit records and receipt mappings. A later legitimate inquiry edit is reported as `native_inquiry_current_values_differ`; it is not overwritten or treated as proof the initial import failed. Existing inquiry history does not capture every structured field, so this tool cannot reconstruct historical versions of all such fields. Matched targets are not compared against source contact values: they must remain unchanged by import, verified against a protected before/after target snapshot in the rehearsal. Receipt identities are checked against the reviewed inventory. The report remains read-only and never certifies a source freeze or release authority.

Use the [read-only post-import verifier](crm-import-verification.md) with the complete source export to check archives, native origin/history and audit/receipt mappings. Before production cutover, verify per-source counts/content hashes, note/task projection counts, role-separated UI/API visibility and all reconciliation exceptions against the frozen source. Retain a database backup and rehearse restoration. Application rollback should retain the additive archive and native history; deleting immutable source/history records is not a rollback mechanism. Correcting an erroneous applied mapping requires an explicitly reviewed recovery procedure or restoration, not a casual rerun with changed inputs.

Production source extraction/freezing, reviewed unmatched-inquiry mappings, complete source-field functionality, full import reconciliation/restoration rehearsals and `/admin/` retirement remain open release gates.
