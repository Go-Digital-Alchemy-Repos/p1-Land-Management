# P1 implementation status — September 7, 2026

Branch: `codex/p1-cms-crm`. Original public baseline: `5303da0`; copied Core source: `aad2057ca53e0a55a873bcbe9c62a73e267be541`. The [master plan](MASTER_PLAN.md) remains the full scope; a deployed dashboard slice does not complete it.

## Current release state

| Workstream | Verified state | Remaining release gate |
|---|---|---|
| Public website |35 routes including `/commercial` are live through the production CMS gateway as deployment `bd566935-a610-40e4-ba22-41dc9ae9a835`, built from reviewed source `b6e35ddb8072805d322a0452dd4d2684aac079b6`; the shared 1,240px public frame, canonical redirects, CMS fallback, Core proxy, security headers and persistent cache volume are verified live. Unsupported commercial credential and universal-service claims were removed while retaining existing CMS field identities; all rendered raster media now uses responsive WebP, passes route-wide structural accessibility checks, and rejects malformed encoded paths before proxying. | Production CMS initialization/content publication, shared CMS identity, owner acceptance and real-user accessibility/performance evidence |
| Independent P1 Core | Production Core setup correction `e2106796-b5c3-43e7-90a2-0e86b223a196` SUCCESS from `507f45448769d8d601b9ae2b257e83670f90ecad`; the one-time owner setup UI now shows its required authorization-code field while the server keeps the code private and rejects missing codes. Federation consumer staging restart `78fa0eca-840e-4df7-bfaa-73ecf514ea32` remains available; isolated CMS, managed forms, private proof and commercial sender remain available. | Designated-owner setup, production CMS initialization/content publication, shared identity and owner acceptance remain |
| Business dashboard | Staging web `107e7b65-c251-424d-8730-13bf0ceac40f` from `82e11f2` and isolated worker `4a3911b2-9f0d-4d5f-94c5-5a88513367ed` are SUCCESS; durable agreement draft preparation (`0018`), retry-stable agreement reviews, publication-gated inspection/property history, charge history, worker observability, enforced owner MFA, audit-backed service-request creation, PWA launcher metadata, grouped navigation and safe deep links are deployed in staging | Browser role/decision acceptance, actual owner recovery/enrollment, provider/device/pilot gates and a separately reviewed production dashboard release |
| Shared identity | Better Auth dashboard provider and Core federation consumer are deployed with fresh staging-only credentials, exact HTTPS callback and completed database backups; the browser handoff verifies S256 PKCE | Establish a staging owner session, then pass identity linking, MFA, revocation, outage and preview acceptance before any production enablement |
| Commercial prospect context | Reviewed `fc302b1` committed and pushed; isolated migrations, role/operational boundaries and conversion protection tested | Reviewed panel7ef0ae2 and migration0011 passed staging UI/API and restored-copy checks; production promotion and full assessment/onboarding remain |
| Dispatch readiness | Reviewed484f953 passed combined tests and staging readiness update/conflict/start checks | Production promotion and wider operational acceptance |

## September 7 — paired federation staging release

Dashboard staging web `2cc65a61-5886-4eeb-ae5d-374c0138b4a4` reached SUCCESS from the frozen `9b84067` artifact, applying additive migrations `0014_core_federation`, `0015_client_onboarding`, and `0016_agreement_charge_review`. Core staging `8298ec17-eb4c-4e85-967e-6f9a66158ab5` reached SUCCESS from `f219835`; its subsequent configuration restart `78fa0eca-840e-4df7-bfaa-73ecf514ea32` also passed readiness. Fresh staging database backups `927006f7-92e3-4bcf-8973-9b93d2a54117` (dashboard) and `3aea8f30-62fa-46fa-8be9-a9e506b9038c` (Core) are listed with completed storage sizes before activation.

Both services use a newly generated staging-only confidential-client secret and the exact staging callback. Core reports federation enabled, Core readiness and dashboard health return 200, and the browser handoff returns a 302 to Dashboard's exact `/api/v1/federation/authorize` endpoint with S256 PKCE, the registered callback and the required purpose. The credentialed token/introspection paths remain under `/api/integrations/core/v1/federation/*` as frozen by the contract. Staging Dashboard has no configured owner bootstrap, so no real Dashboard session, identity link, MFA/revocation/outage or preview browser acceptance has occurred. Production services, data and credentials remain unchanged.

## September 7 — durable agreement preparation staging release

Dashboard web deployment `803ded4d-b2bf-4e26-93e8-88804c724208` reached SUCCESS from the reviewed `ed20808` dashboard source, then matching worker deployment `4a3911b2-9f0d-4d5f-94c5-5a88513367ed` reached SUCCESS. The web migration gate applied additive `0018_agreement_preparation`; anonymous `/api/v1/agreement-preparation-jobs` is `401` with `no-store`, while `/api/healthz` is `200` with `no-store`. The worker startup logs recorded a scheduled and completed preparation job.

