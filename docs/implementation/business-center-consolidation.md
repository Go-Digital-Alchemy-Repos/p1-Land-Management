# Business Center consolidation implementation evidence

Status: in progress. This is not a release candidate and must not be deployed as a completed consolidation.

## Branch and source preservation

Implementation worktree: `p1-business-center-consolidation`, branch `codex/business-center-consolidation`, based on published `origin/main` at `2848855`. The original shared checkout and its content-overhaul changes remain untouched. Blythe is read-only reference material; no Blythe change is included.

The reporting implementation from `codex/admin-google-analytics` was integrated through four clean cherry-picks: `3a7c875`, `5105e17`, `c0c0737`, `0d4a7d1`. This preserves the reporting code, not a claim that Google credentials are connected or that the new destinations exist yet.

## Implemented foundation

- Shared explicit leaf capability catalogue for Workspace, Customers, Operations, Revenue, Marketing Content/Design/Reporting, and business Settings. Group selection expands into current leaves. Owner alone receives automatic known-tool access.
- Additive migration `0028_business_access.sql`; reviewed grants, profile names, optimistic version, notification subscriptions, invitation grants/revocation, and plain `member` role. Existing staff receive no automatic grants. Legacy role suggestions are review-only.
- Owner-only User Manager APIs and UI: account search, invite/resend/revoke, names, suspension, grouped permissions, MFA policy controls, session revocation and audit history. Stale edits preserve the draft and explicit reload fetches fresh server values.
- Access updates atomically version grants, audit, and invalidate sessions. Owner access cannot be edited or suspended through this manager. Client invitations retain separate client-access boundaries.
- `/me` returns capabilities. Dashboard navigation now uses explicit office grants, with profile fallback for ungranted accounts. Existing client and assigned crew portal routes remain distinct.
- Sales API follow-through: legacy leads/estimates, current estimate creation/document/recipient/send paths and commercial inbox require explicit Sales or the applicable financial read grant. Template selection and maintenance are separate. Commercial owner assignment checks active Sales grants rather than legacy titles. Direct HTTP tests prove denial for ungranted Manager/report-only accounts and access for explicitly granted members.
- Initial service migration: sales revision/conversion, commercial assessment/prospect context, agreement management/read/activation preview, billing charge review and queue require explicit grants. Billing reads remain separated from general agreement details.
- OpenAPI and generated client cover the new identity field and User Manager endpoints. Codegen now preserves its handwritten index and legacy estimate adapter.

## Validation to date

- `pnpm run typecheck:libs`: passed.
- API and dashboard typechecks passed after actor typing and generated-client integration fixes.
- `node scripts/test-dashboard.mjs`: 47/47 passed, plus migration replay, using disposable PostgreSQL and synthetic records.
- `node scripts/test-service-agreements.mjs`: lifecycle/charge/schema/review tests, worker preparation test and real HTTP test passed; no live providers.
- Dashboard production build: passed; existing large MapLibre chunk warning remains.
- Dashboard navigation tests: 3/3 passed after explicit-grant navigation change.
- User Manager browser regression passed in headless Chrome: stale draft retention, fresh reload/version, isolated Analytics grant, invitation submission, and mobile dialog containment.

The baseline property-workspace test omitted nullable structured-address and property-type fields already returned by the baseline API. Its expectation was aligned with the verified response; production behavior was not changed to satisfy that assertion.

## Required remaining work

1. Complete the API capability matrix and migrate all remaining legacy role gates, including projections, shared lookups, assignment choices, notifications and exports. Initial domain changes and navigation are not full enforcement. Replace broad frontend role-based preloading/action conditions. Preserve crew/client record scope and offline queues.
2. Complete User Manager recovery and Core form-notification selection, existing-account linkage, history/pagination and migration reconciliation. Review crew grants versus scoped field workflow before cutover.
3. Complete module-by-module visual/accessibility verification of the adopted Core admin theme, including the remaining Marketing and template screens. Shared light/dark/system styling and sampled browser verification are implemented.
4. Mount the retained CMS route modules under Marketing and build the allowlisted, user-scoped Core boundary. Separate Google Analytics and Search Console grants on all legacy and new server routes. Preserve original media/publishing/intake behavior.
5. Merge CRM notes/tasks/history and client identity through explicit source mappings, repeatable import/reconciliation, and explicit Won onboarding.
6. Implement reusable MSA/scope/cost/package templates, immutable published versions and client composition integrated into existing estimate/approval/activation workflows. Preserve legal-content and billing constraints in the accepted plan.
7. Feature inventory/parity verification, restore rehearsal, redirects/retirement tooling, production builds and final release review. No legacy removal or production cutover has occurred.

