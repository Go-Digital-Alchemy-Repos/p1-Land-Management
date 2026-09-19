# Website Backups: native status and manual-run contract

Status: backend contract implemented and locally validated; **release pending**. Native UI is implemented and independently reviewed; backup-service corrections passed final local validation. This slice does not establish restore parity, successful production backup creation, media recovery or readiness to retire the retained administration application.

## API and authorization

The consolidated Dashboard API exposes:

| Method | Dashboard route | Generated client | Success |
| --- | --- | --- | --- |
| GET | `/api/v1/marketing/cms/website-system/backups/status` | `getWebsiteBackupStatus()` | 200, `WebsiteBackupStatus` |
| POST | `/api/v1/marketing/cms/website-system/backups/run` | `runWebsiteBackup()` | 201, `WebsiteBackupSummary` |

The transport allowlists these exact method/path pairs as Owner-only. Core mounts `business-center-backups.routes.ts` at `/website-system/backups` behind the existing authenticated Business Center bridge. The router independently requires an active, attested Owner and responds with `Cache-Control: private, no-store`.

Both operations reject query parameters. Manual run accepts an absent body or a strict empty object. Caller-supplied reason, storage settings, object key and restore options are rejected. The server always invokes `runSystemBackup("manual")`. No native restore or download operation is exposed by this contract.

## Response projection

`WebsiteBackupStatus` contains scheduling/configuration indicators (`enabled`, `configured`, `intervalHours`, `retentionDays`, `maxSnapshots`), nullable storage metadata (`bucketName`, `prefix`, `source`), nullable `latest`, and a `recent` summary list.

`WebsiteBackupSummary` contains only:

- `schemaVersion`, nullable `clientStackId`, `key`, `createdAt`, and `reason`;
- `appVersion`, nullable `gitCommitSha`, `environment`, and `storageSource`;
- `tableCount`, `totalRowCount`, and `mediaAssetCount`.

Legacy absent stack IDs normalize to null. The projection excludes database rows, restore ordering, Railway project/service identifiers and provider credentials. A backup key is metadata, not a download URL or authorization to restore. Malformed summary data fails as a service error instead of returning raw storage data.

`enabled` describes automatic scheduling; it is distinct from configured storage. A configured provider does not prove successful archive delivery. Empty history remains empty; no sample backups are manufactured.

## Execution, audit and uncertain outcomes

The existing backup service performs synchronous work. The endpoint has no durable job ID and does not claim a queued or running lifecycle. The client must not automatically retry a run.

Before invoking the service, the route records `website_backup_requested` for the authenticated user. If this audit write fails, the backup service is not called. After the service returns, it records `website_backup_completed`. Audit details contain fixed operational text, not database rows or credentials. If completion audit persistence fails, the route reports uncertainty even though the backup service may already have completed.

The observed service concurrency error, `Another backup or restore is already running`, maps to a fixed 409. Other failures are sanitized 503 responses instructing the user to refresh status before another run. Input validation remains 400 and authorization remains 401/403 through the existing boundaries.

The bridge currently has a bounded request timeout. A connection failure or timeout does not cancel or prove failure of a backup already executing in Core. The UI must retain an uncertain state, refresh authoritative backup history, and avoid presenting a retry as harmless. Read-only status refresh is distinct from initiating another backup.

## Retention and recovery limitations

A manual run follows the existing backup-service workflow, including configured retention pruning. The action confirmation must disclose that older snapshots may be removed according to policy. This route neither changes retention configuration nor bypasses the service's concurrency lock.

`mediaAssetCount` reflects database media inventory. It is not proof that image/document object bytes were copied into a backup or can be restored. Likewise, a successful run response proves neither restore compatibility nor application recovery. Separate isolated restore, object-storage recovery and application rollback rehearsals remain necessary.

The storage layer enumerates all listing pages before latest selection or pruning, rejects incomplete pagination evidence, and returns qualified object keys. Unreadable inspected history fails explicitly rather than masquerading as empty history. One freshly resolved storage-operation context keeps status/run/restore work on one destination; subsequent operations resolve configuration again. This does not establish safe legacy-administration retirement. The retained restore workflow has not been replaced by this slice.

## Local evidence and release gate

Completed local validation for this contract:

- Eight focused router tests, using mocked backup/storage services: Owner denial, metadata projection, empty history, strict inputs/no restore, audited single invocation, concurrency/error sanitization, audit failure behavior and malformed summaries.
- Eighteen transport tests, including the two exact Owner-only backup operations and absence of restore exposure.
- Fifty-one mounted CMS regression tests.
- Core and API TypeScript checks; Dashboard OpenAPI client generation.

The focused audit test explicitly verifies that a failed request audit prevents service execution, and that a failed completion audit yields 503 after exactly one service invocation. These tests do not run a real backup or contact production storage.

Before release closeout, record the deployed Git revision and Railway outcome, verify authenticated Owner status reads and non-Owner denial, and inspect the completed native UI's honest empty/error/uncertain states. Do not create a production backup solely for UI verification. A deliberate operational backup, retention effects, restore rehearsal and final retirement acceptance require their own recorded evidence. Current live release verification remains pending.

## Native screen

Owner navigation mounts `/marketing/system/backups` under Website System. The screen reads status on entry and shows scheduler state separately from storage configuration, policy, latest/recent metadata and Eastern timestamps. No mutation happens on entry. Manual creation requires an explicit retention/media warning confirmation and has no automatic retry. A failed status refresh disables creation; an uncertain run additionally requires a successful refresh and explicit inspection acknowledgment. This acknowledgment is a component-lifetime UX gate, not a persisted job ledger or a claim that an in-flight operation stopped. The server advisory lock remains the concurrency authority.

Seven component tests and thirteen navigation tests passed; dashboard typecheck/build and API production build passed. Thirty-one combined transport/navigation tests and fifty-nine Core router/CMS tests passed in the integration coordinator's run. Production run/retention/restore remains unexercised.

Final storage review: 44 storage/service/configuration-freshness tests passed, Core typecheck/build passed. Seven disposable-database tests were explicitly skipped because no local test database was configured. Opaque operation contexts retain the original destination for an already-started operation; new operations resolve current settings and cannot fall back to an old client after configuration becomes incomplete. This policy prevents mixed-destination archives while retaining between-operation credential freshness.
