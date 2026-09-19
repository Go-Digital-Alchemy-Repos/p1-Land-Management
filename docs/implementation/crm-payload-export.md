# Read-only CRM export bundle

Status: implemented and tested against disposable databases using the actual Core CRM migrations. A private read-only production payload export completed September 19; source freeze and import have not run. The exporter reads CRM payloads and a limited matching inventory; it never modifies either database.

## Run

Use the workspace Node 24 runtime (or a runtime supporting source-aware JSON parsing, checked by the tool). Supply `CRM_SOURCE_DATABASE_URL` for Core and `DASHBOARD_DATABASE_URL` for the destination through the established secret mechanism. Prefer read-only database credentials. The command also starts both transactions as `REPEATABLE READ READ ONLY` and checks their read-only setting.

```sh
node scripts/consolidation/export-crm-payloads.mjs --source-instance VERIFIED_SOURCE_INSTANCE --source-timezone UTC --output /absolute/private/new-crm-export
```

The source instance must be the verified historical commercial handoff issuer. The timezone argument is mandatory: Core CRM timestamps lack timezone information. Confirm the historical source timestamp convention before choosing UTC or a PostgreSQL-recognized timezone such as `America/New_York`. The database's current session timezone alone does not prove its historical convention.

The output directory must not exist. It is created with mode 0700 and contains mode-0600 files:

- `export.json`: complete camel-case source rows and the matching target/identity inventory, accepted by payload preparation and the reviewed importer.
- `manifest.json`: full preservation manifest and reconciliation findings.
- `evidence.json`: transaction snapshot identifiers/times, supplied timezone, availability of archive/identity mappings, counts and SHA-256 hashes of the exact first two files. Written last.

Standard output contains counts only. Errors do not print source data or connection credentials. Files contain private CRM/form/metadata contents; keep them outside Git and in protected storage. Never treat a partial directory as complete: require valid evidence and verify both file hashes. The bundle supplements database backups; it is not a full Core backup or proof that all `/admin/` data has been migrated.

## Coverage and consistency

The exporter enumerates all six supported `crm_*` tables, checks their persisted column names against the payload contract, and rejects unknown/missing tables or columns. It verifies expected timestamp and JSONB storage types. Actual Core migration tests cover special address column names as well as ordinary camel-case mapping. This deliberate rejection prevents a newly deployed CRM field/table from disappearing from the export unnoticed.

Each database supplies a consistent transaction snapshot. A concurrent source change after the snapshot does not mix newer client values with earlier leads. The two database snapshots are independent, not a distributed transaction. Evidence always retains `sourceFreezeVerified: false` and `releaseApproval: false`; arrange and verify a freeze separately for cutover, then export again.

The source inventory selects only canonical/Core IDs and revocation times from `p1_identity_link`. It excludes sessions, credentials and grant secrets. If the identity-link table is absent, evidence explicitly reports that absence, identity links remain empty and reconciliation identifies unresolved people. A present but incompatible identity schema is rejected. The target inventory contains only lead status/conversion IDs, client/user IDs, receipt identities and existing parent archive mappings for this source instance. An absent archive table is explicitly recorded, enabling pre-migration inventory without inventing mappings.

Each collection is capped at 100,000 records, and the input bundle at 32 MiB. Uncompressed source row sizes are checked before transfer, then the complete export size is checked again. Oversized data fails rather than producing a truncated export. The importer has its own 10,000-row batch cap; retain the complete export, then prepare and review explicit smaller batches with their required parent/inventory rows if needed.

## Timestamps and JSON precision

Timestamp conversion happens in PostgreSQL and preserves six fractional digits. Null source dates remain null; preparation marks records that cannot populate native non-null dates. UTC export retains the naive wall values as explicitly asserted UTC instants. For other named zones, the exporter checks candidate offsets observed within 72 hours on six-hour samples and rejects timestamps with zero or multiple valid mappings. Tests cover New York spring gaps, fall folds and ordinary winter conversion. This check does not establish the source's historical convention or prove every unusual historical timezone transition; verify such history explicitly before release instead of accepting a guessed conversion.

JSONB source columns are transferred as text and parsed with numeric-token checks. Preparation and import use the same checked parser for input files. A decimal, oversized integer, underflow or overflow that would change through JavaScript numeric parsing is rejected before a manifest/import is produced. Representable numeric formatting differences are accepted. Unsupported numeric values require a separately reviewed lossless representation; they must not be coerced merely to pass export. Original string contents, note whitespace, array ordering and microseconds remain preserved.

## Validation and next steps

`node scripts/test-dashboard.mjs` covers the actual source migrations, read-only transaction evidence, export→prepare→import→re-export/replay, private exclusive bundles and hashes, the real CLI, concurrent source edits, schema/type drift, missing identity linkage, JSON numeric precision and timezone cases. Offline migration tests cover the JSON parser and preparation contracts.

Review the manifest using [payload preservation](crm-payload-preservation.md), then follow [reviewed import](crm-payload-import.md). Production source convention/freeze verification, unresolved mappings, unsupported values, full field functionality, archive access, count/checksum reconciliation, restore rehearsal and admin retirement remain release gates. No production release authority is granted by this command.


## Actual private export — September 19, 2026

The exported snapshot contains three leads and zero clients, lead/client notes or
lead/client tasks. Its source lead IDs exactly match the prior metadata capture.
One lead has a receipt-backed parent match; two remain blocked by
`parent_mapping_requires_review` (source stages New and Contacted). No automatic
mapping, source freeze, import, account grant or operational onboarding occurred.

UTC was selected for this specific snapshot using independent evidence: all three
naive lead creation values, interpreted as UTC, follow linked form-effect jobs’
absolute timestamps by approximately 6–20 seconds. The supported follow-up and
edited timestamp writers serialize JavaScript dates to ISO UTC. This is a documented
snapshot-specific inference assuming the inspected application writers, not a claim
that every historical naive timestamp in every Core instance is UTC. A different
source inventory requires renewed convention review.

Private bundle pointer: `/tmp/p1-crm-payload-private-path`. Bundle directory mode0700;
export, manifest and evidence files mode0600. Both database snapshots reported
transaction_read_only=on; no database writes were performed. Database endpoints
remain private: the export ran over authorized Railway SSH with the destination
connection passed through stdin, not command arguments or logs. No public database
endpoint or persistent credential was created.

Verified SHA256:
- export.json: `09354af6ee30f1f7454d16f32b0eb5237f4725c43db0f588d26e716342f2174a`
- manifest.json: `e25fe573b11ddb827998b365b664d7635beb54650166c500b45fa48f03590a89`

An initial read-only acquisition attempt failed at a wrapper assertion referencing
an incorrect result key after export; it produced no usable bundle and no writes.
The corrected attempt used the actual records contract, checked the three-lead
inventory, and wrote evidence last. Reviewed mapping, isolated actual-payload import
rehearsal, fresh frozen-source export and final migration acceptance remain open.
