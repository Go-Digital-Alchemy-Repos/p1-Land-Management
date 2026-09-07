# Client Migration Execution Ledger

This ledger records verified execution against the [Client Migration Master Plan](core-project-plan.md).
Statuses describe repository evidence and do not imply production release approval.

## Orchestrator transition and current sprint — 2026-09-05

### Final candidate formatting gate corrected

Hosted run34006325373 stopped at formatting for one line-wrapping issue in the added Stripe
settings test. Root applied Prettier to that file and passed the full repository formatting
command. The change is formatting-only; prior behavior evidence remains scoped to its recorded
commits, and the corrected head still requires hosted Verify. No production actions occurred.

### Maintenance cutover sequence reconciled; browser activation acceptance passed

Independent operational review reconciled completed Core517a88d/recoveryf9036a3 hosted checks,
copy-tool evidence and remaining live gates in the maintenance matrix/runbook. Root clarified
that namespace settings must accompany the namespace-aware recovery artifact/start command;
a read from the old root-key application cannot establish cutover acceptance. Freeze/drain,
refreshed exact-object approval, actual copy, live recovery and final rollout remain unperformed.
Railway still reports b620280d/a006f36 SUCCESS with prior deployments REMOVED. No production
configuration changed. Better Farms launch and isolated CRM-2 are separate from maintenance.

Real desktop/mobile Stripe settings tests now prove saved synthetic credentials remain awaiting
activation after save/reload and blank-secret resave; the UI request cannot set the operator flag.
Both cases passed (13.0 seconds), and the owned PostgreSQL fixture was removed. These tests make
no provider calls. The maintenance candidate is being stabilized for final hosted validation.

### CRM-2 contract accepted for isolated implementation

Root accepted [the typed-field/mapping design](crm-custom-fields-implementation-plan.md), including
five scalar types, dedicated revisioned definitions/values, transactional won conversion and pinned
submission snapshots. Root added a monotonic form mapping revision that survives removal/recreation
to prevent stale-editor overwrite. Old workers cannot consume mapped jobs safely; rollback must
drain them or retain a compatible consumer. This is design acceptance, not implementation or release
approval. CRM-2 will remain isolated from the maintenance candidate until its own acceptance passes.

The latest CRM settings page also passed actual desktop/mobile light/dark badge and viewport checks
(2 cases, 10.7 seconds) against an owned disposable PostgreSQL fixture, which was removed. Initial
attempts stopped before browser tests because the required fixture was absent and then not ready;
explicit database readiness resolved setup. No production services or provider calls were used.

### CRM settings navigation completed; activation wording reviewed

CRM settings now links to the existing platform integrations, email templates and branding routes,
with explicit site-wide scope. Root verified each destination in App routing; all retain their
existing authorization. The CRM operations guide now documents stage presentation, reset/save,
editor access and these shared controls. No duplicate credential or branding store was introduced.
Five existing CRM settings component tests, 24 ecommerce settings tests, TypeScript and scoped
lint passed. A bounded independent review of62d9044 found no activation bypass or new historical
recovery regression; its nonblocking wording finding was corrected so an enabled deployment flag
is not presented as proof of complete checkout/provider readiness. Final hosted checks remain
required. CRM-2 typed fields and mapping is in design review, with no schema changes yet.

### Ecommerce provider activation separated from saved credentials

The candidate now requires `ECOMMERCE_PROVIDER_TRANSACTIONS_ENABLED=true` for new Stripe
checkout, payment links and refunds. Configuration errors remain explicit and precede activation
checks; disabled new requests stop before local customer/order/payment/refund writes. A read-only
checkout-request lookup permits retrieval of an existing linked payment intent without claiming or
creating a request; pending historical requests cannot bypass activation to create a payment.
Manual draft/payment/refund and risk-review paths, webhooks, expiry and refund reconciliation
remain available. Settings show missing credentials, awaiting activation, or enabled transactions;
the displayed status is read-only and saving credentials cannot change the deployment flag.
“Configured” checks saved key presence/mode, not remote provider acceptance.

Backend validation passed 82 central ecommerce tests and 10 recovery tests, plus types/scoped lint.
Root reviewed transaction call sites and passed all 24 settings component tests, including load,
retry and save coverage for all five sections and activation-state persistence. The first new UI
fixture incorrectly returned Stripe data to every settings query; it was corrected to return each
endpoint's own fixture before the passing run. No production configuration or provider calls were
made. Root also passed TypeScript, scoped lint and the complete production build. Hosted run
34005497636 passed both pilot acceptance and Verify for preceding checkpoint517a88d; checks
for this final candidate and provider acceptance remain release gates.

### Exact-object apply tooling reviewed and verified

Root reviewed the new separate apply command and obtained a second bounded review with no blocking
finding. The command requires explicit exact-object approval, independently bound source/target
and writer-drain attestation, current frozen runtime, and separate bounded0600 inputs. A new
exclusive ledger fsyncs its header and dispatch intent before conditional PUT; retries use a new
ledger and reverify actual objects, preserving ambiguous remote writes and all sources. There is
no delete/list/overwrite path or normal-application startup hook. Attestation remains operator
trust, not command-certified writer drainage. No production copy is approved or performed here.

Root passed all126 migration/planner/storage/source/command tests, full build and detached checks
for both actual Node artifacts. Apply SHA256:
`3aafee4cd8b950aebde3e9c42732c531a1f4d7c96d4da5e87822ee5a4609b3ba`;
dry-run SHA256: `2760976f1c20deee6334ad7c46c8e7dc2f64cde05cc2cdf1a09922b5038e7f9d`.
The detached tests prove argument rejection without sources/TSX, not provider acceptance. Root
also found query/statement deadline overrides in PostgreSQL URL parameters; both operator
commands now accept only the centrally validated sslmode query parameter, with regression tests
proving rejection before connection. CI includes the separate apply-artifact check after build.
See [operator contract](legacy-upload-apply-command.md) for exact inputs and failure handling.

Hosted run34004914446 completed successfully for checkpoint59af4a4, including all22 Linux pilot
cases and the dependent full Core Verify job. Final checks on the newly integrated tooling remain
required before release. Production is unchanged.

### Integrated release draft opened

