# CRM record reconciliation before migration

Status: local read-only tooling. No production inventory or CRM import has run.

Core CRM leads and dashboard Sales leads are separate stores. Commercial form handoffs already create dashboard leads keyed by `(source_instance_id, submission_id)` in `commercial_intake_receipt`. Migrating Core `crm_leads` as new dashboard leads without checking those receipts would duplicate inquiries. Core `crm_clients` are also distinct from operational dashboard clients; a source Won stage is not authority to create operational clients/properties or invite anyone.

Run:

```sh
node scripts/consolidation/reconcile-crm.mjs --input /absolute/private/crm-inventory.json --output /absolute/private/crm-report.json
node --test scripts/consolidation/reconcile-crm.test.mjs
```

The command reads an offline projection and exclusively creates a mode-0600 report. It has no database connection, network access, account-linking or import behavior. It never matches contact names, email addresses, phones or company names. A successful command means the relationships were analyzed, not that migration or cutover is approved. Both `automaticImportAllowed` and `releaseApproval` remain false. Inputs are limited to 32 MiB and 100,000 rows per collection.

## Exact inventory projection

Every collection is required; use empty arrays when genuinely empty. Every listed field is required, including explicit nulls. Unknown fields and duplicate record IDs are rejected. Exclude names, addresses, emails, note bodies, task titles, form data, credentials and session material from this projection. Keep full source exports separately for the later content-preservation reconciliation; this report is not a backup.

```json
{
  "schemaVersion": 1,
  "sourceInstanceId": "core-instance-id",
  "coreLeads": [
    {
      "id": "core-lead",
      "stage": "won",
      "formSubmissionId": "submission",
      "ownerId": "core-user"
    }
  ],
  "coreClients": [
    {
      "id": "core-client",
      "sourceLeadId": "core-lead",
      "ownerId": null,
      "accountOwnerId": "core-user"
    }
  ],
  "coreNotes": [
    {
      "id": "note",
      "entity": "lead",
      "parentId": "core-lead",
      "createdById": "core-user"
    }
  ],
  "coreTasks": [
    {
      "id": "task",
      "entity": "client",
      "parentId": "core-client",
      "createdById": null,
      "assignedToId": "core-user",
      "completed": false
    }
  ],
  "dashboardLeads": [
    { "id": "lead", "status": "won", "convertedClientId": "client" }
  ],
  "dashboardClients": [{ "id": "client" }],
  "canonicalUsers": [{ "id": "user" }],
  "identityLinks": [
    { "coreUserId": "core-user", "canonicalUserId": "user", "revokedAt": null }
  ],
  "recordLinks": [],
  "receipts": [
    {
      "sourceInstanceId": "core-instance-id",
      "submissionId": "submission",
      "leadId": "lead"
    }
  ]
}
```

Use the real Core `COMMERCIAL_HANDOFF_SOURCE_INSTANCE_ID`, matching the historical receipt issuer. Do not export its signing secret. If source-instance identity changed historically, prepare a separately scoped inventory for each verified instance; never pool submission IDs across issuers.

| Collection         | Source projection                                                                                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `coreLeads`        | Core `crm_leads`: ID, stage, form submission ID, owner ID.                                                                                                                                                      |
| `coreClients`      | Core `crm_clients`: ID, source lead ID, owner and account owner IDs. Keep those two owner fields distinct.                                                                                                      |
| `coreNotes`        | Union of `crm_lead_notes` and `crm_client_notes`, with `entity`, source parent ID and creator ID.                                                                                                               |
| `coreTasks`        | Union of `crm_lead_tasks` and `crm_client_tasks`, with source parent, creator, assignee and completed state.                                                                                                    |
| `dashboardLeads`   | Dashboard `lead`: ID, status and converted client ID.                                                                                                                                                           |
| `dashboardClients` | Dashboard `client` IDs.                                                                                                                                                                                         |
| `canonicalUsers`   | Canonical `user` IDs, including historical identities. This is not an eligibility/grant review.                                                                                                                 |
| `identityLinks`    | Core `p1_identity_link`: both active and revoked link history.                                                                                                                                                  |
| `recordLinks`      | Existing reviewed CRM migration mappings, each `{ "entity": "lead" or "client", "sourceId": "...", "targetId": "..." }`, scoped to the top-level source instance. Do not manufacture them from contact matches. |
| `receipts`         | Dashboard `commercial_intake_receipt`: source instance, submission and lead IDs.                                                                                                                                |

