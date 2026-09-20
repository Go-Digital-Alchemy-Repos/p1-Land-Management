# Consolidation acceptance tracker

Current assessment: **implementation in progress; not a complete release candidate**. Updated September 20, 2026. The approved scope remains unchanged. Main now contains the consolidated applications and validated public changes; `b7a56cc064e07046e6e932f2d367049487da53b5` was verified deployed successfully on Website, Dashboard and Core. Live Integrations, Email Templates and Developer Resources libraries render the restored original-style interfaces; detailed evidence is in handoff.md. Original checkout and Blythe remain outside this worktree's write scope.

The Owner's identity link and Website Editor work. Live Analytics now works after correcting empty previous-period report normalization. Search Console remains blocked by property coverage/access (configured domain property returns 403; only the apex URL-prefix property appeared in the authorized list). Do not rotate existing Google credentials or equate apex access with canonical `www` coverage.

The September 17 dashboard backup has passed an isolated restore, application of 19 consolidation SQL migrations, preservation of all preexisting business-table rows, and a second backup/restore comparison. See [restore evidence](dashboard-restore-rehearsal-2026-09-18.md). Bounded actual-source CRM preservation has now run (see the September19 production CRM checkpoint below). Approved account-policy reconciliation, actual deployed-image rollback, complete provider media recovery and `/admin/` retirement remain open. An isolated current/prior source-rebuild startup rehearsal has a partial result; it does not establish deployed-image provenance or content recovery. Historical Core archive row/sequence recovery passed September 19; see the recovery checkpoint below.

## Latest populated recovery evidence — September 19

The five real Blog articles and20media records are imported and live. Their full
57-table database backup passed exact row/sequence recovery; all20media object
bytes passed a separate archive/extraction/hash rehearsal. The current9978d9db
and previousb3dca732 source-built application images now both pass startup against
the populated restored database, including all five full public Blog snapshots,
permanent route ownership, identity parity and authentication rejection. Parent
inspected retry03 evidence and reran10 rollback plus12 recovery tests. Only the
expected cms_forms.updated_at field changed on application startup; baseline and
row counts remained intact, with isolated resource cleanup verified.

This supersedes earlier empty-Blog rehearsal limitations below. It does not prove
Railway historical-image retrieval, provider-side object restoration, populated
legacy client_site_content (that table is empty), or final retirement readiness.
The live private draft test excerpt was restored and persisted as version4; public
content stayed unchanged. Evidence: core-application-rollback-runner.md and private
/private/tmp/p1-blog-app-images-aar7h839/populated-blog-application-recovery-03.json.

## Crew photo assignment race — September 19

Field-photo registration now rechecks current work assignment/status after image
decode, under the existing property→work→file lock order. Ready retries use the
same check. Deterministic mounted PostgreSQL tests commit reassignment/cancellation
while decoding is paused and then assert403, no file row and no storage write.
Parent independently reran all10 file tests successfully; author API types passed.
No decoding or external storage calls occur while transaction locks are held.
This closes the observed decode interleaving, not the entire offline acceptance
matrix. Changed-content field-event replay now rejects changed kind/payload/version/time or actor/work with409. Exact JSONB/equivalent-time retries preserve original accepted/conflict status; parent independently passed4 mounted PostgreSQL replay tests with unchanged side-effect snapshots.

## Requirement-level status

“Implemented” below means source exists with recorded validation, not release acceptance. Every row remains open until its stated acceptance evidence is complete.