[Draft PR11](https://github.com/Go-Digital-Alchemy-Repos/Core-Platform/pull/11) now exposes the
integrated client/reliability candidate for review against deployed main. Its body records the
full scope and explicitly holds merge/deployment for final checks, reviewed copy/barrier/media
acceptance and recovery operations. It does not authorize imports, DNS, provider activation or
production storage writes. The separate recovery artifact is not merged into this PR.

The exact-object apply tooling is under bounded implementation/review. Its accepted contract
requires an explicit copy approval distinct from dry-run approval, a separately bound operator
writer-drain attestation, current frozen runtime, independent0600 input files and a fresh fsynced
ledger. Operator attestation is not platform verification. New attempts reverify actual objects
rather than trusting old ledger markers, and sources are never deleted or overwritten.
No command has been used to copy a production object.

### First hosted Linux pilot acceptance passed

Hosted run34004914446, pilot job101410232417, passed all22 browser cases in54.6 seconds at
`59af4a4`. The first run exposed missing Better Farms dependencies in the fresh hosted checkout;
CI now installs that checkout's exact lockfile, and the launcher rejects a missing site dependency
directory rather than falling back to Core's parent installation. The dependent required Verify
job is still running; pilot success is not a claim that the whole release check completed.

Root also corrected the dry-run operator's database session boundary: URL `options` values are
rejected before pool creation because node-postgres can let them override the explicit read-only
session. Five command tests and scoped lint passed, including rejection without a database pool
or leaked connection detail. The verifier still has no apply path. A separate exact-object apply
command is being prepared with explicit approval, writer-drain attestation and fsynced private
ledger; this is tool implementation only, not approval or execution of a production copy.

### Hosted pilot gate added

Commit `55a79cc` adds a hosted job that checks out the exact reviewed public Better Farms source
`7fd1298beb373ee447aa97f578fb11e575faf8f0` with credential persistence disabled and runs the same
22-case two-origin suite. The existing required Verify job always evaluates the dependency and
explicitly fails if pilot acceptance did not succeed; failed/skipped pilot work cannot silently
leave the required check green. Workflow YAML parsed successfully and its site pin agrees with
the launcher. Hosted run34004810590 is in progress; local acceptance is not substituted for its
first Linux result. Failure/receipt artifacts are retained14days.

The final recovery candidate `f9036a3` hosted Verify run34004708405 completed successfully,
including the new compiled maintenance-runtime test. That closes its hosted-artifact gate,
not live namespace/media/deployment/drain acceptance. Production remains unchanged.

### Recovery review corrections verified

Independent review of the recovery-only artifact identified database URL host/duplicate-sslmode
bypasses, an ignored query-string connection timeout, repeated-signal drain behavior, and verifier
cleanup gaps. Rollback candidate `f9036a3` fixes them: only one sslmode parameter is permitted,
external hosts require DNS plus verify-full, driver PoolConfig supplies read-only options and a
real five-second connection timeout, repeated signals retain the drain guard, and process cleanup
failure no longer bypasses container cleanup/reporting. The normal entrypoint's database behavior
is unchanged unless the explicit internal recovery flag is set by the separate maintenance entry.

Root passed413 tests, types, scoped lint and rebuild. A stalled real loopback PostgreSQL handshake
rejected after5.008 seconds. The final compiled artifact SHA256 is
`4b0b5f1c28c584c7c0071afe17ef1459c2737747fbf3943f29610b61d71bdf09`.
The repeated disposable PostgreSQL smoke passed read-only readiness,503 business admission,
no application table creation and clean SIGTERM; fixture removal was verified. Exact evidence
and recovery-only limitations are committed on `codex/namespace-rollback`. Hosted checks and
live namespace/read/deployment/drain acceptance remain required. No production change occurred.

### Seven-route pilot acceptance and mobile focus fix

The actual pinned Better Farms sweep found a keyboard focus escape from the open mobile drawer.
Root reviewed the bounded header correction in site `7fd1298beb373ee447aa97f578fb11e575faf8f0`:
Tab/Shift+Tab and programmatic focus stay within the drawer/trigger, background branches become
inert while open and regain their prior state on close, and desktop resizing closes the drawer.
The site commit is pushed and clean. Core now pins that exact source.

All22 actual two-origin pilot browser cases passed (33.7 seconds), including the original three
CMS/forms/image integration cases and19 route/interaction cases. All seven routes passed desktop
and mobile image decoding, headings, internal targets and navigation/reload; board dialogs and
donation-to-contact behavior passed. The expanded focus test covers forward/reverse movement,
background restoration and desktop resizing. Site types and38 contract tests plus Core types and
scoped lint passed. Fixture containers/ports were cleaned. Source-backed copy/assets approval,
comprehensive accessibility and real domains/provider activation remain separate launch gates.

### Isolated rollback maintenance artifact prepared

Rollback branch `codex/namespace-rollback` now has candidate `3ccc819`: a separate compiled
`rollback-maintenance.cjs` entrypoint that serves health/readiness and namespaced media only.
It does not import normal application bootstrap, migrations, sessions, business routes or worker
startup. All other requests, including webhooks, return503 for later retry/reconciliation. It
requires frozen upload configuration, forces read-only database sessions and verifies that state
in readiness. The normal npm-start entrypoint is unchanged and must not be confused with this mode.

Root passed405 tests, types, scoped lint and build, then ran the compiled artifact against an
owned empty PostgreSQL16 fixture: read-only readiness passed, business requests were rejected,
no application tables were created and SIGTERM exited0; fixture and volume were removed.
Artifact SHA256 `079417c7478f1cd6d18972b5e01029c4353ca2b80d4d0e7d2730a57a58aacc76`.
Independent review is assigned before acceptance. This is an explicitly limited recovery interval,
not a working storefront/admin rollback, not deployed, and not proof of live-media acceptance.
Replacing/draining old writers, exact production start-command verification, media reads and
return-to-current-version queue/provider reconciliation remain operational gates.

The seven-route Better Farms browser sweep independently passed18/19 cases and found a mobile
menu focus escape; its bounded fix and repeat route/integration acceptance are now assigned.
This does not substitute for client copy/domain approval or claim comprehensive WCAG conformance.

### Actual populated rollback schema rehearsal

Root extended the disposable upgrade runner with an optional immutable `--rollback-ref`. On actual
main `a006f36` upgraded through candidate `0d11316`, rollback `704cabf` migration startup completed,
then the current candidate migrated forward again. The original 11 rows across ten tables, all
values of four notification jobs, and queued/failed form-effect jobs were unchanged. The existing
negative duplicate-paid-history case still rejected without altering its records. Both candidate
and rollback dependencies came from their respective lockfiles; the disposable database/volume
were removed. The final run used Python `-O`, retaining explicit verification checks.
See [aggregate and exact revision evidence](release-evidence/core-rollback-schema-2026-09-06.json).

This proves migration-startup compatibility for the populated fixture, not full rollback readiness.
The older runtime starts scheduled publication, event reminders, backups and directory membership
lifecycle services, but does not implement the new form, notification or inventory-reservation
workers. Its business writes and older backup behavior cannot be assumed equivalent to the new
candidate. A controlled rollback must address admission, worker drainage, queued work and eventual
resumption explicitly; the upload freeze only covers upload mutations. HTTP/runtime/provider
acceptance and those operational controls remain open. No production change occurred.

### Offline commerce desktop/mobile acceptance integrated

Root reviewed the final actual-app spec and its guarded synthetic fixture seeds. Both desktop and
mobile passed (2/2, 14.1 seconds) on a fresh disposable PostgreSQL database. The workflow creates a
cash order through the wizard, repeats payment confirmation concurrently and proves one stock
deduction and one confirmation job. The Refunds UI now renders accessible success and rejection
messages and clears the amount after success; the browser confirms a successful manual refund,
visible over-balance rejection, and exactly one persisted refund. Input labels are associated.

Fulfillment checks reject repeated quantities. The cancellation sequence rejects captured-payment
cancellation, fully refunds before successful cancellation, rejects shipping with a real order item,
and rejects reactivation with the cancellation-specific message. The cancelled/refunded shipping
request hits the payment guard first; the test documents this rather than claiming an unreachable
status branch. No provider request or production mutation occurred. Fixture containers/volumes were
removed and port 5201 closed. Types and scoped lint passed; full unit validation earlier in this
checkpoint passed 858 tests, with separate database suites intentionally skipped in that invocation.
The new browser spec is discovered by the existing desktop/mobile CI suite. Final hosted validation
and broader release gates remain pending.

### Populated notification restart failure corrected and rehearsed

The offline-commerce browser workflow created a valid order-status notification that prevented
subsequent startup: reconciliation replayed the narrower historical 0052/0053 type constraints.
The runner now applies a consolidated current notification schema in 0060, preserving the
historical migration files, refund/shipment columns, timestamp conversion and full type constraint.
No notification data is deleted or rewritten. Root independently rehearsed an upgrade from actual
main `a006f36`, then two restarts containing all four notification types: every job value and all
11 original rows across ten tables were preserved. The existing duplicate-paid-history negative
case still rejected and preserved both duplicate records. The owned database and volume were
removed. See [exact migration hash evidence](release-evidence/core-notification-restart-upgrade-2026-09-06.json).

The expanded populated-upgrade CI runner now retains this regression. Root also passed all 858
unit tests (24 database tests intentionally skipped in this invocation), types and scoped lint.
The actual browser run passed desktop/mobile plus restart of its retained populated fixture;
final review is strengthening the cancelled-fulfillment assertion before integration. These are
candidate fixes, not production deployment evidence.

### Browser-discovered refund validation response corrected

The actual offline-commerce browser run found that an amount exceeding the remaining refundable
balance was rejected with HTTP500. The service now attaches HTTP400 to that validation error and
to nonpositive amounts, and HTTP404 to a missing order. This preserves the rejection before any
refund reservation while allowing the API error handler to return an actionable client error.
Root passed 75 ecommerce service tests, including explicit status assertions, and scoped lint.
The full browser workflow remains in progress; this checkpoint does not claim its completion.
The master plan now explicitly records the settings repair and broader ecommerce quality request
as part of the active program scope. No production deployment occurred.

### Stripe configuration preflight before local mutations

Root reviewed and independently passed all 72 ecommerce service tests plus 12 neighboring
webhook/inventory/public-order regressions. Provider-backed manual-order payment links,
existing-order payment links, standalone payment requests and Stripe refunds now resolve a
validated Stripe client before customer/order/request/refund writes. The same client is passed
through dispatch, avoiding a mutable configuration reread after reservation. Missing/mismatched
configuration leaves no new local records. Deliberate offline draft, mark-paid and manual-refund
operations do not require Stripe. Ambiguous failures after dispatch retain their draft/pending
records for reconciliation; this change does not claim remote account/network validation.

Types, scoped lint and formatting passed. The minimal refund-gateway API accepts an optional
resolved client for this internal flow; existing callers remain supported. No provider request
or production change occurred. Manual transaction browser acceptance remains in progress and
provider activation/sandbox acceptance remains a separate release gate.

### Rollback candidate preserved and release findings assigned

Root reviewed the isolated media rollback port, compared its R2/helper bytes to the integration
candidate and independently passed all 23 focused checks. Candidate `704cabf` is committed and
pushed on `codex/namespace-rollback`; agent validation also passed all 403 baseline tests,
types, lint, formatting, build and budgets. This is a recovery candidate, not a main merge or
deployment. Full database/new-queue/business compatibility remains open.

The independent bounded review of `1d9cd8c` recommends holding the broad release for missing-
configuration-before-write corrections and unresolved namespace cutover. Manual commerce
browser acceptance is also needed; it is now assigned in an isolated fixture alongside the
provider configuration correction. The latter preserves deliberately offline actions and
ambiguous failures after provider dispatch. The updated
[maintenance gate matrix](core-maintenance-release-gates-2026-09-06.md) separates these from
Better Farms content/domain launch and future provider activation. No production change occurred.

### R2 conditional-write semantics verified on the actual provider

Root exercised a single randomly named temporary probe under the approved Core target upload
namespace. First conditional PUT succeeded; a second different payload with `IfNoneMatch: "*"`
was rejected with HTTP412. GET returned the original bytes. The probe was deleted and GET404
confirmed removal. Existing CMS objects and database rows were untouched. See
[provider evidence](release-evidence/core-r2-conditional-write-2026-09-06.json) and the sourced
runbook notes. This closes the conditional-operation evidence gap, not freeze/drain/copy or
namespace cutover acceptance. The actual media source remains preserved and uncopied.

Independent full-release review and the isolated namespace-compatible rollback artifact are
in progress. Early review identifies provider-backed ecommerce paths that write local records
before checking absent Stripe configuration; this is a concrete corrective task, not proof that
unconfigured providers automatically make those mutations safe. Final review and scoped fixes
remain required before broader release acceptance.

### Actual deployed-source upload dry run

A fresh read-only observation at 01:04:09 UTC matched the exact deployed `a006f36` service,
database identity and CMS record against the independently known installation/record. Root
approved only a one-object read-only plan, `241f66b679a75b138655322090126eabd8311a317f22ffc2d88ca4cb237aceff`,
with the previously verified digest as an expected value, not an assertion of unchanged bytes.
The reviewed standalone artifact was hash-checked and delivered into a private temporary runtime
directory. It then actually reread and hashed the R2 source, checked the target and authoritative
CMS record, and returned `complete:true`, one `would-copy`, with no storage writes requested.
The command's runtime files were removed and its process exited successfully. Only aggregate
[evidence](release-evidence/core-live-upload-dry-run-2026-09-06.json) is committed.

No configuration, object or database mutation occurred. Uploads remain enabled; this is
point-in-time source/provider read evidence, not a drained-writer barrier or copy approval.
Freeze/drain, final inventory refresh, conditional-write verification, approved copy, media-read
acceptance and rollback compatibility remain required before namespace cutover. The older plan
is superseded for this dry run only and must not be used as an implicit apply authorization.

### Standalone migration command packaging

The production build now emits `dist/operations/verify-legacy-upload-migration.mjs`, bundling
application helpers while using installed production `pg`/AWS dependencies. A detached smoke
check exposed a silent entrypoint skip through macOS path aliases; the entrypoint now compares
resolved filesystem paths. Both direct and symlinked launches return the expected sanitized
missing-input error with exit1. The command runs without source files or `tsx`. CI now repeats
this packaging check after building; it does not claim valid database/provider acceptance.

Root passed all 18 command/source tests, types, scoped lint, full build and the detached check.
The artifact SHA256 was `6c1c584a8d74e95c34318d2f1264f9db328637b02d81b7bfdbd0d9819da2e95e`.
An additional detached run used the exact-main hotfix dependency install successfully. No
production delivery, source inventory refresh, provider read or copy was performed in this step.

### Exact-origin images, source-file verification and read-only migration tooling

Site `21eeb76b33c1258c75a001296074b880ef85f87f` now permits hero images from the exact configured
Core HTTPS origin, matching its CSP. Core's optional image-field allowlist rejects other origins;
the Better Farms manifest explicitly declares its admin origin. Existing manifest readers must
be upgraded before using the new property. Build/runtime/manifest origin agreement remains an
explicit deployment gate; runtime-only changes require a rebuild. Arbitrary CDN hosts are not
implicitly trusted. Root reviewed and reran focused tests, then passed the three real two-origin
browser cases in 17.1 seconds, including decoding a Core-hosted image in both preview and the
published public site. The first attempt was interrupted to correct root's test selector; only
the subsequent completed run is acceptance evidence.

The site-reference verifier now requires real-path containment and regular files, and includes
the declared field-schema module. The previously symbolic schema reference now identifies the
actual Better Farms module. Regression tests reject external symlinks and directories, preserve
internal file symlinks, and catch missing schemas. Actual site checkout verification passed.
These are stable-checkout checks, not protection against concurrent hostile filesystem mutation.

The new `verify-legacy-upload-migration.ts` command accepts separate private plan/approval files,
checks actual runtime/database identity and the exact CMS row, then performs bounded object
reads through the existing executor with writes disabled. Root reviewed its source and reran all
18 focused tests. File bounds, ownership/permissions, FIFO/symlink rejection, secret-safe errors
and source mismatches are covered. It relies on trusted Railway runtime provenance, not remote
attestation. No production invocation or object copy occurred; the old inventory remains stale.

Combined validation: 849 tests passed, 24 database cases skipped by the default local command;
types, full lint, formatting, production build and bundle budgets passed. The actual pilot used
its own disposable database. Site's 38 tests/types/build passed. Hosted CI for this checkpoint
and live dry-run/provider acceptance remain outstanding.

### Current-production baseline reconciliation and upgrade rehearsal

Main's post-merge Verify `34002181523` passed. The deployed `a006f36` hotfix was merged into
the candidate as `9d18400`; the merge introduced no further content diff because the reviewed
guard was already integrated. CI and the populated-upgrade runner now explicitly pin actual
production `a006f36a3c4f37566c71b278d561844b45fb3b81` instead of the previous main baseline.

Root ran the updated populated rehearsal under Python optimization. Two candidate migration
runs preserved eleven synthetic records across ten tables, did not replay historical jobs,
and verified new constraints. The deliberate duplicate paid-history database rejected the
unique index while preserving both rows. Cleanup succeeded. Aggregate evidence is recorded in
[current-baseline upgrade](release-evidence/core-populated-upgrade-2026-09-06.json). This is
synthetic upgrade evidence; the separately recorded real-backup restore proves a different gate.
The read-only source-bound upload dry-run command and exact-origin image-policy changes are
assigned as independent bounded work; neither is accepted until root review and verification.

### Default-off upload guard release — 2026-09-06 UTC

Orchestrator accepted the isolated hotfix at exact reviewed head `2f6f0224f3de34af13e21e22f82314772dc5ac26`:
393 baseline tests plus types/lint/format/build/budgets, both hosted Verify checks, independent
review, no migration/dependency/namespace change, and read-only confirmation of the exact live
`f09e9d4` baseline with the freeze flag absent. The previous actual backup recovery rehearsal
remains recorded separately. These are the applicable gates for the default-off guard; this
acceptance does not waive the broader migration, provider or client-launch gates.

PR #10 merged as `a006f36a3c4f37566c71b278d561844b45fb3b81` at 00:46:51 UTC. Railway automatically
started deployment `b620280d-6445-4ba8-bb23-b6e9226391d9` for that exact commit; it was BUILDING
at inspection. Main hosted run `34002181523` was in progress. No flag or namespace was changed.
Post-deployment verification subsequently passed: Railway reports SUCCESS for the exact commit,
the old deployment is REMOVED, live SSH confirmed that commit and the compiled guard with the
flag absent, and readiness returned HTTP200. See
[deployment evidence](release-evidence/core-upload-guard-release-2026-09-06.json).
This was read-only verification; no real upload/delete was attempted. The old source
inventory/plan cannot be treated as current after this deployment; refresh it only after the
separate writer barrier is established. Upload freezing and object copying are not approved by
this default-off release checkpoint.

### Editable content URL normalization fix

Review of the remaining image/CSP mismatch found that both Core and Better Farms accepted
backslash-containing paths as internal URLs. Browser URL parsing can reinterpret a leading
slash/backslash as an external host, including credential-bearing targets that bypass the
explicit HTTPS validator. Both validators now reject backslashes and ASCII control characters
in site paths. Ordinary site paths and explicit credential-free HTTPS targets remain supported.
Four Core regressions and all 36 site tests passed; both type checks and scoped Core lint passed.
The site fix is committed separately after `8021f6b`; the two-origin pin remains historical until
it is refreshed. No production change occurred.

The original HTTPS image/CSP mismatch is still open. Its correct resolution must coordinate
the editable image contract with the site's permitted image origins, so an editor cannot save
an image the browser refuses to render. No wildcard image origin was introduced by this fix.

### Combined pilot acceptance refreshed — 2026-09-06 UTC

Root reran the complete three-case two-origin pilot with the clean site source pinned to
`8021f6bab7727b4ffd0614acea8d619ce39a3400`. All three passed in 16.6 seconds: CMS preview/draft/
publish and stale-write/permission boundaries, plus actual post-commit lost-response retries
for contact and newsletter. Each unchanged retry retained its original receipt and one local
effect set; a changed accepted payload created a distinct receipt. No outbound provider effects
were enabled. The local fixture exited and no pilot container remained. Aggregate receipt
proof is retained in [integration evidence](release-evidence/better-farms-integration-2026-09-06.json).
Site hosted Verify `34001963412` passed. This refreshes the development-Core/compiled-site
integration proof; it does not establish production checkout, email delivery, public content
approval or a deployment. The broader Core hosted runs were still in progress at inspection.

### Better Farms navigation acceptance follow-up

Site `8021f6b` is committed and pushed on `codex/form-reliability`. It preserves the configured
canonical origin through unknown-route loads, removes canonical links on unknown SPA routes,
recreates them on valid routes, and removes the explicit browser zoom cap. All 35 site tests,
types and build passed; the compiled production app passed actual Chromium direct-load,
SPA-navigation and Back/Forward metadata checks using a synthetic origin. The local browser
and app were stopped. Hosted CI and the Core two-origin rerun for this new site revision are
still pending; no site or Core deployment occurred. See the updated route acceptance status.

### Settings and release checkpoint — 2026-09-06 UTC

All five Ecommerce Settings destinations were corrected and verified in production by the
settings routing release. The broader ecommerce completion scope remains active: reliable
configuration, checkout and refund correctness, inventory concurrency, provider reconciliation,
and operator recovery must be verified before claiming ecommerce launch readiness.

The follow-up settings candidate passed hosted Verify, including 34 application browser cases
and transactional settings database coverage. Subsequent backup recovery, Better Farms retry,
and exact-object migration checkpoints also passed hosted Verify (`34000858616`, `34001067799`,
`34001429853`). These results establish candidate validation, not production deployment.

The isolated default-off media mutation guard is committed as `2f6f0224f3de34af13e21e22f82314772dc5ac26`
and proposed in [draft PR #10](https://github.com/Go-Digital-Alchemy-Repos/Core-Platform/pull/10).
Both branch and PR Verify checks passed (`34001574491`, `34001616162`); independent review found
no must-fix issue. All 393 baseline tests, types, lint, formatting, build and bundle budgets passed.
Its integration into the broader candidate is `176af77`; the candidate's local full checks also
passed. The PR remains unmerged and the production freeze flag remains unset. Admission guards
do not replace the required old-writer drain and final inventory reconciliation.

Read-only production inspection at 00:30:40 UTC found no `ecommerce_stripe` settings rows.
The ecommerce Stripe service reads those settings rather than an environment fallback. Existing
order status counts do not establish provider acceptance or prove that the orders are demos.
No Stripe request or configuration mutation was performed. Sandbox payment, cancellation,
delayed webhook and refund acceptance remain outstanding; they must not be inferred from
synthetic browser or database tests.

### Exact-record media migration and controlled cutover preparation

The upload planner now supports v2 ownership tied to one exact legacy CMS object, preserving
v1 plans and their hashes. It binds the record/key/content digest to independently supplied
source deployment/service/database identity. The executor requires current record reads before
storage access and immediately before copying. Reserved client/backup namespaces, extra entries
and connection fields are rejected. Root reviewed the changes and passed 94 planner/executor/
adapter regressions plus types, lint and formatting.

A bounded read of the actual R2 image verified its SHA256 and 199,788-byte size, then rechecked
the authoritative CMS row. The private metadata-only plan is
`e52c75d19b798e7aaa3bf36b4f2f25c7fa09fb66fbc7f6c5fb4b9661f2d256fb`.
It is not an apply approval or executed storage dry-run. Its source inventory must be refreshed
after the writer barrier is established; no production object has been copied.

Orchestrator cutover direction: assign stable current-Core identity `core-platform`, preserve
the explicitly configured legacy `system-backups` location for this maintenance release, and
use `clients/core-platform/uploads` for uploads. These are planned settings, not live changes.
New-client origin-derived preflight remains a distinct deployment contract.

Source review found no existing media freeze. Making R2 unavailable would trigger old-main local
fallbacks, and a false delete result would not prevent deletion of the CMS row. An isolated,
default-off throwing freeze guard is implemented across upload, replacement and deletion
paths (draft PR #10; not deployed). Old writers/in-flight operations must be drained before final inventory; a flag alone is
not a barrier. Keep writes frozen through cutover acceptance. After reopening writes, rollback
requires a namespace-compatible artifact or explicit reverse-copy reconciliation rather than
blindly returning to raw-key old main.

### Live storage inspection and actual backup recovery

The settings candidate `9a8bf1a` passed hosted Verify (`34000263302`). Read-only production
inspection then established actual storage facts rather than relying on configuration: the
referenced unprefixed R2 image exists, the other local CMS file is missing, and relevant paid
inventory duplicate groups currently number zero. Stack identity and explicit backup namespace
remain unset. The missing local URL has no other-table references in the inspected backup;
its original source was not found in the three Core checkouts. No replacement or deletion was
guessed from another image's equal file size.

The latest actual production backup (main `f09e9d4`, 00:01:45 UTC) was fetched by exact key to
a private temporary file. Two independent disposable restores preserved all 94 tables and 391
rows before and after candidate migrations, including encrypted values as ciphertext. Root's
run used Python optimization to confirm the checks remain active. Containers, volumes and
private backup input were removed. Only aggregate evidence was retained in
[live storage and recovery](release-evidence/core-live-storage-2026-09-05.md). No production
write, provider operation, DNS change or deployment occurred. Media recovery, namespace
ownership/cutover, encryption-secret recovery and controlled replacement remain separate gates.

The seven-route Better Farms audit is recorded in
[route acceptance status](pilots/better-farms/route-acceptance-status.md). It exposed lost form
idempotency between the React form and Core. A reviewed isolated site change, `cec78df`, now
retains keys through ambiguous unchanged retries and forwards them through the proxy; changed
payloads and accepted successes renew them. Site tests/types/build passed. The actual
after-commit response-loss browser proof is the next acceptance step; no site deployment occurred.

**Retry acceptance verified:** Root independently passed all three two-origin pilot cases against
site `cec78df` (15.5 seconds). For contact and newsletter, the browser response was discarded only
after the real Core receipt and one local effect job were verified in PostgreSQL. Unchanged retry
returned the same submission ID and retained one receipt/effect set. A changed payload after that
successful retry created a distinct receipt. Invalid inputs created none, and failed-response inputs
remained in the form. See [synthetic receipt evidence](release-evidence/better-farms-form-retry-2026-09-05.json).
The fixture enables only local contact/CRM effects and sends no provider email. The earlier
preview/draft/publish case still passes. Retry memory lasts for the mounted form; navigation/reload
recovery is not claimed. Site hosted Verify passed (`34000741175`); no site release occurred.

### Populated upgrade, two-origin pilot and upload execution checkpoint

Hosted Verify run `33999305310` passed for `70f8f9e`. The next checkpoint adds a pinned-main
populated upgrade rehearsal to CI, preserving its JSON evidence with the compiled runtime report.
The actual local rehearsal also passed under Python optimization: two candidate migration runs
preserved eleven seeded records across ten tables, did not replay historical effects, and verified
new constraints. A separate duplicate-paid-history database correctly rejected the unique index
while retaining both records. Cleanup was confirmed. These are synthetic fixtures, not evidence
that production contains no duplicates or that production recovery has been exercised.

The dedicated Better Farms HTTPS fixture passed against the unchanged site revision `ee14d67`.
Root independently reran it successfully (13.3 seconds): actual content-editor UI, live preview,
private drafts, publication on a fresh public page, stale-write rejection, permission boundaries,
and browser-enforced origin/message isolation. Core runs its development application and Better
Farms its compiled production application. This proves the Fund a Farm integration slice; remaining
route acceptance, infrastructure and production cutover gates remain open.

Upload migration now has reviewed executor/adapter libraries: exact target and ownership callback,
dry-run default, explicit plan binding for apply, byte verification, atomic create-only destination
writes, source preservation, durable-result callback and revalidation on resume. Request/body
deadlines and byte limits bound operations. Thirty-two added focused regressions passed; the full
ordinary suite passed 749 tests with 19 opt-in database tests excluded from that run. TypeScript,
lint, formatting, build and budgets passed. The ownership inventory, operational CLI, actual R2
conditional-write verification and media cutover remain unfinished; no production objects changed.

Ecommerce remains an active completion workstream. The settings 404 incident below is resolved;
settings load/error/save behavior is receiving an additional targeted review before further release.

### Ecommerce settings incident and expanded completion scope

The Project Owner reported that every Admin → Ecommerce → Settings submenu returns 404 and authorized
fixing ecommerce bugs and completing the ecommerce solution. This is an added requirement of the
active program goal. Prioritize the five reported settings destinations (store, customer accounts,
security, Stripe, tax), verify navigation and settings behavior, then audit the complete ecommerce
journey against the existing ecommerce backlog and release criteria. Do not interpret “world class”
as proof of completion or as permission to bypass provider, transaction, or production verification.

Initial source evidence: the menu generates `/admin/ecommerce/settings/<section>`, but App.tsx
registers only `/admin/ecommerce/:view` and `/admin/ecommerce`. A minimal release-branch hotfix is
being isolated from the larger integration program.

**Resolved in production:** PR #8 merged as `119383598aec848640a1a4ee08804c99c5fdeef9` and Railway
deployment `8d422058-5bcc-4785-8f8c-1db5ee59c8a8` reached SUCCESS. The five-line route addition retains
admin and feature gates. Against exact locked dependencies, TypeScript, lint, formatting, 386 tests,
production build and bundle budgets passed; independent review accepted it. The live authenticated
admin browser loaded all five screens and their Save controls after release. No settings values were
changed. `/api/health/ready` reported database connected at 2026-09-05T22:54:04Z. This closes the routing
incident, not the broader ecommerce completion workstream. The fix is also merged into remediation.

### Ecommerce settings load and save correctness follow-up

The routing hotfix exposed a separate issue: four settings forms offered Save before their initial
GET completed, and all five lacked load-failure recovery. The candidate now waits for successful
hydration, offers Retry, preserves edits across background refreshes, and reports failed saves
without clearing entries. Twenty-one focused regressions passed; the initial failure tests reproduced
the previous behavior before the fix. Root independently passed all 39 settings/routing regressions.

Backend review also found non-atomic multi-field writes: Stripe could commit active mode before a
credential write failed, while tax and fraud settings had the same partial-save pattern. These now
use one transactional conflict-upsert batch. Encryption finishes before writes, concurrent first
saves no longer race through select-then-insert, and caches invalidate after successful commit.
A generation counter prevents an older in-flight read from repopulating an invalidated cache;
delete follows the same successful-write boundary. Other application instances retain the existing
60-second cache TTL, so this is not immediate cross-instance invalidation.

Independent review accepted the change. Five real PostgreSQL tests passed for rollback, concurrent
first saves, coherent reads during writes, encryption and category moves; fixture cleanup completed.
CI now runs these tests in a dedicated database. The full ordinary suite, types, lint, formatting,
production build and bundle budgets passed. Root also ran all 32 real application desktop/mobile
journeys successfully, including settings persistence, transport-failure recovery and editor denial.
Two additional desktop/mobile Stripe cases passed with synthetic local test keys: UI save/reload,
masked GET responses, and blank-secret resave preservation. No Stripe provider call was made.
These additional fixes are candidate changes, not yet deployed. Hosted Verify for the preceding
checkpoint `fb19e45` passed as run `33999814457`.

### Runtime-discovered follow-up: database timestamp consistency

Disposable form-outbox tests exposed local-time Date binding against PostgreSQL timestamp-without-
timezone columns. The form worker correction is in progress. The same pattern requires a separate
ecommerce fix: `server/storage/ecommerce.storage.ts:1378` passes a Date directly when comparing
inventory reservation expiry against a timestamp-without-timezone column. Follow-up inspection of
the fully migrated disposable database confirmed migration `0052` converts notification claim and
next-attempt timestamps to timezone-aware columns, so that claim predicate does not share the expiry
defect. Test reservation expiry under a non-UTC process timezone before accepting that worker gate.

**Reservation fix verified:** the raw comparison now uses UTC ISO encoding, matching typed storage
inserts. Four disposable PostgreSQL regressions failed before the fix and passed after it in both
New York and UTC process timezones; each run also checked UTC and New York database timezones.
Coverage includes exact expiry boundaries, future/paid/cancelled/released exclusions, distinct order
IDs, ordering, and limits. Existing reservation-service tests passed. The disposable container was
removed. This changes no payment-provider behavior or schema and is not yet deployed.

The Project Owner appointed task `01a073ab-f0d7-74b2-a649-4f69e49248ab` as the new Orchestrator,
adopted `/Users/mike/Desktop/ORCHESTRATOR.md`, and authorized autonomous implementation within the
program goal. Routine decisions must not stall development; when one workstream is blocked, continue
independent approved work. Existing production release gates remain in force.

The new remediation branch is `codex/orchestrator-remediation`, based on verified integration revision
`6a74c6d`. The earlier integration branch and primary checkout remain preserved. The previous
Orchestrator's last inspected turn reports CI success for that revision; no durable handoff document
was found, so ownership and state are being reconstructed from source and this ledger.

The [September 5 review](orchestrator-review-2026-09-05.md) is the remediation intake. Current ownership:

| Work | Owner | Status |
| --- | --- | --- |
| Consistent backup snapshot and session-safe backup/restore locks | Infrastructure specialist; Orchestrator integration | Code reviewed; mocked cleanup and six disposable PostgreSQL regressions passed |
| Durable production upload enforcement for attachments and CMS media | Orchestrator | Eight focused regressions passed |
| Fresh notification claim/retry timestamps | Engineering specialist; Orchestrator integration | Code reviewed; eight focused regressions passed |
| Durable form effects and retries | Engineering specialist; Orchestrator contract ownership | Implemented and independently verified; awaiting integration release |
| Digital Alchemy CRM settings/capability comparison | CRM source analyst | [Source-backed gap analysis](crm-capability-gap-analysis.md) completed at upstream revision `8473fa9` |

The owner explicitly added CRM improvements from `Go-Digital-Alchemy-Repos/DigitalAlchemyCRM` to the
goal. Adapt useful settings and capabilities to Core's architecture and permissions after source
comparison; do not transplant the source project's tenancy or contracts. The reusable React website
build prompt and deployment playbook remain deferred until the system and pilot are complete.

### First remediation checkpoint

Backup export now uses one repeatable-read transaction; backup and every restore entry point retain
one checked-out connection for their advisory lock. Unlock failures evict the connection. Local
PostgreSQL tests exercised concurrent parent/child writes, restoration, competing backup/restore,
and cleanup after read/storage failures. Production attachments, CMS media, and avatars now fail
instead of silently accepting local-disk storage when R2 is unavailable. Development fallback is
preserved. Notification claims and retries use current operation time rather than batch start time.

At the checkpoint, the full suite passed 560 tests in 116 files; six opt-in database tests were skipped
in that run and passed separately against disposable local PostgreSQL. TypeScript, lint, formatting,
production build, and bundle budgets passed during this remediation pass. The subsequently started
form-outbox implementation is unfinished and requires its own complete validation before release.
No production deployment or production data operation has occurred for these remediation changes.

### Durable form delivery and enforced release checks

Managed form submissions now enqueue their downstream effects atomically. Internal CRM/contact
writes and completion share a transaction; external email/Mailchimp delivery uses durable retries,
fenced claims and bounded transport operations. An operator CLI lists and retries failed jobs without
printing submission contents. Historical submissions are not replayed. Submitted notification text is
escaped in both fallback and configured HTML templates. New job dates use timezone-aware columns.

Validation passed: 587 tests, TypeScript, lint, formatting, production build and bundle budgets.
Independent fresh PostgreSQL verification passed 14/14 checks under both New York and UTC process
timezones with the database session in New York. Immediate-claim tests use the database clock to
avoid host/container clock skew. CI now explicitly runs backup, form and reservation database tests
in both process timezones. SMTP phase/inactivity timeouts are configured, but a strict whole-message
deadline remains follow-up work; external delivery remains at least once. These changes are not yet
in production.

PR #9 added the hosted Verify workflow to main after successful hosted runs 33997345291 and
33997339214. Main now requires an up-to-date Verify check from GitHub Actions, a PR and resolved
conversations, including administrators; force pushes and deletion are disabled. No bypass allowances
were added. Independent review remains procedural. Railway deployment
`3d85b969-b2f7-4e0d-a774-34d6fb4e4144` for `f09e9d4199ffca634c0bc1df5c4e48d3c63bb762`
reached SUCCESS; readiness reported database connected at 2026-09-05T23:05:26Z.

CRM-1's [implementation contract](crm-settings-implementation-plan.md) is accepted for the next
bounded implementation: configurable labels, preset colors and display order over the existing six
immutable stage keys, admin-only writes, permitted editor reads and generic settings bypass
protection. This is accepted design, not a claim that the feature has shipped.

### Next infrastructure and CRM checkpoint

Hosted run `33997734605` succeeded for `9bf61dd7ceb92fb5e518389b0b7b983aa5377cd4`,
including repeated migrations and the explicit reliability database tests under both timezones.

The Orchestrator is implementing an explicit [database transport policy](runbooks/database-transport.md).
Sanitized production configuration inspection confirmed the private Railway database hostname,
explicit `sslmode=disable`, and both Railway project/environment identity variables. No secrets were
printed or variables changed. The proposed policy preserves that explicit private-network mode and
removes the unverified-certificate fallback for remote connections. Forty policy tests and
TypeScript/lint passed. Independent real PostgreSQL TLS testing caught an IP-host certificate mismatch
accepted by the driver's default identity handling. An explicit URL-bound identity callback corrected
it. The same fixture then passed trusted-CA encryption, untrusted-CA rejection, incorrect-host
rejection and explicit local plaintext checks. The policy is accepted as a candidate for integration;
it has not been deployed.

The engineering specialist owns graceful startup/shutdown and seven worker drains, with actual
HTTP/worker tests required. The CRM specialist owns CRM-1 implementation against the accepted
contract, including actual mounted permission tests and browser acceptance. These in-progress
candidates are not release evidence and remain subject to Orchestrator integration review.

### CRM presentation, graceful shutdown and actual browser checkpoint

CRM-1 now has typed settings for label/color/order over the original six stage keys, admin-only
writes, permitted CRM-editor reads and reserved-key protection in the generic settings routes.
Mounted permission tests exposed the earlier root admin guard blocking CRM editors before their
CRM gate. Moving only the CRM mount before that blanket guard restores the intended access;
unrelated admin routes remain protected. The UI now consumes the shared configuration throughout
pipeline presentation. No lifecycle stage enum or won-conversion behavior changed.

Runtime signals now stop admission and polling, drain startup/HTTP/current worker work, then close
the database. A bounded deadline forces nonzero exit when work cannot drain. Independent review
accepted the implementation; 24 lifecycle/worker checks passed, including real HTTP sockets, and
an actual application signal shutdown exited cleanly. Railway termination grace must still be
verified against the configured application deadline before production release.

The new default browser suite starts actual Express/Vite against guarded, synthetic local PostgreSQL
and excludes inherited provider credentials and both server/Vite dotenv discovery. Six journeys
passed across desktop and mobile: all five ecommerce settings destinations plus reload, CRM UI
save/reload with original stage keys, and editor read/write/route boundaries. CI now installs Chromium
and runs these journeys. The old synthetic CSS fixtures are explicitly separate layout checks.

Combined validation: 670 tests passed with 18 opt-in database checks skipped in that ordinary run;
the earlier hosted reliability checkpoint ran those database checks explicitly. Current TypeScript,
lint, formatting, build and bundle budgets passed. The six new browser journeys passed locally;
the new hosted browser gate is awaiting its first run. CRM saved-config backup/restore, renamed-won
conversion and the rest of the detailed CRM acceptance contract remain open. These changes are
committed candidates, not a claim of production deployment or full program completion.

### CRM restore acceptance found and corrected stale settings

A real disposable PostgreSQL restore exported configured CRM labels/colors/reversed stage order,
changed the settings and primed the serving process caches, then restored the snapshot. The database
and fresh storage returned restored data, but the warm singleton still served the changed settings.
The shared restore entry point now invalidates settings key/category caches only after commit.
Seventeen focused checks passed, including seven real database tests proving immediate restored
reads and preservation of the six immutable stage keys. This invalidation is process-local; other
replicas require restart/cache expiry. No production restore or data operation occurred.

### Production artifact and platform teardown verification

Hosted run `33998294076` passed for `b61ad7f`, including the real development-app browser journeys.
A separate compiled production smoke exposed a release blocker before database connection:
Sharp 0.35.4's ESM `createRequire(import.meta.url)` was bundled into CommonJS, losing its module URL.
Externalizing the production Sharp dependency corrected that crash; the rebuilt artifact completed
strict-TLS migrations/bootstrap on macOS, then encountered macOS's unsupported production reusePort
option. An isolated Linux image smoke is now running to verify readiness and signal drainage on the
correct platform. Independent review accepted the package/config changes; green build/browser
checks alone did not prove the compiled server could start. A persistent compiled-production smoke
gate remains required alongside the development browser gate.

Read-only Railway inspection found the active deployment has no explicit drain grace and starts
through npm. Candidate config now starts Node directly with production mode and sets 45 seconds
of platform grace for the 30-second application drain. Current Railway runtime is Node 22.23.2
(Railpack 0.39.0). Effective config and a real replacement still require verification after a gated
release; no production configuration was changed in this verification work.

### CRM-1 acceptance and compiled Linux smoke completed

CRM-1's expanded real-app browser acceptance passed 18 combined desktop/mobile cases, followed
by both enhanced configured-editor cases. Evidence covers saved stage presentation across board,
list/filter and both selectors; renamed won conversion with concurrent retries creates exactly one
client; a customer-looking nonterminal label creates none. Editor access, invalid/generic writes,
disabled/re-enabled CRM, malformed/future-version fixture recovery, failed-request retry, and both
themes were exercised. The tests found mobile control clipping; a minimal fieldset width/control
wrapping fix resolved it. Badge contrast met 4.5:1 in both themes. The separate real backup restore
test closes saved-config recovery. CRM-1 is accepted in source, not deployed.

The compiled production artifact then passed a separate Linux smoke on Railway's Node 22.23.2:
Node was PID 1, readiness 200 reported connected, actual PostgreSQL sessions used TLS 1.3, and SIGTERM
produced draining/drained then exit 0 in 0.088s. Tested artifact SHA256:
`ca568353328ab354e4fa0546f3d157fe7943af9e65f75a46487c9cb507d4493d`.
The image must retain docs and installed production dependencies alongside dist. This disposable
fixture proves the artifact/start command locally; live config adoption remains a release gate.
The engineering specialist is converting the fixture into a reproducible CI production-start gate.

### Planning reconciliation

The master plan's historical planning-only authorization paragraph was superseded by the owner's
current autonomous execution authorization. Its current-state section now reflects the approved
seven-route/no-import pilot, operator and recovery fields already present in intake, while retaining
the draft overall intake and unresolved client production release gates. This removes contradictory
instructions without converting incomplete production evidence into approval.

### Reproducible production-start gate accepted

Hosted run `33998723053` passed for `745cde6`, including expanded CRM browser journeys.
The checked-in `script/verify-production-runtime.py` now repeats the compiled Linux startup with
full locked production dependencies, trusted TLS PostgreSQL, artifact hash/native Sharp checks,
PID 1, readiness and SIGTERM drainage. Final candidate passed on Node 22.23.2 with six TLS 1.3
connections and exit 0; the old bundled-Sharp negative control failed before readiness as expected.
Both fixtures reported removal of every owned container. Python syntax validation passed.
CI runs this gate after build/budgets and preserves JSON evidence; first hosted execution of this
new step is pending. It complements active-request/worker shutdown tests and does not prove the
live Railway settings have changed.

The [Core release-readiness audit](core-release-readiness-2026-09-05.md) distinguishes the full
260-file integration branch from a genuinely narrow CRM extraction. The main remaining Core
release evidence includes populated upgrade/recovery and existing upload namespace compatibility.
Better Farms site launch remains separate. Its next bounded integration task is validated-origin
preview CSP and content-editor access, followed by a real two-origin preview/publish journey.

### First hosted production gate follow-up

Run `33999010828` failed because its first five-second `docker exec` readiness observation timed
out during installation/startup. The harness incorrectly treated that observation as terminal and
removed the still-running fixture. It now retries the same container within the original 180-second
monotonic deadline, with a bounded HTTP probe, and records observation timeouts. It does not restart
the container or extend the deadline. Diagnostic log timeouts are also contained so cleanup/report
writing still runs. The next hosted run must prove the corrected gate succeeds.

### Preview policy and scoped upload migration planning checkpoint

Core preview frame policy now permits only the public origin from an explicitly configured,
validated client manifest. Missing configuration preserves standalone restrictions; invalid explicit
configuration rejects startup before migrations/listening. Independent review found a coherent
wildcard-host manifest bypass; new shared-validator and middleware regressions reproduced it and
now reject both wildcard origins. Content editors can reach the client-site-content router before
the blanket admin guard while unrelated admin routes remain denied. These source and mounted-route
checks do not yet prove the real two-origin Better Farms preview/save/publish journey.

A server-only legacy upload migration planner now requires explicit stack/bucket/source ownership
attestation, exact source keys with content identities, the current destination namespace and a
stable plan digest. It rejects conflicting mappings and preserves originals; it can classify copy,
verified-resume and source/destination conflicts without performing storage operations. Twenty-eight
focused tests passed. Ownership attestation is not verified access authority. The apply service,
actual same-stack inventory/ownership evidence and verified copy rehearsal remain required; no
unscoped fallback or production object movement was introduced.

Combined checkpoint validation passed 717 tests, with 19 opt-in database tests skipped in that ordinary
run; TypeScript, lint, formatting, build and bundle budgets passed. The added backup database case
was separately exercised earlier. See the hosted run for the next exact-candidate gate evidence.

## Current Program State

| Milestone                             | Status      | Evidence                                                                                                                                                                                                         | Remaining gate                                                                                                                                                                               |
| ------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Governance and baseline            | In progress | Core baseline `e2ba048`; Better Farms baseline `6dd6335`; Woo prototypes `325188d` and `ffd11a6`; orchestrator review and fail-closed intake contract recorded                                                   | Verify remaining client launch evidence and approvals; approved intake already records seven routes, no import/live checkout/DNS cutover, Mike as operator, and 1440-minute RPO/RTO    |
| 1. Manifest and integration contracts | In progress | Manifest v1.0, compatibility validation, exact-origin preview, runtime publication ADR, Better Farms fixture, WooCommerce import contract v1.0.0, and a registrar-neutral DNS-plan/verification contract         | Client confirmation of pilot modules, exact domains and origin ownership, provider responsibilities, and remaining route/data decisions                                                      |
| 2. Better Farms adapter               | In progress | Better Farms source `31deb36`; locked shell, theme adapter, bounded Fund a Farm registry/content, preview, runtime API fallback, authenticated public-form proxy, route metadata, and hosted quality gate        | Complete site inventory and expand page, form, SEO, accessibility, responsive, and asset coverage incrementally                                                                              |
| 3. Railway deployment foundation      | In progress | Client-stack preflight, stack identity, Railway/manual-domain runbook, backup provenance, runtime-publishing rollback runbook, registrar-neutral onboarding, and read-only A/AAAA/CNAME propagation verification | Record client ownership/certificate/routing/API/health/redirect/rollback evidence, provider-specific ALIAS/ANAME evidence where applicable, and rehearse restore in a disposable environment |
| 4. WooCommerce adapter                | In progress | Phase 1 catalog rehearsal has planner, atomic durable batches, target ownership checks, replay, and checkpointed failed-run resume evidence on disposable PostgreSQL; both prototype branches remain preserved   | Map and approve the remaining client scope; customer/order apply remains disabled and no client data may be used                                                                             |
| 5. Transaction correctness            | In progress | Atomic membership/webhook/operator effects; ecommerce webhook, paid-order, payment-link, refund, inventory-reservation, and notification-outbox controls; database-enforced paid inventory effects               | Complete provider sandbox and operational reconciliation evidence; approve client tax, shipping, fulfillment, return, dispute, finance, and support workflows                                |
| 6. Integrated pilot                   | Blocked     | Depends on Milestones 2–5 and approved infrastructure intake                                                                                                                                                     | Production-like integration and acceptance suite                                                                                                                                             |
| 7. Launch and hypercare               | Blocked     | Production release requires all prior gates and current backup/rollback evidence                                                                                                                                 | Explicit go/no-go evidence, approved domains/operators, and successful post-deploy verification                                                                                              |
| 8. Reusable playbook                  | Planned     | Existing manifest, deployment, and integration documents provide the initial source material                                                                                                                     | Complete after pilot evidence identifies reusable versus Better Farms-specific work                                                                                                          |

## Orchestrator Decision Policy

Routine, reversible implementation choices inside the approved architecture proceed autonomously. Escalation is
reserved for material product or architecture choices, unavailable credentials or external authority, destructive or
irreversible operations, paid services, legal or compliance decisions, and production actions without a controlled
rollback path. No real client data, live DNS, or production deployment is used during repository implementation.

## Module Portfolio Priorities

The 2026-09-03 source review covered CMS/editor, design and theme settings, provider directory, events, careers,
portfolio, CRM, ecommerce, memberships, forms, and notifications. Focused evidence suites passed 208 tests, but the
portfolio is not release-ready. Work is ordered by boundary risk and dependency:

1. Authorization and privacy: settings key ownership, provider moderation fields, public directory DTOs, event
   access URLs, initial administrator setup, and private resume delivery.
2. Transaction correctness: membership and ecommerce webhook claims, inventory and coupon effects, refunds,
   event capacity/payment states, and CRM conversion/deduplication.
3. Content safety and delivery: shared rich-content policy, form side-effect idempotency, career integrations,
   durable notifications, and audit trails.
4. Migration and operations: durable WooCommerce mappings/runs, pagination and retention, object backup/restore,
   CI/E2E/accessibility gates, and module observability.

Notifications are currently a UI/storage scaffold without production event producers. CRM atomic conversion and CRM-1 presentation settings now have disposable database and real-browser
acceptance evidence; production release and broader CRM enhancements remain open. Ecommerce and memberships must not process live transactions
until their webhook and transaction gates are closed.

## Security Baseline

Codex Security scan `18959473-19cb-409a-acde-2838a0474ff0` is sealed against Core commit `887f2c0` with nine
validated findings: four high, four medium, and one low. The first remediation checkpoint covers production
bootstrap authentication, branding-setting authorization, provider self-moderation, directory response privacy,
provider biography sanitization, event access-link authorization, private resume namespaces, and server-approved
legacy membership prices. Online dependency advisories and live ingress, bucket, volume, provider, and cross-client
configuration remain explicitly deferred.

## Accepted Checkpoints

### 2026-09-03 — Public CMS HTML boundary hardening

- **Implemented:** Better Farms' newsletter fixture now targets the existing managed-form submission route;
  public CMS pages and previews, public sidebars, and public managed-form HTML pass through the established
  allowlist sanitizer at the response boundary.
- **Content compatibility:** the policy retains the CMS editor's headings, lists, links, and approved image
  markup while removing scripts, event handlers, unsafe URL schemes, and arbitrary embeds. No stored content
  was modified.
- **Validation:** manifest and sanitization regression coverage added; no database, client data, deployment,
  DNS, or external-service action performed.

### 2026-09-03 — WooCommerce phase-one catalog planner

- **Implemented:** strict `core.woocommerce-import` v1.0.0 envelope parsing; stable source fingerprints and
  operation hashes; deterministic category, simple-product, default-variant, media, and relationship plans;
  exact currency precision; conservative HTML transforms; parent-cycle, product-type, status, tax, URL,
  money, slug, SKU, and disabled-data validation; and a read-only sanitized dry-run CLI.
- **Target safety:** inspection uses durable mappings as ownership evidence, blocks unowned deterministic
  target IDs and slug/SKU conflicts, detects missing or edited mapped targets, and identifies unchanged
  same-source operations as idempotent matches.
- **Validation:** 432 tests in 91 files, type check, lint, production build, a ready synthetic offline dry
  run, Better Farms manifest validation, bundle budgets, formatting, and diff whitespace checks passed.
- **Production impact:** none. The CLI is offline-only, no target adapter is wired, no client export is
  present, and any undispositioned warning blocks apply.
- **Next gate:** implement the durable phase-one target adapter so catalog rows, mappings, audit evidence,
  and checkpoints share one transaction; then prove resume and concurrency against PostgreSQL.

### 2026-09-03 — WooCommerce durable lifecycle foundation

- **Core:** `codex/uncommitted-work-audit`; additive migration `0047_woocommerce_import_lifecycle.sql`
  remains unapplied until an approved release.
- **Implemented:** schema-backed import runs, source/target ownership mappings, audit entries, quarantine
  records, active-run serialization, contract/mode/phase validation, explicit resumable state transitions,
  safe hashed record references, sanitized failure codes, and completion reconciliation gates.
- **Validation:** 423 tests in 90 files, type check, lint, production build, Better Farms manifest validation,
  bundle budgets, formatting, migration reconciliation coverage, and diff whitespace checks passed.
- **Safety boundary:** durable apply accepts phase 1 only. The migration does not import data, and customer,
  order, delta, or production cutover requests fail closed.
- **Next gate:** canonical catalog planner and target inspection behind the accepted port, followed by atomic
  phase-one batch apply and database-backed concurrency/resume tests.

### 2026-09-03 — WooCommerce import contract freeze

- **Contract:** `core.woocommerce-import` v1.0.0 accepted by the Project Orchestrator for implementation.
- **Decision:** preserve both prototype branches; adopt the catalog parser and collision protections from
  `325188d`, and the repository-port/run/checkpoint/rollback model from `ffd11a6`, behind one versioned
  target contract.
- **Safety boundary:** phase 1 permits only categories and simple physical catalog records in synthetic or
  isolated rehearsal. Customer and historical order apply remain disabled until the Project Owner approves
  privacy, identity, retention, finance, and side-effect isolation rules. No client export is authorized.
- **Next gate:** contract tests, additive mapping/run/audit/quarantine persistence, durable atomic batches,
  target-edit conflict behavior, and database-backed resume/concurrency evidence.

### 2026-09-03 — Ecommerce refund serialization

- **Core:** `codex/uncommitted-work-audit`; milestone commit recorded in Git history and pushed after validation.
- **Implemented:** order-locked refundable-balance reservation; one pending provider refund per order; immediate local `refund_pending` visibility; Stripe idempotency derived from the durable local refund ID; and webhook recovery by local refund metadata after an ambiguous provider response.
- **Validation:** focused refund, ecommerce service, and webhook tests; project type check, lint, formatting, full test suite, production build, client-site manifest validation, bundle budgets, and diff whitespace checks.
- **Production impact:** none. No provider calls, live refunds, database mutation, or deployment.
- **Risk carried forward:** pending-refund operator tooling and automatic reconciliation are not yet implemented; checkout request idempotency, durable email/jobs/replay, database-backed concurrency evidence, and Stripe sandbox evidence remain release blockers.

### 2026-09-03 — Ecommerce paid-order atomicity

- **Core:** `codex/uncommitted-work-audit`; milestone commit recorded in Git history and pushed after validation.
- **Implemented:** order-row serialization and one database transaction for Stripe paid-state transition, coupon redemption/counter mutation, guarded stock deduction, and inventory adjustment evidence. Admin re-save of paid state now retries the existing idempotent coupon and stock paths to recover partial legacy/manual work.
- **Validation:** 61 focused ecommerce service and webhook tests; project type check, lint, formatting, full test suite, production build, client-site manifest validation, bundle budgets, and diff whitespace checks.
- **Production impact:** none. No live payment, client data, database mutation, or deployment.
- **Risk carried forward:** manual-order creation still reaches paid effects through recoverable separate calls; database-enforced effect keys, checkout request idempotency, serialized refundable balance, durable email/jobs/replay, and Stripe sandbox concurrency evidence remain release blockers.

### 2026-09-03 — Ecommerce webhook delivery hardening

- **Core:** `codex/uncommitted-work-audit`; milestone commit recorded in Git history and pushed after validation.
- **Implemented:** atomic pre-effect claims for ecommerce Stripe events; retryable failure state; stale-claim recovery; per-attempt ownership tokens; and explicit completion only after payment-request, paid-order, or refund reconciliation returns successfully.
- **Validation:** focused concurrent-delivery lifecycle and migration tests; project type check, lint, production build, full test suite, client-site manifest validation, bundle budgets, formatting, and diff whitespace checks.
- **Production impact:** none. The additive `0046_ecommerce_webhook_delivery.sql` migration remains unapplied until an approved release.
- **Risk carried forward:** paid-order state, coupon redemption, and inventory deduction still cross transaction boundaries; checkout idempotency, serialized refundable balance, durable jobs/replay, and Stripe sandbox evidence remain release blockers.

### 2026-09-03 — Membership payment delivery hardening

- **Core:** `codex/uncommitted-work-audit`; milestone commit recorded in Git history and pushed after validation.
- **Implemented:** preserve-on-blank membership Stripe credentials with explicit clear semantics; admin form hydration from masked status; trusted-origin checkout and portal return URLs; additive webhook delivery status, attempts, failure evidence, stale-claim recovery, and per-attempt ownership tokens.
- **Validation:** focused credential, return-URL, webhook lifecycle, and migration tests; project type check, lint, production build, full test suite, client-site manifest validation, bundle budgets, and diff whitespace checks.
- **Production impact:** none. The additive `0045_membership_webhook_delivery.sql` migration remains unapplied until an approved release.
- **Risk carried forward:** subscription effects and audit writes are individually idempotent where supported but do not share one database transaction; ecommerce transaction correctness and live Stripe sandbox evidence remain release blockers.

### 2026-09-03 — Security boundary remediation

- **Core:** `codex/uncommitted-work-audit`; milestone commit recorded in Git history and pushed after
  validation.
- **Implemented:** production bootstrap token requirement; strict branding-setting ownership; provider
  self-service field restrictions and rich-text sanitization; visibility-aware public directory DTOs; event
  audience, registration, and recording-entitlement enforcement; private resume storage namespaces; and
  server-approved legacy membership prices.
- **Evidence:** sealed Codex Security scan `18959473-19cb-409a-acde-2838a0474ff0` reported nine findings
  against baseline `887f2c0`.
- **Validation:** 406 tests in 86 files, type check, lint, production build, client-site manifest validation,
  bundle budgets, and diff whitespace checks passed.
- **Production impact:** none. Production now requires `SETUP_TOKEN`; configure it before a future release.
- **Risk carried forward:** ecommerce and membership transaction atomicity, event capacity/payment lifecycle,
  shared rich-content policy, and the deferred dependency/live-infrastructure checks remain release blockers.

### 2026-09-03 — Runtime content publishing

- **Core:** `codex/uncommitted-work-audit` at `887f2c0`, pushed to origin.
- **Better Farms:** `codex/site-shell-fund-a-farm` at `0f0ddde`, pushed to origin.
- **Implemented:** manifest-generated content controls, exact-origin preview, draft/published snapshots,
  immutable revisions, optimistic conflict checks, public ETag endpoint, same-origin Better Farms proxy,
  and validated built-in fallback.
- **Validation:** Core 398 tests in 85 files, type check, lint, build, manifest validator, and bundle budgets;
  Better Farms 11 contract/security tests, type check, build, and dependency audit with zero findings.
- **Production impact:** none. No deployment, migration execution, DNS mutation, or client-data import.
- **Risk carried forward:** production origins and operators are not yet recorded; the runtime content tables
  remain unapplied until an approved release.

### 2026-09-03 — WooCommerce durable catalog repository

- **Implemented:** a versioned repository port and Drizzle adapter for Phase 1 catalog rehearsal. The adapter
  creates lifecycle runs, supports durable batch replay, checks source ownership and target baselines, applies categories
  before products, atomically writes target records, mappings, audits, and checkpoints, and preserves
  post-import target edits for manual review during rollback.
- **Validation:** 17 focused planner, lifecycle, and repository tests; TypeScript check; changed-file lint and
  formatting; and diff whitespace checks passed. No database-backed integration run was performed because no
  client or rehearsal export is authorized in this workspace.
- **Production impact:** none. No migration execution, client-data import, deployment, or external service call.
- **Risk carried forward:** database-backed interrupted/resumed/concurrent batch evidence, approved protected
  rehearsal input, and restoration of pre-existing mapped records remain acceptance gates before any client use.

### 2026-09-03 — WooCommerce rehearsal command guard

- **Implemented:** an explicit durable-apply command that accepts only `rehearsal` mode, requires an exact
  dry-run fingerprint and `--apply` acknowledgement, bounds batch size, and emits only sanitized aggregate
  evidence. It dynamically loads the database adapter only after all local input guards pass.
- **Safety boundary:** the command does not authorize cutover, production targets, client exports, migrations,
  or deployments. Its usage is recorded in the accepted import contract.

## Active Sprint

**Objective:** Implement the accepted WooCommerce import contract behind stable planner and repository ports,
starting with contract tests and additive durable lifecycle persistence. Transaction hardening remains a release
gate; the next payment checkpoint is a durable checkout-request model rather than a superficial client token.

**Write ownership:** the Project Orchestrator owns the WooCommerce contract, import services, additive lifecycle
migrations, tests, operational documentation, and this ledger. The two prototype branches remain read-only inputs.

**Acceptance gate:** no real client data; every record is applied, matched, excluded-approved, or quarantined;
resume and replay are idempotent; target edits fail to manual review; lifecycle and checkpoint writes are atomic;
database evolution is additive; existing Core tests, lint, types, build, migration checks, manifest validation,
and budgets remain green.

### 2026-09-04 — Durable ecommerce checkout requests

- **Implemented:** an additive checkout-request lifecycle that atomically claims a browser-generated UUID
  before account, customer, order, or payment writes. A repeated request for the same customer returns the
  existing Stripe PaymentIntent client secret after the order link is durable; a request for another email is
  rejected without exposing the order.
- **Safety boundary:** an in-progress or failed request cannot create another order. The browser keeps the key
  for an unchanged checkout payload and changes it when the payload changes. The migration remains unapplied;
  this does not authorize a production deployment.

### 2026-09-04 — Better Farms client-migration intake contract

- **Implemented:** a versioned, secret-free intake contract and validator capture source-access mode,
  pilot route scope, excluded capabilities, data entity dispositions, reconciliation owner, recovery targets,
  operational owners, release roles, and blockers. The validator permits a transparent draft but refuses an
  approved intake until each required decision is resolved and all three release roles are present.
- **Evidence:** the Better Farms draft references the same stack ID as the client-site manifest, explicitly
  excludes live ecommerce, customer/order history, and production DNS cutover, and validates through the
  new CLI. It contains no client credentials, exports, endpoint URLs, or registrar access.
- **Risk carried forward:** the draft is not a substitute for client decisions. Protected source access,
  approved scope and exclusions, RPO/RTO, DNS and release owners, and sandbox/production-like evidence
  remain required before approval or deployment.

### 2026-09-04 — Better Farms cross-repository site contract verification

- **Implemented:** a site-contract verifier loads the fail-closed manifest and checks its route components,
  source assets, theme token source, and Puck renderers against a supplied site checkout. References that
  escape the checkout or point to a missing file fail the verification.
- **Evidence:** the verifier passed against Better Farms revision `0f0ddde`, checking 12 unique declared
  source references with no missing or unsafe paths. It makes no network request, site change, build, or
  deployment.
- **Risk carried forward:** source-file presence does not replace visual, responsive, accessibility, SEO,
  form, API, or production-like acceptance evidence for the full pilot.

### 2026-09-04 — Better Farms combined pilot contract verification

- **Implemented:** a combined pilot verifier validates the migration intake, client-site manifest, and site
  checkout together. It requires matching stack IDs, requires every scoped intake route to be manifest
  declared, carries forward source-reference verification, and prevents an approved intake from pairing
  with a draft manifest.
- **Evidence:** the Better Farms draft intake, manifest, and source revision `0f0ddde` passed as one
  contract with no mismatch or missing reference.
- **Risk carried forward:** both records intentionally remain draft/blocked until the client provides the
  operational and migration decisions captured by the intake. The verifier does not authorize deployment.

### 2026-09-04 — Better Farms pinned-source build evidence

- **Evidence:** the clean Better Farms checkout at `0f0ddde40ed91f2cfa2182eb3627b51c85ec0c9c` passed its
  TypeScript check, all 11 site-contract tests, and its production build. The build emitted the expected
  static client artifact and server bundle without production credentials.
- **Coverage:** the source suite verifies the Fund a Farm editable-content contract and behavior locks,
  trusted preview origin/component checks, published-content fallback behavior, and safe Core API origin
  parsing. This confirms the source revision used by the combined pilot verifier remains buildable.
- **Risk carried forward:** this is source-build evidence only. It does not constitute a visual/
  accessibility/SEO acceptance review, live API integration, client content approval, or deployment.

### 2026-09-04 — Better Farms local production-route smoke check

- **Evidence:** the built Better Farms server ran locally in production mode. Each seven manifest-declared
  public route returned the static application shell with HTTP 200. Responses carried the expected production
  Content Security Policy and `X-Frame-Options: DENY` when no trusted Core admin origin was configured.
- **Content fallback:** the Fund a Farm runtime-content endpoint returned its intentional HTTP 503
  `Published content is temporarily unavailable` response because no Core API origin was configured locally.
  The pinned source's contract suite separately verifies the client fallback for that outcome.
- **Risk carried forward:** this does not test a configured Core API, authenticated preview, live browser
  rendering, or a deployed origin. No external request, client data, DNS, or Railway service was used.

### 2026-09-04 — Better Farms public-form proxy slice

- **Implemented:** Better Farms source revision `f14318e` replaces contact and newsletter success placeholders
  with the public same-origin API routes declared in its manifest. The server accepts only the managed Core
  contact (`name`, `email`, `subject`, `message`) and newsletter (`email`) payload contracts, forwards them
  to the credential-free configured Core origin, applies a five-second upstream limit, and returns a clear
  unavailable response when no origin is configured. Browser code remains same-origin under the existing CSP.
- **Evidence:** Better Farms TypeScript check, 14 site-contract/security tests, and the production build
  passed. A local production server returned HTTP 200 for `/contact` with its CSP and returned the intended
  HTTP 503 JSON response for a form attempt without an upstream Core origin. No upstream service or visitor
  data was contacted.
- **Risk carried forward:** enabling `CORE_PLATFORM_API_ORIGIN` requires client-specific Core form routing,
  data-handling approval, and a configured-environment rehearsal. The current generic Core system forms must
  not be assumed to establish client-scoped mailing-list or contact-message ownership.

### 2026-09-04 — Better Farms crawler-facing route metadata

- **Implemented:** Better Farms source revision `3fbe1bb` now emits server-rendered title, description,
  robots, Open Graph, Twitter, and canonical metadata for each declared public route. Browser navigation
  synchronizes the same tags. Canonicals require an explicit credential-free `PUBLIC_SITE_ORIGIN`, never
  derive from request headers, and are omitted for unknown noindex routes.
- **Evidence:** TypeScript check, all 17 Better Farms contract/security tests, and production build passed.
  A local production server configured with a test origin returned Fund a Farm metadata and its expected
  canonical URL; an unknown route returned `noindex, nofollow` with no canonical URL.
- **Risk carried forward:** a real public origin and content/SEO review remain client decisions. This is
  implementation and local evidence only; it makes no DNS, hosting, or deployment change.

### 2026-09-04 — Better Farms configured-form handoff verification

- **Implemented:** Better Farms source revision `46dfc54` makes the form proxy's Core origin and fetch
  dependency injectable for deterministic verification while preserving production configuration behavior.
  The proxy continues to validate the credential-free origin, accepts only strict managed-form payloads,
  and enforces the same five-second upstream boundary.
- **Evidence:** the Better Farms contract suite now includes direct proxy tests for a successful Core handoff,
  rejection of unexpected form fields before an upstream call, and the unavailable response on transport
  failure. TypeScript and all 20 contract/security tests passed without a Core request or visitor data.
- **Risk carried forward:** this proves the adapter handoff contract, not the client-specific Core form
  configuration. Data ownership approval and a configured-environment rehearsal remain required before
  enabling the upstream origin.

### 2026-09-04 — Ecommerce stock-boundary review

- **Verified:** cart pricing aggregates duplicate product/variant lines before order creation. Paid-order
  settlement runs in one database transaction: it serializes on the order row, transitions payment state,
  records any coupon redemption, conditionally decrements tracked non-backorder stock only when the available
  quantity covers the full line, and writes the inventory adjustment. A failed guarded decrement rolls back
  the paid transition and all accompanying effects.
- **Concurrency boundary:** competing paid orders use the conditional stock update, so only one can consume a
  limited final unit. Backorder-enabled variants are deliberately excluded from that nonnegative-stock guard.
  Focused inventory, ecommerce-service, and Stripe-webhook suites passed 66 tests.
- **Risk carried forward:** the database boundary is covered by code review and focused suites, but live
  checkout remains blocked pending Stripe sandbox concurrency and production-like end-to-end evidence,
  reconciliation procedures, and the client release approval.

### 2026-09-04 — Ecommerce refund outcome and reconciliation hardening

- **Implemented:** a Stripe refund returned immediately as `failed` or `canceled` now records as failed
  instead of remaining falsely pending. The admin refund API now provides a reconciliation action that lists
  refunds for the original PaymentIntent and matches only the durable local refund ID recorded in Stripe
  metadata. It never reissues a provider refund; a pending local reservation remains in place when no match
  is found.
- **Concurrency boundary:** the existing refundable-balance reservation locks the order and prohibits a
  second pending refund. Reconciliation updates the same durable refund record and recalculates the order
  payment status from current refund records. The provider request uses no user-controlled identifier.
- **Validation:** focused ecommerce suites passed 66 tests. The full Core gate passed: 98 test files/458
  tests, TypeScript, lint, formatting, production build, and bundle budgets. No Stripe API request, migration,
  or production data change was made.
- **Risk carried forward:** this needs Stripe sandbox evidence for delayed/failed/listed refunds and operator
  runbook/reconciliation acceptance before live refunds are enabled.

### 2026-09-04 — Membership webhook-effect atomicity

- **Implemented:** each accepted Stripe membership checkout or subscription event now applies its subscription
  write and audit record in one database transaction. Invoice paid and failed events likewise lock the linked
  subscription and commit its status, payment-failure timestamp, and audit event together. Webhook delivery
  claim and completion remain separate durable lifecycle operations so failed effects stay retryable.
- **Concurrency boundary:** the checkout/subscription path locks the user row before finding or creating the
  target subscription. Existing Stripe subscription metadata remains the fallback when a later provider event
  omits it. Focused lifecycle tests cover checkout, invoice, duplicate, and retry behavior.
- **Risk carried forward:** this does not establish Stripe sandbox concurrency or production-like end-to-end
  evidence. The external Stripe session-creation flow still needs sandbox reconciliation and retry evidence
  before live transactions are enabled.

### 2026-09-04 — Membership operator-effect atomicity

- **Implemented:** manual membership assignment, manual status changes, direct admin edits, and free-plan
  activation now each write their subscription change and audit event in one transaction. User-scoped writes
  serialize on the user row; direct subscription edits lock the subscription row before changing it.
- **Validation:** focused membership service and webhook lifecycle suites pass. The project type check, lint,
  and formatting checks remain green.
- **Risk carried forward:** no live Stripe session, customer, or subscription was created. Stripe sandbox
  reconciliation, concurrency, and the client release approval remain required gates.

### 2026-09-04 — Registrar-neutral client stack onboarding

- **Implemented:** an admin-only, credential-free domain onboarding workflow that validates client stack and
  domain topology, generates deterministic manual apex, `www`, and admin record instructions, and records
  rollback preparation. Its readiness evaluator distinguishes failed gates from DNS/certificate propagation
  that is still pending.
- **Safety boundary:** the workflow does not persist registrar credentials, call provider APIs, change DNS,
  create Railway infrastructure, or authorize cutover. The generated plan and observed verification evidence
  must be preserved in the client operations record before release review.

### 2026-09-04 — Separate public/admin origin preflight

- **Implemented:** the deployment preflight can now enforce the approved two-origin topology. When selected,
  it requires distinct canonical `PUBLIC_SITE_ORIGIN` and `CORE_PLATFORM_ADMIN_ORIGIN` values, requires the
  legacy `APP_URL` to match the admin origin, and requires both exact origins in `TRUSTED_ORIGINS`. The
  checked flag is `--require-separate-origins`; the deployment runbook defines each variable's role.
- **Evidence:** valid split topology, mismatched/identical/untrusted origins, and existing bootstrap policy
  are covered by 15 focused tests. The CLI passed with a complete synthetic isolated-stack fixture using
  ecommerce, email, backups, and the split-origin gate. TypeScript, lint, formatting, and whitespace checks
  passed. No Railway variable, DNS record, client service, or credential was read or changed.
- **Risk carried forward:** runtime login, proxy, preview, cookie, generated-link, and CORS/CSRF behavior
  still require a client-approved staging configuration and browser evidence. This preflight rejects unsafe
  configuration; it does not provision or validate a live topology.

### 2026-09-04 — Public/customer and admin link ownership

- **Implemented:** the client-stack origin helper resolves canonical public and admin origins independently,
  with safe fallback to the legacy application origin for existing stacks. Ecommerce checkout success and
  customer order-status email links now use `PUBLIC_SITE_ORIGIN`; an admin-created payment request uses
  `CORE_PLATFORM_ADMIN_ORIGIN` for its cancellation path.
- **Evidence:** helper tests reject credential-bearing or path-bearing overrides and preserve the legacy
  fallback. Ecommerce service tests verify the exact Stripe success/cancel origins; ecommerce email tests
  verify the customer status URL. Focused suites passed 66 tests, along with TypeScript and formatting.
- **Risk carried forward:** a client-approved staging browser exercise must still prove routing, session
  cookies, proxy behavior, emails, Stripe redirects, preview, and CORS/CSRF work at the real origins.

### 2026-09-04 — WooCommerce isolated PostgreSQL rehearsal

- **Environment:** disposable local PostgreSQL 16 container, created only for this rehearsal. Core's complete
  migration sequence and the additive WooCommerce lifecycle migration completed against an empty database.
  The source was a synthetic category and simple-product envelope; no client export, Railway service, or
  production credential was used.
- **Evidence:** the Drizzle repository completed a two-operation catalog run with two durable audit records;
  exact replay of the category batch returned its existing result without another target write; concurrent
  active-run claims for the same source/target produced exactly one success and one database rejection. A
  second fresh PostgreSQL 16 target was migrated and rehearsed with the same completed-run, audit-count,
  replay, and concurrency results.
- **Risk carried forward:** this proves the durable Phase 1 behavior on an isolated database, but does not
  authorize a client import, cutover, customer/order history, or a production migration. A protected source
  export, two full clean-target rehearsals, reconciliation approval, and restore/rollback evidence remain
  required release gates.

### 2026-09-04 — WooCommerce failed-run resume rehearsal

- **Implemented:** rehearsal-only `--resume-run` reclaims only the same failed run after verifying its
  contract, source, target, fingerprint, high-water mark, mode, and enabled phases. It resumes strictly
  after the atomically persisted checkpoint; replayed or inconsistent checkpoint/audit evidence moves the
  run to manual review. Resume identifiers are bounded command inputs.
- **Evidence:** a fresh disposable local PostgreSQL 16 database with a synthetic category and product applied
  the first batch, recorded a simulated failure, rejected a different-target resume, then resumed the same
  run at batch two. The completed run had exactly two applied audit entries, one category, and one product.
  Focused command, lifecycle, and repository tests also cover normal resume and inconsistent-evidence review.
- **Safety boundary:** no client export, Railway resource, production credential, or deployment was used.
  Customer/order phases and production cutover remain disabled.

### 2026-09-04 — Client-stack restore identity and release record

- **Implemented:** every application-level restore now requires a target `CLIENT_STACK_ID` and accepts an
  identified backup only when its manifest stack ID is an exact match. A snapshot created before provenance
  was recorded is rejected by default and requires the CLI-only `--allow-legacy-backup` acknowledgement
  after duplicate-environment review. That acknowledgement cannot override an identified mismatch.
- **Release control:** added a versioned, secret-free client release manifest and validator that bind the
  Core and site revisions, distinct public/admin origins, backup provenance, complete standard gate set, and
  business/technical/operations evidence. The Better Farms record is deliberately a draft with pending
  database, backup, restore, health, security, and import gates.
- **Evidence:** exact match, missing target, mismatch, and legacy restore-policy tests pass; release-manifest
  schema tests and Better Farms draft validation pass. A disposable PostgreSQL 16 source/target drill first
  rejected a mismatched target identity without changing the destination, then restored an exact-match
  synthetic snapshot containing a JSON menu array and settings record. The drill uncovered and fixed JSON
  array serialization during restore. No Railway configuration, DNS mutation, provider call, or client data
  access occurred.
- **Risk carried forward:** a client-approved duplicate-environment restore using its actual protected
  snapshot, actual stack origins, browser/routing evidence, backup provenance, remaining operational gates,
  and named approvals are still required before the manifest can be approved or a release considered.

### 2026-09-04 — Better Farms authenticated form handoff

- **Implemented:** Better Farms public forms retain same-origin browser endpoints, but its site server now
  forwards only to an explicit `better-farms-foundation` Core Platform client-form route using a server-only
  token. Core verifies the requested stack ID and token in constant time before submitting its managed
  contact or newsletter form. The existing generic public form routes are unchanged.
- **Fail-closed behavior:** an absent site token prevents any upstream request; an absent Core configuration
  returns unavailable; an incorrect stack ID or token is rejected without revealing which value failed.
  The client-site contract records the proxy token as a required server secret reference without its value.
- **Risk carried forward:** no token has been generated or configured, and no server-to-server request has
  been made outside tests. The release still requires isolated-stack configuration, deployed-origin browser
  evidence, and approval before the route may be enabled.
- **Preflight:** client-form releases must include `--require-client-form-proxy`; it verifies that the Core
  stack has its server-side proxy token without printing its value. The paired Better Farms server token is
  recorded only as a required contract reference and must be configured separately during an approved setup.

### 2026-09-04 — Atomic manual ecommerce payment settlement

- **Implemented:** manual paid-order creation, an administrator marking an order paid, and an administrator
  changing an order to paid now all use the same order-locked settlement transaction as Stripe payment
  completion. The transaction writes paid status and manual payment evidence together with coupon redemption
  and guarded inventory adjustment. A failure leaves a newly created manual order pending and unpaid.
- **Evidence:** focused ecommerce tests cover each admin/manual route and the failure-safe pending state. A
  fresh disposable local PostgreSQL 16 instance ran the full migration sequence: one manual settlement wrote
  paid status and a single stock adjustment, while an insufficient-stock settlement left its order pending
  and wrote no adjustment. No client, Railway, Stripe, or production database was contacted.
- **Risk carried forward:** provider-backed payment, email/jobs/replay, customer reconciliation, and Stripe
  sandbox concurrency evidence remain required before enabling a live ecommerce release.

### 2026-09-04 — Atomic payment-link settlement

- **Implemented:** Stripe Checkout payment-link reconciliation now locks the payment request and settles its
  linked order in one transaction. The request changes to paid only after guarded inventory, coupon, and
  order-payment effects succeed. A linked request without a PaymentIntent, an intent mismatch, or a missing
  linked order is rejected so the provider webhook can retry rather than acknowledge an inconsistent state.
- **Evidence:** focused service and webhook tests cover first settlement and idempotent replay. A fresh
  disposable local PostgreSQL 16 rehearsal settled one linked request and order with one inventory
  adjustment, then attempted a second request after stock was exhausted. The second order remained
  `pending/unpaid` and its request remained `open`, with no PaymentIntent recorded. No client, Railway,
  Stripe, or production database was contacted.
- **Risk carried forward:** live provider retries, durable confirmation-email delivery, customer
  reconciliation, and Stripe sandbox concurrency evidence remain release gates.

### 2026-09-04 — Public managed-form HTML boundary

- **Implemented:** all public form reads now pass through the shared public rich-HTML sanitizer at the
  public-form storage boundary. This covers the ordinary `/api/forms/:slug` route and the event-registration
  form route that supplies a form override directly to the browser renderer.
- **Evidence:** focused storage tests verify that iframe, event-handler, and JavaScript-URL payloads are
  removed before a public form is returned, while supported paragraph, formatting, image, and HTTPS link
  content remains renderable. The existing shared sanitization regression suite and form service tests pass.
- **Risk carried forward:** other public rich-HTML renderers have separate content contracts and remain
  subject to their own sanitizer and release-gate review.

### 2026-09-04 — Atomic CRM won conversion

- **Implemented:** the administrative transition of a lead to `won` now locks the lead and writes its
  converted client plus both conversion notes in one database transaction. If any conversion write fails,
  the lead does not move to `won`; a concurrent retry sees the already-created client under the same lock.
- **Evidence:** focused CRM service coverage verifies the administrative route delegates the complete
  transition to the atomic storage operation. A fresh disposable local PostgreSQL 16 rehearsal committed a
  won lead, client, and two notes together, then injected a conversion failure and confirmed that the second
  lead remained `new` with no client or notes. No client, Railway, or production database was contacted.
- **Risk carried forward:** lead-intake duplicate identity, retention/export policy, and operational audit
  coverage remain client-release review items.

### 2026-09-04 — Stripe webhook recovery controls

- **Implemented:** the Ecommerce Operations tab lists sanitized failed Stripe webhook delivery evidence and
  lets administrators explicitly replay a failed delivery by its Stripe event ID. Replay fetches the event
  from Stripe's authenticated API, reuses the existing durable claim/attempt lifecycle, and never accepts an
  operator-supplied webhook payload. Events already processed or currently owned by another worker cannot be
  replayed.
- **Safety boundary:** the delivery list excludes processing tokens and raw error text. A replay requires the
  existing admin authorization plus configured Stripe credentials; no replay, provider call, database change,
  or deployment was performed while implementing this control.

### 2026-09-04 — Recording archive access projection

- **Implemented:** the public recording-archive route now uses the same entitlement projection as event
  detail. Archive responses always omit virtual join URLs, Zoom links, and dial-in details. Free recordings,
  completed recording purchases, and administrators retain only the recording URL they are authorized to use.
- **Evidence:** endpoint-level tests cover anonymous paid archives, authenticated purchasers, and free
  recordings. Two independent read-only boundary reviews found the original archive-only exposure and no
  remaining bypass in the scoped fix. The full test, type, lint, formatting, production build, bundle budget,
  and Better Farms contract gates passed.
- **Risk carried forward:** guest access and scheduled notification policies are separate event-delivery
  contracts; no provider or production event data was contacted.

### 2026-09-04 — Paid event reminder entitlement

- **Implemented:** automated event reminders now require `paymentStatus: paid` for explicitly paid events
  before sending the event payload. Free and legacy unspecified registration types retain their normal
  reminder behavior. A pending paid registration remains unsent and is retried after Stripe’s verified
  payment webhook changes its state to paid.
- **Evidence:** focused reminder tests cover free, legacy, pending-paid, and post-settlement flows. An
  independent boundary review and a separate bypass/regression review found no remaining direct automated
  join-link disclosure in the scoped sender. The full test, type, lint, formatting, production build, bundle
  budget, and Better Farms contract gates passed.
- **Risk carried forward:** refund/revocation eligibility and manual notification policy require their own
  event-lifecycle decisions. No production event, Stripe, or email-provider action occurred.

### 2026-09-04 — Shipping provider readiness truthfulness

- **Implemented:** shipping-provider status now separates saved credentials from a working operational
  capability. A provider becomes operational only when its registry capability is backed by an end-to-end
  carrier transport; no unimplemented provider is advertised as ready for rates, labels, or tracking.
- **Evidence:** the provider-registry suite covers a configured, active EasyPost record that remains
  non-operational while its transport is absent. Full tests, production build, bundle budget, release-manifest,
  and Better Farms site/pilot contract checks passed.
- **Risk carried forward:** live shipping rates, labels, address validation, and carrier tracking remain
  client-dependent acceptance gates until a selected provider adapter and sandbox verification are complete.

### 2026-09-04 — Database-enforced paid inventory effects

- **Implemented:** added the partial unique inventory index that permits at most one `order_paid` adjustment
  for each order and variant. The storage-layer order lock and atomic stock guard remain in place; the database
  now independently rejects a duplicate paid effect if a caller ever bypasses the existing read check.
- **Evidence:** reconciliation migration coverage includes the new `0049` migration. A disposable PostgreSQL
  16 rehearsal inserted one paid adjustment and a separate manual adjustment, then rejected a duplicate paid
  adjustment with the named unique constraint. The full test suite, build, bundle budget, and Better Farms
  release/site/pilot checks passed.
- **Risk carried forward:** no inventory reservation is held during an unpaid checkout, and live Stripe
  concurrency behavior still requires sandbox evidence before a transaction-enabled client launch.

### 2026-09-04 — Tracked CI quality gate

- **Implemented:** added the repository-owned GitHub Actions quality workflow for every push and pull
  request. It installs from the lockfile and blocks on types, lint, formatting, tests, production build, and
  bundle budgets using Node.js 20.
- **Evidence:** the workflow mirrors the documented local gate sequence, which is currently green. It is
  credential-free and does not run migrations against, deploy to, or contact any client environment.
- **Risk carried forward:** GitHub-hosted execution results will appear after the workflow is pushed; browser,
  sandbox-provider, and client-specific production evidence remain separate release gates.

### 2026-09-04 — Isolated database migration CI gate

- **Implemented:** the tracked quality workflow now provisions a disposable PostgreSQL 16 service and runs
  `npm run db:verify` before the application quality checks. The verification command applies the complete
  migration and reconciliation sequence, then closes its connection pool.
- **Evidence:** a fresh local PostgreSQL 16 container, published only on a non-default local port, completed
  the verification successfully. The full release suite then passed: 107 test files, 497 tests, type-check,
  lint, formatting, production build, and bundle budgets. No client, Railway, Neon, Stripe, or production
  database was contacted.
- **Evidence update:** hosted run `33843014549` passed the PostgreSQL migration check, type-check, lint,
  formatting, tests, production build, and bundle budgets for the pinned candidate revision.
- **Risk carried forward:** client backup, restore, security, health, import, browser, and provider-sandbox
  evidence remain separate required release gates.

### 2026-09-04 — Durable paid-order receipt delivery

- **Implemented:** a paid-order settlement now inserts a deduplicated `order_confirmation` outbox job in
  the same database transaction as payment status, coupon, and inventory effects. The worker claims jobs
  with PostgreSQL row locking, reloads current order data, uses bounded exponential retry, and retains a
  failed job after five attempts. Ecommerce Operations exposes failed receipt jobs without recipient,
  provider, or raw error details.
- **Evidence:** focused worker tests cover completion, retry backoff, and terminal failure. A fresh
  disposable PostgreSQL 16 rehearsal applied all migrations, settled the same synthetic order twice, and
  observed one queued confirmation job and one inventory decrement. The full local suite passed 108 test
  files and 500 tests, type-check, lint, formatting, production build, and bundle budgets. No client,
  Railway, Neon, Stripe, email provider, or production database was contacted.
- **Evidence update:** hosted GitHub Actions run `33844150498` passed the isolated PostgreSQL migration
  verification, type-check, lint, formatting, tests, production build, and bundle budgets for the pinned
  candidate revision.
- **Risk carried forward:** provider sandbox retries, delivery monitoring, and client-specific email
  acceptance remain release gates.

### 2026-09-04 — Checkout inventory reservations

- **Implemented:** checkout now reserves inventory for tracked, non-backorder variants before creating a
  Stripe PaymentIntent. Variant-row locks serialize competing reservations; paid and cancelled orders release
  their holds. A fifteen-minute expiry worker asks Stripe to cancel the PaymentIntent and keeps the hold until
  that cancellation succeeds, preventing a late payment from consuming inventory newly offered to another
  checkout. Stripe failed and cancelled events also release the pending order immediately.
- **Evidence:** focused checkout, webhook, migration, and reservation-worker suites passed 77 tests; the full
  local suite passed 109 files and 503 tests, type-check, lint, formatting, production build, and bundle
  budgets. A disposable PostgreSQL 16 rehearsal applied the entire migration sequence, ran two concurrent
  reservations for the sole synthetic unit, accepted one and rejected one, then settled the accepted order and
  verified both the paid release and inventory decrement. No client, Railway, Neon, Stripe, or production
  database was contacted.
- **Risk carried forward:** live Stripe timeout, cancellation, and delayed-event behavior still needs sandbox
  evidence before a transaction-enabled client launch.
- **Evidence update:** hosted GitHub Actions run `33844886692` passed the isolated PostgreSQL migration
  verification, type-check, lint, formatting, tests, production build, and bundle budgets for the inventory
  reservation candidate revision.

### 2026-09-04 — Durable refund notifications

- **Implemented:** processed refunds now enqueue a deduplicated `refund_confirmation` outbox job in the same
  database transaction that creates or transitions the refund. The shared worker reloads the processed refund
  before sending, and retries a failed email rather than marking the job sent. The notification timing columns
  now retain time-zone information, which aligns database defaults with worker-supplied retry times.
- **Evidence:** focused notification, email, refund, and migration suites passed 73 tests. A disposable
  PostgreSQL 16 rehearsal applied all migrations, created a processed synthetic refund, claimed the queued
  job with the correct order and refund IDs, and marked it sent. No client, Railway, Neon, Stripe, email
  provider, or production database was contacted.
- **Risk carried forward:** provider sandbox evidence and delivery monitoring remain client-release gates.
- **Evidence update:** hosted GitHub Actions run `33845562745` passed the isolated PostgreSQL migration
  verification, type-check, lint, formatting, tests, production build, and bundle budgets for the refund
  notification candidate. The Better Farms draft manifest pin passed the same hosted gate in `33845577943`.

### 2026-09-04 — Durable shipment notifications

- **Implemented:** shipment creation, its order status transition, and the deduplicated shipment-confirmation
  job now commit together. The worker reloads the shipment and retries a failed delivery.
- **Evidence:** focused worker and migration suites passed. A disposable PostgreSQL 16 rehearsal applied the
  migration sequence, created a synthetic shipment, verified the order became shipped, and claimed the
  matching notification job. No client or production provider was contacted.
- **Evidence update:** hosted GitHub Actions run `33845834480` passed isolated PostgreSQL migration
  verification, type-check, lint, formatting, tests, production build, and bundle budgets for the shipment
  notification candidate.

### 2026-09-04 — Durable order-status notifications

- **Implemented:** an administrative order-status transition now updates the order and queues a deduplicated
  `order_status` notification job in the same transaction. The durable worker reloads the order, sends the
  recorded status, and uses the established retry and dead-letter lifecycle when delivery fails.
- **Evidence:** focused admin-route, storage, migration, and worker suites passed, including dispatch of a
  queued `shipped` status. A disposable PostgreSQL 16 rehearsal applied the full migration sequence, changed
  a synthetic order to `shipped`, and claimed the matching status job with its recorded status value. No
  client, Railway, Neon, Stripe, email provider, or production database was contacted.
- **Risk carried forward:** provider sandbox retries, delivery monitoring, and client-specific email
  acceptance remain release gates. The Better Farms manifest remains draft pending the approved client gates.
- **Evidence update:** hosted GitHub Actions run `33845987420` passed isolated PostgreSQL migration
  verification, type-check, lint, formatting, tests, production build, and bundle budgets for the
  order-status notification candidate. The draft Better Farms manifest reference passed the same hosted gate
  in `33846343839`.

### 2026-09-04 — Compensated paid-order cancellation boundary

- **Implemented:** administrative cancellation now rejects any order with a captured payment that has not
  reached the terminal `refunded` state. This keeps a paid-but-unfulfilled order visible for fulfillment or
  its explicit refund and reconciliation lifecycle; unpaid and fully refunded orders remain cancellable.
- **Evidence:** focused service coverage verifies that a paid order is rejected without an update and a fully
  refunded order can be cancelled. No payment-provider call, client data, or production environment was
  contacted.
- **Risk carried forward:** the business decision to fulfil, partially refund, or fully refund an individual
  paid order remains an authorized operator action. Provider sandbox reversal and reconciliation evidence
  remain release gates.

### 2026-09-04 — Better Farms pinned-source contract revalidation

- **Evidence:** the exact `31deb36e3fb13e29b1cab557dccd070c9e3fdf81` Better Farms pilot revision adds a
  repository-owned quality workflow. Hosted run `33846914461` passed its lockfile install, TypeScript check,
  21 site contract/security tests, and production build. Core's site-contract, manifest, release-manifest,
  and combined pilot-contract validators also passed against the paired drafts.
- **Safety boundary:** the site and Core manifests remain draft. The check uses only local source and
  credentials-free fixtures; it does not contact Core, Railway, WooCommerce, client data, a form destination,
  DNS, or a payment provider.

### 2026-09-04 — WooCommerce approved-warning evidence

- **Implemented:** the Phase 1 catalog planner now accepts a separate, non-secret disposition schedule only
  when it exactly matches the dry-run source fingerprint and its sanitized warning references. The schedule
  can record an owner-approved exclusion, never suppress an error or override a mapped value. Its fingerprint
  and approval reference persist with a rehearsal run and must remain unchanged for resume.
- **Evidence:** focused planner, command, lifecycle, repository, and migration tests passed (30 tests).
  TypeScript, lint, formatting, and a synthetic offline catalog dry-run passed. The legacy schema
  reconciliation path applies the same additive evidence migration. No WooCommerce endpoint, client export,
  database, or deployment was contacted.
- **Risk carried forward:** the feature provides a controlled rehearsal record; Better Farms still needs a
  real source inventory and owner-approved field exclusions before any client data can be planned or applied.
- **Evidence update:** hosted GitHub Actions run `33847976083` passed its isolated PostgreSQL migration
  verification, type-check, lint, formatting, 510 tests, production build, and bundle budget for revision
  `bcc3282`.

### 2026-09-04 — Manual DNS record-type validation

- **Implemented:** the registrar-neutral onboarding plan now requires literal IPv4/IPv6 values for `A` and
  `AAAA` records, while `ALIAS`, `ANAME`, and `CNAME` records require a public DNS hostname. This prevents
  the wizard from presenting a hostname as an invalid address-record target.
- **Evidence:** onboarding service tests cover valid record plans and both invalid address/alias inputs.
  TypeScript, lint, and formatting passed. The workflow remains deterministic, credential-free, and does not
  read or mutate any DNS provider.
- **Evidence update:** hosted GitHub Actions run `33848841230` passed isolated PostgreSQL migration
  verification, type-check, lint, formatting, 511 tests, production build, and bundle budget for revision
  `ad8b5fc`.

### 2026-09-04 — Ecommerce and recovery domain metrics

- **Implemented:** the existing secret-free metrics endpoint now reports aggregate outcome counters for
  checkout, payment webhooks, refunds, expired inventory reservations, transactional notifications, backups,
  and restores. Counters contain no identifiers, payloads, amounts, or customer data.
- **Evidence:** focused observability and affected service tests passed; the complete local release gate
  passed with 110 test files / 512 tests, type-check, lint, formatting, production build, and bundle budget.
- **Risk carried forward:** metrics are a process-local signal until a client stack exports them and names
  alert thresholds, responders, error-budget policy, and support timelines. Those operational decisions remain
  required launch evidence.
- **Evidence update:** hosted GitHub Actions run `33849933505` passed isolated PostgreSQL migration
  verification, type-check, lint, formatting, 512 tests, production build, and bundle budget for revision
  `063f20d`.

### 2026-09-04 — Authenticated stack-labeled monitoring scrape

- **Implemented:** production metrics now fail closed without both explicit opt-in and a dedicated bearer
  token. Monitoring can scrape a bounded Prometheus view labeled with the client stack ID. That view exports
  only aggregate process, database, email, HTTP-error, and operational-domain counters; it excludes route
  labels, identifiers, provider payloads, and money values.
- **Implemented:** deployment preflight now supports `--require-observability`, requiring the production
  opt-in and a unique 32+ character metrics token before a stack can claim observability readiness.
- **Risk carried forward:** a client still must configure the external monitoring system, test delivery,
  set thresholds and error budgets, and name responders before this gate may pass.
- **Evidence:** metrics and client-stack configuration tests passed; a synthetic isolated-stack
  `--require-observability` preflight passed. The full local gate passed with 110 test files / 515 tests,
  type-check, lint, formatting, production build, and bundle budget. No client telemetry endpoint,
  monitoring provider, or production stack was contacted.
- **Evidence update:** hosted GitHub Actions run `33851430774` passed isolated PostgreSQL migration
  verification, type-check, lint, formatting, 515 tests, production build, and bundle budget for revision
  `e2df227`.

### 2026-09-04 — Release-contract monitoring gate

- **Implemented:** release-manifest schema v2.0 adds a required `monitoring` gate. A prior v1.0 record fails
  closed, so an omitted monitoring review cannot be read as an optional requirement. Better Farms' draft is
  migrated with that gate explicitly pending.
- **Evidence boundary:** passing the schema confirms the release record includes monitoring review; it does
  not establish telemetry delivery, alert thresholds, error budgets, or named responders. Those client
  operating facts remain required before approval.
- **Evidence:** release-manifest schema tests, Better Farms manifest validation, and the combined
  cross-repository pilot-contract verification passed. The full local gate passed with 110 test files /
  516 tests, type-check, lint, formatting, production build, and bundle budget.
- **Evidence update:** hosted GitHub Actions run `33852653975` passed isolated PostgreSQL migration
  verification, type-check, lint, formatting, 516 tests, production build, and bundle budget for revision
  `8874742`.

### 2026-09-04 — Combined pilot release-record verification

- **Implemented:** the combined pilot verifier now validates the site manifest, migration intake, and release
  manifest together. It requires a shared stack ID, exact site revision and origins in the release record,
  and coherent approval states across all three records. A release record pinned to a different site revision
  fails before a pilot can be treated as valid.
- **Evidence:** focused mismatch coverage and the complete local gate passed with 110 test files / 517 tests,
  type-check, lint, formatting, production build, bundle budget, and combined Better Farms checkout
  verification. No client endpoint, provider, or production stack was contacted.
- **Evidence update:** hosted GitHub Actions run `33854154794` passed isolated PostgreSQL migration
  verification, type-check, lint, formatting, 517 tests, production build, and bundle budget for revision
  `6d32456`.

### 2026-09-04 — Read-only DNS propagation verification

- **Implemented:** client-stack onboarding can now query public DNS for planned A, AAAA, and CNAME records
  without registrar credentials or any provider write operation. Missing answers remain pending; a returned
  nonmatching answer is blocked. ALIAS and ANAME remain manual-review evidence because they are
  provider-specific extensions, never inferred as passed.
- **Safety boundary:** the verifier has no DNS write capability and does not change release readiness by
  itself. Certificate, ownership, routing, API, health, redirect, rollback, and provider-specific record
  evidence remain separate required checks.
- **Evidence:** injected-resolver tests cover matching A/CNAME answers, absent DNS answers, mismatches, and
  ALIAS/ANAME manual review. The full local gate passed with 110 test files / 519 tests, type-check, lint,
  formatting, production build, bundle budget, and diff validation. No client endpoint, provider, or
  production stack was contacted.
- **Evidence update:** hosted GitHub Actions run `33856073524` passed isolated PostgreSQL migration
  verification, type-check, lint, formatting, 519 tests, production build, and bundle budget for revision
  `78b254b`.

### 2026-09-04 — Durable client-stack onboarding evidence

- **Implemented:** generated domain plans, public DNS verification results, and readiness evaluations now
  create append-only, stack-scoped database evidence records. The admin screen can retrieve the retained
  history for release review; each record includes the authenticated administrator and timestamp.
- **Safety boundary:** the evidence stores planned targets and observed public answers, never provider
  credentials. It does not mark a release approved, provision Railway, alter DNS, or bypass the remaining
  client-owned certificate, routing, health, restore, and approval gates.
- **Evidence update:** hosted GitHub Actions run `33857544782` passed isolated PostgreSQL migration
  verification, type-check, lint, formatting, 520 tests, production build, and bundle budget for revision
  `fba3c05`.

### 2026-09-04 — Controlled ecommerce notification retry

- **Implemented:** administrators can now requeue a terminal failed ecommerce notification after reviewing
  order history and mail-provider logs. The storage transition accepts only a `failed` job, retains its
  automatic attempt count and deduplication key, and records the manual-retry count, timestamp, and
  authenticated administrator. A second requeue is rejected until the worker has completed another attempt.
- **Operator boundary:** the console requires an explicit confirmation and warns that a provider may have
  accepted an earlier request before reporting an error. The retry uses current durable order details and does
  not expose recipient, provider, or raw diagnostic data. It does not reset the automatic retry cycle or
  create a second job.
- **Evidence:** focused notification-worker and admin-screen tests passed. A fresh disposable PostgreSQL 16
  database applied the complete migration sequence, requeued a synthetic failed job once with audit fields,
  retained its five automatic attempts, and rejected a second requeue. The complete local gate passed: 110
  test files / 520 tests, type-check, lint, formatting, production build, bundle budget, and diff validation.
  No client, Railway, provider, email, or production database was contacted.
- **Risk carried forward:** manual retry is an accountable recovery control, not end-to-end provider delivery
  proof. Mail-provider sandbox behavior, delivery monitoring, reconciliation procedures, and client approval
  remain transaction-release gates.

### 2026-09-04 — Better Farms rendered-route browser review

- **Evidence:** the exact pinned Better Farms revision `31deb36` completed a fresh production build and was
  served locally without a Core origin. A real browser loaded all seven manifest-declared public routes:
  home, About, How It Works, Get Involved, For Farmers, Fund a Farm, and Contact. Desktop home and mobile
  Contact captures rendered without observed layout defects; the mobile form exposed labeled controls and
  blocked an empty submit with visible required-field errors before making a request. The Contact route had
  no browser console errors or non-static network failures.
- **Known fallback:** Fund a Farm requested its configured runtime-content path and received the intentional
  local HTTP 503 because no `CORE_PLATFORM_API_ORIGIN` was supplied. It rendered the schema-validated pinned
  fallback content as designed. This is not configured-Core integration evidence and remains a staging gate.
- **Content blocker:** rendered testimonials and team cards still contain placeholders such as `Full Name`,
  `Placeholder Name`, and placeholder credentials. Client-approved copy, identities, rights, and accessibility
  review are required before the representative-page success measure or a content-release approval can pass.
- **Safety boundary:** no external Core request, form submission, client data, DNS, Railway resource, or
  production configuration was used. The local server and browser were closed after the review.

### 2026-09-04 — Release-contract content gate

- **Implemented:** release-manifest schema v3.0 adds a required `content` gate. Versions v1.0 and v2.0 now
  fail closed, so a release record cannot treat an omitted copy and identity review as approval. A passed gate
  requires an evidence reference, while the record itself remains secret-free and does not confer approval.
- **Better Farms status:** the draft manifest now records `content` as explicitly pending. This reflects the
  rendered-route review finding that testimonials and team cards still use placeholder names and credentials;
  client-approved copy, identities, rights, visual, and accessibility evidence remain required.
- **Safety boundary:** this changes a local release-control contract and its draft record only. It does not
  change the Better Farms site, contact a client service, deploy to Railway, or authorize a release.
- **Candidate pin:** the Better Farms draft binds the reviewed site revision `31deb36` to Core revision
  `8dcd98c`, the exact content-gate implementation. The combined client-site, intake, release-record, and
  source-checkout verifier must pass again for this pin.

### 2026-09-04 — Better Farms content-review inventory

- **Evidence:** a source-specific, secret-free draft review record now names the visible non-form
  placeholders in the exact reviewed revision: two testimonial attributions, three home-team cards, six
  About-board cards and their shared filler biographies, and one unattributed quotation. It separates those
  content claims from legitimate form input placeholders.
- **Release control:** the record specifies the client evidence required for retained copy, names, roles,
  quotations, portraits, media rights, responsive visual review, and accessibility review. It remains a
  draft and does not change the pending Better Farms `content` gate or approve publication.
- **Safety boundary:** this inventory reads the pinned local site source only. It does not modify the client
  site, contact a client, access customer data, or change Railway, DNS, or production configuration.

### 2026-09-04 — Better Farms Contact accessible names

- **Implemented:** the Contact form now uses programmatic labels for full name, email address, and
  organization while preserving its existing visual input hints and custom validation. This repairs the
  prior reliance on placeholder text for those three controls.
- **Evidence:** the exact site revision `cfd8576` passed TypeScript, all 21 site contract/security tests,
  and a production build. A real mobile browser exposed the three names in its accessibility tree, rendered
  the existing layout without a visual regression, and reported no console messages.
- **CI maintenance:** the pinned source then moved its workflow and declared build runtime to Node 24. The
  final `cee3a0e` source gate passed TypeScript, its 21 site contract/security tests, and production build
  without the prior deprecated-action-runtime annotation.
- **Safety boundary:** no upstream form request, Core service, client data, Railway resource, DNS record, or
  production configuration was used. The local site server and browser were closed after review.

### 2026-09-04 — Better Farms intentional content fallback

- **Implemented:** the Fund a Farm content proxy now returns an explicit empty publication (`204`, no-store)
  when a Core origin is intentionally unconfigured. The site recognizes that response as its existing
  schema-validated bundled-content fallback. Actual configured-upstream failures remain `503`; public-form
  submissions without configuration remain unavailable and are unchanged.
- **Evidence:** the exact site revision `ee14d67` passed TypeScript, all 22 site contract/security tests, and
  a production build locally and in hosted GitHub Actions run `33863786090`. A fresh local production browser
  visit to Fund a Farm rendered the fallback content, exposed its donation controls with accessible names and
  expected pressed state, and reported zero console errors or warnings.
- **Content review:** the same rendered-route audit found generic image alternatives such as `Rectangle`,
  `Group`, and `Img` on Home. The secret-free content-review record now requires client-approved alternative
  text or a documented decorative designation for each retained image; the `content` gate remains pending.
- **Safety boundary:** no Core origin, form submission, client data, Railway resource, DNS record, or
  production configuration was used. This local fallback behavior is not configured-Core integration or
  production-health evidence.

### 2026-09-04 — Fail-closed client release readiness gate

- **Implemented:** `npm run release:readiness -- <release-manifest.json>` evaluates a schema-valid release
  record for actual go/no-go eligibility. It reports pending required gates, backup state, missing business,
  technical, and operations approvals, and stable blocker identifiers; it exits nonzero until every release
  condition is present. Structural manifest validation remains available for transparent draft records.
- **Evidence:** the Better Farms draft produced its exact required evidence list—database, backup, restore,
  health, security, monitoring, content, and import gates; backup provenance; and all three approval roles—
  then exited `1`. Focused manifest/readiness coverage (7 tests), TypeScript, lint, and formatting passed.
- **Safety boundary:** the command reads a local secret-free manifest only. It does not approve a release,
  access a Railway service, contact a client, alter DNS, restore data, or deploy.

### 2026-09-04 — Deployment runbook release-readiness handoff

- **Implemented:** the Railway and Better Farms publishing runbooks now require the exact release record to
  report `ready: true` before environment preflight or any deployment action. They explicitly distinguish
  secret-safe configuration validation from release authorization, backup/restore proof, and the approved
  deployment window.
- **Safety boundary:** this changes the operator sequence only. The Better Farms example remains a draft and
  continues to fail readiness; no Railway resource, deployment variable, DNS record, backup, restore, or
  client service was accessed.

### 2026-09-04 — Combined deployment preflight and release gate

- **Implemented:** `npm run deploy:check` now accepts `--release-manifest <path>`. It validates the
  secret-safe environment as before, requires the manifest's `clientStackId` to equal `CLIENT_STACK_ID`, and
  fails with the stable release-readiness blockers unless the exact record is eligible for deployment.
- **Evidence:** TypeScript and lint passed. A complete synthetic non-production environment paired with the
  Better Farms draft failed only on its known release blockers; pairing that record with another stack ID
  also failed on the identity mismatch. Neither check reads a secret value in its output.
- **Safety boundary:** this is a local preflight change only. It does not load deployment secrets into the
  repository, contact Railway, create infrastructure, update DNS, restore data, or deploy.

### 2026-09-04 — Client-stack identity contract alignment

- **Implemented:** environment preflight now requires the same stack-ID form as the release manifest: a
  lowercase kebab-case identifier beginning with a letter. This prevents a configuration from passing with
  an identity that no valid manifest can represent.
- **Evidence:** focused client-stack and release-manifest coverage passed 14 tests; TypeScript, lint, and
  formatting passed. A stack ID beginning with a digit is rejected with the existing non-secret validation
  message.
- **Safety boundary:** no environment value, Railway service, client data, DNS record, backup, restore, or
  deployment was accessed.

### 2026-09-04 — WooCommerce rehearsal command strictness

- **Implemented:** the durable WooCommerce rehearsal command now rejects unknown, duplicate, and misplaced
  arguments before it reads an envelope or dynamically loads the database repository. The existing
  rehearsal-only mode, fingerprint confirmation, bounded batch size, and explicit `--apply` confirmation
  remain required.
- **Evidence:** focused command, lifecycle, and repository coverage passed 19 tests; TypeScript, lint, and
  formatting passed. The command rejects a misspelled flag, conflicting `--mode`, and an extra positional
  argument without exposing source records.
- **Safety boundary:** no source envelope, client data, database, Railway service, DNS record, or deployment
  was used. Customer, order, delta, and cutover modes remain unavailable.

### 2026-09-04 — Hosted Core quality-gate confirmation

- **Evidence:** the complete hosted Core quality workflow for the latest rehearsal-command change passed in
  GitHub Actions run `33865146130`: PostgreSQL migration verification, TypeScript, lint, formatting, tests,
  production build, and bundle-budget enforcement all completed successfully.
- **Safety boundary:** this was CI verification of the pushed repository revision only. It did not access a
  client source, Railway service, production configuration, DNS, backups, or data.

### 2026-09-04 — Deployment preflight argument strictness

- **Implemented:** the deployment preflight now parses its supported capability switches and
  `--release-manifest` path through a tested, fail-closed parser. It rejects unknown, incomplete, and
  duplicate options before it reads environment configuration or a release record.
- **Evidence:** focused deployment-argument, stack-identity, and release-manifest coverage passed 16 tests;
  TypeScript, lint, and code formatting passed. A direct command with repeated
  `--require-ecommerce` exited `2` with only the duplicate-option error.
- **Safety boundary:** validation used no deployment environment, manifest, client system, Railway service,
  DNS record, backup, restore, or production operation.

### 2026-09-04 — Better Farms no-import pilot decision

- **Decision recorded:** the client confirmed that no WooCommerce site is ready for import. Better Farms is
  therefore a site-only pilot: catalog, media, customer, and order imports are excluded; no client source
  data is accessed; and the import release gate is explicitly not required.
- **Implemented:** the combined pilot-contract verifier now requires a disabled import gate to pair with an
  intake that records no source system, no migration history, and only excluded entity dispositions. It
  rejects either record when that no-import decision is inconsistent.
- **Evidence:** focused intake, release-manifest, and combined-pilot coverage passed 14 tests. The Better
  Farms manifests and pinned site checkout pass their combined contract verifier. Release readiness now
  omits import but remains fail-closed on the remaining infrastructure, content, and approval evidence.
- **Safety boundary:** no WooCommerce endpoint, export, client data, Railway service, DNS record, backup,
  restore, or production operation was accessed.

### 2026-09-04 — Better Farms release-role authorization

- **Decision recorded:** the user authorized the business, technical, and operations release roles in this
  Codex thread. The draft release manifest records those three references while remaining unapproved until
  its required operational and content evidence is present.
- **Safety boundary:** recording authorization does not create infrastructure, provide a release window,
  satisfy any pending gate, authorize a deployment, or access client or production systems.

### 2026-09-04 — Per-deployment public-origin template hardening

- **Implemented:** public prerendering, JSON-LD, `robots.txt`, sitemap generation, and product feeds now
  use the configured per-deployment public origin before any persisted SEO site URL. This prevents a new
  Railway deployment from inheriting canonical or feed URLs from a prior site's stored settings.
- **Evidence:** focused origin, prerender, robots, and product-feed coverage passed 18 tests; TypeScript,
  lint, and formatting passed. The existing temporary Railway endpoint returned HTTP 200 for both the
  application route and `/api/health/ready`, with its database connected.
- **Safety boundary:** the Railway checks were read-only. No deployment, environment-variable change, DNS
  mutation, client-data access, backup, restore, or production release was performed.

### 2026-09-04 — Client dashboard and recovery defaults

- **Decision recorded:** every client receives a dashboard at `dashboard.<client-domain>`. The installing
  super admin is the designated DNS and release operator and manually applies generated DNS records through
  the client's existing provider access.
- **Recovery baseline:** scheduled backups run every 24 hours, retain 30 days of snapshots, target an RPO
  of 24 hours, and target restoration within 24 hours. This preserves all data captured by a completed
  backup; actual recovery remains contingent on a verified restore drill.
- **Implemented:** client manifests, deployment preflight, and DNS-plan generation now require the matching
  `dashboard` hostname, with the public origin allowed at the apex or `www` host. Better Farms records the
  same recovery objectives while its evidence gates remain pending.
- **Safety boundary:** no DNS provider, Railway configuration, backup object, restore target, or production
  environment was changed.
### 2026-09-04 — Better Farms primary super-admin assignment

- **Decision recorded:** Mike at Go Digital Alchemy is the primary super admin, DNS operator, and release owner for Better Farms template onboarding.
- **Scope:** this assigns the accountable operator only. It does not approve a release or authorize DNS, Railway, backup, restore, or production changes.

### 2026-09-04 — Shared R2 client namespaces

- **Decision recorded:** template installations use the shared `core-platform-website-backups` R2 bucket.
  The public domain chosen during onboarding determines the client namespace, with backups at
  `clients/<client-domain>/backups/` and uploaded objects at `clients/<client-domain>/uploads/`.
- **Implemented:** the domain-plan output records the derived bucket and prefixes. Backup storage and media
  storage automatically qualify objects into their respective client namespaces; no per-client bucket is
  created. Credentials remain Railway secrets and are never stored in the onboarding record.
- **Safety boundary:** the template does not provision the bucket or credentials, and no R2 object or live
  infrastructure was changed.

### 2026-09-05 — Template baseline quality confirmation

- **Evidence:** GitHub Actions quality workflow `33888210287` passed for the current template baseline,
  including migration verification, TypeScript, lint, formatting, the full test suite, production build, and
  bundle budgets. Local verification on the same revision also completed a production build and bundle-budget
  check successfully.
- **QA review:** an isolated parallel QA proposal was compared with the current branch and was not accepted,
  because it was based on an older revision and would replace newer atomic webhook, CRM, and directory
  safeguards. It remains outside the integrated branch pending a clean, current-base review.
- **Release state:** the Better Farms combined pilot contract passes. Its release remains draft and
  fail-closed on database, backup, restore, health, security, monitoring, and content evidence.
- **Safety boundary:** this checkpoint did not access or modify Railway, R2, DNS, client data, backups,
  restores, or production infrastructure.

### 2026-09-05 — Compatible production dependency security updates

- **Implemented:** upgraded compatible direct runtime dependencies for multipart handling, uploads, CSS
  processing, sanitization, WebSocket handling, and rate limiting. The production dependency audit decreased
  from 28 advisories (18 high) to 20 (12 high), with no critical advisories.
- **Evidence:** TypeScript and lint passed; the full suite passed 113 files and 538 tests; production build
  and bundle-budget checks passed.
- **Remaining dependency gate:** direct high-severity advisories remain in `drizzle-orm`, `nodemailer`, and
  `sharp`; each available fix is a major-version upgrade and requires focused compatibility and migration
  review before integration. Transitive high-severity advisories must be resolved through their owning
  dependency paths.
- **Safety boundary:** dependency updates and validation used the local repository only. No client data,
  Railway, R2, DNS, backups, restores, or production infrastructure was accessed or changed.

### 2026-09-05 — Sharp security upgrade

- **Implemented:** upgraded `sharp` from 0.34.x to 0.35.4, clearing its direct high-severity production
  dependency advisory.
- **Evidence:** TypeScript, lint, the full suite (113 files, 538 tests), production build, and bundle budgets
  passed. The production audit reports 19 remaining advisories, 11 high, and no `sharp` advisory.
- **Safety boundary:** this local dependency update did not access or modify external infrastructure or data.

### 2026-09-05 — Nodemailer security upgrade

- **Implemented:** upgraded `nodemailer` to 10.0.0 and updated the SMTP transporter reference to the
  package's exported `Transporter` type.
- **Evidence:** email-focused tests (11), the full suite (113 files, 538 tests), TypeScript, lint, and
  production build passed. The production audit no longer reports `nodemailer`.
- **Safety boundary:** this local dependency update did not access or modify external infrastructure or data.

### 2026-09-05 — Drizzle ORM security upgrade

- **Implemented:** upgraded `drizzle-orm` to 0.45.2, clearing its direct SQL-identifier escaping advisory.
- **Evidence:** TypeScript, lint, the full suite (113 files, 538 tests), production build, and bundle budgets
  passed. The production dependency audit no longer reports `drizzle-orm` and now reports 17 advisories, 9
  high, and no critical advisories.
- **Deferred environment evidence:** `npm run db:verify` intentionally refused to run because no
  `DATABASE_URL` is configured in this isolated workspace. Migration verification remains part of the
  isolated Railway environment gate; no database connection was borrowed or created.
- **Safety boundary:** this local dependency update did not access or modify external infrastructure or data.

### 2026-09-05 — Production dependency audit reconciliation

- **Implemented:** applied the package manager's compatible dependency-graph remediation after direct security
  upgrades. The resulting lockfile resolves the remaining transitive production advisories without a source
  change.
- **Evidence:** `npm audit --omit=dev` reports zero vulnerabilities. TypeScript, lint, the full suite
  (113 files, 538 tests), production build, and bundle budgets passed against the resolved graph.
- **Safety boundary:** dependency reconciliation and validation used the local repository only; no external
  infrastructure, client data, or production configuration was accessed or changed.

### 2026-09-05 — Hosted dependency-quality gate confirmation

- **Evidence:** GitHub Actions quality workflow `33994314968` passed on the production dependency-audit
  reconciliation revision. It completed migration verification, TypeScript, lint, formatting, the full
  538-test suite, production build, and bundle-budget enforcement.
- **Release state:** dependency-audit remediation is verified in both the local workspace and the hosted
  quality environment. The separate client release gates for database, backup, restore, health, security,
  monitoring, and content evidence remain required and pending.
- **Safety boundary:** this hosted verification did not change Railway, R2, DNS, client data, backups,
  restores, or production infrastructure.

### 2026-09-05 — Managed form idempotency hardening

- **Implemented:** public managed forms and authorized client-form proxy submissions now accept a durable
  `Idempotency-Key`. The key is unique per form, and a retry returns the original submission without repeating
  CRM ingestion, notifications, contact-message creation, or external audience synchronization. The bundled
  public form renderer preserves one key across a retry and resets it after a successful submission.
- **Migration safety:** the schema reconciliation path applies the additive form-submission column and unique
  index for both journaled and legacy databases.
- **Evidence:** focused form and migration tests, TypeScript, lint, the full suite (113 files, 540 tests),
  production build, and bundle budgets passed locally.
- **Safety boundary:** this change does not submit forms, alter client records, or access Railway, R2, DNS,
  backups, restores, or production infrastructure.

### 2026-09-05 — WooCommerce rehearsal target guard

- **Implemented:** the durable WooCommerce apply command now fails closed in a production runtime and when
  `--target-stack` does not match the configured `CLIENT_STACK_ID`. This makes the command's documented
  isolated-rehearsal restriction an executable boundary rather than a convention.
- **Scope:** the importer remains catalog-only and rehearsal-only. Customer and historical-order durable
  application remain disabled; Better Farms remains a no-import pilot.
- **Evidence:** command-boundary tests, TypeScript, lint, the full suite (113 files, 541 tests), production
  build, and bundle budgets passed locally.
- **Safety boundary:** no WooCommerce endpoint, source export, client data, Railway service, DNS record,
  backup, restore, or production environment was accessed or changed.

### 2026-09-05 — CRM inbound duplicate-intake hardening

- **Implemented:** inbound CRM lead deduplication now occurs inside one database transaction. It acquires
  transaction-scoped PostgreSQL advisory locks for normalized email and phone identities before it finds,
  updates, or creates a lead, preventing concurrent requests from creating duplicate leads across application
  instances.
- **Behavior preserved:** matching intake updates the existing lead and writes the duplicate audit note;
  new intake creates one lead. The separate atomic won-lead-to-client conversion remains unchanged.
- **Evidence:** CRM-focused tests, TypeScript, lint, the full suite (113 files, 541 tests), production build,
  and bundle budgets passed locally.
- **Safety boundary:** this local code change did not receive or alter client lead records, CRM credentials,
  Railway, R2, DNS, backups, restores, or production infrastructure.

### 2026-09-05 — CRM external boundary hardening

- **Implemented:** the externally callable CRM intake route now applies a dedicated production rate limit and
  uses shared constant-time secret comparison for its configured API key. The same comparison utility now
  backs the client-form proxy token check.
- **Evidence:** secret-comparison, proxy-authorization, and rate-limit tests passed; the full suite passed
  114 files and 543 tests, with TypeScript, lint, production build, and bundle budgets also passing locally.
- **Safety boundary:** no CRM credential, lead payload, client data, Railway, R2, DNS, backup, restore, or
  production infrastructure was accessed or changed.

### 2026-09-05 — Shared-R2 backup client-isolation hardening

- **Implemented:** the backup-storage adapter now rejects unsafe relative paths and refuses backup object
  downloads or deletions unless the full object key is inside the active client's configured backup prefix.
  Listing also rejects unsafe relative prefixes. This keeps administrative restore and retention operations
  confined to `clients/<client-domain>/backups/` in the shared bucket.
- **Evidence:** focused R2, backup-storage, and restore-identity tests passed. TypeScript, lint, the full
  suite (115 files, 545 tests), production build, and bundle budgets passed locally.
- **Safety boundary:** no R2 account, bucket, object, backup, restore, Railway environment, DNS record, or
  client data was accessed or changed.

### 2026-09-05 — Domain-derived backup namespace release gate

- **Implemented:** the deployment preflight now requires an explicitly configured `BACKUP_R2_PREFIX` to
  exactly equal the namespace derived from the active client public origin. A client stack with
  `PUBLIC_SITE_ORIGIN=https://www.example.com` must use `clients/example.com/backups`; a stack ID alone is
  no longer sufficient to approve a different folder in the shared bucket.
- **Evidence:** configuration, storage-policy, and backup-isolation tests passed. TypeScript, lint, the full
  suite (115 files, 546 tests), production build, formatting, and bundle budgets passed locally.
- **Safety boundary:** no R2 account, bucket, object, backup, restore, Railway environment, DNS record, or
  client data was accessed or changed.

### 2026-09-05 — Bootstrap admin secret-comparison hardening

- **Implemented:** the unauthenticated bootstrap-admin endpoint now uses the shared constant-time secret
  comparator for `SETUP_TOKEN`, matching the CRM intake and client-form proxy boundaries. It reads a single
  normalized setup-token header rather than comparing an untyped raw header value.
- **Evidence:** secret-comparison and authentication tests passed. TypeScript, lint, the full suite (115
  files, 546 tests), production build, formatting, and bundle budgets passed locally.
- **Safety boundary:** no account was created, no identity or credential was accessed, and no Railway, R2,
  DNS, backup, restore, or production infrastructure was changed.
