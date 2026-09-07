# Core live storage and recovery evidence

Read-only inspection of the currently deployed Core service on September 5 local time
(2026-09-06 00:05–00:06 UTC). Source revision is `f09e9d4`; Node is 22.23.2.
No production setting, row, object or deployment was changed.

- Upload R2 settings are present and their credentials successfully authenticated a HEAD
  of the exact object referenced by the CMS. Bucket: `core-platform`. The object exists,
  is `image/webp`, and its 199,788-byte length matches the CMS record. It is unprefixed.
  This proves read availability for that object, not write permission or dedicated ownership.
- The other CMS record references a local upload. That file is absent from the running
  container (`ENOENT`); no matching filename or original filename was found in the three
  Core checkouts. Its URL occurs in no other table in the inspected backup. The R2 media
  URL is referenced by one event. Equal recorded sizes do not prove these two media records
  contain the same image; do not substitute one for the other without content evidence.
- `CLIENT_STACK_ID`, `PUBLIC_SITE_ORIGIN`, `BACKUP_R2_PREFIX` and the four dedicated
  backup R2 environment variables are unset. Backups currently use application R2 settings
  and the legacy `system-backups` prefix. The production bucket's cross-client ownership
  boundaries have not been established by this inspection.
- The current database has zero duplicate non-null order/variant groups for the exact
  `order_paid` predicate relevant to migration 0049. This is point-in-time evidence;
  concurrent writes and later changes still require cutover checks.
- The exact latest backup manifest was readable. It describes 94 tables and 391 rows,
  was created at 00:01:45 UTC from `f09e9d4`, and has no client stack identity.
  An exact-key download was restricted to the existing `system-backups/db/` prefix;
  no bucket-wide scan was used. The compressed snapshot was 173,210 bytes.

The actual candidate restore and subsequent migration replay both preserved all snapshot
rows, original columns, counts and values in an owned disposable PostgreSQL instance.
Root independently repeated the rehearsal under Python optimization. See the
[aggregate report](core-recovery-2026-09-05.json) for the exact backup and source hashes.
Both fixtures and their volumes were removed; the private downloaded snapshot was deleted
after verification. No backup content or credentials were committed.

Remaining release work: establish the stable stack/storage ownership contract, prepare and
verify any scoped namespace copies, resolve or explicitly track the missing unused media
record, confirm original encryption-secret recovery and provider operation separately, and
exercise rollback/controlled replacement. Database recovery does not recover missing media.

Hosted Verify for candidate `9a8bf1a` passed as run `34000263302`, including the populated
upgrade, atomic settings database tests, compiled production runtime and 34 browser journeys.
