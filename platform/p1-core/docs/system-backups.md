# System Backups

This project now includes an application-level backup and restore system designed for Railway deployments.

## What it does

- Creates scheduled database snapshots in compressed JSON format.
- Uploads backups to Cloudflare R2.
- Retains backups as a rolling window with automatic oldest-first deletion.
- Exposes admin endpoints for backup status and manual backup runs.
- Includes a destructive restore script for disaster recovery.

## What it covers

- PostgreSQL application data.
- CMS data, blog data, users, settings, events, and related relational tables.
- Backup metadata describing app version, Git commit SHA, Railway environment, and restore order.
- Backup metadata identifying `CLIENT_STACK_ID` when configured.

## What it does not fully replace

- Railway deployment rollback for app code.
- Railway-native database or volume snapshots.
- Cloudflare R2 bucket versioning for uploaded media files.

For strongest protection, use this together with:

- Railway deployment rollback.
- Railway-native database backups.
- Cloudflare R2 bucket versioning or object lock for media where available.

## Storage configuration

The backup system supports two storage modes:

1. Recommended: dedicated backup bucket via environment variables.
2. Fallback: the existing Cloudflare R2 CMS/media configuration from the admin integrations settings.

### Recommended environment variables

- `SYSTEM_BACKUPS_ENABLED=true`
- `SYSTEM_BACKUP_INTERVAL_HOURS=24`
- `SYSTEM_BACKUP_RETENTION_DAYS=30`
- `SYSTEM_BACKUP_MAX_SNAPSHOTS=30`
- `BACKUP_R2_ACCOUNT_ID=...`
- `BACKUP_R2_ACCESS_KEY_ID=...`
- `BACKUP_R2_SECRET_ACCESS_KEY=...`
- `BACKUP_R2_BUCKET_NAME=core-platform-website-backups`
- `BACKUP_R2_PREFIX=clients/<client-domain>/backups` (derived automatically from `PUBLIC_SITE_ORIGIN`, with `CLIENT_STACK_ID` as the pre-domain fallback)

### Optional environment variables

- `SYSTEM_BACKUP_EXCLUDED_TABLES=session,__drizzle_migrations`

## Runtime behavior

- Backups run automatically in production on startup and then on interval.
- The service checks the latest backup timestamp and avoids creating duplicates too frequently.
- PostgreSQL advisory locking is used so only one backup runs at a time.
- With the default daily interval and `SYSTEM_BACKUP_MAX_SNAPSHOTS=30`, the system keeps a rolling set of the newest 30 backups and deletes the oldest beyond that limit automatically.

## Admin API

- `GET /api/admin/system/backups/status`
- `POST /api/admin/system/backups/run`

Both routes require an authenticated admin session.

## Manual backup

```bash
npm run backup:run
```

## Restore from R2 object key

```bash
npm run backup:restore -- --key "<full-object-key>" --yes
```

## Restore from local backup file

```bash
npm run backup:restore -- --file "./backup.json.gz" --yes
```

## Important restore notes

- Restore is destructive and replaces live database contents.
- Restore requires `CLIENT_STACK_ID` in the target environment. A snapshot with a `clientStackId` must
  match it exactly; a mismatch is always rejected.
- Snapshots created before stack provenance was added have no `clientStackId`. They are rejected by default.
  After a duplicate-environment review, use `--allow-legacy-backup` with `--yes` to acknowledge that limited
  provenance. This flag never overrides an identified stack mismatch.
- Use a duplicate Railway environment first whenever possible.
- After a successful restore, the serving process clears its settings key/category caches so CRM
  presentation and other settings immediately reflect restored values. Failed/rolled-back restores
  retain the existing cache. Other running replicas must be restarted or allowed to expire their
  own caches; this invalidation is local to the process performing the restore.
- After restore, verify logins, CMS pages, menus, events, media references, and email settings.
- If the failure also affects app code, use Railway deployment rollback in addition to database restore.

## Suggested Railway operations setup

1. Enable Railway-native backups on the PostgreSQL/volume service.
2. Add the dedicated backup bucket environment variables above.
3. Keep the production app service on automatic scheduled backups.
4. Test restore quarterly in a duplicate Railway environment.
