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
3. Adopt Core admin theme throughout the business dashboard with independent light/dark/system preference, responsive and accessibility verification.
4. Mount the retained CMS route modules under Marketing and build the allowlisted, user-scoped Core boundary. Separate Google Analytics and Search Console grants on all legacy and new server routes. Preserve original media/publishing/intake behavior.
5. Merge CRM notes/tasks/history and client identity through explicit source mappings, repeatable import/reconciliation, and explicit Won onboarding.
6. Implement reusable MSA/scope/cost/package templates, immutable published versions and client composition integrated into existing estimate/approval/activation workflows. Preserve legal-content and billing constraints in the accepted plan.
7. Feature inventory/parity verification, restore rehearsal, redirects/retirement tooling, production builds and final release review. No legacy removal or production cutover has occurred.

Canonical scope: `docs/proposals/p1-business-center-consolidation.md`. The active goal remains the full implementation, not just this foundation.

## Next integration notes

Core reporting still has a blanket `crm` route gate and must be split. Core middleware currently gives local `admin` users blanket access, and its federation-client role enum lacks `member`. Complete the user-scoped dashboard-to-Core authority contract before changing those gates; do not merely add local reporting permissions and treat local administrators as Owners. Core's reporting services and chart code remain available to reuse.

The web app now loads datasets from leaf grants and uses a typed `/workspace/references` endpoint for minimized selection fields. Grants are checked independently for record workspace tabs and source sections. The main client, property, schedule, recurring, project, inspection, sales and billing action controls use capabilities; agreement selectors no longer fetch full Properties records. Failed or obsolete refreshes cannot repopulate business datasets after an identity/grant change.

## Customer and operations enforcement checkpoint

- Customer/contact/property/type reads and writes require the corresponding Customers grant. Nested client/property sections query only permitted source areas; general workspace activity is Owner-only. Request attachments are excluded from generic property file listings and remain available through their own authorized tool.
- Schedule, recurring programs, project phases, inspections, expenses, billing and QuickBooks financial actions use explicit capabilities. Integration credential configuration remains Owner-only. Requests-to-work conversion requires both Requests and Schedule. Project phase billing intents require Billing.
- My Day-only ordinary members receive assignment-scoped work reads and field submission access. Office completion review requires Schedule, including inside the transition policy itself. Existing client publication and crew assignment boundaries remain.
- Workflow notification recipients are selected by tool grants; global manual delivery administration is Owner-only. Historical notification access and delivery-time revocation for already queued messages still need follow-through.
- Disposable database suite passed 47 tests plus migration replay. Added direct unauthorized HTTP checks across Customers, Operations, Revenue and minimal references, minimized record-section assertions, and My Day member assignment checks. After removing the final string-role completion-review fallback, its targeted policy suite passed 5 tests. API/dashboard typechecks and agreement lifecycle/preparation/HTTP tests passed. No live providers used.

Remaining access follow-through includes server-side assignee eligibility on every write path, notification history/delivery revocation, agreement-only editing versus billing projections, isolated-tool browser scenarios and the Core federation authority contract. Do not treat these checkpoints as complete system authorization coverage.
