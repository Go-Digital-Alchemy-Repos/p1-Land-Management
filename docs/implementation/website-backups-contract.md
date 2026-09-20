# Website Backups: native status and manual-run contract

Status: native status/run released and read-only verified at `47e8136e1885c0edd4696f8907a4f7b3b59629e7` on September 19. Native UI is implemented and independently reviewed; backup-service corrections passed final local validation. This slice does not establish restore parity, successful production backup creation, media recovery or readiness to retire the retained administration application.

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

Before release closeout, record the deployed Git revision and Railway outcome, verify authenticated Owner status reads and non-Owner denial, and inspect the completed native UI's honest empty/error/uncertain states. Do not create a production backup solely for UI verification. A deliberate operational backup, retention effects, restore rehearsal and final retirement acceptance require their own recorded evidence. Scoped read-only live evidence follows; mutation and recovery acceptance remain separate.

## Native screen

Owner navigation mounts `/marketing/system/backups` under Website System. The screen reads status on entry and shows scheduler state separately from storage configuration, policy, latest/recent metadata and Eastern timestamps. No mutation happens on entry. Manual creation requires an explicit retention/media warning confirmation and has no automatic retry. A failed status refresh disables creation; an uncertain run additionally requires a successful refresh and explicit inspection acknowledgment. This acknowledgment is a component-lifetime UX gate, not a persisted job ledger or a claim that an in-flight operation stopped. The server advisory lock remains the concurrency authority.

Seven component tests and thirteen navigation tests passed; dashboard typecheck/build and API production build passed. Thirty-one combined transport/navigation tests and fifty-nine Core router/CMS tests passed in the integration coordinator's run. Production run/retention/restore remains unexercised.

Final storage review: 44 storage/service/configuration-freshness tests passed, Core typecheck/build passed. Seven disposable-database tests were explicitly skipped because no local test database was configured. Opaque operation contexts retain the original destination for an already-started operation; new operations resolve current settings and cannot fall back to an old client after configuration becomes incomplete. This policy prevents mixed-destination archives while retaining between-operation credential freshness.

## Live release evidence — September 19

All three Railway services reported SUCCESS on `47e8136e1885c0edd4696f8907a4f7b3b59629e7`:

- Dashboard: `777b74f9-8e2e-4956-9e97-87515d927c24`.
- Core: `b78549d2-4d5e-463e-8cd4-b5acc9c4932c`.
- Public: `f367e5c1-5b78-4dca-adc9-f7eff6eab937`.

Authenticated Owner navigation loaded the native screen and ten real history entries. Latest read-only metadata: September 18 at 8:17am Eastern, scheduled, P1 stack, production environment, 52 tables, 519 rows, zero media records; revision unavailable was displayed honestly. Qualified archive keys were displayed. Scheduler enabled, 24-hour interval, 30-day/30-snapshot policy and configured deployment storage were separate indicators.

Desktop and 390px mobile visual checks passed; document width was 390px and only one h1 existed. No captured browser console errors. Public, Core and Dashboard health endpoints returned 200. Unauthenticated native status returned 401; non-Owner denial is covered by local route/transport tests, not impersonation of a real account. No create, retention delete, restore, upload or configuration mutation was performed in production.

The readable manifest now provides a concrete recovery source to investigate. It does not prove the archive has been independently copied, restored or reconciled, and zero media records does not establish recoverability of public media assets. These are the next recovery acceptance boundaries.

## Controlled restore foundation — September 20 (not exposed)

Native restore remains a required parity gap. The next workflow will require an
Owner to review a selected archive before explicitly confirming replacement of
Core data. Service foundation now offers a read-only review fingerprint over the
entire parsed snapshot and a separate reviewed restore entry point. It re-downloads
inside the existing session advisory lock, verifies target stack and key, and
rejects any changed fingerprint before restore SQL. Existing retained callers are
unchanged. A fingerprint is an integrity precondition, not authentication or a
permission grant; the native route must independently enforce active Owner access.

No new route or UI is enabled in this checkpoint. Required next work: metadata-only
strict review/execute contracts and allowlists; archive structural validation;
bounded review lifetime and explicit typed destructive confirmation; independent
operation/audit recovery because restoring Core can replace its audit/user rows;
uncertain-outcome handling without automatic replay; isolated successful restore
and failure-path tests, UI acceptance, and review before production exposure.
Never run production restore as an acceptance test. Keep `/admin` available until
the full workflow is accepted. The earlier restore and rollback gates still apply.

Archive validation follow-up: native reviewed entry points now enforce schema1,
unique table/sequence identities, complete restore-order membership, exact table/
row/media counts (`cms_media`), sequence-table references, identifier syntax and
consistent row columns. The reviewed loader caps compressed objects at64MiB and
expanded JSON at256MiB. Unsupported or oversized archives require a separately
reviewed operator recovery path; native review never offers them as actionable.
Retained/direct recovery functions keep their existing contracts. Thirty-four
focused tests and Core typechecking pass. Full successful reviewed restore against
an isolated database and real-archive compatibility remain necessary before exposure.