## Reading the report

`review_existing` identifies a record-ID candidate supported by an explicit mapping, commercial receipt, or already-converted dashboard lead/client relationship. `review_unmapped` means no such identity match was supplied; it is not an instruction to create a new record. `blocked` denotes ambiguous or conflicting record identity. Conflicting explicit/receipt mappings, duplicated submissions, multiple source records targeting one destination, missing parents/targets and blocked parent mappings remain explicit findings. Client derivation from a blocked lead is blocked too.

Source and dashboard stage differences are reported for reconciliation; neither side automatically wins. Missing, revoked, duplicate or dangling identity links produce distinct owner, account-owner, author or assignee findings. Null historical authors remain null; the tool never substitutes the current Owner. Before assignment in the eventual importer, validate current active status and the required Sales/Customers grant separately.

Issue references contain up to 20 sorted related IDs plus `relatedTotal`; every affected source record still receives its own issue. Reports are deterministic for equivalent input order and include a digest of the exact input file. Retain original inputs/reports and rerun after reviewed corrections.

## Remaining migration contract

This preflight does not compare or copy payload content, timestamps, due dates, source metadata or status history. Those must be preserved and reconciled by the importer. No existing dashboard lead/client fields should be overwritten merely because a Core record matches a receipt.

- Reuse matched dashboard leads. Keep original submission snapshots and explicit source record mappings; preserve additional CRM notes/tasks rather than re-running form intake.
- Resolve source client links against existing operational clients. Won status alone must not trigger onboarding, access grants, property creation or billing.
- Lead notes have a native append-only Sales workflow (`0039_lead_notes.sql`), and inquiry/customer tasks have a native versioned workflow with preserved revisions (`0040_crm_follow_up_tasks.sql`). Source-ID-safe payload import remains open. Customer notes extend the existing store with source provenance and nullable historical authors (`0041_customer_note_provenance.sql`); both workspace projections retain those records through left joins. The full-history endpoint and native composer remain Customers-controlled. No payload import has run.
- Retain completed tasks, original authors/assignees, due dates, creation/update times and both source owner fields. An unresolved author/owner must be preserved for review, never silently assigned to the migration operator.
- Verify field-level payload reconciliation, idempotent replay, audit history, version conflicts, counts and checksums, restoration/rollback, scoped UI/API access and frozen-source cutover before retiring Core CRM.

The full consolidation remains in progress; this tool resolves the record-identity preflight requirement only.

## Payload preparation checkpoint

[CRM payload preservation](crm-payload-preservation.md) now defines and implements a strict full-row preservation manifest for all six Core CRM tables. It derives this relationship preflight from the same payload rows, records deterministic per-record/content hashes, retains fields without native counterparts and flags incompatible note/task payloads. This advances payload reconciliation preparation; a [reviewed matched-record importer](crm-payload-import.md) now archives source snapshots and transfers notes/tasks in a transaction. Production application, full field reconciliation and retirement still require the documented release gates.

## Actual metadata capture — September 19, 2026

`crm-capture.mjs` uses explicit metadata projections, verified repeatable-read
read-only transactions, statement/lock timeouts, row/byte bounds and snapshot
digests. Private Railway SSH captures found three Core leads, no Core clients,
notes or tasks, and one identity link. Dashboard has one lead, one client, eight
users, one source-matched receipt and no archive mappings. The expected six Core
CRM tables exist. No contact details, form bodies, credentials or content payloads
were exported by this metadata capture.

Strict offline reconciliation found zero conflicts, one receipt-backed
`review_existing` proposal and two `review_unmapped` proposals. This is not mapping
approval or migration completion. Inventory SHA256:
`dc0a783ff5899b27f1332771915948aea7b15fd2aed8f406e340916799a54679`; report SHA256:
`a6fb4a22a61ea36fb71a95d591678e4c240f520102e03117cf30f70753823dd2`.
Private directory pointer is `/tmp/p1-crm-metadata-private-path`; directory mode0700,
files mode0600. Capture/reconciliation tests:15 passed.

Snapshots are sequential, not source-frozen across stores. Explicit proposal review,
content-preserving payload export, coordinated freeze and verified import remain
required. No production records, credentials or provider settings were changed.