| Requirement | Current evidence | Remaining acceptance work |
| --- | --- | --- |
| One dashboard, admin-style appearance, Marketing immediately above Settings | `artifacts/p1-dashboard/src/dashboard-routes.ts`, `main.tsx`, shared theme/styles and recorded browser checks. Marketing contains Content, Design, Website System and Reporting. | Full route-by-route theme, keyboard, contrast, responsive and error-state acceptance; final removal of legacy administrative entry points. |
| Owner-only automatic full access; explicit tool grants for members | `lib/api-zod/src/business-access.ts`; API access/policy modules; Core federation/capability middleware; business/sales access and CMS transport tests. | Exhaustive endpoint/projection/export/notification/shared-lookup coverage matrix, including crew/client and offline boundaries. Existing tests cover parts of this requirement, not all callers. |
| Full User Manager | `UserManager.tsx`, user-management contracts/routes/services; invitation, access-history pagination, recovery, MFA/session and form-notification controls with browser/HTTP evidence. | Existing-account linkage and approved grant/notification/MFA reconciliation; full old-account transition rehearsal. Read-only identity report is not an applied migration. |
| Preserve CMS store, publications, revisions, media and public APIs | Retained Core handlers bridged through allowlisted `marketing-cms.transport.ts`; native Website, Pages, Sections, Media, Galleries, Menus, Sidebars, SEO, Blog, Forms, Events, Team and Careers screens. | Compare every legacy operation, nested setting, preview, publication and public consumer. Generic CMS and P1 published Website snapshots remain distinct; their existence is not proof of identical consumers. |
| Marketing Design parity | Palette, typography, social profiles and branding editors; public palette/font/social delivery; typed/versioned writes. | Public logo/favicon/company identity delivery is released and read-only verified (see identity evidence below). Owner asset mutation, full image/font/provider behavior and appearance acceptance remain unverified. |
| Website System settings separate from business Settings | Owner-only Website modules, head-tag settings and native Developer Resources are in Marketing. Business integration status remains in Settings. | Website Integrations now has a native Owner destination, exact API operations, versioned redacted configuration, explicit secret controls and coordinated legacy routes. Authenticated desktop/mobile read-only acceptance passed at `807db42`; Google reporting target management is deployed at `ca126b51` and its live GA historical display is verified; credentials remain deployment-managed, and provider delivery/recovery evidence remains incomplete. Email Templates now has an Owner-only native destination, exact allowlisted operations, generated client and versioned editor/preview/restore/test-mail controls, with atomic storage and coordinated retained/startup writers. Native live library, branded preview, reservation acquisition and unsaved visual-to-HTML editing were verified at `45e2800`; saved welcome/password-reset branding was reconciled and persisted at `bed669c7` without sending mail. Full mobile/template mutation, provider delivery and recovery acceptance remain. Developer Resources now uses versioned writes on both HTTP surfaces; full cross-surface browser/retirement acceptance remains. System Backups now has native Owner-only status/history and manual-run controls; deliberate restore parity and recovery acceptance remain open. Client Stack Onboarding now has a native Owner-only destination with all four operations and existing evidence attribution; retained admin routes are not retired. Migrate or explicitly account for each function before retirement. Do not move business integration settings indiscriminately. |
| Analytics and Search Console moved without losing controls | `MarketingReports.tsx`, independent capability/API routes, formatting/CSV and browser evidence; source reports preserved. | Live GA historical results and authenticated dashboard display reverified September 19 after target-management deployment. Realtime after `e35b8a88` was live-verified with one active user and matching United States/desktop breakdowns at 10:12 PM on September 19. Remaining: Search Console domain/www access, credential management, report/CSV control parity and single public page-view verification. |
| CRM merged into Revenue and Customers without data loss | Native inquiry/customer notes, follow-ups, filters, corrections, archive views and explicit Won onboarding; CRM extraction, reviewed import, independent verifier and reconciliation tools. | Two distinct unmatched inquiries passed actual-source isolated import/replay/verification. Source-fenced runner `19dea572` passed an independent 21-test PostgreSQL run. Production fenced import and exact replay are complete for the current three-source-lead batch (two new inquiries, one preserved receipt match). Native pipeline presentation is released with fixed lifecycle keys, Owner-only versioned editing and no source override to transfer. Remaining: operational prospect-context adoption, permanent source-write ownership and final cutover reconciliation. Full raw archival does not substitute for required native field/workflow usability. |
| Reusable MSA, scope, cost and package templates | Typed/versioned template library and migration; private composition, source snapshots, explicit switching, save-as-template and pricing review UI/API. | Final acceptance of all template scenarios, long documents and multi-client isolation on the integrated candidate. Owner-provided legal/template content remains distinct from synthetic tests. |
| Agreement composition feeds existing Sales | `composed-estimate-preparation.service.ts`, revision/change-order services, mounted routes and native preparation UI. | Final integrated workflow acceptance. Older notes saying preparation is internal/unmounted are superseded. |
| Customer review/PDF/approval match fixed agreement and pricing | `composed-estimate-document.ts`, immutable issuance, shared rendering, `composed-estimate-approval.ts`, document browser/PDF checks and integration tests. | Final full-candidate document/security regression, including historical estimates, long terms and permitted customer access. Do not claim a new electronic-signature workflow. |
| Approval → operations → activation → billing | `composed-estimate-preparation.integration.test.ts` and recorded mixed-billing rehearsal cover preparation, outbox-only send, approval, activation, visit generation and retry-safe billing. | Actual crew execution/review in the complete browser journey, offline behavior, cancellation/successor/change-order regressions and operational acceptance. Crew synchronization and manager review now use real local HTTP calls; browser offline storage and external posting remain unverified. |
| Preserve public/media/preview/intake/offline compatibility | Existing retained handlers, stable data stores and targeted runtime/route checks. | Full compatibility inventory and cutover tests spanning both applications. No blanket parity claim is supported yet. |
| Migration, restore, rollback and retirement | `scripts/consolidation/` has identity/CRM analysis, extraction, reviewed import and independent verification tools with synthetic tests. | Dashboard backup restore/migration/round-trip rehearsal passed September 18. P1 recovery runner now validates exact snapshot identity and fingerprints actual p1-migrations. Historical Core archive row/sequence recovery and a source-based retirement route inventory now exist (see September 19 evidence below). Populated database, downloaded Blog media archive and current/prior source-built application rollback rehearsals passed. Remaining: provider-side storage restoration and exact Railway image recovery, tested retirement/deep-link behavior, identity+CRM reconciliation, final ordering/freeze procedure and release packet. |
| Validated release candidate and Owner acceptance | Validated commits reconciled to main. Managed scripts `76127ead`, sidebar colors `552248a0`, crew recovery `fdff1811`, and Blog tool links `70ac81cc` have successful Railway deployment evidence. Managed scripts and Blog links have authenticated live browser checks. GitHub Actions remain disabled. | Full requirement audit, resolved release blockers, candidate-wide validation, reviewed migration/rollback artifacts and final full-goal acceptance. |


## Current interface and recovery checkpoint — September 19

The original shared presentations for Integrations, Email Templates, Developer
Resources, Team, Sidebars, Careers and Events are now released in addition to the earlier Design and Content restoration. Careers and
Events remain disabled in P1 production, as required. Events presets, structured
data diagnostics, upload-dropzone and complete registration management still need
scope-aware comparison; excluded commerce/membership controls must not be enabled
to manufacture parity.

Published menu delivery now connects four approved slots to server-rendered public
HTML, hydration and subsequent page navigation, with last-valid caching and managed
form dialogs. Live empty assignments preserve the existing fallback navigation.
This does not establish every CMS family’s preview, restore, simultaneous editing
or dynamic public-route behavior.

