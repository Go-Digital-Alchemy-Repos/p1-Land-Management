# Consolidation acceptance tracker

Current assessment: **implementation in progress; not a complete release candidate**. Updated September 19, 2026. The approved scope remains unchanged. Main now contains the consolidated applications and validated public changes; `140a412` was verified deployed successfully on Website, Dashboard and Core. Original checkout and Blythe remain outside this worktree's write scope.

The Owner's identity link and Website Editor work. Live Analytics now works after correcting empty previous-period report normalization. Search Console remains blocked by property coverage/access (configured domain property returns 403; only the apex URL-prefix property appeared in the authorized list). Do not rotate existing Google credentials or equate apex access with canonical `www` coverage.

The September 17 dashboard backup has passed an isolated restore, application of 19 consolidation SQL migrations, preservation of all preexisting business-table rows, and a second backup/restore comparison. See [restore evidence](dashboard-restore-rehearsal-2026-09-18.md). No real CRM import, full account reconciliation, application rollback rehearsal, complete media recovery or `/admin/` retirement has occurred. Historical Core archive row/sequence recovery passed September 19; see the recovery checkpoint below.

## Requirement-level status

“Implemented” below means source exists with recorded validation, not release acceptance. Every row remains open until its stated acceptance evidence is complete.

| Requirement | Current evidence | Remaining acceptance work |
| --- | --- | --- |
| One dashboard, admin-style appearance, Marketing immediately above Settings | `artifacts/p1-dashboard/src/dashboard-routes.ts`, `main.tsx`, shared theme/styles and recorded browser checks. Marketing contains Content, Design, Website System and Reporting. | Full route-by-route theme, keyboard, contrast, responsive and error-state acceptance; final removal of legacy administrative entry points. |
| Owner-only automatic full access; explicit tool grants for members | `lib/api-zod/src/business-access.ts`; API access/policy modules; Core federation/capability middleware; business/sales access and CMS transport tests. | Exhaustive endpoint/projection/export/notification/shared-lookup coverage matrix, including crew/client and offline boundaries. Existing tests cover parts of this requirement, not all callers. |
| Full User Manager | `UserManager.tsx`, user-management contracts/routes/services; invitation, access-history pagination, recovery, MFA/session and form-notification controls with browser/HTTP evidence. | Existing-account linkage and approved grant/notification/MFA reconciliation; full old-account transition rehearsal. Read-only identity report is not an applied migration. |
| Preserve CMS store, publications, revisions, media and public APIs | Retained Core handlers bridged through allowlisted `marketing-cms.transport.ts`; native Website, Pages, Sections, Media, Galleries, Menus, Sidebars, SEO, Blog, Forms, Events, Team and Careers screens. | Compare every legacy operation, nested setting, preview, publication and public consumer. Generic CMS and P1 published Website snapshots remain distinct; their existence is not proof of identical consumers. |
| Marketing Design parity | Palette, typography, social profiles and branding editors; public palette/font/social delivery; typed/versioned writes. | Public logo/favicon/company identity delivery is released and read-only verified (see identity evidence below). Owner asset mutation, full image/font/provider behavior and appearance acceptance remain unverified. |
| Website System settings separate from business Settings | Owner-only Website modules, head-tag settings and native Developer Resources are in Marketing. Business integration status remains in Settings. | Website Integrations now has a native Owner destination, exact API operations, versioned redacted configuration, explicit secret controls and coordinated legacy routes. Authenticated desktop/mobile read-only acceptance passed at `807db42`; active Google configuration management and provider delivery/recovery evidence remain incomplete. Email Templates now has an Owner-only native destination, exact allowlisted operations, generated client and versioned editor/preview/restore/test-mail controls, with atomic storage and coordinated retained/startup writers. Native live library, branded preview, reservation acquisition and unsaved visual-to-HTML editing were verified at `45e2800`; mobile/full mutation acceptance and inherited template branding/content reconciliation remain. Developer Resources now uses versioned writes on both HTTP surfaces; full cross-surface browser/retirement acceptance remains. System Backups now has native Owner-only status/history and manual-run controls; deliberate restore parity and recovery acceptance remain open. Client Stack Onboarding now has a native Owner-only destination with all four operations and existing evidence attribution; retained admin routes are not retired. Migrate or explicitly account for each function before retirement. Do not move business integration settings indiscriminately. |
| Analytics and Search Console moved without losing controls | `MarketingReports.tsx`, independent capability/API routes, formatting/CSV and browser evidence; source reports preserved. | Live GA provider results and authenticated dashboard display verified September 18. Remaining: Search Console domain/www access, Website System connection management, report/CSV control parity and single public page-view verification. |
| CRM merged into Revenue and Customers without data loss | Native inquiry/customer notes, follow-ups, filters, corrections, archive views and explicit Won onboarding; CRM extraction, reviewed import, independent verifier and reconciliation tools. | Reviewed real source mappings, unmatched-parent policy, source pipeline/settings merge, operational prospect-context adoption, source freeze and actual reconciled migration rehearsal. Full raw archival does not substitute for required native field/workflow usability. |
| Reusable MSA, scope, cost and package templates | Typed/versioned template library and migration; private composition, source snapshots, explicit switching, save-as-template and pricing review UI/API. | Final acceptance of all template scenarios, long documents and multi-client isolation on the integrated candidate. Owner-provided legal/template content remains distinct from synthetic tests. |
| Agreement composition feeds existing Sales | `composed-estimate-preparation.service.ts`, revision/change-order services, mounted routes and native preparation UI. | Final integrated workflow acceptance. Older notes saying preparation is internal/unmounted are superseded. |
| Customer review/PDF/approval match fixed agreement and pricing | `composed-estimate-document.ts`, immutable issuance, shared rendering, `composed-estimate-approval.ts`, document browser/PDF checks and integration tests. | Final full-candidate document/security regression, including historical estimates, long terms and permitted customer access. Do not claim a new electronic-signature workflow. |
| Approval → operations → activation → billing | `composed-estimate-preparation.integration.test.ts` and recorded mixed-billing rehearsal cover preparation, outbox-only send, approval, activation, visit generation and retry-safe billing. | Actual crew execution/review in the complete browser journey, offline behavior, cancellation/successor/change-order regressions and operational acceptance. Crew synchronization and manager review now use real local HTTP calls; browser offline storage and external posting remain unverified. |
| Preserve public/media/preview/intake/offline compatibility | Existing retained handlers, stable data stores and targeted runtime/route checks. | Full compatibility inventory and cutover tests spanning both applications. No blanket parity claim is supported yet. |
| Migration, restore, rollback and retirement | `scripts/consolidation/` has identity/CRM analysis, extraction, reviewed import and independent verification tools with synthetic tests. | Dashboard backup restore/migration/round-trip rehearsal passed September 18. P1 recovery runner now validates exact snapshot identity and fingerprints actual p1-migrations. Historical Core archive row/sequence recovery and a source-based retirement route inventory now exist (see September 19 evidence below). Remaining: application/media recovery, application rollback, tested retirement/deep-link behavior, identity+CRM reconciliation, ordering/freeze procedure and final release packet. |
| Validated release candidate and Owner acceptance | Validated commits reconciled to main and incremental production release verified through 140a412; GitHub Actions remain disabled. | Full requirement audit, resolved release blockers, candidate-wide validation, reviewed migration/rollback artifacts and final full-goal acceptance. |