Canonical scope: `docs/proposals/p1-business-center-consolidation.md`. The active goal remains the full implementation, not just this foundation.

## Next integration notes

The reporting authority contract and separate source grants are implemented (see checkpoints below). The CMS migration is now extending that user-scoped boundary. Other Core areas still use legacy local admin/editor gates and must be migrated before retirement; local administrators must never implicitly become canonical Owners.

The web app now loads datasets from leaf grants and uses a typed `/workspace/references` endpoint for minimized selection fields. Grants are checked independently for record workspace tabs and source sections. The main client, property, schedule, recurring, project, inspection, sales and billing action controls use capabilities; agreement selectors no longer fetch full Properties records. Failed or obsolete refreshes cannot repopulate business datasets after an identity/grant change.

## Customer and operations enforcement checkpoint

- Customer/contact/property/type reads and writes require the corresponding Customers grant. Nested client/property sections query only permitted source areas; general workspace activity is Owner-only. Request attachments are excluded from generic property file listings and remain available through their own authorized tool.
- Schedule, recurring programs, project phases, inspections, expenses, billing and QuickBooks financial actions use explicit capabilities. Integration credential configuration remains Owner-only. Requests-to-work conversion requires both Requests and Schedule. Project phase billing intents require Billing.
- My Day-only ordinary members receive assignment-scoped work reads and field submission access. Office completion review requires Schedule, including inside the transition policy itself. Existing client publication and crew assignment boundaries remain.
- Workflow notification recipients are selected by tool grants; global manual delivery administration is Owner-only. Historical notification access and delivery-time revocation for already queued messages still need follow-through.
- Disposable database suite passed 47 tests plus migration replay. Added direct unauthorized HTTP checks across Customers, Operations, Revenue and minimal references, minimized record-section assertions, and My Day member assignment checks. After removing the final string-role completion-review fallback, its targeted policy suite passed 5 tests. API/dashboard typechecks and agreement lifecycle/preparation/HTTP tests passed. No live providers used.

Remaining access follow-through includes server-side assignee eligibility on every write path, notification history/delivery revocation, agreement-only editing versus billing projections, isolated-tool browser scenarios and the Core federation authority contract. Do not treat these checkpoints as complete system authorization coverage.

## Unified admin appearance checkpoint

The dashboard now uses the Core admin light/dark tokens from `platform/p1-core/client/src/index.css` through dashboard-owned `theme.css`. Earthtone feature styles use semantic surfaces, text, borders, actions and status colors. Decorative page illustrations are no longer mounted. Core/public branding files are unchanged. The light muted-text token is slightly darker than Core's source to meet 4.5:1 on the admin canvas.

The header exposes Light/Dark/System for every signed-in workspace user, independently of business-settings permission. Selection is device-local under `p1-business-center-theme`; system changes and cross-tab storage changes are observed. A same-origin pre-render initializer prevents the wrong initial mode, and the offline shell caches that initializer. Storage failure retains a working in-session preference. App manifest colors and QR-code contrast were aligned. Ordinary modal layering now clears the mobile header.

Validation: dashboard typecheck and production build passed (existing MapLibre chunk warning). `scripts/test-dashboard-theme-browser.cjs` passed in Chrome against mocked synthetic client data: light/dark/system, reload persistence, OS changes, key text/action contrast in both modes, absence of decorative backgrounds, client editing dialog, mobile containment and title hit testing. Light desktop, dark dialog and mobile screenshots were visually inspected. Existing User Manager conflict/invite/mobile browser regression passed with the new shared theme loaded.

