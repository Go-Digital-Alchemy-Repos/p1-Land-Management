# CRM payload preservation manifest

Status: implemented offline preparation; database import, source extraction and cutover remain open. This command does not connect to Core or the dashboard, create records, merge customers, assign staff or grant access.

```sh
node scripts/consolidation/prepare-crm-payloads.mjs --input /absolute/private/crm-export.json --output /absolute/private/crm-payload-manifest.json
node --test scripts/consolidation/prepare-crm-payloads.test.mjs scripts/consolidation/reconcile-crm.test.mjs scripts/consolidation/reconcile-identities.test.mjs
```

The input and output contain private customer/contact data, note bodies and arbitrary historical form/metadata contents. Keep both outside the repository in protected storage. The output is exclusively created with mode 0600, never overwritten, and the CLI prints counts only. Failures do not print input contents. The 32 MiB input and 100,000-record-per-collection limits fail rather than silently dropping records. Keep original source exports: the manifest is preparation evidence, not a replacement for database backups.

## Input contract

The top-level object has exactly these keys:

- `schemaVersion`: `1`.
- `sourceInstanceId`: the verified historical Core handoff issuer, matching the receipt inventory.
- `records`: all six required arrays: `leads`, `clients`, `leadNotes`, `clientNotes`, `leadTasks`, `clientTasks`.
- `targetInventory`: all six required inventory arrays: `dashboardLeads`, `dashboardClients`, `canonicalUsers`, `identityLinks`, `recordLinks`, `receipts`. Their exact shapes are defined in [CRM reconciliation](crm-reconciliation.md).

Use full rows with the camel-case property names from `platform/p1-core/shared/schema/crm.ts`. `payloadShapes` in `scripts/consolidation/prepare-crm-payloads.mjs` is the executable field contract. Its test compares all fields against the actual six source table declarations, so source schema changes require explicit contract updates. Unknown or missing fields, duplicate IDs within a source table, invalid types, unsupported JSON values, unsafe integers and excessive JSON nesting are rejected. IDs in different source tables remain distinct.

Lead and client rows retain all contact fields, source/form/metadata values, dates and owners, including independent `ownerId` and `accountOwnerId`. Client address, company, billing, onboarding, tags and lifecycle fields remain in the preserved parent snapshot even where the dashboard has no corresponding field. Note/task rows retain original parent, creator, assignee, completion, content and timestamps. No field is trimmed, coalesced with another field or inferred from contact matches.

Date fields require explicit UTC ISO strings with at most six fractional digits, or the source's actual null. Preserve microseconds. Core uses timestamps without time zone in these tables: determine and document the source timestamp convention before exporting to UTC; this tool never guesses a timezone or substitutes today's date. Invalid calendar dates and naive/offset timestamps are rejected. Preserve array order inside source fields such as tags or form data. Numeric metadata must be representable by the JSON/JavaScript contract; unsupported values require a separately reviewed lossless export format, not coercion.

## Manifest and reconciliation

The tool derives the relationship-only inventory directly from the full payload rows and runs the existing CRM reconciliation. It does not accept an unrelated preflight report as proof. Receipt identity, explicit reviewed links, parent relationships and conflicting mappings therefore use the same source records whose payloads are preserved.

Each manifest record contains its collection/source ID, entity/kind, source parent ID, candidate destination (only for a `review_existing` mapping), full canonical `sourceSnapshot`, SHA-256 `sourceDigest`, `nativeProjection` where applicable, blockers and action. Object key order and source collection row order do not affect the semantic content digest; order within individual payload arrays remains significant. `inputFileSha256` independently identifies the exact input bytes. Hashes detect change, not authenticity or approval.

Parent records receive `preserve_parent_snapshot` only after an existing target is identified. They have no native overwrite projection: matching a lead receipt is not permission to replace dashboard fields, and a Won source stage is not permission to onboard a customer. Unmapped or conflicting parent identities block dependent notes/tasks.

Notes and tasks receive `review_native_projection` only when the parent resolves and the payload meets native constraints. Exact note/task text and timestamps are retained. Blank/oversized content and null required creation/update dates remain in the snapshot and are flagged; the tool never truncates text or fills historical dates with import time. Unresolved historical author/assignee IDs remain in provenance while their proposed canonical IDs stay null. A unique active identity link is only an identity candidate, not proof of current Sales/Customers eligibility. Reconciliation findings remain attached for review, including stage differences and separate owner/account-owner issues.

Every manifest retains `automaticImportAllowed: false` and `releaseApproval: false`. A successful preparation command does not mean the manifest can be applied without further checks.

## Importer acceptance requirements still open

The database importer must revalidate the manifest schema/digests and reviewed source/target/identity links, lock/check current target state, recheck active assignment grants, store all source snapshots durably, and key provenance by source instance plus source table and ID. Replay must compare preserved source content rather than overwriting later native task edits. Mismatched source content or mappings must conflict explicitly. Notes, tasks, mappings, preserved snapshots and audit evidence need transactional rollback and count/checksum verification. Parent fields must not be overwritten by an archive operation.

A source extraction/freeze procedure, reconciliation of incompatible source values, unmatched parent creation policy, protected archive access, idempotent import, restore rehearsal and retirement gates remain necessary before `/admin/` can be removed. No production inventory, export, import or cutover was run for this checkpoint.