## Developer Resources implementation

The [versioned document storage and private bridge](developer-resources-consolidation.md) are implemented with atomic sync, audit rollback and conflict checks, with real PostgreSQL and route tests. Native reader/editor and generated client contracts are implemented with draft retention and six component tests. The retained editor now shares atomic versioned writes and retains drafts on conflict/reservation loss (September 19). Full cross-surface browser parity remains open. This does not retire legacy Developer Resources.

## Website System inventory

The [operation-level inventory](website-system-parity-inventory.md) now records all five missing destinations, their retained operations, and the migration contracts needed before implementation. It confirms that the legacy Google settings card does not configure the active environment-backed reporting service; document synchronization overwrites matching stored documents and needs coordination with edits. These findings are not completed feature parity.

## Remaining work sequence

1. Complete the legacy feature/endpoint inventory, especially Website System Integrations/Email Templates and nested CMS operations. Close the concrete public identity delivery gap already identified.
2. Finish missing native CRM/settings/identity behavior and reconcile the source data/account contracts. Keep provider provisioning and Owner-reviewed mappings explicit as external acceptance dependencies.
3. Complete the whole-system capability matrix and full agreement/crew/offline journey. Reuse implemented proposal and billing services; do not rebuild them because an old checkpoint says they were pending.
4. Run isolated export/import/reconciliation and backup/restore/rollback rehearsals; finish safe legacy deep-link and retirement behavior.
5. Execute the final integrated browser/API/security/data compatibility audit and assemble the release candidate. Request production authority only with that concrete evidence packet.

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

A source review confirmed three remaining public-delivery gaps: native SEO robots settings are saved but production `/robots.txt` still serves the static file; CMS redirects are editable but the public server only applies hardcoded redirects; menu-location assignments are saved but `SiteHeader` still builds its navigation from fixed definitions. These must be connected with explicit publication/cache contracts, preserving staging noindex, canonical redirects, reserved infrastructure routes and accessible desktop/mobile navigation. Native editor existence is not public-consumer parity.

Search Console domain-property access remains pending: the verified Owner browser lists `mike@godigitalalchemy.com`, while `mike@p1landmanagement.com` receives a domain-property access denial. The existing reporting token lists only the apex URL property. Restricted domain access has been prepared but not submitted; browser permission expansion awaits the requested action-time confirmation. No provider credentials or reporting property were changed.

The [isolated application rollback runner](core-application-rollback-runner.md) now has a genuine partial result (evidence04). Current/prior source rebuilds booted on separate restored clones with unchanged baseline and verified cleanup. Only form updated timestamps changed; three added rows belong to the migration ledger. Empty archived content prevents published-content recovery proof; media, authenticated/provider and original Railway-image rollback gates remain open. Seven offline runner checks passed independently.

Robots public delivery is implemented at `ec899b3`; five Core and 21 website checks, both typechecks and the Core production build passed. Independent review found no blocker. Canonical live projection/robots equality and GET/HEAD headers passed after release `550534b`; a separate live staging check remains unverified. Menus and redirects remain unconnected public consumers.

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
remain separate from these checks. Menus are still an unfinished public consumer.

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