Read-only account and CRM inventories have been captured privately. The actual CRM
metadata contains three Core leads and one dashboard lead: one receipt-backed match
needs review and two Core records remain unmapped. Private payload export completed September 19 with all three source leads and verified hashes. This historical inventory is superseded by the source-fenced production import and exact replay below; permanent source-write ownership and cutover remain open. Account inventory is
not approval to activate seven inactive accounts or change the Owner’s MFA policy.

Recovery review confirms that the archive stores database rows/sequences, not media
object bytes. The verified historical archive has no media records, and the scoped
uploads namespace was empty. A separate object manifest and isolated byte/link
recovery rehearsal remain necessary. Existing rollback evidence uses source-built
images; exact current/prior Railway image provenance and retrievable immutable
image bytes remain necessary before claiming deployed-image rollback.

## Developer Resources implementation

The [versioned document storage and private bridge](developer-resources-consolidation.md) are implemented with atomic sync, audit rollback and conflict checks, with real PostgreSQL and route tests. Native reader/editor and generated client contracts are implemented with draft retention and six component tests. The retained editor now shares atomic versioned writes and retains drafts on conflict/reservation loss (September 19). Full cross-surface browser parity remains open. This does not retire legacy Developer Resources.

## Website System inventory

The [operation-level inventory](website-system-parity-inventory.md) now records all five missing destinations, their retained operations, and the migration contracts needed before implementation. It confirms that the legacy Google settings card does not configure the active environment-backed reporting service; document synchronization overwrites matching stored documents and needs coordination with edits. These findings are not completed feature parity.

## Remaining work sequence

1. Finish the original Website System interface restoration (Integrations, Email Templates and Developer Resources), then verify nested CMS behavior and public consumers. Public identity and four-slot menu delivery are already released; dynamic Blog delivery is released; full publication acceptance remains open; five-article import is complete.
2. Finish missing native CRM/settings/identity behavior and reconcile the source data/account contracts. Keep provider provisioning and Owner-reviewed mappings explicit as external acceptance dependencies.
3. Complete the whole-system capability matrix and full agreement/crew/offline journey. Reuse implemented proposal and billing services; do not rebuild them because an old checkpoint says they were pending.
4. Run isolated export/import/reconciliation and backup/restore/rollback rehearsals; finish safe legacy deep-link and retirement behavior.
5. Execute the final integrated browser/API/security/data compatibility audit and assemble the release candidate. Incremental production releases have standing Owner authorization; destructive migration, policy changes and admin retirement still require their specific acceptance gates.

## Validation baseline and limits

Latest implementation checkpoint: 119 dashboard/database tests and migration replay passed; 58 focused Core/shared identity tests passed; shared-library/API/Core/dashboard type checks and API/Core/dashboard builds passed; Branding browser passed. An initial dashboard run failed an unrelated global client-count assertion under concurrent fixtures; it passed on rerun without an onboarding change. That isolation weakness is recorded rather than hidden.

These checks support their tested slices. They do not prove live providers, real-source migration, restored production data, whole-app authorization completeness or successful `/admin/` retirement. Those gaps keep the full goal active.

## Follow-up source review for the Owner

The September 17 review checked the legacy `admin-sidebar.tsx`, Core `App.tsx` and `settings-page.tsx` against dashboard destinations and the CMS transport allowlist. It confirmed the five missing System destinations named above. The reporting and agreement implementation is substantially beyond the historical foundation backlog; no new claim of missing proposal preparation is made.

Identity reconciliation is explicitly structural and read-only: its current input does not cover Core suspension, email verification, MFA/session assurance, detailed grant parity or client/property access. Those require separate evidence. Capability review must distinguish valid Owner/client role restrictions from obsolete broad staff roles; the presence of `requireRole` by itself is not evidence of an authorization defect.

Public identity delivery is released and read-only verified at `4d85894`. The strict public projection supplies a shared identity revision to server-rendered HTML, hydration and navigation; known media uses same-origin URLs without widening CSP. Existing published CMS fields remain intact. See [public identity contract](public-website-identity.md) for precedence, validation and cache limitations. Automated synthetic identity checks do not establish a live Owner branding edit or whole-CMS parity.

## Native Backups status/run implementation — September 19

Owner-only status/history and explicit manual backup UI/API are released at `47e8136`; authenticated read-only desktop/mobile verification passed with ten real history entries. [The contract](website-backups-contract.md) records precise coverage, retention side effects, uncertainty controls, pinned storage destinations and media limitations. Full history pagination, qualified keys and unreadable-history error handling were corrected. Restore is not exposed through this native slice. Core/media recovery, application rollback and retirement remain open; do not use these passing mock-backed tests as restore evidence.

## Recovery and CRM rehearsal checkpoint — September 19

The [synthetic CRM import/restore rehearsal](synthetic-crm-restore-rehearsal.md) passed: six source records verified, four native records checked, one later native task edit preserved through replay and restoration, and every public-table row fingerprint matched. Independent review confirmed the fixture-only isolation and evidence. Twenty-six runner/payload/reconciliation tests passed. This does not close actual source mappings, source freeze, production import or account/access reconciliation.

A genuine P1 Core archive has been [acquired read-only and verified](core-recovery-acquisition-2026-09-19.md); actual recovery execution is tracked there. Application boot/previous-image rollback remains a separate [rehearsal gate](core-application-rollback-rehearsal-plan.md), particularly because startup workers can mutate a restored clone. No production restore or admin retirement is claimed.