The worker path creates internal billing drafts only. It does not post to QuickBooks, send invoices, charge customers or publish work. Type checking, the 32-test dashboard suite, the disposable PostgreSQL agreement regression/replay run (including the new preparation test), and a zero-finding production dependency audit passed before release. Staging pre-deploy now runs `pnpm --dir artifacts/api-server migrate:dashboard`: Railway’s pre-deploy environment does not contain the Docker image's compiled `dist` output. No production dashboard, Core, public website or provider configuration changed.

## Website and CMS evidence

- React renders published CMS content into HTML and hydrates the same revision. Seven existing page families passed draft privacy, conflict409, publish and historical restore checks; `/commercial` additionally passed publication/restore with original content restored at revision6. Actual unsaved iframe previews subsequently passed commercial, service, location and article checks, with no private markers across35 anonymous routes.
-35-route build/QA, responsive WebP image budgets and initial public JavaScript131.7KiB gzip passed for the current public release candidate. Real-user Core Web Vitals and complete screen-reader acceptance remain unverified.
- Exact supplied P1 SVG is used for favicon/compact branding. Blog/Gallery are removed from main navigation; Service Areas is the final bold-blue Services item. Public URLs remain available.
- Staging admin redirect loop is fixed and live. Public/Core processes run nonroot; persistent last-good CMS cache survived redeployment and an isolated backend-unavailable check. New production volumes still require runtime ownership/provisioning verification.
- Excluded modules are unavailable through reviewed routes/UI; Events and Careers stay disabled. Private proof is encrypted and excluded from public contracts/settings bypasses. Mobile proof UI now fits390px. No private approval automatically publishes claims or grants image rights.
- Core IPv6 certificate validation defect was reproduced with real certificates and fixed in9f5cbec without weakening chain validation. Root independently passed52 focused tests. The three full-suite failures were stale admin navigation and QueryClient test fixtures, corrected in `1869384` without runtime changes. The isolated full suite passed 650 tests with 26 existing environment-gated database skips; root independently reran all eight affected tests successfully. Exact-source Core staging preparation is underway; the TLS fix is not yet production deployed.

## Commercial delivery and recovery

Cross-service staging acceptance verified two new inquiries, including phone-only contact: durable201 receipt, retry200 with the same identity, one Core CRM lead, one completed signed delivery job and one dashboard mapping. Staff follow-up persisted; stale changes returned409. The actual Sales inbox rendered the selected inquiry without JavaScript errors.

A separately approved historical staging receipt produced one missing delivery job; repeat apply reused it. Original form/CRM API snapshots were unchanged, and database timestamps/audit corroborated only the new commercial job. No SQL before-snapshot was captured for that apply. Its original failed email job was not retriggered. Temporary dashboard testing sessions were revoked and the synthetic staff profile deactivated while retaining its audit actor.

Fresh Core and dashboard staging backups restored successfully into network-isolated PostgreSQL18.6 containers. Migration0001/0010, three selected commercial receipts/jobs/mappings and audit counts matched their source snapshots. This is database-only recovery of separate snapshots, not distributed point-in-time recovery, restored object storage/secrets/ACLs or application/provider startup. The separate0011 upgrade and second restore passed, preserving existing selected data and relationships; SQL rehearsal does not establish application/provider recovery. See [staging evidence](p1-website-staging.md).

## Owner access and deployment boundaries

An active, verified dashboard owner and completed installation were observed after the earlier zero-owner check. Live production setup subsequently reported `initialized:true` and `configured:true`. The previous password is not recoverable; the login page offers password reset. Required owner MFA remains enforced. The deployed recovery screen guides enrollment/verification without granting business access or manufacturing session assurance. Actual owner MFA enrollment and recovery acceptance remain unverified. CMS/dashboard common credentials are required but not live.

Dedicated P1 database/storage/secrets are separate from original Core, which remains untouched. Mailgun delivery probes passed and Google mailbox records were retained. Production Core and public gateway are deployed (see p1-core-production.md and p1-public-production.md); production CMS records, shared identity and owner acceptance remain outstanding. Staging email failures were not represented as delivered mail. Production commercial signing keys are active; one synthetic managed-form receipt completed both CRM and signed dashboard delivery with duplicate-safe retry. Public website delivery is verified; owner acceptance remains a separate gate.

## Scope still required

The prospect company/contact/property editing UI is reviewed and accepted on staging. The assessment-to-proposal-to-onboarding workflow remains in development. Target-account pursuit, remaining operational/financial/reporting and client/crew acceptance, Expo iOS/Android implementation and physical-device validation remain part of the approved master plan. Authentic customer proof and serviceability claims require actual evidence and permission. No separate Portfolio, public customer accounts, payments or membership features are added to the public CMS scope.

Source and release detail: [dashboard deployment](dashboard/DEPLOYMENT.md), [prospect context](dashboard/PROSPECT_CONTEXT.md), [commercial initiative](initiatives/commercial-industrial-sales.md), [task register](TASKS.md). Completed reviewed commits are pushed; uncommitted identity, native and agreement UI/contract work is preserved and is not deployed implicitly. The independently reviewed, unmounted agreement backend is committed as `d42d926`; migration0012 remains undeployed.

## Reviewed continuation — September 7