Real-archive validation (September20): the protected populated Core archive with
SHA-256 `f2e8b6901bcf8590c282c4cf705b0baca95122e4872189a9ee6c7f083d264944`
now passes admission:57 tables,645 rows,20 media records. The first inspection
rejected legitimate bounded `privateCapture` provenance and public-qualified
sequence names. Both formats are now explicitly supported; arbitrary schemas and
sequence aliases remain rejected, with canonical duplicate detection. Archive
bytes were not altered. Thirty-seven focused tests and Core typecheck pass.
This is read-only compatibility evidence, not a successful native restore or
permission to restore production. The expiring confirmation and independent audit
workflow remain unimplemented and must precede route exposure.

## Independent operation ledger candidate (0049, not deployed)

Dashboard migration0049 and matching Drizzle model keep restore review/request/
outcome outside the Core database being restored. The active Owner is rechecked
when reviewing and claiming; reviews expire after5minutes by database time. A
server-derived source-binding hash and exact archive fingerprint bind the claim.
The claim and audit commit atomically before contacting Core. Same-ID retries
return the existing operation without another execution; different IDs targeting
the same backend serialize, with a partial unique index allowing only one running
or uncertain operation. Uncertain operations are never silently released or
replayed. Completion audit can persist after in-flight account deactivation because
it records the already-authorized operation, not another restore.

Fresh disposable PostgreSQL test passed without skips: role/activation denial,
owner isolation, source change, expiration, same/different-ID races, audit failure
rollback, uncertain replay denial, and completion after access change. Migration
replay, API typechecking and resource cleanup passed. No production migration or
endpoint exposure occurred. Remaining: bridge review/execute/status contracts,
explicit confirmation, source binding derivation, reconciliation of uncertain
outcomes, Core-operation receipt correlation, UI, independent review and isolated
successful end-to-end restore. Do not promote0049 to production as a complete tool.

### Core archive-review bridge candidate

`POST /website-system/backups/restore-review` now accepts only a bounded archive
`key`, behind the existing attested active-Owner bridge middleware. It invokes
strict archive admission and returns only the existing projected manifest fields
and validated SHA-256 fingerprint. No archive rows, restoration order, private
capture metadata or deployment identifiers are returned. Unknown body/query
fields are rejected before storage access. This read-only operation neither
captures a backup nor executes a restore. The Dashboard transport allowlist and
UI do not expose it yet; `/restore` remains absent from this bridge.

Validation: 48 focused Core tests passed (11 route,16 archive-validation,21 backup
service). Review authorization, input injection, private metadata suppression and
provider failure sanitization are covered. This candidate remains on the task
branch pending the complete ledger-backed workflow and its release gates above.

### Dashboard review persistence bridge candidate

The dedicated `POST /marketing/cms/website-system/backups/restore-operations`
accepts only an archive key, verifies the signed-in Owner, issues a short-lived
Core federation grant, validates the returned metadata/fingerprint and exact key,
and stores the review in the independent Dashboard ledger. Grant cleanup precedes
ledger creation. Source binding hashes the server-configured Core origin and the
validated archive stack identity; it is never accepted from browser input.
`GET .../restore-operations/:id` requires the initiating active Owner. Both return
an explicit public projection with operation ID, state, timestamps and archive
counts/identity; archive keys, fingerprints, actor IDs and source binding stay
server-side. The internal Core review operation is deliberately excluded from
the generic browser proxy registry, preventing bypass of review persistence.

Validation: 25 transport/contract tests passed without skips, plus the disposable
PostgreSQL ledger test including active-Owner status reads and cross-Owner denial.
API typechecking passed. Production remains unchanged. Composed HTTP acceptance,
UI, typed confirmation, execution receipts and uncertain-outcome reconciliation
remain required before this candidate can ship. Same-origin backend replacement
cannot be detected from the origin binding alone; archive fingerprint and fresh
Core identity validation must still be enforced immediately before execution.

### Explicit intent and expiry enforcement candidate

A Dashboard claim now requires the exact typed confirmation `RESTORE WEBSITE
DATABASE`, with no additional execution fields accepted. Missing/mistyped intent
cannot change the reviewed operation. Core's separate reviewed restore service
requires a finite expiry no more than five minutes ahead. It checks before
storage access, under the backup lock, after archive download, and inside the
restore transaction after publication-lock/compatibility checks immediately
before destructive SQL. Expiry during a download or lock wait aborts the restore;
retained/direct operator recovery contracts remain unchanged.

Validation: 50 focused Core tests pass, including expiry during download and
transaction-lock waits with no destructive SQL and transaction rollback. The
real PostgreSQL ledger test passes including invalid confirmation leaving the
review untouched. Both Core and Dashboard API typechecks pass. No execute HTTP
endpoint, production migration or production restore is enabled. Durable Core
receipt correlation, uncertainty reconciliation, full schema compatibility,
composed HTTP/UI acceptance and independent review remain release requirements.

### Reviewed restore inventory and non-cascading safety

