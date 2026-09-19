# Verified next implementation boundaries — September 19

## Public identity delivery

Implemented public identity delivery now projects validated Design Branding into the same SSR/hydration/navigation snapshot. All 3,259 existing CMS field identities are preserved. See [public identity delivery](public-website-identity.md). Release and live read-only verification passed at `4d85894`; actual Owner edit acceptance remains distinct from synthetic tests. The default disk cache survives process restarts only when its filesystem survives; it does not guarantee recovery across replaced containers.

## Native Backups and recovery

Native status/run is released at `47e8136` with Owner read-only verification; see [backup contract and live evidence](website-backups-contract.md). Ten real archive summaries are available, latest September 18 with P1 provenance, 52 tables and 519 rows. Secure archive acquisition is recorded separately below; isolated restore acceptance is tracked in that evidence. The history screen alone does not supply object bytes or prove recovery.

Retained operations are status, manual run (snapshot upload and retention pruning), and restore by key (database replacement). Native parity must retain all three with Owner enforcement, exact stack/provenance checks, storage-prefix checks, shared advisory lock 880120441, transactional rollback, cache invalidation and no replay on uncertain response. Restore requires an explicit destructive confirmation; do not perform a production restore for acceptance. Manifest media counts are references, not backed-up object bytes.

Read-only Railway metadata identified service Postgres `7913729e-39e9-45a9-ac58-ceb18711a0a6`, successful deployment `335faa38-fd8a-46cc-a615-4a942c2df1b9`, image `ghcr.io/railwayapp-templates/postgres-ssl:18`. The Core binding has now been matched privately; the isolated runner now uses a PostgreSQL18 fixture with verified internal networking and a loopback-only shared namespace. A trusted Core archive is now privately acquired; see [acquisition evidence](core-recovery-acquisition-2026-09-19.md). The verified Core connection matches the PostgreSQL 18 service. The configured uploads namespace was empty at acquisition, which does not prove all media recovery. Authenticated backup status can provide manifest metadata without database rows or credentials; a Railway snapshot UUID alone is insufficient.

CRM/account reconciliation, agreement/crew/offline acceptance and safe retained-admin retirement remain governed by consolidation-acceptance.md. QuickBooks/Twilio remain deferred.
