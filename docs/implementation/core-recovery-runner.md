# Core recovery runner and remaining retirement gates

September 19, 2026. The historical P1 archive now passes isolated row/sequence recovery; see [actual evidence](core-recovery-acquisition-2026-09-19.md). Application/media recovery and retirement remain incomplete.

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

The runner now defaults to `postgres:18-alpine` and accepts `--postgres-image` for a reviewed production-compatible image or immutable digest. The parent verified that Core's connection binds to the Railway PostgreSQL 18 service without exposing credentials. Evidence records the resolved PostgreSQL image ID/version, runtime image ID, lockfile hash, source/migration hashes and original archive hash.

Before restoration, a dedicated Node 22 Linux runtime image is built using the existing Core `package-lock.json` and `npm ci --ignore-scripts`. This preparation requires registry/network access; it occurs before the isolated rehearsal. Only package manifests, tsconfig, and allowlisted TypeScript/SQL/JSON beneath server/shared/p1-migrations enter the temporary build context. No archive, `.env`, host node_modules, or provider environment enters that image. This avoids macOS native dependencies in Linux. Source symlinks are rejected.

PostgreSQL runs on a dedicated Docker `--internal` network, with no host-published ports and no install/pull at runtime. The child shares that exact PostgreSQL container network namespace (`--network container:<owned fixture>`) and connects through `127.0.0.1` in test mode. This preserves the application’s non-loopback TLS enforcement rather than weakening it or inventing Railway identity. Before starting the child, the runner verifies PostgreSQL has only the owned internal attachment and the child’s NetworkMode matches the exact immutable ID resolved from the owned fixture. A synthetic Docker create/inspect check verified that Docker normalizes the supplied container name to its ID; missing/incorrect IDs fail before child execution. The child has read-only root filesystem, dropped capabilities and only the private archive mounted read-only; synthetic database/session values are supplied explicitly. It never starts HTTP/application/worker processes. Current migrations run first, then the real restore service and row comparisons; sequence values and is_called state are independently checked against restored MAX values. Migrations and comparisons run again. This repeats the current migration ledger created before restore; it does not prove previous-image compatibility or an application startup/rollback. Aggregate output suppresses raw logs and database content. Cleanup verifies removal of the child, database/volumes, internal network and runtime image.

Validation: eleven synthetic offline tests pass, covering provenance, unchanged input bytes, migration fingerprinting, source allowlist/symlinks and Docker isolation command construction. Python compile also passes. The separate genuine-archive rehearsal also passed Linux runtime, row and catalog-sequence checks; see the evidence linked above. Preparation failures remain fail-closed with a stage-only report; no raw logs are published. The original backup is never rewritten.


## Evidence still required

- Fresh Core backup identity, age, compressed hash, schema/row preservation and successful application startup against an isolated restored database. Database credentials/settings ciphertext can be compared without provider keys; that does not verify decryption/provider recovery.
- Media object recovery: Core snapshots contain `cms_media` rows and a count, not the corresponding object bytes. Obtain a privately retained object manifest and immutable copies/version identifiers; restore to an isolated storage boundary, compare byte checksums and content metadata, then verify application asset delivery against that isolated boundary. Do not overwrite source objects or treat ETags alone as universal content checksums.
- Application rollback: record exact public, Dashboard, Core and worker revisions/images and environment contract; start the candidate against restored additive schema, then the previous compatible application image against that same schema. Verify login/capability checks, public content, preview/media, intake durability and queued-job compatibility without live external delivery. Do not down-migrate to make an old image start.
- Source-freeze/migration ordering: finish reviewed identity/account/grant and CRM mappings first; arrange a coordinated write freeze and consistent exports across both stores, apply additive destination migrations, run approved import, independently reconcile, then test workflows before release. Current read-only identity inventory does not prove suspension, verification, MFA, detailed grants or property scopes. Retain rollback revisions, archives and rejected/unmatched records.
- Retirement inventory: enumerate retained admin page routes, deep links and API consumers, map each to native parity or explicit disposition, and test canonical redirects plus authorization. Keep public/media/preview/intake and bridge/worker endpoints required by consumers. A blanket `/admin` redirect or deleting Core would not satisfy this migration.

## Backup UI parity

The retained implementation has GET status, POST run and POST restore under `/api/admin/system/backups`; restore is real database replacement, not merely a download. The native destination must retain status/configuration/retention/history, manual backup and a deliberately confirmed restore with exact backup identification. Owner-only grant enforcement must remain server-side. Preserve the shared session advisory lock, exact stack identity checks, transaction rollback, safe configured storage-prefix checks and post-commit settings cache invalidation. Other replicas' caches require explicit restart/expiry handling after restoration. Exercise restore only against isolated fixtures during acceptance, never production as a UI test.

`docs/implementation/consolidation-acceptance.md` remains the broader acceptance source of truth. The existing Dashboard restore evidence does not close these Core/media/retirement gates.