The [account-access metadata reconciler](account-access-reconciliation.md) is implemented at `5e6dd9d`, preserving the separate identity-v1 contract. Fourteen account/identity tests passed and independent source review found no blocker. Actual inventories, authenticated Owner review, current session assurance, effective delivery and endpoint authorization remain unverified; the tool never applies account changes.

The [retained admin route inventory](admin-retirement-route-inventory.md) now maps explicit routes, deep-link gaps and backend dependencies. This identifies work before cutover; no redirects or retired routes are claimed.

Historical Core archive recovery passed on PostgreSQL18.6 after fixing generated identity insertion and missing historical identity-sequence metadata: 52 tables, 519 rows and both actual catalog sequences verified; all owned resources removed. [Evidence and failed-attempt history](core-recovery-acquisition-2026-09-19.md) preserve the exact source/hash boundary and remaining application/media/rollback gates. This is not a complete recovery or retirement sign-off.

## CMS delivery and deep-link checkpoint — September 19

Native Pages, Galleries and Sections now retain editor selections in direct URLs at `112f1d1`. Fifteen focused component tests, dashboard type checking and production build passed (existing large-chunk warning remains). See [editor deep links](native-cms-editor-deep-links.md). Railway dashboard deployment `a97ad844-eb79-48f6-91a0-1f419ad91b5e` reached SUCCESS. Authenticated browser checks opened all three `new` editors directly and verified page return-to-list clears its selector; no CMS records were created or published. Existing-record, real reservation, mobile and dirty-history acceptance remain open.

Historical source review identified three public-delivery gaps: robots settings, CMS redirects and menu assignments. All three now have released consumers with publication/cache contracts. Their narrower remaining acceptance checks are recorded below; the old finding must not be used to treat their implementations as missing.

Search Console domain-property access remains pending: the verified Owner browser lists `mike@godigitalalchemy.com`, while `mike@p1landmanagement.com` receives a domain-property access denial. The existing reporting token lists only the apex URL property. Restricted domain access has been prepared but not submitted; browser permission expansion awaits the requested action-time confirmation. No provider credentials or reporting property were changed.

The [isolated application rollback runner](core-application-rollback-runner.md) now has a genuine partial result (evidence04). Current/prior source rebuilds booted on separate restored clones with unchanged baseline and verified cleanup. Only form updated timestamps changed; three added rows belong to the migration ledger. Empty archived content prevents published-content recovery proof; media, authenticated/provider and original Railway-image rollback gates remain open. Seven offline runner checks passed independently.

Robots public delivery is implemented at `ec899b3`; five Core and 21 website checks, both typechecks and the Core production build passed. Independent review found no blocker. Canonical live projection/robots equality and GET/HEAD headers passed after release `550534b`; a separate live staging check remains unverified. Redirect delivery was released at `8068e29`/`31d0c4b`; four-slot menu delivery was released at `4b7cf0f6`. Read-only live redirect projection checks were repeated September 19; nonempty production-rule execution remains unverified because the live collection contains zero rules.

## Composed agreement / crew acceptance — September 19

The composed-preparation integration test now exercises a distinct assigned crew
identity through `/api/v1/field/sync` after office dispatch, rather than marking work
reviewed with SQL. A time-start/completion batch is accepted and replayed over HTTP;
exactly two field events persist. Completed but unreviewed work still cannot prepare
a per-visit charge. Crew self-review returns403; the manager status endpoint reviews
the completed work, after which charge preparation is idempotent. Existing mixed
proposal, recurrence, financial allocation and finite-term assertions still pass.

Executed successfully with PostgreSQL18 in a disposable loopback-only container,
all current dashboard migrations, a local dashboard HTTP server and synthetic users.
The final guarded test passed1/1 with no skips. Both the server and owned database
container were stopped, and container removal was verified. No production connection
or provider worker was used. The test now refuses non-loopback database/server
configuration or a database name lacking test/fixture/acceptance markers.

This proves composed proposal → recurring job → crew synchronization/retry → manager
review → charge preparation through actual application handlers. It does not prove
browser IndexedDB/offline recovery, photos, device restart, reassignment recovery,
all cancellation/successor cases, provider delivery, or full operational acceptance.

## Public CMS redirects — release candidate September 19

Redirect rules now have a validated public projection consumed by the website
gateway and subsequent client-side navigation. Only canonical same-site paths and
301/302 are accepted; reserved infrastructure routes, duplicate active sources and
cycles are denied. Advisory transaction locks prevent conflicting concurrent edits.
Invalid historical rows can be disabled independently to repair the collection.
The gateway retains the last valid snapshot on upstream failure (30-second refresh),
preserves incoming query parameters and removes active source routes from sitemap.
Client checks abort on navigation and fail open after2.2seconds instead of stranding
visitors if the projection is unavailable. Normal document requests remain authoritative.

Parent isolated HEAD-plus-redirect release copy passed Core typecheck/build, website
typecheck/Vite build/prerender/manifest generation,22 HTTP/runtime/store tests and
6 policy/client resolver tests. Archive builds require explicit P1_SOURCE_REVISION;
the manifest step passed after supplying the actual base revision. Specialist ran
5 isolated PostgreSQL concurrency/policy tests and reported browser navigation,
query, stale-response and failure checks. No production redirect records were created
or changed. Full CRUD authorization runtime coverage and live nonempty-rule acceptance
remain separate from these checks. This checkpoint predates menu delivery at `4b7cf0f6`; menus are now connected.

