# Core application rollback rehearsal plan

September 19, 2026. Source-reviewed preparation only; application startup and rollback have not passed this gate.

The archive-level recovery runner deliberately does not start Core. Application boot is a separate acceptance step because it runs migrations, bootstrap writers, scheduled publishing and form-delivery workers. A successful row comparison alone does not establish application recovery.

## Isolation and sequence

1. Verify the original archive and preserve its aggregate recovery evidence. Create a separate disposable restored database for application boot; do not reuse or alter the verified baseline.
2. Use an internal-only Docker network with no external egress and no published database ports. Do not mount production environment files, provider credentials, Docker socket or production storage. Restored settings can contain provider configuration, so credential omission alone is insufficient isolation.
3. Supply rehearsal-only TLS PostgreSQL with a local CA and hostname-matching certificate. Core's production database configuration rejects plaintext loopback connections. The built application compiles `NODE_ENV` as production; a runtime override is not a reliable substitute.
4. Use fresh synthetic session/setup secrets, local rehearsal origins, `DATABASE_TLS_MODE=verify-full`, the rehearsal CA, and a synthetic form-notification recipient. Disable system backups and federation. Use disposable uploads storage. Never fetch production media through restored configuration.
5. Record immutable current and previous image IDs/digests, source revisions and environment contracts. Prepare images before the isolated run, not during it.
6. Record baseline table counts, migration ledger and representative published revisions. Boot current Core on the clone. Check health and readiness independently; verify unauthenticated auth rejection and setup status without submitting setup or recovery.
7. Read known published content and verify revision, ETag and conditional 304; check the bounded website-identity projection. Do not submit forms, publish content, trigger test email or invoke external providers.
8. Stop gracefully and record all migration/bootstrap/worker changes. Clone the resulting post-current-boot database and start the prior compatible image against it. Repeat checks. Do not down-migrate to force compatibility.
9. Remove only owned rehearsal containers/storage and retain private aggregate evidence. Separately account for provider decryption, media delivery, authenticated capabilities, preview/intake and queued-job behavior; the checks above do not establish them by themselves.

## Known constraints

`server/index.ts` runs migrations and bootstrap before `runtime-lifecycle.ts` starts workers. Only the backup worker has a dedicated disable switch. Scheduled publishing and form effects can mutate restored data immediately; no-egress prevents real delivery but does not prevent those local changes. A fully read-only boot would need an intentionally reviewed worker-disable capability. For the present recovery test, isolate the database clone and observe these changes rather than asserting none occur.

There is no migration or `shared/schema.ts` difference between prior identity release `06acff2` and current source `864de7f`. Those revisions are candidate compatibility boundaries, not proof that their deployed images are recoverable or mutually compatible. Immutable image evidence and actual startup checks remain required.

This plan does not authorize production restore, write freeze, admin retirement, or data deletion. It supplements the [acceptance tracker](consolidation-acceptance.md) and [archive recovery runner](core-recovery-runner.md).