This proves the shared theme and sampled workflows; final visual acceptance still requires the remaining Marketing/report/template screens and the broader module-by-module parity pass. Production remains unchanged.

## Marketing reporting authority and transport checkpoint

Federation introspection now negotiates `include_capabilities: true`; older callers receive the original strict DTO unchanged. Core accepts the plain `member` role and receives current leaf grants on every introspection. Authenticated requests retain that verified canonical identity separately from the linked local Core user. Local admin/editor or CRM permission alone cannot authorize reporting. Analytics and realtime require `marketing.analytics.view`; Search Console requires `marketing.search-console.view`, including the legacy report APIs.

Dashboard reporting reads now have three fixed `/api/v1/marketing/reporting/` operations: `analytics`, `realtime`, and `search-console`. They authorize the caller, create a 60-second user/session-bound grant, call the fixed Core reporting ingress, and delete the grant afterward. Core introspects the grant and enforces current canonical permissions plus the existing linked Core account's active/revoked status. No shared admin browser session or unrestricted proxy is used. The existing provider services still own queries, caches and Google credentials. Report responses are bounded and private/no-store; arbitrary upstream errors/headers are not forwarded. OpenAPI and generated report DTOs/client functions are included.

Release ordering: deploy the additive dashboard introspection extension before the upgraded Core consumer (the old dashboard rejects the new request field). Provision a separate random base64url service key in dashboard `CORE_MARKETING_SERVICE_KEY` and Core `DASHBOARD_MARKETING_SERVICE_KEY`; configure dashboard `CORE_MARKETING_ORIGIN` as the exact HTTPS Core origin, with no path/query/credentials. Existing federation confidential-client configuration and explicit identity links are also required. No keys were created, exposed, or configured by this change. Private Core service ingress is mounted after the API rate limiter and before browser Origin checks; it rejects Cookie, Origin and Fetch Metadata headers and authenticates the service key before any identity/provider call. Ordinary browser routes retain their Origin checks.

Focused Core tests exercise the actual permission middleware, independent sources, malformed/browser-shaped ingress and suspension; the disposable Core federation integration exercises linked accounts and immediate reporting grant changes/revocation. The dashboard suite includes minimized request construction, bounded/sanitized responses and direct unauthorized report reads. This checkpoint does not yet mount the reporting UI under Marketing or claim a live Google connection. Full CMS migration and reporting browser parity remain required.

Owner instruction retained: push the finished, validated branch to GitHub when the full goal is complete. No interim push or production cutover is authorized by this checkpoint.

Reporting checkpoint validation: dashboard suite 50/50 plus migration replay; Core route/auth suite 19/19; disposable Core federation suite 15/15; Core, API and dashboard typechecks passed. A pure transport test initially imported the authenticated router and caused asynchronous BetterAuth initialization to outlive the test's pool cleanup; transport/configuration were separated from route/authentication dependencies, and the standalone transport tests now pass without opening a database or triggering that warning. The generated client reflects source-specific report shapes and sanitized unavailable responses. The transport currently rejects report bodies above 8 MiB rather than silently truncating them; include large-report parity in final reporting validation.

## Marketing reporting screens checkpoint

Marketing is now a navigation group immediately above Settings. `/marketing/reporting/analytics` and `/marketing/reporting/search-console` are independently permissioned, lazy-loaded report screens using the generated dashboard reporting client. Search Console-only navigation never loads Analytics/realtime, and Analytics-only navigation never loads Search Console. Changing user/grants/source remounts the workspace; requests are aborted on navigation/range changes and failed historical refreshes clear previous report data.

The adaptation retains overview KPIs/prior-period comparisons, daily trends and metric selection, channels/source/campaigns, pages/landing pages, geography/devices/browsers, events, and realtime totals/countries/devices. Device breakdowns retain donut presentation for count metrics. Search Console includes finalized Web totals, daily trends, queries/pages/countries/devices, prior comparisons, and Pacific-day presets. Both include date presets/custom dates, refresh, loaded-row search/sort/pagination, formula-safe filtered CSV export, source identity/freshness and sampling/threshold/truncation disclosures. Missing daily values remain gaps and missing metrics show unavailable rather than invented zero. External provider links use the returned property identity. No public tracking was added.