Redirect release `8068e29` reached SUCCESS on Website
`b835bc61-4c68-49f0-a5c3-8993e709f66d` and Core
`7262d353-0e3c-45e5-9dbb-4d50505546b9`. Portable test-only follow-up
`31d0c4b` also reached SUCCESS (Website `a21b5d5a-9988-4ca4-b86f-5675d001f8fc`,
Core `a1fa0075-8b76-42d1-b81a-bfa5d518d518`). Live read-only checks returned200
for the valid public redirect projection, sitemap and About document. The projection
has zero rules; this is not evidence of a nonempty production redirect execution.

Owner-aware Marketing editor controls were released at `d1b7a60` (dashboard
`2649cfcb-6a5d-4c4b-a209-cb0d44bb7b34` SUCCESS). The shared policy still denies
crew/client and unknown capabilities, and requires explicit staff grants.

The full shared CMS builder/editor restoration remains under implementation. Review
found an existing concurrency defect: page writes have no atomic stale-version or
server-enforced editor-lease check, and user-only leases allow same-user tabs to
overwrite/release each other. Orchestrator approved additive page/menu versions and
instance-specific leases with transactional mutations, coordinated across both
editors before release. This is required conflict protection, not completed work.

## CMS Pages parity release — September 19, 2026

The preceding page-concurrency gap is repaired in release `872d2bb749adbded8297c817f20a9fcd725f08d4`. Original Pages list/templates/wizard/editor tabs and shared structure/canvas/inspector are integrated in both hosts. Page/menu versions, exact editor-instance leases for Pages, atomic revision/relationship updates and scheduler conflicts have actual PostgreSQL tests; the P1 migration runner and retained data upgrade were exercised separately. Current Core/dashboard typechecks and builds pass; independent parent database rerun11/11 passed. Synthetic browser save, same-user read-only tab, stale-draft retention and responsive390/1279/1280/1440 checks passed after correcting desktop CSS and mobile containment. Full details/limits are in `marketing-admin-interface-parity.md` and `cms-page-concurrency-plan.md`.

Railway SUCCESS: dashboard `7340a4fd-56bf-4e7a-9874-ffebcff8e5ea`, Core `40c4e535-b5a5-435b-8d1b-b8a9428e536a`. Core runtime logs report P1 migrations completed at2026-09-19T19:08:28.720Z. Authenticated live Pages list shows the restored controls and real empty state, with no loading/error alert; no production page was created or edited. The public structured Website content remains a separate contract.

Remaining Marketing interface restoration proceeds with Sections and SEO, then Galleries, structured Website presentation, Backups/onboarding/head tags and remaining integrations/documents/email tools. Existing Sections reservations are not yet server-fenced like Pages; this is a separate concurrency gap and must not be marked accepted merely by sharing the builder. Admin retirement, full content parity, actual account/CRM reconciliation and final operational/recovery acceptance remain open.

## Marketing Sections and SEO release — September 19

Original shared Sections list/editor/visual builder and SEO cards/audit/reference/
tabs shipped at `7714ccb9`. Production dashboard/Core/website deployments reached
SUCCESS; authenticated read-only checks confirmed the new tools and actual empty
catalog state. Thirteen adapter tests, both typechecks, isolated builds, independent
review and desktop/mobile browser checks passed. Native fabricated public preview
links were removed during review; editor preview remains authoritative. See the
[parity evidence](marketing-admin-interface-parity.md). Sections still lacks the
CMS Pages version/session fence. Galleries and structured Website restoration are
in progress; remaining system-tool parity and all unrelated consolidation gates
remain open. This release does not authorize admin retirement.

## Website, Gallery and Head Tags release — September 19

`78fb0e72` is live on dashboard/Core/website (Railway SUCCESS), with shared retained
editor presentation. Parent verification:33 editor regression tests,8 SEO tests,
both typechecks, isolated Core and restricted-context dashboard builds, desktop/
390px synthetic browser checks, and authenticated production read-only checks.
Website's actual homepage preview renders; Gallery has no saved records; Head Tags
shows unchanged Save disabled. No production save/publication occurred. Blog and
Menus restoration are in progress; all remaining parity and retirement gates stay
open. See Marketing parity document for deployment IDs and evidence limits.

Production account/CRM metadata was captured privately with verified read-only
transactions. The CRM report proposes one receipt-backed existing lead and two
unmapped leads with zero conflicts. It is not an approved mapping/import. Owner
account/MFA disposition and all source-freeze, content-preserving migration, session/
notification, recovery and operational acceptance remain open.


## September 19 redirect revalidation and chain guard

The released consumer passed 29 read-only/runtime checks; its live projection is
valid and empty. A ten-edge chain limit now prevents browser hop-budget failures
without collapsing or changing authored 301/302 rules. Core policy and the mirrored
public parser reject longer chains; invalid upstream snapshots preserve last-valid
rules. Boundary/graph coverage includes ten accepted, eleven rejected, prefix joins,
mixed statuses, inactive edges and cycles. After the change, 25 website runtime/store,
four Core policy and three client resolver checks passed, with both typechecks.
No production redirect rules were changed. Fresh database tests were skipped without
a fixture URL; historical release evidence records five isolated database checks.
Nonempty live execution, full CRUD authorization acceptance and stale-edit CAS remain.


## Crew browser persistence acceptance — September 19

The real built dashboard passed the isolated Chrome153 browser harness in
`scripts/consolidation/crew-offline-browser-acceptance.mjs`, including an independent
parent rerun. Actual UI time-start/completion events persisted in IndexedDB across
offline navigation reload and a full browser-process restart with the same profile.
A failed acknowledgement retained both exact IDs/payloads; reconnect retried those
IDs, cleared acknowledged entries, and an empty resync made no request. The fixture
received two batches and applied two unique events. Dashboard index SHA256 was
`890b7ba281adf153ec2f48a577c07d62441e93f4a9c815a633a5511031fe8821`.

