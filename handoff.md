# Business Center consolidation handoff

Updated September 18, 2026. Read this current-state update before older checkpoint details below.

## September 19 public identity checkpoint

Public identity delivery is released at `4d85894` on main and the consolidation branch. Core, dashboard and website Railway deployments reached SUCCESS; homepage/contact SSR identity revisions match the live projection, and desktop/mobile read-only checks preserve current P1 branding. See `docs/implementation/public-website-identity.md` for exact release evidence and remaining live-edit/cache limits. Native Integrations and Email Templates were released earlier; their contract documents retain the scoped evidence. The full consolidation remains incomplete. Native backup status/run and history correctness are the next active implementation slice; restore, CRM/account reconciliation and crew/offline acceptance remain open.

## September 18 reconciliation and current state

- All completed consolidation code was normally merged to `main`; both `main` and `codex/business-center-consolidation` reached `140a412`. Do not selectively deploy an older public-only main: that previously regressed Dashboard and Core and has been corrected. See `docs/implementation/reconciliation-2026-09-18.md` and `main-release-policy.md` in that directory.
- At `140a412`, Railway reported SUCCESS for website `d431f347-021d-4e8e-9dce-3964ce86ae06`, Dashboard `2196e4ac-0c84-421f-9c54-b8ffdd52e628`, and Core `51843fa2-5821-4072-8d0f-8e65c2a58abd`. Worker remained on its existing compatible deployment. These supersede the September 17 deployment table below.
- Analytics now returns real Google provider data in the consolidated authenticated dashboard. The failure was a valid empty previous-period report being rejected for missing headers; the normalizer and regression coverage were corrected in `8cd8ae1`. Do not provision replacement OAuth credentials.
- Search Console remains open: configured domain property `sc-domain:p1landmanagement.com` returned 403; the authorized property list exposed only `https://p1landmanagement.com/`. Canonical `www`/domain coverage must be verified before switching settings or claiming completion.
- The Service Areas map, sidebar, public improvements and Title Case links are live. The directory now begins with a full-width map; desktop and mobile were visually checked after `140a412` deployment.
- The private September 17 dashboard backup is available on this workstation and an isolated restore/migration/second-restore rehearsal has now passed. See `docs/implementation/dashboard-restore-rehearsal-2026-09-18.md` for scope and limits. This does not establish complete Core/media recovery, application rollback, CRM/account reconciliation, or admin retirement.

The older stopping-point, reporting-error and deployment sections below are historical context, not current operating instructions. Continue from the acceptance tracker. The full consolidation goal remains active.

## Start here on the next workstation

The consolidation is **partially implemented and incrementally deployed, not complete**. Continue the existing implementation; do not rebuild from the original proposal or treat the deployed screens as proof of complete parity.

Repository: https://github.com/Go-Digital-Alchemy-Repos/p1-Land-Management

Working branch: `codex/business-center-consolidation` (not `main`). For a fresh checkout:

```sh
git clone --branch codex/business-center-consolidation https://github.com/Go-Digital-Alchemy-Repos/p1-Land-Management.git p1-business-center-consolidation
cd p1-business-center-consolidation
git status --short
git log -6 --oneline
```

If using an existing checkout, inspect local changes first; fetch and integrate normally without resets or force pushes. Install from the checked-in lockfiles: the root workspace uses pnpm; Core has its own package setup. Inspect each package's scripts before running checks. Production credentials, database dumps, local dependencies, browser sessions and SSH keys are not transferred by cloning GitHub.

Read, in order:

1. `AGENTS.md` and any applicable nested instructions, especially `platform/p1-core/AGENTS.md`.
2. `docs/implementation/consolidation-acceptance.md` — authoritative current acceptance gaps.
3. `docs/implementation/consolidation-release-2026-09-17.md` — deployments, backup and live verification evidence. Later sections supersede earlier account-link-pending observations.
4. `docs/proposals/p1-business-center-consolidation.md` — approved scope.
5. `docs/implementation/business-center-consolidation.md` — chronological implementation and test history, not a current backlog.

Suggested continuation prompt:

