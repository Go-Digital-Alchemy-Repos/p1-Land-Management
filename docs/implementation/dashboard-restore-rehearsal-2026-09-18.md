# Dashboard backup restore rehearsal — September 18, 2026

Candidate application/migration source: `140a412dae1d9e784de85b9a26589db555d31b20`.

The private September 17 production dashboard backup was checksum-verified and restored into temporary PostgreSQL 18, matching the source major version. The container had no network, no published ports and a RAM-backed database directory. No application, worker, provider client, email or SMS process ran. It was removed after validation; the original backup was unchanged. No production database was queried or modified during this rehearsal.

## Executed checks

- Restore used `pg_restore --exit-on-error --single-transaction --no-owner --no-acl`.
- Existing migration checksums matched source, including preservation of the historical ledger-only entry. Nineteen pending source SQL migrations applied in one advisory-locked transaction, taking the ledger from 31 to 50 entries and schema from 75 to 84 tables.
- Every preexisting table's original-column row multiset matched before/after, excluding the migration ledger's expected additions. No private record contents were written into evidence.
- A fresh custom-format dump of the migrated database restored into a second isolated database. All table columns and row fingerprints matched; normalized schema-only dumps (including constraints, indexes and triggers) and sequence states also matched.
- All checked-in migration checksums matched the final ledger. The SQL replay used the migrator's transaction/order/checksum semantics; it did **not** execute the Node application migrator or establish application startup compatibility.
- No `p1-isolated-restore-*` containers remained after completion.

## Reproduction

Run from the repository with Docker available and the private archive accessible locally:

```sh
python3 scripts/consolidation/rehearse-dashboard-restore.py \
  --dump /private/path/dashboard.dump \
  --expected-sha256 7d509ebdad328ad5ede44a3baa61e0cce6cf0f6d4c32cbba62976f8941cb9ecc
```

The script emits only evidence metadata. It suppresses raw database errors, which can contain customer data. Restore input must be a trusted P1 backup. Container cleanup occurs in `finally`; if the host or process is killed externally, remove only that rehearsal's named container. Never substitute production connection settings.

## Result

```json
{
  "status": "passed",
  "sourceBackupSha256": "7d509ebdad328ad5ede44a3baa61e0cce6cf0f6d4c32cbba62976f8941cb9ecc",
  "image": "postgres:18-alpine",
  "sourceTables": 75,
  "migratedTables": 84,
  "sourceLedgerEntries": 31,
  "candidateLedgerEntries": 50,
  "appliedMigrations": [
    "0028_business_access.sql",
    "0029_agreement_template_library.sql",
    "0030_agreement_composition_drafts.sql",
    "0031_estimate_document_snapshots.sql",
    "0032_agreement_draft_pricing.sql",
    "0033_estimate_allocations.sql",
    "0034_composed_estimate_preparation.sql",
    "0035_composed_estimate_issuance.sql",
    "0036_recurring_visit_authorization.sql",
    "0037_composed_revisions.sql",
    "0038_composed_change_orders.sql",
    "0039_lead_notes.sql",
    "0040_crm_follow_up_tasks.sql",
    "0041_customer_note_provenance.sql",
    "0042_inquiry_history_index.sql",
    "0043_lead_detail_history.sql",
    "0044_crm_source_archive.sql",
    "0045_crm_archive_parent_indexes.sql",
    "0046_lead_customer_onboarding.sql"
  ],
  "originalRowsPreserved": true,
  "migratedRestoreMatches": true,
  "currentMigrationChecksumsMatch": true,
  "schemaAndSequencesMatch": true,
  "network": "none",
  "hostPorts": []
}
```

## Remaining recovery acceptance

This verifies the September 17 dashboard archive and additive consolidation migration path. It does not establish a current backup's freshness, Core database/media recovery, real CRM/account migration, application image rollback, secret/provider recovery, RTO/RPO, or safe legacy admin retirement. These remain explicit acceptance gates. Do not remove `/admin` or perform down-migrations based on this result.
