# Neon to Railway database migration

Status: production cutover completed and verified on September 3, 2026.

## Approved direction

On September 3, 2026, the project owner directed the application back to Railway Postgres. The configured Neon endpoint could not be authenticated or located in either accessible Neon organization. No Neon data was copied. Production now uses the existing Railway database whose latest sampled business-data timestamps were June 10, 2026.

## Verified state

- Railway project: `464f452a-375f-43e7-b929-dc0daa62c69d`, environment `production`.
- App service: `Core Platform` (`d9a4454c-3b2d-40a6-a679-650a0eee5317`).
- Destination service: `Core Platform DB` (`ad246d03-77a8-45b2-8d0e-1e96d60198f5`).
- Previous configured source: Neon endpoint `ep-frosty-field-ap7fxguy`, database `neondb`.
- Both the active app and a direct read-only connection using the currently configured URL fail with PostgreSQL code `28P01` (password authentication failed).
- The configured endpoint was not found among the projects/endpoints accessible through the connected Mike and Digital Alchemy Neon organizations. This does not establish that the source was deleted.
- Existing Railway database `railway`: PostgreSQL 16.14; 77 public tables and a Drizzle journal. Sampled data: 14 users, 9 CMS pages, 98 system settings. Latest timestamps checked were June 10, 2026. This is not evidence that it contains all later production changes.
- The first cutover deployment, `7686f55b-7988-4d6c-8389-9dff5feb7cf6`, authenticated to Railway but exposed a missing careers-table migration and failed its health check.
- Repair deployment `d3496ee7-2116-4ef8-8eb1-f3c72c2fbe99` completed successfully. It uses `/api/health/ready` as the Railway health gate.
- Existing Railway data was backed up to `/Users/mike/.codex/backups/core-platform/2026-09-03/railway-before-migration.dump` with owner-only permissions. Archive size: 334,723 bytes. SHA-256: `b4e022475366fe78cd7641772ee2b8b80a54b14d7c87bca1e5e56f4252828e1d`. `pg_restore --list` validation is recorded separately from any restore test.

## Cutover validation

- `DATABASE_URL` references the Railway database over Railway's private network. Secret values were supplied through Railway and were not written to the repository.
- Startup reconciled the missing careers schema and created `career_jobs`, `career_applications`, and `career_application_notes`.
- Startup no longer overwrites existing merchant edits to seeded ecommerce categories or products.
- `/api/health/ready` returned HTTP 200 with `database: connected`.
- `/`, `/login`, `/careers`, and `/shop` returned HTTP 200.
- `/api/branding` and `/api/site-config` returned valid JSON with HTTP 200.
- Startup logs recorded successful system bootstrap and service startup without database errors.

## Source recovery follow-up

If the former Neon endpoint or a dated export is recovered, compare it with Railway before importing anything. Production may contain new writes after this cutover, so any recovered records require a planned reconciliation rather than a full restore over Railway.

## Migration record

1. Preserved and validated the pre-cutover Railway backup.
2. Inspected both accessible Neon organizations and found no project matching the former endpoint or the application's legacy schema.
3. Redirected production to the existing Railway database using its private hostname and explicit non-TLS internal connection mode.
4. Diagnosed and repaired the careers bootstrap failure exposed by the first cutover deployment.
5. Deployed and verified the repair release and database readiness.

## Rollback

The pre-cutover Railway backup is the recovery point for database rollback. The former Neon URL is not a viable runtime rollback because authentication fails. After new Railway writes occur, do not switch databases or restore the backup without reconciling those writes.

Do not delete the Neon source, older Railway database, or backups as part of this migration. Retirement can be considered separately after production verification and an agreed retention period.