The receiver was synthetic and isolated to loopback; it establishes browser queue
behavior, not production server idempotency. The separate actual HTTP/PostgreSQL
agreement/crew test supplies backend evidence. No physical reboot, photo upload,
reassignment, storage eviction or provider delivery is established by this run.
Browser/server/profile cleanup completed. Full operational acceptance remains open.


## Blog publication storage and recovery candidate — September 19

The additive [Blog foundation](blog-publication-consolidation.md) is independently
reviewed. It supplies immutable snapshots, draft/current/last-published pointers,
version and exact-instance lease fences, explicit unpublished adoption, URL
ownership/tombstones and legacy drift detection. It is not exposed by existing APIs
and does not change any current public article or editor behavior.

Recovery review repaired cyclic FK restore ordering, historical-archive omission
and new timestamp storage. New backup capture also preserves scalar date/timestamp
values without process-timezone conversion or microsecond truncation. Existing
archives remain unchanged. P1 schema-push is disabled because its installed
introspector can remove/recreate valid composite constraints and cannot preserve
SQL-owned deferral semantics. SQL migrations remain authoritative.

Specialist validation passed14 actual publication/catalog tests,5 populated
backup/restore tests and1 actual migration-runner test. Parent independently passed
the5 restore tests,29 backup tests in New York and11 database tests in UTC, and
reviewed the retained-schema compatibility boundaries. Final parent publication
rerun/build and release evidence are recorded in handoff. API/editor/scheduler
cutover, private preview, static-article adoption, public SSR/hydration/metadata/
sitemap/cache integration and full Blog feature acceptance remain open.


## Latest recovery release — September 19

Blog storage/recovery foundation shipped at9926fc01; dashboard lazy-tool recovery
shipped at5af08490. All three Railway services reached SUCCESS for5af08490, both
health checks passed and the delivered dashboard module contains the recovery UI.
See handoff for deployment IDs. This does not complete Blog publication cutover or
full consolidation acceptance. Build-log image digests are now recorded, but their
retrievable immutable bytes and actual image-based rollback remain open.

## Blog publication and formatting checkpoint — September 19

Both editors and public Blog delivery shipped at `e6125fb9` with successful Core,
Dashboard and Website deployments. See handoff and the Blog consolidation contract
for exact test/release evidence. Private routes reject unauthenticated requests;
public SSR retains the five existing articles. Actual Owner publication acceptance,
static-article import, complete sidebar/comments/gallery output and recovery remain.

Review found that toolbar code blocks, inline code and dividers were lost in public
sanitization. The follow-up preserves those inert tags across sanitizer, media
resolution and projection, maps authored H1 to a section H2, and retains the active
HTML/URL restrictions. Independent review found no blocker. Eleven Core pipeline,
eight existing security and five website parser tests passed; the public HTTP test,
both typechecks/builds and 54-route prerender passed. Local browser at390px proved
page width390, code block width342, internal scrolling for a12890px code line, one
H1 and a rendered divider. Synthetic preview server was stopped after inspection.
This is formatting evidence, not full CMS or production-content acceptance.

## Permanent Blog source ownership release — September 19

`20a3ac31` backend followed by `9d39eb5d` website is deployed successfully on
Core, Website and Dashboard. Immutable receipt migration and public v2 ownership
prevent retired static routes from reappearing after future CMS withdrawal/rename.
Backup preflight preserves full receipt identity, provenance and microsecond time.
21 Core pipeline/route,14 original actualPG publication,6 receipt,8 backup and
migration tests passed;34 website tests and source/build checks passed. Parent
independently reran11 website Blog/ownership tests. All five live article URLs and
the Blog index return200; each original route occurs once in sitemap. No real
article import occurred. Source media/date/author/hero preservation and complete
CMS workflow acceptance remain open. Exact deployments/backup evidence: handoff.md
and blog-static-import-plan.md. `/admin` retirement remains gated.

## Blog presentation preservation release — September 19

Runtime5799e3f3 deployed successfully to Website, Core and Dashboard. Optional versioned
presentation survives immutable revisions and both original editor controllers; public
editorial rendering preserves hero/body/aside semantics and declared date precision.
19 realPG cutover tests,25 Core pipeline/route,20 native editor,9 retained editor,
40 website and6 review-bundle tests passed. Typechecks/builds passed; local desktop/
390px visual check confirms no horizontal overflow and original related-link styles.
Live health and Blog reads passed without production content mutation. Remaining:
presentation editing controls, registered originals+responsive variants, genuine date/
source review and atomic import acceptance. No full Blog/CMS parity claim yet.

### Atomic Blog import foundation (September 19)

Implemented internal reviewed importer and exact source fence, plus archived
Website editor read-only routing once permanent Blog ownership exists.27 new
source/import/guard checks,36 regression checks and16 review-tool checks passed
in parent verification. Core/dashboard builds and Core/dashboard/API types passed.
See `blog-static-import.md` for contracts, replay and explicit remaining gates.
Production articles are not transferred; real apply tooling, populated restore,
reviewed dates and browser mutation acceptance remain pending.

## Live Analytics overview and Blog transfer checkpoint

