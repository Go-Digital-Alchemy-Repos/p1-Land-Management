# Orchestrator Client Migration Review — September 3, 2026

## Review Disposition

The Client Migration Master Plan is coherent and execution-ready as a planning baseline. Its governing
architecture is one Core Platform dashboard/API, one client, one dedicated PostgreSQL database, and one
separately built React public site per client deployment. Better Farms is the first pilot. Shared-runtime
multi-tenancy, a Neon migration, and a Next.js rewrite are outside the active program.

This review authorizes no client import, product implementation, deployment, DNS change, provider
configuration, or infrastructure mutation. Those actions remain behind the plan's approval and release
gates.

## Evidence Reviewed

| Surface                 | Verified revision and evidence                                                                | Disposition                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Core Platform           | `e2ba048`; migration/session hardening already on `origin/main`                               | Preserve as implementation baseline                                |
| Better Farms Foundation | clean `main` at `6dd6335`; `npm run check` and `npm run build` passed                         | Reconfirm at pilot kickoff                                         |
| Woo catalog prototype   | `codex/woocommerce-migration-toolkit` at `325188d`; 6 scoped tests and type check passed      | Preserve; do not merge yet                                         |
| Woo rehearsal prototype | `codex/woocommerce-migration-toolkit-4bfb` at `ffd11a6`; 7 scoped tests and type check passed | Preserve; do not merge yet                                         |
| Deployment draft        | preflight, `CLIENT_STACK_ID`, backup provenance, and runbooks in the reviewed working tree    | Suitable as non-deployed scaffolding with the URL limitation below |

The Woo branches implement different contracts. `325188d` is limited to categories and simple physical
products and writes through a direct Core database adapter. `ffd11a6` models products, customers, and
orders behind repository ports with cursors and rollback semantics, but has no durable adapter. Neither
implements the approved mapping-run schema, full audit/quarantine lifecycle, or production rollback gate.
They must be reconciled contract-first; combining files from both branches would produce overlapping
types, scripts, and incompatible behavior.

## Milestone Order

The plan's order is accepted with these dependency rules:

1. Milestone 0 establishes named repositories/revisions, pilot scope, approvers, exclusions, success
   measures, and stop/rollback conditions.
2. Milestone 1 freezes the manifest, topology/origin, route/data ownership, Puck, module, theme, and Woo
   import contracts.
3. Better Farms design extraction and non-deployed operations scaffolding may proceed in parallel only
   after their Milestone 1 contract surfaces are stable.
4. Module templates, the durable Woo adapter, and ecommerce transaction hardening may proceed in separate
   write surfaces after their shared contracts are approved. Import rehearsal may not touch client data
   until the target schema and rollback design are accepted.
5. Independent verification follows integration. Launch requires explicit Project Owner authorization.

Milestone 5 need not wait for a completed import adapter; ecommerce correctness can run in parallel after
the order/payment/inventory contracts are frozen. Both Milestones 4 and 5 must pass before the integrated
pilot gate.

## Remaining Decisions and Blocking Effect

| Decision                                                                                                                                | Owner                                                        | Blocks                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| Better Farms enabled modules, Woo history scope, exclusions, success metrics, and rollback triggers                                     | Project Owner with Better Farms business/technical approvers | Detailed adapter work and pilot acceptance                      |
| Exact Better Farms domains, apex/`www` policy, DNS/hosting providers, and manual DNS operator                                           | Project Owner                                                | Domain instructions, verification, and launch                   |
| Cookie/CORS behavior, email/admin/public link ownership, CSP, webhooks, and preview authentication for the approved two-origin topology | Project Owner and Workstream A reviewer                      | Site bridge and deployable preflight                            |
| Puck publish model: runtime content fetch, static rebuild, or reviewed hybrid                                                           | Project Owner and Workstreams A–C                            | Puck registry, cache/fallback behavior, publishing and rollback |
| Accepted Woo prototype capabilities and source-of-truth/update policy for imported records                                              | Project Orchestrator after Workstream A proposal             | Mapping schema and durable adapter                              |
| Customer/order history retention, account linking, privacy basis, and historical notification/payment suppression                       | Project Owner, privacy owner, finance/support                | Any customer or order import                                    |
| RPO/RTO, provider accounts, monitoring responders, release approvers, and DNS authority                                                 | Project Owner                                                | Provisioning and launch                                         |

The target topology is resolved: the public site owns the normal domain, the dashboard uses a protected
admin subdomain, and browser API calls use same-origin `/api` routing. The existing `APP_URL` is still used
for origin validation and a mixture of public, administrative, and email links. The preserved preflight
validates that current variable and `TRUSTED_ORIGINS`; it does not implement the required configuration
split. Do not interpret a passing preflight as proof that login, preview, publishing, or generated links
work across the two origins.

## First Bounded Execution Tasks

These tasks can begin only after the Project Owner authorizes the first execution wave. Each task has a
single write surface and must report the validation it actually ran.

### CM-001 — Better Farms Pilot Baseline and Intake

