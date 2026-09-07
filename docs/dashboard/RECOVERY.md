# Dashboard recovery runbook

Status: partial rehearsal only. The target remains no more than 24 hours of server data loss and restoration within one business day. Offline work not yet synchronized exists only on the field device and is outside server backup coverage.

## Verified evidence (2026-09-07)

A read-only custom-format `pg_dump` from Railway dashboard staging, carried over Railway SSH without exposing a public database port, restored into a new disposable PostgreSQL 17 container using `pg_restore --no-owner --no-acl --exit-on-error`. Verification found eight applied migrations and both contact version/archive columns. The source had zero clients; no business-data recovery is proven. The 71,557-byte archive stayed in process memory and the temporary container was removed after validation. Total measured dump/restore/verification time was 4.03 seconds; this is not an application recovery-time measurement.

Production volume backup `f93d4729-dbe2-4d04-b8df-624b5328c85f` was created before migration 0008 and listed by Railway. DAILY/WEEKLY/MONTHLY schedules are enabled. Retention and missed-backup alerting must still be verified against the proposed 30 days.

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

Run `python3 scripts/test-service-agreement-recovery.py` from the checkout with Docker, Python3, Node and installed workspace dependencies. It creates two disposable PostgreSQL16 containers with loopback-only connections, strips provider variables from fixture processes, uses the real agreement domain services to create/cancel fixed and per-visit charges, dumps the source, and restores the target. Both containers are removed after the run. No live database is used. Artifacts remain in a private temporary directory; its location is recorded in `/tmp/p1-agreement-populated-recovery-path.txt`.

The latest repository runner passed with all 48 public table counts/hashes, constraints and indexes identical after restore. Two agreements, one fixed period, two charges, two billing drafts and eight audit events were populated. Migration replay through0013 and idempotent charge retries left the entire restored snapshot unchanged. Cancellation review queue entries, dispatch financial redaction and client denial were also verified.

Latest evidence: `/var/folders/5q/z8zp8fjx4hn52fnvw00hqts00000gn/T/p1-agreement-populated-recovery-7t90bejm/report.json`. Dump SHA256 `ad6fc4d754652fd4b93fca74707c817ddf6b28db562ae742c0b8c0d580612400`, 113,099 bytes. The report records the base commit and hashes of tested agreement, migration, schema and harness files, including working-tree fixture code. The measured 15.54 seconds is a local synthetic regression duration, not a production restoration-time guarantee.

This closes the populated agreement database-recovery test gap. It does not prove Railway volume restoration, restored login/session assurance, file/object recovery, provider reconciliation, production cutover, retention or missed-backup alerts.