Runtime9978d9db is verified successful on all three Railway applications. The live
Analytics overview uses the shared original presentation and real provider data;
no alert or page overflow was observed. Parent desktop/mobile isolated render checks
and both-host tests/builds passed. Five Blog articles are now CMS-owned and publicly
served with matching responsive images. Private draft save isolation passed, but
live restore/publish cleanup is still pending a stalled browser confirmation.
An actual populated post-import snapshot is acquired privately; its isolated
restore rehearsal remains in progress. These do not close overall CMS, recovery,
account/CRM, operational acceptance or retirement gates.

## Joined crew browser recovery — September 19, 2026

CUA resumed the still-running isolated fixture at loopback port55533. Its prior
Start work entry remained queued. With API503 simulation enabled, a completion
entry saved locally and the downloaded assignment remained visible with an outage
notice (the prior defect removed it). After connectivity restoration and browser
reload, both entries remained pending. First synchronization deliberately lost the
acknowledgement after real acceptance; both remained pending. Retry displayed
Completed and zero pending entries. Fixture verification passed: two real crew
events, stable replay IDs, billing blocked before review, real manager review and
identical billing retry receipt. No provider worker ran.

This older running fixture does not establish the later source-only exact-event-ID
assertions. It also does not prove physical offline/reboot, quota eviction, photos,
cancellation or successor/change-order behavior. Those gates remain open. The
bounded refresh fix retains downloaded My Day data only for explicit transient
HTTP failures; concurrent authorization failures take precedence. Three focused
recovery tests and two acknowledgement tests pass; dashboard typecheck/build pass.

Recent releases: managed Head Tags `76127ead` and sidebar icon colors `552248a0`
are verified live on Railway. Head Tags now manages the existing GA tracking ID;
Turnstile remains enabled with authoritative status displayed. Full consolidation
acceptance and safe admin retirement remain incomplete.

Fresh joined fixture rehearsal on September 19 (port57934) passed the stronger exact
event-ID and both-accepted-receipt assertions, closing the older fixture limitation
above. Full CUA download/start/completion/reload/lost-ack/retry journey passed.
The reusable runner is scripts/consolidation/crew-joined-fixture.py; physical-device
and other explicitly outstanding scenarios remain open.


## Blog tool links and release checkpoint — September 19

`70ac81cc58a47711fd94040ab08fc07c6136b039` deployed successfully in dashboard
release `1fe216e4-3d8b-493a-95e3-73c3210688f7`. CUA opened `?tab=comments`
and observed moderation, switched to Comment Settings (`?tab=settings`), then
reloaded and observed the same settings panel. No settings were changed.
Thirty-two Blog adapter tests, dashboard types and build passed. Taxonomy uses
`?tab=taxonomy`; post creation continues to use `?post=new`.

The operation inventory found no missing Blog API operations, but initial-load
retry, pending-mutation navigation protection and presentation differences remain
under implementation. Sections exact-instance lease/version protection is also
unreleased work. Neither is accepted by this checkpoint.

Crew recovery `fdff1811` has Railway SUCCESS deployment
`be661605-c7ea-46e1-9a45-0fab6573be2e`. Native Backup UI was read-only inspected:
latest listed scheduled archive is September19 08:56 Eastern, revision9ded625d,
52tables/584rows/0media. It predates imported Blog content and must not be used as
proof of current release recovery. Fresh non-pruning capture/rehearsal is underway.


## Sections and Blog settings release candidate — September 19

Sections now coordinates exact-editor leases, versioned update/delete and atomic
starter resets across both editors. See `sections-concurrency.md` for compatibility,
rollback and the fresh 57-table/663-row populated backup/restore evidence. Parent
PostgreSQL tests (10), Blog settings tests (6), and integrated Core/dashboard types
and builds passed. Blog settings now handles failed reads, uncertain taxonomy
creation, pending navigation, category hierarchy and moderation counts/dates; see
`blog-settings-recovery.md` for the remaining visual/concurrency limitations.
Runtime `0db3ed9b9afc21ccc5698301004838000c4c3d34` reached Railway SUCCESS:
Core `ac3f01f5-aca4-4500-8c84-e043f2bb83ad`, dashboard
`21f7721b-0f33-458e-a21d-ebc419dee59a`, website
`d275a1dc-5f02-4385-b3d9-b34a7b1f7f2c`. Authenticated CUA read checks
confirmed Blog Participation Rules/Spam Protection controls and successful empty
Sections library loading. No production save/reset/delete was performed. These checks do
not close CRM/account migration, full operational acceptance or admin retirement.

## CRM field usability — September 19

The fresh protected Core snapshot captured at 2026-09-20T02:58:47.367Z has
three leads (two New, one Contacted), zero clients/notes/tasks, no assigned source
owners, and one follow-up date. All three have form submission IDs. There is no
stored `crm_pipeline_config`; therefore no custom stage label/order/color data
exists in this snapshot to transfer. This does not prove current live source
freshness or eliminate the required native pipeline settings capability.

General inquiry details now include read-only submitted contact title, property
name/type, acreage, project stage, service timing and requested services. Previously
those preserved native fields were visible through commercial tooling but absent
from the general inquiry details editor. Both read and correction responses return
an allowlisted `submittedContext`; the correction request and revision-history
contract remain unchanged. Attribution and arbitrary metadata are not added to this
response. The UI distinguishes reported context from verified operational properties.

Validation: fresh disposable PostgreSQL migrations and service regression passed
(0 skipped), including stale-write rejection, read-only input rejection, no-op
stability and unchanged history. Two UI adapter tests passed (escaped content and
older-API compatibility). Dashboard/API typechecks and production builds passed.
The owned fixture database was removed. This improves migrated inquiry usability;
it does not constitute production import, reviewed mappings, context correction/
adoption, pipeline customization, or account-policy acceptance.

