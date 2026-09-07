# Core Platform Client Migration Master Plan

## Status and Authority

This is the accepted planning baseline for Core Platform's near-term product direction as of September
3, 2026. It supersedes earlier assumptions that treated multi-tenancy, Neon, or a framework rewrite as
prerequisites for client migrations. Product implementation, client imports, deployment, and
infrastructure changes still require the authorization gates below.

Supporting documents may add operational detail but must not redefine this plan:

- [ADR-005: Repeatable Single-Client Deployments](adr/005-isolated-client-stacks.md)
- [Ecommerce Production Implementation Backlog](ecommerce-implementation-backlog.md)
- [Single-Client Deployment Runbook](runbooks/client-stack-deployment.md)
- [Universal Bolt-On App Contract](master-prompts/bolt-on-apps/00-universal-bolt-on-app-contract.md)

Material changes to deployment, persistent data, public contracts, security, or release strategy require
Project Orchestrator and Project Owner approval.

## Product Direction

Digital Alchemy will migrate WordPress clients incrementally using a repeatable single-client deployment:

- one Core Platform dashboard and API;
- one client and one dedicated PostgreSQL database;
- one separately built static React website;
- one client-specific configuration, secrets, storage, provider, backup, monitoring, and release boundary.

The client's React site remains the public design authority. Core Platform imports or integrates that
site into Puck so editors can manage approved content and compositions. Optional bolt-on modules—such as
ecommerce, CRM, forms, memberships, directory, events, careers, and portfolio—are enabled only when the
client needs them. Their public pages and components must inherit the site’s design tokens, primitives,
layout rules, interaction patterns, and accessibility behavior.

This is not a shared SaaS or multi-tenant deployment. Future multi-tenancy is out of scope. New contracts
should still avoid unnecessary global assumptions and carry explicit instance/site identity where that
improves portability, diagnostics, or migration safety.

## Terminology and Architecture Decision

| Term            | Canonical meaning                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| Client instance | One deployed Core Platform application serving exactly one client                                               |
| Client database | PostgreSQL used only by that client instance                                                                    |
| Client site     | Separately built static React public website connected to the instance                                          |
| Site manifest   | Versioned, non-secret contract for build, routes, assets, tokens, components, integrations, and enabled modules |
| Theme adapter   | Mapping from imported site tokens/primitives to Core Platform and bolt-on semantic roles                        |
| Puck registry   | Approved editable components, schemas, defaults, constraints, and render mappings                               |
| Bolt-on module  | Optional Core Platform business capability enabled through the module registry                                  |
| Client stack    | Operational shorthand for the single-client boundary, not a tenant in a shared system                           |

The public React site and Core Platform may live in separate repositories, but each release records
compatible manifest and contract versions. Public rendering must not depend on arbitrary source code in
the database or allow Puck content to execute untrusted code.

## Current Baseline and First Pilot

