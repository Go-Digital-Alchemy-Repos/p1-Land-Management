# Core recovery runner and remaining retirement gates

September 19, 2026. This checkpoint is a code review and synthetic runner validation, not a completed P1 Core/media restore or permission to retire `/admin`.

## Corrected runner

`platform/p1-core/script/verify-backup-recovery.py` now supports identified P1 snapshots without removing or changing their provenance. The operator supplies the reviewed expected stack ID; a missing/mismatched identity is rejected before Docker/database activity. The child also calls the application's identity guard and restore service. Legacy snapshots require a separate explicit flag; it cannot bypass an identified mismatch.

The evidence digest now includes `p1-migrations/*.sql` and `p1-migrations/meta/_journal.json`, the migration source consumed by `server/migrate.ts`. Previously it fingerprinted the unrelated upstream `migrations` folder.

From the repository root, with Docker available, dependencies installed and a privately downloaded, trusted, owned mode-0600 Core JSON gzip backup:

```sh
python3 platform/p1-core/script/verify-backup-recovery.py \
  --backup /private/path/p1-core.json.gz \
  --expected-stack-id p1-land-management \
  --output /private/path/p1-core-recovery-evidence.json
```

The ID above is illustrative: use the independently verified P1 deployment identity matching the snapshot, not a guessed value. For a reviewed historical snapshot genuinely lacking identity, replace `--expected-stack-id ...` with `--allow-legacy-backup`. The two options are mutually exclusive. The older upstream recovery document's command without either option is superseded by these commands.

The runner creates its own temporary PostgreSQL 16 container and loopback-only port, strips inherited provider/application configuration, runs candidate migrations, restores using the actual application function, compares original-column row multisets and reruns migrations/comparisons. It never starts application/worker processes. Only aggregate results are reported; child output is withheld. Cleanup removes the owned container/volumes. The original archive is unchanged. This does not verify application startup or establish that PostgreSQL 16 matches the current production major version; verify that before choosing the final rehearsal fixture.

Validation: `python3 platform/p1-core/script/test_verify_backup_recovery.py` passed five synthetic offline tests: exact-match byte preservation, mismatch rejection including legacy override attempts, explicit legacy acknowledgement, rejection before any subprocess/database activity, and actual P1 SQL/journal fingerprint coverage. No real archive or database was restored in this checkpoint.

## Evidence still required

- Fresh Core backup identity, age, compressed hash, schema/row preservation and successful application startup against an isolated restored database. Database credentials/settings ciphertext can be compared without provider keys; that does not verify decryption/provider recovery.
- Media object recovery: Core snapshots contain `cms_media` rows and a count, not the corresponding object bytes. Obtain a privately retained object manifest and immutable copies/version identifiers; restore to an isolated storage boundary, compare byte checksums and content metadata, then verify application asset delivery against that isolated boundary. Do not overwrite source objects or treat ETags alone as universal content checksums.
- Application rollback: record exact public, Dashboard, Core and worker revisions/images and environment contract; start the candidate against restored additive schema, then the previous compatible application image against that same schema. Verify login/capability checks, public content, preview/media, intake durability and queued-job compatibility without live external delivery. Do not down-migrate to make an old image start.
- Source-freeze/migration ordering: finish reviewed identity/account/grant and CRM mappings first; arrange a coordinated write freeze and consistent exports across both stores, apply additive destination migrations, run approved import, independently reconcile, then test workflows before release. Current read-only identity inventory does not prove suspension, verification, MFA, detailed grants or property scopes. Retain rollback revisions, archives and rejected/unmatched records.
- Retirement inventory: enumerate retained admin page routes, deep links and API consumers, map each to native parity or explicit disposition, and test canonical redirects plus authorization. Keep public/media/preview/intake and bridge/worker endpoints required by consumers. A blanket `/admin` redirect or deleting Core would not satisfy this migration.

## Backup UI parity

The retained implementation has GET status, POST run and POST restore under `/api/admin/system/backups`; restore is real database replacement, not merely a download. The native destination must retain status/configuration/retention/history, manual backup and a deliberately confirmed restore with exact backup identification. Owner-only grant enforcement must remain server-side. Preserve the shared session advisory lock, exact stack identity checks, transaction rollback, safe configured storage-prefix checks and post-commit settings cache invalidation. Other replicas' caches require explicit restart/expiry handling after restoration. Exercise restore only against isolated fixtures during acceptance, never production as a UI test.

`docs/implementation/consolidation-acceptance.md` remains the broader acceptance source of truth. The existing Dashboard restore evidence does not close these Core/media/retirement gates.