> Read handoff.md and the linked acceptance tracker. Continue the approved Business Center consolidation on codex/business-center-consolidation. Verify current repository and deployment state, diagnose the remaining Google reporting configuration issue, then complete the outstanding feature and migration acceptance work. Preserve existing data, access controls and unrelated work; commit and push validated task changes. Do not mark the full goal complete until the acceptance gaps are closed.

## Owner requirements and authorization

- Consolidate website `/admin/` into the business dashboard, eventually retiring the separate admin without losing features or data.
- Marketing immediately above Settings contains Content, Design, Website System and Reporting. Website settings stay separate from business settings.
- CRM belongs in Revenue/Customers and must retain records and operational workflow.
- Adopt the richer admin-style User Manager: only Owner has automatic full access; other team members have explicitly selected dashboard/website capabilities enforced server-side.
- Adopt admin-style themes in place of the former earthtone dashboard UI.
- Bring Analytics and Search Console reports into Marketing, preserving their controls and real provider behavior.
- Reusable MSA, Scope, Cost and Package templates must compose into the existing sales/agreement workflow. Blythe is a read-only feature reference, not a project to modify or directly copy.
- The Owner explicitly requested implementation, GitHub pushes, and deployment of completed work followed by continued implementation. Ordinary task commits/pushes do not require another confirmation. Do not treat this as authorization for destructive data operations or unrelated changes.
- Preserve GitHub Actions' disabled state. Use normal pushes, not history rewriting. Do not send emails or other external communications without explicit authorization.
- The original checkout and Blythe were left untouched. Continue in the task checkout/worktree.

The previous session's goal tool had a stale paused state/older deployment wording; the Owner subsequently explicitly resumed work and authorized incremental deployment. The full goal has not been achieved. Reconcile any new session goal state with the actual Owner instructions rather than claiming completion.

## Exact stopping point: account link succeeded

The Owner finished the explicit CMS credential-proof and Dashboard identity confirmation flow. Verification after their final “done” established:

- A read-only production Core query returned **one active identity link**.
- The authenticated Marketing Website Editor loaded existing website routes and shared content.
- Analytics and Search Console no longer display `Website reporting access is unavailable`.
- Both instead display **`Website reporting is not connected yet.`**, mapped by the transport to `not_configured`.

Do not ask the Owner to link the same account again. Do not claim Google reporting works. The exact missing Google credential/property setting has **not** been established. No content or account permissions were changed during this verification.

Immediate diagnostic sources:

- `artifacts/api-server/src/dashboard/marketing-reporting.transport.ts`
- `platform/p1-core/server/services/google-reporting-auth.ts`
- Related Google reporting routes/services and environment schema (search for `P1_GA_` and `not_configured`).

The current Google auth implementation accepts either `P1_GA_SERVICE_ACCOUNT_JSON` with client email/private key, or all of `P1_GA_CLIENT_ID`, `P1_GA_CLIENT_SECRET`, `P1_GA_REFRESH_TOKEN`. Check configuration presence and property requirements without printing secret values. A not-configured result alone does not prove which setting is absent. Inspect the prior reporting implementation before provisioning replacements or changing provider access.

## Implemented and live, with limits

- Marketing navigation, many native Content/Design screens, Website Editor, appearance controls, User Manager and capability infrastructure.
- Retained Core CMS handlers and data stores behind allowlisted authenticated service transport; this is not yet proof of every legacy operation's parity.
- Native CRM notes/tasks and onboarding work; extraction/import/verification tooling exists, but real CRM migration and reconciliation have not been performed.
- Versioned MSA/Scope/Cost/Package templates; composition and pricing; mounted sales preparation; immutable issuance/documents/PDF/customer approval; revisions/change orders and billing integration. Do not describe these as merely unmounted foundations.
- Live template library had no saved templates. No synthetic legal content was published. Owner-provided standard agreement content remains distinct from test fixtures.
- Dashboard migrations are deployed through `0046_lead_customer_onboarding.sql`, with 50 ledger entries. Thirty preexisting migration files matched production checksums. Historical ledger-only `0019_optional_owner_mfa.sql` was retained, not replayed.
- Production had one active Owner and seven existing disabled fixture accounts at the release check. Do not alter those fixtures casually.