## Cancelled downloaded work — September 19

Fresh isolated joined fixture at loopback58914 completed real agreement approval,
activation, visit generation and scheduling. CUA downloaded the assignment. During
crew API503 simulation, the fixture manager cancelled the work order through the
actual status endpoint; CUA queued a start and completion from its stale download.
After reconnection both events received conflict receipts. Reload and retry kept
two pending entries. Independent database verification confirmed exactly those two
event IDs, both conflicts, unchanged Cancelled work, zero charges and billing denial.
CUA also confirmed that download replacement and sign-out refused to discard the
pending entries. No provider worker or production mutation ran.

The reusable fixture now supports `cancel-work` and `verify-cancelled`. Python
compilation and both acknowledgement tests passed. This closes the tested
work-order cancellation retention/replay case, not agreement-term cancellation,
successor/change-order integration, physical device persistence, or full offline
acceptance. Office conflict resolution and a durable acknowledgement that permits
safe removal of resolved local entries are still missing; repeated synchronization
alone cannot clear these conflicts. Implement that workflow before calling the
crew journey operationally complete.

Prior inquiry context runtime `b09db1a59e0640d6ccbc1f75ca93d4668aa9fb0b`
reached Railway SUCCESS: dashboard `bc0693e5-b9be-4e5f-a1bd-7533eb54dec6`,
Core `1e37d292-1928-49bd-8bff-702c80f711fe`, website
`1b15445e-1718-4198-b417-b9238ff1edca`.

### Field conflict review acceptance — September19

Office record-only resolution now passes the joined local browser/API/database
journey: cancelled-work entries remain immutable, office reviews are append-only,
crew receipt sync clears only reviewed copies,0 pending survives reload, and safe
sign-out succeeds. Dashboard0047 is applied; release0e058517 reached Railway SUCCESS for all
three services and authenticated live Schedule loaded the conflict panel successfully. See `field-conflict-resolution.md`. This closes
this bounded office-review gap, not physical-device offline/eviction, photo
reconciliation, cancellation/change-order acceptance or the overall crew gate.


## Production CRM preservation checkpoint — September19

Fresh source export matched the prior reviewed source hash:3 leads, no clients,
notes or tasks. The source-fenced dry-run/apply/independent verification/exact replay
passed. All3 snapshots are preserved;2 separate inquiries were created and the
existing receipt-matched lead remained unchanged. Live Sales exposed the imported
inquiries, structured context and original CRM history. See
[production evidence](crm-production-preservation-2026-09-19.md). This supersedes
historical “no real CRM import” statements only for this exact bounded batch.
Permanent source ownership, account policy, pipeline parity and retirement remain
open. The prior documentation-only revision22bfe064 also reached SUCCESS on all
three Railway services.

## Standard estimate delivery — September 20

Additive receiver `519c10b8` verified SUCCESS before enabling Core producer. Durable estimate handoff and queue visibility implemented; 25 focused and 23 actual PostgreSQL tests pass, as do affected builds/typechecks. Producer `b75c3dee` verified Railway SUCCESS on all three applications, dashboard health and public contact HTTP 200; no historical replay. See `estimate-dashboard-intake.md`.

## Analytics report date and filtering acceptance — September 20

Authenticated production Analytics rendered actual property554712298 results (8 active users,22 sessions,170 page views at observation). Daily search narrowed four rows to September17, then showed the explicit no-match state with CSV disabled for an unmatched value. These are provider observations, not fixture data. The daily date column exposed Google's compact YYYYMMDD strings; dashboard date dimensions now render MM/DD/YYYY without timezone shifts, and search accepts either representation. CSV and sort retain original provider values. Four report tests, dashboard typecheck and production build passed. Release `781d37e3` reached Railway SUCCESS on all three applications. Authenticated production browser showed 09/17/2026 through 09/19/2026; searching 09/17/2026 returned exactly one matching row. Search Console access and complete report/export parity remain open.

## Native pipeline presentation — September 20

Released `b7a56cc0` reached SUCCESS on all three services. Fresh source inspection found no legacy override. After a verified backup and additive migration 0048, the live Owner Sales editor and default stage consumers loaded successfully. Five UI and three PostgreSQL tests cover validation, revision conflicts, first-write races, audit rollback, permissions, client isolation and draft retention. Browser mutation checks used only the disposable fixture. See `sales-pipeline-settings.md`. The existing New/Contacted/Qualified/Proposal/Won/Lost lifecycle and onboarding semantics remain unchanged. This closes presentation-settings parity, not permanent CRM write ownership or retirement.

## Agreement candidate regression — September 20

Current candidate plus the successor regression passed six non-skipped tests across composed preparation integration, service-agreement lifecycle, billing, recurring-visit authorization and mounted HTTP roles. A fresh local PostgreSQL 18 database applied every current migration through 0048; the actual Dashboard HTTP application ran with synthetic credentials and no provider configuration. Both the temporary server and database/volume were removed after validation.

The lifecycle regression now explicitly creates a successor after cancellation: reuse of the prior estimate and an overlapping term are rejected; two concurrent distinct successor requests yield one success and one409; exact creation replay returns the winner; activation succeeds; the predecessor row remains byte-for-byte equivalent as JSONB. This fills a missing successful-successor assertion. Existing composed tests cover revision races, immutable snapshots, approval/change orders, activation and charge preparation. Six tests passed, zero failures/skips; API typecheck passed. No production or provider writes were used.

This establishes current backend regressions, not the complete customer/staff/crew browser journey, long-document visual acceptance, real-device offline durability or external billing delivery. Those acceptance gates remain open.
