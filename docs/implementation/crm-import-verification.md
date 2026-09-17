# CRM import verification

Status: implemented for synthetic rehearsal databases. No production verification, restore or cutover has run.

After the [reviewed import](crm-payload-import.md), run this independent read-only check against the same complete source export:

```sh
node scripts/consolidation/verify-crm-import.mjs --input /absolute/private/crm-export.json --output /absolute/private/crm-verification.json
```

Supply `DASHBOARD_DATABASE_URL` through the established secret mechanism. Use a new report path. The command creates an exclusive file with mode `0600`; stdout contains only verification status and counts. Input is limited to 32 MiB. Malformed UTF-8 and numbers that cannot be preserved exactly are rejected by the shared payload parser.

Use the full source-instance export, including when imports were applied in multiple reviewed batches. A subset deliberately reports other archives and import audit entries as unexpected. Preserve the original full export and its evidence rather than reconstructing it from mutable live records.

## What is checked

One repeatable-read, read-only transaction checks:

- Complete source/archive membership, native provenance membership and imported audit membership.
- Recomputed full archived JSON hashes against both the stored hash and source export, reviewed projection hashes, parent mappings and existing target parents.
- Receipt mappings from the exported inventory against the current receipt records.
- Exactly one matching import audit event for each archived record, including source/review digests, importer and native/parent target.
- Native note content, exact microsecond creation time, canonical author and original source identifiers.
- Task origin fields and version-one values, contiguous revision membership, and agreement between the latest revision and current task values.

Legitimate later task changes remain intact and are counted separately. The verifier checks their initial imported revision rather than requiring current task text or completion to equal the old export. A concurrent edit is excluded consistently from the transaction snapshot and becomes visible on the next verification.

Reports contain IDs, hashes, counts and issue codes, not customer messages or full source payloads. They include the exact input-file digest, semantic source/manifest digests, snapshot identifier and verification time. Hashes establish comparison evidence; they do not authenticate the reviewer or authorize a release.

## Results and limits

- Exit `0`: all checks in `crm_archive_and_native_origin` passed.
- Exit `2`: a complete report was written and contains mismatches requiring investigation.
- Exit `1`: verification/report creation failed; no complete new report can be relied on. Existing output files are never replaced.

`verified: true` applies only to this data-preservation scope. Reconciliation findings are separately counted and still require review, including unresolved historical identities. Source freeze, identity-link freshness, native product support for all archived fields, role-separated UI/API visibility and a real backup/restore rehearsal remain separate gates. The report always sets `sourceFreezeVerified` and `releaseApproval` to false.

Run against a restored rehearsal database as part of restoration validation, retaining export, review, import results and verification evidence together. This tool does not perform restoration, repair mismatches, delete records, change assignments or approve `/admin/` retirement.

## Validation

The disposable PostgreSQL dashboard suite covers missing/completed imports, preserved later task edits, changed source payloads, unexpected records/audits, lost receipts/audit records, stray revisions, independently recomputed archive hashes, read-only snapshot consistency during concurrent edits and CLI exit/file/privacy behavior. No database protections are disabled to manufacture fixtures.