Most recent code fix: `78b893f7f5f936393473d365ea89a867b1d3f90d` recovers an unlinked federation callback to the fixed `/admin/login?federation=link-required` proof form rather than returning raw JSON. It clears temporary flow cookies, retains no-store/no-referrer, never forwards callback secrets or arbitrary return URLs, and preserves other denials and explicit confirmation. No automatic email-based linking was added.

Follow-up evidence commits: `b85a7f3` (recovery deployment), `d0d9c9e` (successful Owner linking/CMS read).

## Remaining work

Use the acceptance tracker for the full matrix. Prioritized outstanding areas:

1. **Live reporting:** diagnose Google configuration, restore real Analytics/Search Console results, verify Search Console property coverage and report/CSV parity; provide appropriate Website System connection management.
2. **Missing Website System features:** Integrations, Email Templates and System Backups still need consolidated equivalents or explicit disposition before admin retirement. Developer Resources and Client Stack Onboarding now have native destinations; retained admin retirement still requires the complete acceptance tracker.
3. **Public identity delivery:** Branding editor exists, but public logo/favicon/company identity still need integration with actual website consumers and published contact content. Consider current image CSP and safe media delivery.
4. **CMS parity:** inventory every legacy operation, nested setting, preview/publication path, shared setting and public consumer. Generic CMS and P1 Website snapshots remain distinct stores/consumers; do not merge them by assumption.
5. **CRM migration:** finish native field/settings/prospect-context gaps, obtain reviewed real source mappings, handle unmatched parents, rehearse import and independent reconciliation, and define source freeze. A raw archive is not native workflow parity.
6. **Access/account migration:** complete endpoint/export/shared-lookup/notification capability coverage, client/crew/offline boundaries, grants, suspension, email verification, MFA/session assurance and existing-account transition rehearsal. One linked Owner is not full account reconciliation.
7. **Agreement acceptance:** complete integrated long-document/multi-client/historical-document tests and real browser journey through crew execution/review, offline behavior, activation and billing, including cancellation/successor/change orders. Prior mixed-billing fixture simulated crew completion and did not exercise external posting.
8. **Retirement/release acceptance:** execute isolated restore/rollback and migration rehearsals, finish redirect/deep-link inventory, verify media/intake/preview/public compatibility, then safely retire `/admin/`. It remains needed today.

Email Templates now has versioned transactional storage, coordinated retained/startup writers, a native Owner-only API and dashboard editor at `/marketing/system/email-templates`. See `docs/implementation/email-template-concurrency.md` for implemented operations and validation. Native library, branded preview, reservation acquisition and unsaved visual-to-HTML editing were verified live at `45e2800`; mobile/full mutation acceptance remains. Website Integrations now has a native Owner UI/API with explicit secret controls, versioned writes and coordinated legacy routes. Authenticated desktop/mobile read-only acceptance passed at `807db42`; active Google configuration management and canonical Search Console coverage remain incomplete. Do not retire retained admin or send test emails as part of unattended validation.

## Deployment state and operations

These were verified SUCCESS during this session; recheck before the next release rather than assuming no concurrent changes.

Railway project: `e83f79dd-d901-4ab1-836b-bdf272b58dc2`.
Production environment: `6126e9ca-b071-4c41-b7c0-aa945fa37067`.

| Surface | Service ID | Latest verified deployment |
| --- | --- | --- |
| Dashboard | `7d129f6d-9f9b-4790-b21c-d8919a0a079c` | `2609669b-c874-4caa-8229-cca765adb1a7` |
| Worker | `171f4abc-c24f-4924-bc06-abf0a75a4c15` | `dc20c68a-d803-49d7-ac95-3922d574f738` |
| Core | `45646c66-c173-4e23-81ab-64ca4d545bbe` | `6660c45f-30da-4c3d-be56-746ff7f6189d` |
| Public website | `72d588fd-c963-4e0f-944b-1cb8c5c2fa19` | `fd94bdd5-6829-40ac-8f06-c82ca10f263b` |

Dashboard/worker application checkpoint: `98c073816cbd97e4627bf066498556e513d61c1a`; public readiness fix: `7e85199`; Core recovery checkpoint: `78b893f7f5f936393473d365ea89a867b1d3f90d`. Latest Git branch head includes later documentation; the services are not all deployed from that head.

