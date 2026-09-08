# Dashboard recovery runbook

Status: partial rehearsal only. The target remains no more than 24 hours of server data loss and restoration within one business day. Offline work not yet synchronized exists only on the field device and is outside server backup coverage.

On September 7, the current dashboard-staging PostgreSQL service was streamed as a logical dump into a disposable local PostgreSQL 18 restore. The restore completed successfully with all 16 dashboard migrations through `0016_agreement_charge_review.sql`, 52 public tables, and the `service_agreement`, `agreement_charge_review_event`, and `outbox` tables present. No business records were inspected or retained; the disposable database was stopped after structural verification. This is current logical schema/restore evidence only. It does not prove Railway volume recovery, object-store recovery, the restoration-time objective, application cutover, or reconciliation of accounting activity that may occur after a database backup.

## Verified evidence (2026-09-07)

A read-only custom-format `pg_dump` from Railway dashboard staging, carried over Railway SSH without exposing a public database port, restored into a new disposable PostgreSQL 17 container using `pg_restore --no-owner --no-acl --exit-on-error`. Verification found eight applied migrations and both contact version/archive columns. The source had zero clients; no business-data recovery is proven. The 71,557-byte archive stayed in process memory and the temporary container was removed after validation. Total measured dump/restore/verification time was 4.03 seconds; this is not an application recovery-time measurement.

Production volume backup `f93d4729-dbe2-4d04-b8df-624b5328c85f` was created before migration 0008 and listed by Railway. DAILY/WEEKLY/MONTHLY schedules are enabled. Retention and missed-backup alerting must still be verified against the proposed 30 days.

## Production point-in-time recovery — September 8

Production dashboard PostgreSQL (`Postgres-EjJV`, service `9488d9fe-6e0e-42c1-8965-8757a8b2a034`) now has Railway point-in-time recovery enabled. Railway created the private `Postgres-PITR` archive bucket and deployed the six WAL-archive connection variables plus the archive-path setting to the database. After the service and its dependents returned online, the recovery control displayed an active restore timeline from `2026-09-07 21:35:07` through `21:36:52` (America/New_York display), with a selectable restore target. Railway states that a PITR restore creates a new Postgres service while the current service remains running.

Scheduled volume backups remain enabled alongside PITR: the latest daily backup was 867 MB and six hours old at verification, with the next scheduled run in 17 hours. The configured retention is six daily, 27 weekly, and 89 monthly backups. This improves recovery coverage but does not establish the one-business-day restoration objective, object-storage recovery, QuickBooks reconciliation, or missed-backup alerting. The current coverage should be monitored until it spans the required recovery window before relying on it during an incident.

## Application-only rollback

Use explicit project/environment/service identifiers from DEPLOYMENT.md. Select the last verified web image in Railway deployment history, redeploy that image, then verify health, deep links, authenticated access, uploads and worker compatibility. Preserve additive database columns; do not reverse migrations simply to match an older application image. Stop dependent worker processing if its schema/API assumptions differ. A deployment rollback rehearsal remains required.

## Database recovery procedure to rehearse

1. Record the incident time, latest confirmed good backup, migrations, web/worker images and expected data-loss window. Preserve the damaged volume and logs; do not overwrite the only copy.
2. Restore the selected backup into an isolated replacement environment/volume. Keep production credentials, outgoing email/SMS and financial posting disabled there.
3. Verify migration checksums, table counts, sampled related records, authorization grants, estimates/approvals, invoices, outbox operations and private-file references. Verify application login and role isolation against the restored database.
4. Reconcile accounting state from QuickBooks before resuming billing jobs. Use stable operation IDs and inspect ambiguous outbox rows so a restored queue cannot duplicate financial or notification side effects.
5. Confirm private object storage is available and matches restored metadata. Database backups alone do not recover lost objects; define and test object-recovery/version retention separately.
6. After validation and a concrete cutover review, point the web/worker at the recovered database, resume controlled processing and monitor integration failures. Retain the original damaged volume until the incident review authorizes disposal.
7. Record actual restored timestamp, lost interval, restoration duration and smoke-test results. Only these measured results can establish the recovery targets.

Do not claim disaster recovery complete until Railway volume restoration, representative business records, application cutover/rollback, object recovery and alerting have been exercised.

## Populated agreement recovery regression

Run `python3 scripts/test-service-agreement-recovery.py` from the checkout with Docker, Python3, Node and installed workspace dependencies. It creates two disposable PostgreSQL16 containers with loopback-only connections, strips provider variables from fixture processes, uses the real agreement domain services to create/cancel fixed and per-visit charges, records one keep-due and one correction-required cancellation review, dumps the source, and restores the target. Both containers are removed after the run. No live database is used. Artifacts remain in a private temporary directory; its location is recorded in `/tmp/p1-agreement-populated-recovery-path.txt`.

The latest isolated candidate run passed with all 52 public table counts/hashes, constraints and indexes identical after restore. Two agreements, one fixed period, two charges, two review events, two billing drafts and ten audit events were populated. Migration replay through0016 and idempotent charge retries left the entire restored snapshot unchanged. The restored fixture confirmed one kept-due historical charge, one correction-required queue entry, dispatch financial redaction and client denial.

Latest evidence: the September 8 rerun applied migrations `0001` through `0019_client_workspace_notes.sql` to both disposable PostgreSQL 16 instances. It restored 56 public tables with identical row/constraint snapshots, including two agreements, one fixed period, two charges, two immutable review events, two billing drafts and ten audit events. Post-restore migration replay and idempotent charge retries left the snapshot unchanged; dump SHA256 was `0b9dbc57a598c4da1e25fbbaf84e148d543dd2aeb801d62b0951273e705fbe63` at 142,591 bytes. The report records the base commit and hashes of tested agreement, migration, schema and harness files, including working-tree fixture code. The measured 21.04 seconds is a local synthetic regression duration, not a production restoration-time guarantee.

The isolated cancellation-review candidate adds a new append-only table and history index. Before its deployment, rerun this regression against the exact migration sequence and confirm the dump contains both `agreement_charge_review_event` rows, immutable trigger, history index and related audit events. During any actual recovery, retain review events as business history; do not delete them to reopen a charge or bypass a correction-required posting block. Reconcile QuickBooks before resuming billing so a restored draft cannot create a duplicate provider request.

This closes the populated agreement database-recovery test gap. It does not prove Railway volume restoration, restored login/session assurance, file/object recovery, provider reconciliation, production cutover, retention or missed-backup alerts.