The native reviewed path now compares the archive table set with the current
nonexcluded public table inventory inside the restore transaction and rejects
mismatches before truncation. Its `TRUNCATE` omits `CASCADE`, so PostgreSQL refuses
implicit deletion of excluded/new referencing relations. The retained operator
path is unchanged. This is table-set compatibility, not a claim that all schema
versions are interchangeable; incompatible columns/constraints still cause
transaction rollback and require operator reconciliation.

Validation:52 focused Core tests passed. A fresh disposable PostgreSQL18 database
ran13 database tests without skips, including an exact reviewed archive restore,
rejection of a new table absent from the archive, and real foreign-key rejection
when that new table was excluded. Its rows and current parent rows survived both
rejections; the advisory lock was released. The temporary container was removed.
Core typechecking passed. Production was not touched; native execution remains
unexposed pending operation receipt/reconciliation and full HTTP/UI acceptance.

### Durable Core receipts candidate (Core migration0008, not deployed)

Native reviewed restores now require a canonical actor and UUID operation ID.
Core records admission under its existing backup advisory lock, before the restore
transaction. IDs cannot be admitted twice, including after a rollback. Completion
is written in the same transaction as restored rows, so failure to write the
receipt also rolls back restored content. Receipts live in `p1_operations`, outside
the public tables captured/replaced by website snapshots, and have no foreign keys
into restorable users. This additive operational schema is paired with the
independent Dashboard ledger; neither is authorization by itself.

Apply Core0008 before exposing execution. Retain this schema during application
rollback. Public JSON archives intentionally omit it; full PostgreSQL disaster
recovery/backup evidence must include it. A `started` receipt alone proves neither
failure nor completion. Reconciliation must acquire the same advisory lock and
check the execution deadline before declaring no commit; loss of the receipt
schema/database must fail closed and require operator recovery. No automatic
retry is authorized by missing/started receipts.

Validation:52 focused tests and14 disposable PostgreSQL tests pass without skips.
These include replay rejection preserving intervening rows, receipts surviving a
retained public-data restore, and a forced completion-receipt failure rolling back
restored content while retaining the started admission. Core typechecking passed;
the test database container was removed. No production migration/restore occurred.
Pending: authenticated receipt-status/reconciliation routes, Dashboard resolution,
full composed HTTP/UI tests, independent review and release acceptance.

### Core execute/outcome bridge candidate

Attested-Owner Core bridge routes now accept strict operation ID, fingerprint and
expiry fields: `POST /restore-execute` additionally requires the archive key;
`POST /restore-outcome` only inspects the receipt. Both derive the canonical actor
from the federation grant and reject injected actor fields. Responses contain only
operation ID and outcome. Neither path is in the Dashboard generic proxy registry.

Outcome verification acquires the existing backup advisory lock. A matching
completed receipt confirms commit; a matching started receipt whose deadline has
passed confirms no committed restore under the healthy receipt-store assumption.
An absent/mismatched receipt or still-valid started admission returns `unknown`.
Lock contention refuses reconciliation. The operation is never executed from an
outcome check. Dashboard must validate correlation and record reconciliation in
its independent ledger; unknown must not clear its unresolved-operation block.

Validation:38 focused service/route tests and15 disposable PostgreSQL tests pass,
including actor injection rejection, non-replaying outcome requests, absent and
wrong-actor receipts, expired started receipts, completion, lock contention and
unchanged public rows during reconciliation. Core typecheck passed. Production
remains unchanged. Dashboard execution/reconciliation orchestration, recovery for
missing receipts, full UI/HTTP acceptance and independent review remain pending.

### Dashboard execution/reconciliation candidate (migration0050, not deployed)

Dedicated `POST .../restore-operations/:id/execute` accepts only typed
confirmation. It reads the Owner's saved review, checks the server-derived source
binding, atomically claims it, and only then calls Core with stored archive data.
Repeated claims return the existing state. Only a strict, matching operation-ID
completion response records success; transport/unconfirmed results record
uncertainty with HTTP202. If persistence itself fails, the already-committed
running claim remains blocking. No automatic replay occurs.

`POST .../:id/reconcile` accepts an empty body, checks Owner/source binding and
reads Core's outcome. Migration0050 adds `not_applied`; verified completed or
not-applied outcomes resolve running/uncertain rows with an atomic independent
audit. Unknown preserves the block, as do provider failures. Neither execution
nor reconciliation is in the generic CMS proxy. Grant lifecycle is shared by
these dedicated controllers and review; identity always comes from the session.

Validation:26 contract/transport tests and the real PostgreSQL ledger test pass
without skips, including correlation rejection, unresolved unknown states,
cross-Owner/source denial, idempotent reconciliation audit, resolved-operation
non-replay, fresh-review admission after verified no-commit, and terminal-state
conflict rejection. API typechecking passed. Composed HTTP and browser acceptance
remain pending, along with native UI/history and operator recovery for missing
receipts. Core0008 and Dashboard0049/0050 remain undeployed candidates; do not
retire `/admin` or mark restore parity complete yet.