Production URLs:

- https://dashboard.p1landmanagement.com
- https://www.p1landmanagement.com (public gateway to Core; valid Marketing origin)

Federation staging environment: `ab648ea4-43a8-4181-bef1-0a40bdf94c3d`; Core service `3676c3a9-dc59-406b-a716-ac8628211ead`; Core recovery deployment `472364f4-657a-43cc-805d-20c5f2bf78f7`.
Staging Core URL: https://p1-core-federation-staging-staging.up.railway.app

Read the installed `use-railway` skill before operations. Railway CLI 5.57.9 worked on the previous workstation; authenticate and verify tools on the new machine. `railway api` worked; the older `railway-api.sh` auth lookup did not. Local SSH used an explicit authorized key rather than the default identity; that key is not in GitHub. Establish authorized access on the new workstation rather than copying private keys into the repository.

Packaging matters:

- Dashboard: existing `scripts/package-dashboard.mjs` allowlist.
- Website: `scripts/package-website.mjs --prebuilt` after required production build/image checks.
- Core: committed `platform/p1-core` archive; configured source root `/platform/p1-core`, Dockerfile `/platform/p1-core/Dockerfile`, readiness `/api/health/ready`. Archive uploads require explicit full-commit `P1_SOURCE_REVISION` because there is no `.git` directory.
- Preserve tested packaging/source-root behavior; do not accidentally deploy `main` via a generic redeploy action. Confirm terminal deployment status and live health/browser behavior.

Federation and Marketing transport secrets are already paired in Railway, outside source. Do not rotate/overwrite them merely to resume work. Dashboard uses `CORE_MARKETING_ORIGIN=https://www.p1landmanagement.com`; Core introspects Dashboard grants. Keep explicit account proof and least privilege.

**`CORE_DASHBOARD_FORM_NOTIFICATIONS_ENABLED` remains unset/false.** Existing notification delivery/recipients are retained until reviewed subscription reconciliation. User Manager preferences alone do not mean canonical delivery is active. Do not toggle this flag casually. Production Core's required two-recipient configuration is already valid; never replace it with staging test addresses.

## Validation evidence and boundaries

Previously recorded checks (not rerun merely to write this document):

- 119 dashboard/database tests and migration replay; 58 focused Core/shared identity tests.
- Shared-library/API/Core/dashboard type checks and builds; Branding browser check.
- A dashboard global client-count assertion initially failed with concurrent fixtures and passed on rerun; that isolation weakness remains recorded.
- Latest recovery change: 12 focused server/client tests, Core `npm run check`, Core `npm run build`; staging and production recovery browser checks passed.
- Live Owner checks: Marketing navigation, User Manager, Appearance, CRM notes/tasks, empty template library, linked Website Editor; reporting explicitly remains not configured.

These are scoped evidence, not a whole-system release certification. Run relevant checks for each new change and final candidate acceptance. Do not run write-oriented tests against production or report simulated crew/provider tests as real acceptance.

## Backups and machine-local state

Production Core snapshot: `24612435-f6ab-4b10-915d-eef76ba1d945`.

Dashboard manual Railway snapshot hit quota, so a private custom-format `pg_dump` was captured and its archive listing checked. On the previous workstation it is at:

`/Users/mikedickerman/.codex/backups/p1-consolidation-20260917/dashboard.dump`

SHA-256: `7d509ebdad328ad5ede44a3baa61e0cce6cf0f6d4c32cbba62976f8941cb9ecc`.

This backup is **not in GitHub and will not appear on a new workstation**. Arrange secure access or a fresh verified backup before any migration requiring it. The private directory also holds release credentials; do not upload that directory or print its contents. A successful archive listing is not a completed restore rehearsal. Keep additive schema during application rollback; no destructive down-migration is authorized by this handoff.

Previous task checkout: `/Users/mikedickerman/Documents/Codex Projects/p1-business-center-consolidation`. Working tree was clean at the start of handoff preparation. No uncommitted implementation needs transfer; no implementation or deployment is running as part of this handoff. Browser sessions and temporary release archives are local conveniences, not prerequisites or portable acceptance evidence.
