# Sections editor concurrency and recovery

Sections updates and deletes require the saved `expectedVersion`, a UUID
`editorInstanceId`, and the exact current `leaseId`. The native dashboard and
retained admin both supply this proof. Missing proof is rejected; same-user tabs
cannot borrow one another's reservation. Expired or replaced leases and stale
versions fail without changing content. Existing capability checks remain in force.

A shared PostgreSQL transaction advisory lock orders every section writer and
lease operation before its resource lock. Starter-library resets take that lock
exclusively, refuse affected active reservations, and update all templates in one
transaction. Ordinary startup seeding preserves existing edits. Explicit reset
continues the existing replacement behavior, with incremented versions.

## Deployment and rollback

Migration `0007_cms_section_concurrency.sql` adds a non-null integer version with
default 1. Deploy Core and dashboard together; an older editor must reload before
saving against the new server. The bridge forwards DELETE proof bodies. New
clients must not be pointed at an older server that lacks these checks.

Keep the additive column during application rollback. Rollback to the previous
application removes these safeguards, so suspend Sections editing during rollback
and restore the coordinated pair before resuming. Do not run a destructive down
migration or restore production data automatically.

## Verified recovery baseline

A read-only capture at 2026-09-20T02:58:47.367Z from revision
`386f108a985c8276f663ce8541ec9e3289700136` contains 57 tables and 663 rows,
including five Blog posts, 12 revisions, five import receipts and 20 media records.
Compressed archive SHA-256:
`5844932b355199d3f86fe78742363979850f486dbf445d247b8f9c8ccc674776`.
The archive is private, outside Git. An isolated PostgreSQL18 restore verified all
rows/microseconds, repeated restore receipts, sequences and migration replay;
the restore fixture was cleaned up. This is database recovery evidence, not media
file-byte or provider-object restoration evidence. It does not retire `/admin`.

## Validation

Independent parent rerun: 10 real PostgreSQL concurrency tests passed, including
competing acquisition, same-user tabs, expiry after lock waits, stale update/delete,
atomic reset rollback, reset/acquisition serialization and seed preservation.
Author checks also passed actual migration upgrade/idempotency, retained editor
and lease routes, native Sections adapters, gateway transport and Blog regression.
Parent reran Pages/menu/shared-lease regressions (11 tests), Blog settings (6), and
combined Core/dashboard type checks and production builds successfully. Dashboard
build retains its existing large-chunk warning. No production content mutation is
part of this release check. Live deployment verification is recorded separately.