- Upload fix `d677df5`: independent frozen-source run passed all seven Express/Sharp/PostgreSQL tests without skips and migrations0001–0011 replay. Oversize returns413; stable retries preserve identity; changed actor/property/work/classification/content returns409, including a forced concurrent insert race. Real storage verification against this new revision remains a release gate.
- Public form fix `03ba5b8`: named error-summary targets, five independently rerun tests passed. Author browser evidence covers390px keyboard targeting and retained values. This revision is committed/pushed, not deployed.
- Staging context panel on deployment `2b8a37ed-725d-4597-b27f-137d823e4213` now has actual UI save, preserved unsaved follow-up text and server readback evidence, with no JavaScript errors. Synthetic mutation history was retained; fixture sessions were removed and actors deactivated.
- Actual unsaved iframe previews passed for commercial, service, location and article pages. Anonymous checks covered35 routes with no private markers; no Save/Publish occurred. This supersedes the earlier commercial visual-preview gap, but is not exhaustive manual preview or screen-reader acceptance.
- Production commercial signing configuration is readback-verified with deployment skipped; activation and production end-to-end delivery remain pending.
- Native Android debug compilation succeeded; emulator/runtime, iOS binary and physical-device acceptance remain outstanding. Native work is not yet independently accepted or released.

## Production dashboard promotion authorized

Exact source `bc7d3a6b80b25cd1b60c00bc6aed9387f3ca02ed` passed staging deployment `65d4cfd0-0226-4c59-b035-13417632006b` and23 live image/access checks, including unsigned S3 denial, changed retry metadata409 and oversized image413. Root verified all198 source-file hashes against manifestSHA256 `c51f59823019e0c7e747520900976f0e19e3fd4404ab277841594f528ab14c40`; unfinished0012 is absent.

Production dashboard database volume instance `93dda803-1db8-4dad-9f19-c909b4765e69` was verified against production environment and database service. Backup `799a7253-70be-4d98-ab8a-62d1861d26cb`, named `p1-before-reviewed-bc7d3a6`, was created and listed at2026-09-07T09:53:12.265Z. This is a recovery checkpoint, not a restored Railway snapshot claim.

The Orchestrator authorized web then worker promotion. Production webf9572277 and worker3e979b6e reached SUCCESS with runtime source/migration/access checks. Once0011 prospects exist, rollback must retain operational-property guards and commercial privacy. Shared-login changes remain excluded; Core sender activation and production cross-service receipt verification follow receiver acceptance.

## September 7 — reviewed implementation integration

- Service-agreement backend `d42d926` passed four domain tests, a real-auth HTTP test and migration apply/replay in disposable databases. Independent review verified all 15 file hashes, cancellation charge visibility and replacement double-charge prevention. UI/contracts, router integration, restore rehearsal and staging acceptance remain open; no provider posting or production0012 rollout is implied.
- Native candidate passes 48 policy/storage/sync tests and TypeScript, with Android emulator storage/network evidence. The reviewed logout-cleanup and revoked-session race regressions are fixed: protected views detach before fallible cleanup, late credentials cannot restore access, and forced revocation remains locked. The real Better Auth protocol harness also passed against a disposable synthetic database. Physical devices, iOS build and operational pilot remain open.

## September 7 — staging publication gap found

Exact Core staging deployment `155bea13-4d3f-44ae-ab8d-59e3862ab9df` at `1869384` is SUCCESS. Root verified all 904 packaged source hashes and the archive; runtime reports the exact revision and UID1000. Readiness/admin responses and unchanged public HTML establish the scoped TLS release checks, not full CMS publication acceptance.

Authenticated CMS inspection found 36 registered route/component pairs: eight published and 28 never published (27 pages plus global site chrome). These components are editable and carry manifest defaults, but their public CMS endpoint returns404 and the public gateway renders default content at revision0. Existing website rendering remains available; complete published-content import is still unfinished. The Core task is enumerating exact default hashes and preparing guarded initial publication of only untouched revision0 components, preserving every existing edit and published revision. No publication mutation has been made for this new finding.

## September 7 — initial staging CMS publication completed

The guarded import initialized all 28 untouched components with retained CMS draft/publish APIs at revision2 after backup. The eight prior publications retained their exact revisions and content. Agent verification checked36 public content endpoints,35 crawler pages unchanged apart from hydration state, and35 sitemap dates matching publication timestamps. Root inspected the verifier and receipt report; an immediate independent rerun hit429 on its first read and stopped without changing rate limits. Evidence and recovery boundaries are in `p1-core-staging-1869384.md`. Production CMS initialization remains separate.

Native implementation `f12f752` additionally passed bundled Android emulator process-death/offline access checks with real encrypted storage and synthetic identity responses. Exact note/photo bytes and second-account data survived; expired and known-revoked sessions remained locked after restart. Root verified the APK hash and before/after stored rows. Follow-on checklist recovery, bounded multi-batch sync, recoverable-photo continuation, visible outbox and request-timeout regressions are now covered by the current 48-test suite. Physical/iOS/provider/device pilot acceptance remains open.