Better Farms is the first pilot. Its authoritative repository is
[Go-Digital-Alchemy-Repos/Better-Farms](https://github.com/Go-Digital-Alchemy-Repos/Better-Farms).
The Better Farms Foundation checkout was verified clean on `main` at commit `6dd6335` on September 3, 2026. `npm run check` and `npm run build` passed. Reconfirm the commit and build evidence at pilot kickoff
rather than assuming that state remains unchanged.

Two WooCommerce prototype branches exist from Core Platform commit `e2ba048`:

- `codex/woocommerce-migration-toolkit` at `325188d` provides a catalog-focused categories/simple-products
  planner, CLI, direct Core database adapter, collision checks, tests, and a runbook;
- `codex/woocommerce-migration-toolkit-4bfb` at `ffd11a6` provides a broader
  product/customer/order rehearsal engine with cursor, repository ports, rollback semantics, tests, and
  a validation CLI, but only an in-memory adapter.

Both passed their scoped tests and `npm run check` on September 3, 2026. They are competing prototypes,
not one accepted toolkit, and must not be merged together or used for client data. Workstream A must
approve one reconciled import contract before Workstream E implements mapping tables or a durable adapter.

## Program Principles

- Preserve the imported site's visual identity; do not force a generic Core Platform theme.
- Separate content, presentation, business data, integrations, and infrastructure.
- Prefer versioned manifests/adapters over scattered client-specific conditionals.
- Keep Puck registrations explicit, schema-validated, previewable, and backward compatible.
- Keep bolt-on business logic independent of public-site styling.
- Treat imports as resumable, idempotent, observable migrations with reconciliation and rollback.
- Treat one client instance as the security, backup, monitoring, and release blast radius.
- Require evidence at every gate; configuration is not proof that an integration works.
- Avoid framework rewrites unless a verified pilot requirement cannot be met safely in the current stack.

## Target Contracts

### Versioned Client Onboarding and Site Manifest

The machine-validated manifest contains no secrets and includes:

- `schemaVersion`, immutable client instance ID, display name, source repository/commit, and owners;
- build command, output directory, supported Node version, entry points, and asset base rules;
- domain, route inventory, redirects, navigation, 404 behavior, and sitemap ownership;
- public-site domain, protected admin subdomain, same-origin public `/api` route, DNS provider mode, and
  certificate/routing status;
- API base contract, authentication, forms, and preview behavior;
- token sources for color, typography, spacing, radius, shadow, breakpoints, motion, and z-index;
- component inventory, semantic roles, variants, assets, accessibility notes, and Puck eligibility;
- editable page/region ownership: code, Puck structure/content, fixed slots, or module-owned;
- enabled modules and required page/template slots;
- provider capabilities without credentials;
- compatibility versions for platform, site adapter, Puck registry, and module-theme contract;
- import metadata, accepted exclusions, RPO/RTO, and launch-gate status.

It requires a JSON Schema or Zod schema, example fixture, upgrade policy, compatibility checker, and CLI
that fails closed on unknown breaking versions. Secrets remain in Railway or approved provider stores.

### React Site Integration Contract

The integration contract is repository-layout neutral and defines:

- deterministic production build and static asset output;
- environment-neutral API client, preview authentication, cache/error/fallback behavior;
- route collision/ownership rules for site, Puck, and module routes;
- navigation/footer contracts and link normalization;
- responsive assets, fonts, SVGs, CSP, and cache busting;
- forms, validation, spam controls, consent, uploads, and success/error states;
- SEO metadata, canonicals, structured data, robots, sitemap, redirects, and social previews;
- loading, empty, offline, unauthorized, and disabled-module states;
- fixture-based contract tests without production credentials.

The recommended topology resolves the public-site versus dashboard/API split:

- the public React site owns the client's normal HTTPS domain, including the approved apex/`www` policy;
- the Core Platform dashboard uses a protected admin subdomain such as `admin.example.com`;
- public browser API traffic uses the site's same-origin `/api` path, reverse-proxied to the Core Platform
  backend where the hosting topology supports it;
- the dashboard uses its own same-origin `/api` path;
- public and admin cookies remain host-only by default, application authorization remains authoritative,
  and Puck preview uses an approved signed flow rather than a broadly shared parent-domain cookie;
- public links, administrative links, webhooks, previews, CORS/CSRF, CSP, and email destinations are
  assigned explicitly to the public or admin origin.

The current runtime uses `APP_URL` for origin checks and a mixture of public and administrative links.
Milestone 1 must define separate public-site and admin/API configuration roles, plus a backward-compatible
transition from `APP_URL`, before the topology is implemented.

### Manual Domain Onboarding and Verification Contract

The admin onboarding flow includes a registrar-agnostic domain setup wizard. The core workflow generates
instructions and performs read-only verification. The operator applies every DNS change directly at the
registrar or DNS provider.

The wizard must:

- capture the public domain, apex/`www` preference, protected admin subdomain, hosting targets, public
  same-origin `/api` routing mode, and named DNS/launch owners;
- generate an exact, copyable record plan with record type, host, target/value, TTL, proxy mode when
  applicable, purpose, and provider-neutral manual instructions;
- verify domain ownership, authoritative nameservers, DNS propagation, certificate issuance, public-site
  routing, admin routing, `/api` proxy behavior, health/readiness, redirects, and origin/security policy;
- preserve state and evidence for retries, distinguish pending propagation from invalid configuration,
  and never declare readiness from record creation alone;
- record the operator's prior values and provide a reviewed rollback plan without changing DNS itself;
- regenerate the same instructions safely and avoid directing the operator to delete unrelated records.

Core Platform does not request, receive, or store registrar or DNS-provider credentials and does not call
provider APIs to create, update, or delete records in the near-term scope. Direct provider integrations,
including Cloudflare automation, are future optional enhancements requiring separate approval. Edge
access controls may strengthen the admin subdomain but do not replace application authentication and
authorization.

### Design-System Extraction and Theme Adapter

Extraction inventories source declarations and rendered evidence, producing normalized tokens and
component-role mappings rather than a second design system:

- token provenance and semantic aliases;
- typography/font loading and fallback;
- container, grid, spacing, breakpoints, and responsive behavior;
- buttons, links, fields, cards, dialogs, tables, alerts, and navigation roles;
- focus, hover, active, disabled, error, success, loading, and reduced-motion states;
- images, radius, shadow, icons, motion, contrast, and accessibility checks;
- versioned adapter module, visual fixtures, and regression baselines.

Bolt-ons consume semantic roles such as `surface`, `action.primary`, `form.field`, and
`commerce.productCard`; they must not hard-code Better Farms styling in shared business components.

### Puck Registration and Editable-Content Mapping

Each component has a stable key/version, field schema, defaults, validation, renderer, preview, migration,
allowed nesting, accessibility constraints, and ownership. Every region is classified as code-owned,
Puck structure/content, fixed structure with editable slots, module data with a themed template, or
global site data.

Puck stores approved content/composition data—not arbitrary JSX, secrets, business records, or provider
configuration. Publishing requires validation, preview, compatibility checks, and recoverable history.

### Module Registry and Themed Bolt-On Contract

The module registry is the source of truth for module key, feature setting, routes, navigation,
permissions, migrations, APIs, templates, health checks, and dependencies. Enable/disable operations are
explicit and idempotent; disabling access does not delete data.

Every public bolt-on template declares semantic theme roles, content/data slots, responsive and
accessibility behavior, SEO, all UI states, route/navigation contributions, and visual/contract fixtures.
Business services and storage remain presentation-neutral.

## Milestones and Verification Gates

### Milestone 0 — Governance and Baseline

Dependencies: none.

Deliverables:

- approve this plan and ADR terminology;
- record Core Platform, Better Farms, and Woo toolkit repository/branch SHAs and build evidence;
- inventory audits and preserved deployment/backup drafts without merging unrelated work;
- create a shared-contract decision log with owners/reviewers;
- define pilot scope, exclusions, success measures, and stop/rollback conditions.

Acceptance criteria: repositories and branches are unambiguous; tasks have non-overlapping ownership;
pilot inclusions/exclusions are signed off; unresolved decisions are assigned and block dependents.

### Milestone 1 — Manifest and Integration Contracts

Dependencies: Milestone 0.

Deliverables: manifest schema/example/validator/versioning; React integration and route/data ownership
matrix; public/admin origin and same-origin `/api` contract; manual DNS instruction and read-only
verification contract; module registry; Puck descriptor/content schemas; Woo target ports and
mapping/idempotency proposal.

Acceptance criteria: schemas reject unknown breaking versions and secrets; Better Farms is expressible
without platform conditionals; route/data ownership has no collision; domain contracts require no
registrar master credentials and support the manual path; fixtures pass in both repositories; durable Woo
work remains blocked until contract approval.

### Milestone 2 — Better Farms Design and Content Adapter

Dependencies: approved Milestone 1 contracts.

Deliverables: route/page/component/asset/form/API/SEO inventory; token extraction report; theme adapter;
visual fixtures; Puck registry; editable-content map; navigation/footer/asset/form/preview/API adapters.

Acceptance criteria: representative desktop/mobile pages match approved baselines; WCAG 2.2 AA targets
pass; static build needs no production secrets and rejects incompatible manifests; approved editing cannot
break fixed layout/business data; last compatible adapter/registry can be restored.

### Milestone 3 — Repeatable Railway Deployment Foundation

Dependencies: Milestone 1 identity/config contract; can parallel Milestone 2 after contract freeze.

Deliverables: reconciled secret-safe preflight; Railway app/Postgres blueprint; registrar-agnostic manual
domain wizard; exact DNS record instructions; read-only ownership, propagation, certificate, routing, and
cutover verification; domain/origin, storage, email, health, and monitoring configuration; backup
provenance; release manifest; backup, restore-to-duplicate, and DNS/routing rollback runbooks.

Acceptance criteria: no secret leaks or registrar/DNS-provider credentials; fixture config passes and
unsafe config fails; repeated generation produces the same record plan; read-only verification retries
are safe; readiness requires ownership, DNS, certificate, routing, same-origin `/api`, and application
health checks; rollback instructions restore recorded prior values without affecting unrelated records;
fresh deployment and migration are deterministic/idempotent; backup provenance identifies the client
instance; disposable restore/rollback meets RPO/RTO. No real infrastructure is created without later
authorization.

### Milestone 4 — WooCommerce Adapter and Import Rehearsal

Dependencies: approved import contracts, target schema ownership, and Better Farms source inventory.

Deliverables: durable adapter decision and mapping migrations; adapter behind toolkit ports; dry-run,
resumable/idempotent import, checkpoints, audit, and quarantine; approved entity mappings; redirects;
count/status/stock/money reconciliation; freeze/delta/cutover/rollback rehearsal.

Acceptance criteria: two clean-target rehearsals agree; retries do not duplicate; every record is imported,
excluded, or quarantined; differences are signed off; prohibited credentials/sensitive history are not
imported; rollback restores pre-import state within the approved window.

### Milestone 5 — Ecommerce Transaction Hardening

Dependencies: approved ecommerce contracts; may parallel Milestones 2/4 with separate file ownership.

Foundational blockers: atomic webhook claims; durable idempotent payment/refund/email jobs and
reconciliation; idempotent checkout; inventory reservation or enforced oversell policy; unique
inventory/coupon side-effect keys; serialized provider-idempotent refunds; compensated order transitions;
operator exception queues; all pilot-required tax/shipping/fulfillment/return/dispute workflows.

Acceptance criteria: duplicate/reordered/delayed/concurrent events cannot repeat money or stock effects;
Stripe sandbox E2E covers success/failure/recovery/cancellation/refund/fulfillment; finance/support can
reconcile without database edits; required capabilities are operational, not merely configurable.

### Milestone 6 — Integrated Better Farms Pilot

Dependencies: Milestones 2–5 and approved infrastructure intake.

Deliverables: Better Farms integrated with Core Platform/Puck; required modules and themed templates;
routes/navigation/forms/assets/APIs/SEO/redirects; rehearsed imported data; production-like staging;
completed manual domain wizard and verification evidence;
editor/operator/finance/support/accessibility/security/rollback acceptance.

Verification gate: lint, types, tests, migrations, build, and budgets pass; production-like E2E covers
public/Puck/forms/auth/modules/checkout/webhook/refund/restore/rollback; responsive visual and WCAG checks
pass; security/privacy/secret/upload/origin/rate-limit reviews pass; import and crawler reconciliation pass;
responders, dashboards, alerts, runbooks, and rollback authority are confirmed.

### Milestone 7 — Launch and Hypercare

Dependencies: Milestone 6 and explicit Project Owner release authorization.

Deliverables: pre-cutover backup, freeze/final delta, Git-backed release, DNS cutover, smoke tests;
monitoring for availability, latency, errors, jobs, webhooks, payments, refunds, email, inventory, backups,
forms, and security; daily reconciliation; incident/rollback/communication paths; post-launch review.

Acceptance criteria: go/no-go evidence is recorded; no unresolved severity-1/2 issue; transactions/imports
reconcile; rollback remains viable until acceptance; owner signs off or invokes predefined rollback.

### Milestone 8 — Reusable Client Onboarding Playbook

Dependencies: Better Farms post-launch review.

Deliverables: intake checklist, manifest generator, discovery scripts, extraction workflow, Puck guide,
module matrix, import/cutover playbook, estimates, fixture site, and golden contract tests; classify all work
as shared platform, adapter, or Better Farms-specific.

Acceptance criteria: another qualified React/Vite client can produce a valid manifest without changing
business services; styling comes through an adapter; provisioning copies no secrets; shared contracts and
fixtures contain no Better Farms assumptions.

## Workstreams and Ownership Boundaries

Parallel work starts only after its shared contract is approved. Each stream owns one write surface.

| Workstream                  | Primary write surface                                                 | Must not change independently             |
| --------------------------- | --------------------------------------------------------------------- | ----------------------------------------- |
| A. Contracts/governance     | Schemas, ADRs, contract tests, decisions                              | Scope, DB schema, public APIs             |
| B. Better Farms design      | Site inventory, adapter, fixtures, Puck registry                      | Core business services/schema             |
| C. Core Puck/site bridge    | Registry loader, preview/publish compatibility                        | Client design/module logic                |
| D. Modules/templates        | Registry and presentation-neutral template contracts                  | Theme tokens/import/infrastructure        |
| E. Woo migration            | Toolkit adapter and approved mapping migrations                       | Target contracts before approval          |
| F. Ecommerce correctness    | Orders, payments, inventory, refunds, jobs, tests                     | Puck/theme/client repository              |
| G. Deployment/operations    | Preflight, manual domain wizard, releases, Railway/runbooks, recovery | Real infrastructure without authorization |
| H. Independent verification | E2E, accessibility, security, performance evidence                    | Features except approved fixtures         |

Order: A → (B, C, G) → (D, E, F) → H/Milestone 6 → launch → playbook. B/C/G may overlap after manifest
freeze. D/E/F require stable APIs and explicit file ownership. Authors of money, migration, or security
changes are not their sole acceptance reviewers.

## Foundational Blockers and Later Enhancements

Foundational blockers:

- approved manifest, compatibility, route/data ownership, module, theme, and Puck contracts;
- deterministic build/deploy, secret-safe configuration, migration, backup/restore, and rollback;
- approved Woo adapter/mapping contract and reconciled rehearsal;
- ecommerce money/stock/refund/webhook correctness for enabled capabilities;
- production-like CI/E2E, accessibility, security, and operations;
- explicit Better Farms intake, exclusions, owners, and release approval.

Later enhancements:

- shared multi-tenancy or cross-client administration/analytics;
- Neon/Next.js migration without a pilot requirement;
- direct registrar or DNS-provider integrations, including Cloudflare DNS automation;
- arbitrary React-to-Puck conversion, a theme marketplace, or autonomous AI publishing;
- modules Better Farms does not require, such as advanced subscriptions, gift cards, multi-currency,
  marketplaces, complex carrier automation, and advanced promotions.

## Risks and Controls

| Risk                                       | Control                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Imported site loses identity               | Source-derived tokens, adapter, visual fixtures, client approval                           |
| Client forks accumulate                    | Versioned manifests/adapters; no client conditionals in business services                  |
| Puck breaks layout or runs unsafe content  | Registered schemas, bounded regions, preview/history, no arbitrary JSX                     |
| Route/API conflicts                        | Ownership matrix and contract tests                                                        |
| Operator applies an incorrect DNS record   | Exact generated instructions, review, read-only verification, recorded rollback values     |
| Provider credentials enter platform scope  | Do not request, receive, store, or use registrar/DNS-provider credentials                  |
| DNS cutover precedes certificate/readiness | Staged verification gate; cutover blocked until DNS, TLS, routing, `/api`, and health pass |
| Woo data duplicates or disappears          | Idempotent checkpoints, quarantine, reconciliation, two rehearsals                         |
| Payment/inventory races                    | Atomic claims, unique keys, durable jobs, concurrency/sandbox E2E                          |
| Secrets cross deployments                  | Dedicated config, preflight, scoped credentials, restore provenance                        |
| Code rollback conflicts with schema        | Additive migrations, compatibility window, separate data rollback                          |
| Site/platform versions drift               | Release manifest and compatibility gate                                                    |
| Parallel streams diverge                   | Contract-first approval, bounded ownership, orchestrator integration                       |
| Future portability is blocked              | Explicit instance/site identity and presentation-neutral modules, without tenancy now      |

## Explicit Out of Scope

- shared runtime/database for multiple clients or tenant-aware auth/billing/administration;
- provisioning Better Farms or real client infrastructure during planning;
- durable Woo adapter/mappings before contract approval;
- wholesale framework/database-provider/UI-library rewrite;
- automatic execution of WordPress theme/plugin code;
- requesting or storing registrar/DNS-provider credentials, or automatically changing DNS records;
- launch without Project Owner authorization and recorded gate evidence.

## Current execution authority and remaining client gates

The Project Owner has authorized the Orchestrator to continue implementation and verification
sprint by sprint, including the September 5 infrastructure/engineering fixes, ecommerce completion,
and compatible CRM improvements. The earlier restriction to the first planning wave is superseded
by that authorization. Routine development does not require repeated basic approvals.

The September 5 ecommerce request is an explicit part of the active program goal: repair every
Admin > Ecommerce > Settings destination and verify working load, permissions, persistence, and
error handling; then complete evidence-backed ecommerce quality work across catalog, checkout,
payments, inventory, refunds, fulfillment, customer accounts, tax/shipping configuration, accessibility,
and operations. Track discovered defects through fixes and regression verification in the execution
ledger and ecommerce backlog. “World class” is an ongoing quality objective, not a claim that all
bugs are eliminated or that unverified provider capabilities are ready for production.

The current Better Farms intake records an approved seven-route pilot and no source import.
Live checkout, WooCommerce catalog/media or customer/order history import, and production DNS
cutover are excluded. It also records Mike as DNS/release operator and approved recovery targets
of 1440 minutes RPO and RTO. The overall intake remains draft and its release section blocked;
these approved fields do not by themselves approve a production launch.

Runtime publication, client/site manifest and WooCommerce catalog rehearsal contracts already have
implementation and evidence recorded in the [execution ledger](client-migration-execution-ledger.md).
Preserve those contracts while completing integration and acceptance. Do not restart resolved
architecture decisions based on this plan's historical planning language.

Before the dependent client launch, verify the exact domains and origin ownership, remaining
client/provider responsibilities, complete route/form/content acceptance, actual recovery and rollback
evidence, and the required release approvals. Keep release blocked where that evidence is missing;
continue authorized implementation and disposable rehearsals independently. Better Farms remains
no-import unless the Project Owner explicitly changes that scope.

See the [pilot intake](pilots/better-farms/client-migration-intake.example.json) and current execution
ledger for field-level evidence and unresolved gates. Examples, local tests and green CI are not
substitutes for client production acceptance.