Reused the existing project chart library version (Recharts 2.15.4) and adapted the prior report formatting functions. Reporting is a separate lazy bundle; it does not expand startup with chart code. Mobile chart-tooltip overflow found in browser testing was confined to the chart surface. The newer major Recharts version was not introduced as part of this migration; package tooling flags the existing v2 series deprecated, which remains a future dependency-maintenance consideration.

Browser verification uses synthetic intercepted API responses only: source isolation, table pagination/search, formula-safe downloaded CSV contents, independent realtime failure, historical-source failure clearing stale rows, revoked grants, dark mode and mobile containment. Screenshots were visually inspected. This is frontend/reporting implementation evidence, not proof of a live Google connection. CMS Content/Design/Website System still require their destination modules and allowlisted operations; this checkpoint does not retire `/admin/`.

Final screen checkpoint validation: dashboard suite 53/53 plus migration replay, dashboard typecheck, production build and reporting browser regression passed. The existing MapLibre bundle-size warning remains. The revocation browser assertion was corrected to await the established Profile redirect rather than the transient unavailable heading; it confirms no reporting request occurs after revoked grants are loaded. No production or GitHub push occurred.

## Retained CMS API checkpoint

Added explicit dashboard `/api/v1/marketing/cms` method/path operations for Pages (including publishing, scheduling, duplication, revisions, preview-link and relationship actions), Sections, Galleries, Menus, Sidebars, SEO/robots/redirects/audit, and Team. The operation registry in `artifacts/api-server/src/dashboard/marketing-cms.transport.ts` is the current transport contract. Record identifiers are single segments; only the original gallery search/status/sort and page force parameters are accepted. Core remains the only owner of CMS records and mutation validation. No CMS database copy or alternate publishing engine was introduced.

Each request checks canonical dashboard grants and forwards a short-lived user/session grant to the fixed Core `/api/integrations/business-center/cms` service ingress. Core independently resolves current identity, suspension and grants, then invokes the existing route handlers. The service key authenticates the dashboard process only; it cannot confer user permissions. Ordinary browser cookies, Origin and Fetch Metadata headers are rejected at ingress. Both reporting and CMS share that service authentication implementation. Request/response bodies are bounded at 8 MiB, redirects and automatic mutation retries are disabled, and upstream cookies/headers/internal failures are not exposed. Domain validation and conflict payloads are retained.

The retained CMS routes now require their exact Marketing leaf grants even through `/api/admin/cms`. Media routes likewise require Media access instead of accepting blanket Content/Design/CRM. SEO governs redirects, robots and the existing summarized cross-content audit. Public published reads are unchanged; authenticated draft preview now also requires Pages and its existing preview token. Page title/slug changes still synchronize derived menu links. Explicit removal of linked navigation items requires both Pages and Menus. Cross-tool picker references must be implemented deliberately as the editors move, rather than weakening the maintenance grants.

This checkpoint does not mount CMS editors in the dashboard. Multipart/binary Media transport, Website/Blog/Forms/Events/Careers, Design, Owner-only Website System, editor locks, minimized selector references, typed frontend clients, comprehensive OpenAPI and editor parity remain required. The initial capability list omitted the feature-gated Events/Careers areas; include them in the remaining inventory so disabled tools are preserved without enabling them in production. No legacy UI retirement or live CMS mutation has occurred.

Validation: dashboard suite 56/56 plus disposable migration replay, 26 focused Core route/upload tests, API and Core typechecks, and dashboard API production bundle passed. Tests invoke retained handlers over HTTP with synthetic storage and fresh identity fixtures, cover every exposed method/path denial on both surfaces, independent tool reads, page publication identity, linked-menu removal, revoked/suspended/crew/client/unattested Owner access, draft preview gating, transport path/query/body limits and existing upload protections. Production provider/storage operations were not invoked. Complete CMS editor browser parity and live release rehearsal remain outstanding.