- **Owner:** discovery/documentation specialist.
- **Writes:** `docs/pilots/better-farms/` only.
- **Reads:** Better Farms and Core Platform repositories; Woo branch runbooks.
- **Objective:** record immutable revisions, route/page/component/asset/form/API/SEO inventory, WordPress
  and Woo versions/plugins/data volumes, required modules, owners, exclusions, RPO/RTO, and launch gates.
- **Must not:** modify either application, access production customer exports, or create infrastructure.
- **Acceptance:** evidence is dated; unknowns have owners; sensitive values are omitted; pilot scope and
  rollback triggers are ready for owner sign-off.

### CM-002 — Client Manifest Schema and Compatibility Gate

- **Owner:** Workstream A contracts specialist.
- **Writes:** a new isolated contract module and fixtures plus its decision record; exact paths chosen at
  kickoff to avoid active-task overlap.
- **Objective:** define the secret-free versioned manifest, JSON Schema or Zod validation, compatibility
  policy, sample Better Farms fixture, and fail-closed CLI.
- **Must not:** change the database, public APIs, runtime routing, Puck implementation, or client code.
- **Acceptance:** unknown breaking versions and secret-shaped fields fail; the fixture expresses Better
  Farms without client conditionals; type, schema, and CLI tests pass.

### CM-003 — Domain, Route, Data, and Publish Ownership Contract

- **Owner:** Workstream A integration specialist with Workstreams B/C as reviewers.
- **Writes:** contract/ADR documentation and fixtures only until the Project Orchestrator approves runtime
  changes.
- **Objective:** freeze the approved public-domain/admin-subdomain topology, named runtime configuration
  roles, same-origin `/api` behavior, browser credentials, CORS/CSRF, cookies, link generation, webhooks,
  preview auth, route collision rules, content ownership, Puck publish behavior, cache invalidation, and
  rollback.
- **Acceptance:** every public/admin/module route and data source has one owner; authentication and preview
  work for the chosen topology; no unresolved collision remains.

### CM-004 — Woo Import Contract Reconciliation

- **Owner:** Workstream A migration-contract specialist; independent reviewer required.
- **Writes:** proposal, fixtures, and contract tests only; neither prototype branch is modified or merged.
- **Objective:** compare `325188d` and `ffd11a6`, select reusable parsing/mapping behavior, define entity
  scope, source authority versus merchant edits, external IDs, mapping/run/checkpoint/audit/quarantine
  lifecycle, money/time/status rules, and rollback.
- **Acceptance:** one contract covers retries and delta imports; every unsupported field has a disposition;
  customer/order data remains blocked unless approved; the Project Orchestrator accepts the proposal
  before durable implementation.

### CM-005 — Deployment Preflight and Backup Provenance Completion

- **Owner:** Workstream G operations specialist.
- **Dependencies:** CM-002 identity and CM-003 topology decisions.
- **Writes:** `server/config/client-stack*`, deployment validation script, backup provenance/restore guard,
  related runbooks and tests.
- **Objective:** finalize the preserved draft, distinguish public and Core Platform origins, add a tested
  restore identity mismatch policy with legacy-backup handling, and produce a release manifest.
- **Must not:** provision Railway, change live variables, restore data, deploy, or rotate secrets.
- **Acceptance:** fixtures pass, unsafe/mismatched configurations fail without printing secrets, legacy
  backup behavior is explicit, and all repository quality gates pass.

### CM-006 — Manual Domain Setup Wizard

- **Owner:** Workstream G operations specialist after CM-002/CM-003 contract review.
- **Writes:** a new isolated domain-onboarding module, fixtures, tests, and runbook updates chosen at
  kickoff; no admin UI in the first implementation task.
- **Objective:** accept public/admin domain inputs, produce an exact provider-neutral DNS record plan and
  manual instructions, and perform read-only ownership, DNS propagation, certificate, routing, `/api`,
  redirect, and health verification. Preserve workflow evidence and operator-recorded prior values.
- **Must not:** request or store registrar/DNS-provider credentials, call provider write APIs, change live
  DNS, provision infrastructure, or perform cutover.
- **Acceptance:** fixtures produce deterministic instructions; verification retries are read-only and
  distinguish pending propagation from invalid configuration; cutover remains blocked until every gate
  passes; rollback instructions restore recorded values without affecting unrelated records.

## Work That Can Safely Start After Authorization

CM-001 can start immediately as read-heavy evidence capture. CM-002 and CM-003 can start concurrently
after exact file ownership is assigned because they produce separate contract artifacts but require a
joint review before freeze. CM-004 can analyze both Woo branches in parallel with those tasks but cannot
approve or implement a durable adapter until CM-002/CM-003 establish identity, data ownership, and route
contracts. CM-005 should retain the reviewed draft and wait for the origin and manifest decisions before
being declared deployment-ready. CM-006 begins only after those contracts are reviewed and is not part of
the first CM-002 implementation milestone.

No real import, client-data access, production deployment, Railway provisioning, DNS change, database
migration, or Stripe/email/R2 configuration is safe to begin under planning authorization alone.
