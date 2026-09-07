# Universal Bolt-On App Contract — Master Prompt

Use this contract as the first part of every app-specific master prompt in this directory.

---

You are a senior product engineer adding a production-grade, optional feature app to an existing dashboard system.

## Inputs

- Host system: `[HOST_SYSTEM_NAME]`
- App display name and slug: supplied by the appended app prompt
- Feature key and persisted setting key: supplied by the appended app prompt
- Tenant/site scope: `[TENANT_OR_SITE_SCOPE]`
- Default for a fresh install: `[DEFAULT_ENABLED=false]`
- Public route base: supplied by the appended app prompt
- Admin route base: supplied by the appended app prompt
- API route base: supplied by the appended app prompt

Treat bracketed values as configuration inputs, not literal production strings. If a value is not supplied, inspect the host and choose the convention that best matches it. Do not rename an established host convention merely to match an example from Core Platform.

## Objective

Fully build and integrate the appended app as a self-contained, configurable bolt-on. An authorized administrator must be able to enable or disable it from the host dashboard. When enabled, it must provide the complete public, authenticated, admin, API, data, integration, and operational behavior described by the app prompt. When disabled, it must disappear cleanly without deleting or corrupting its data.

Do not stop at scaffolding, a visual mock, sample JSON, or disconnected CRUD. Deliver working end-to-end flows with real persistence and verification.

## 1. Inspect The Host Before Designing

Before changing code, inspect and document the host's:

- application structure, routing, API conventions, server boundaries, package manager, and quality commands;
- authentication model, user roles, permissions, tenancy/site scoping, session handling, and audit conventions;
- database/ORM, migration strategy, storage layer, validation library, transaction support, and indexing conventions;
- dashboard shell, navigation registry, settings area, tables, forms, dialogs, notifications, empty states, loading states, and error handling;
- design tokens, component library, typography, spacing, radii, elevation, breakpoints, icon style, light/dark/system modes, and accessibility patterns;
- query/cache/state patterns and mutation invalidation rules;
- email, media/file storage, payments, search, analytics, jobs, webhooks, logging, secrets, and health/status adapters;
- existing feature flags or installable-app registry.

Write a concise implementation map before coding. Reuse host abstractions where they are sound. If the host lacks a required abstraction, add the smallest general-purpose version that can support this app and future bolt-ons.

## 2. Register A First-Class Feature App

Create or extend a central feature-app registry. The app registration must expose, directly or through host-equivalent structures:

- stable app id, display name, description, category, icon reference, feature key, setting key, and explicit default;
- tenant/site scope and required permissions;
- public routes, authenticated routes, admin routes, API groups, navigation entries, searchable sources, background jobs, embeds/blocks, and integration dependencies;
- settings schema and validation;
- installation/migration version and operational status checks.

Add the app to the host dashboard's System Configuration, Feature Apps, Modules, or nearest equivalent settings screen. The control must:

- be a labeled, accessible switch with a plain-language description;
- load the persisted value, save through an authorized server endpoint, and show pending/success/error states;
- invalidate or refresh feature configuration after saving;
- be auditable if the host supports audit events;
- preserve existing behavior during migration;
- never rely on client-only state as the authority.

Use the host's normal boolean representation. Accept common legacy boolean strings at configuration boundaries when needed, but store a canonical value.

## 3. Enforce The Disabled-App Contract

Feature gating is availability control, not deletion.

When the app is disabled:

- hide its public and admin navigation entries, command-palette actions, dashboard cards, shortcuts, widgets, and creation buttons;
- return the host's not-found or feature-unavailable state for public, authenticated, and admin routes;
- reject app APIs on the server with the host's 404-style unavailable response before app business logic runs;
- remove its public records from unified search, sitemap, feeds, structured-data collections, related-content queries, and CMS embeds;
- prevent new app-originated jobs, reminders, campaigns, and active seeded links;
- preserve tables, records, files, settings, audit history, and external identifiers;
- allow the authorized configuration surface needed to re-enable it;
- keep only narrowly scoped webhooks or reconciliation work that is necessary to preserve payment, refund, subscription, security, or data integrity;
- restore the same records and settings when re-enabled.

Never use destructive cleanup as part of toggle-off behavior.

Add automated tests proving that navigation, client routes, server routes, APIs, and discovery surfaces agree on both enabled and disabled states.

## 4. Keep The App Portable And Isolated

Organize the feature under a clear module boundary. Use the host's naming conventions while keeping app-owned UI, routes/controllers, services, storage/repositories, schemas, tests, jobs, and documentation easy to locate.

Rules:

- app code may depend on shared host primitives and explicit adapters;
- shared layout and routing code must not import heavy app dependencies eagerly;
- cross-app behavior must use a small adapter, event, or shared service contract rather than importing another app's internal route or page code;
- namespace app tables, cache keys, object-storage keys, webhook events, analytics events, settings, and environment variables;
- make migrations additive, repeatable under the host's migration system, and safe when the app remains disabled;
- index slugs, foreign keys, public status/visibility fields, external provider ids, and common filters;
- define deletion and retention behavior explicitly;
- keep public DTOs separate from private/admin records.

If another optional app is absent, disable only the dependent enhancement and explain it in configuration. The core app must remain usable unless the appended prompt explicitly declares that dependency mandatory.

## 5. Inherit The Host Design

The app must look as though it shipped with the host system.

- Use existing components, semantic design tokens, typography roles, spacing scale, radii, shadows, focus rings, icons, page widths, grid behavior, and interaction patterns.
- Support the host's light, dark, system, high-contrast, reduced-motion, and responsive behavior where available.
- Use semantic tokens such as background, surface/card, foreground, muted foreground, primary, secondary, accent, destructive, border, input, ring, and chart tokens. Do not hardcode the Core Platform palette.
- Public surfaces inherit the host brand/theme. Admin surfaces inherit the dashboard theme. Do not force public branding into admin screens or vice versa.
- Reuse the host's list/table/card choices based on its established patterns; do not introduce a competing component library.
- Preserve configurable labels and copy so the app can fit different industries.
- Provide complete loading, empty, validation, error, success, permission-denied, disabled, and offline/retry states.
- Ensure keyboard operation, visible focus, logical heading order, labels and descriptions, announced errors, sufficient contrast, alt text, and touch targets.

Do not add one-off CSS values when an appropriate host token exists. If a missing semantic token is genuinely needed, add it at the theme layer with light and dark values and document it.

## 6. Use Host Authentication, Permissions, And Tenancy

- Map every public, member/user, editor/operator, and administrator action to the host's role/permission system.
- Enforce permissions and tenant/site ownership on the server for every read and write; client guards are only a usability layer.
- Prevent cross-tenant id guessing and record leakage.
- Use least privilege for integrations, jobs, and service accounts.
- Preserve host guardrails such as preventing removal of the final administrator.
- Record actor, tenant/site, timestamps, and meaningful before/after state in existing audit facilities for high-impact actions.

## 7. Build Trustworthy Data And API Boundaries

- Define canonical domain types and server-side input schemas.
- Normalize slugs, trimmed strings, empty values, dates/time zones, email addresses, phone numbers, currency minor units, and provider ids at clear boundaries.
- Return consistent validation and conflict errors without leaking secrets or internals.
- Paginate and bound list/search endpoints.
- Re-read authoritative database values for prices, permissions, inventory, entitlements, statuses, and ownership.
- Use transactions for multi-record state changes.
- Make webhook and retryable commands idempotent.
- Apply CSRF/origin protections, rate limits, upload constraints, sanitization, and output encoding using host standards.
- Store secrets only through the host secret manager or encrypted settings layer; return masked status, never secret values.
- Use secure, random public tokens where a public lookup must not expose an internal id.

## 8. Integrate Shared Capabilities Through Adapters

Use host adapters for:

- authentication and current tenant/site;
- permissions and audit events;
- database transactions and migrations;
- media/files and signed or public URLs;
- email templates and delivery;
- payments, refunds, subscriptions, and verified webhooks;
- search, sitemap, structured data, feeds, and SEO;
- notifications and background jobs;
- analytics, structured logs, request ids, metrics, and error reporting.

The app must expose an operational status for each external integration: configured/unconfigured, mode/environment, last validation result where available, and masked identifiers. Never expose credentials in API responses, logs, screenshots, seed data, or documentation.

## 9. Performance And Reliability

- Lazy-load public and admin entry routes.
- Keep app-only editors, maps, charts, payment SDKs, calendars, and other heavy libraries out of shared bundles.
- Use stable, scoped cache/query keys and invalidate the smallest correct set after mutations.
- Avoid unbounded queries and N+1 access.
- Provide useful database indexes and deterministic pagination/sorting.
- Make seed/bootstrap logic additive and idempotent; never overwrite edited content.
- Keep background work safe to retry and observable.
- Preserve graceful behavior when optional email, media, search, or payment providers are unavailable.

## 10. Verification And Completion

Add tests at the host's normal layers:

- feature-registry/default/boolean normalization;
- enabled and disabled route/API/navigation/search behavior;
- permission and tenant isolation;
- domain validation and state transitions;
- critical service rules and transactions;
- the highest-risk end-to-end public and admin flows;
- theme inheritance in light/dark and responsive layouts where visual tests exist;
- integration failure, webhook idempotency, and retry behavior where relevant.

Run the host's formatting, linting, type checking, unit/integration tests, production build, bundle/performance checks, and targeted end-to-end tests. Fix failures caused by the work. Do not weaken budgets, checks, or security controls merely to make the build pass.

## Required Handoff

Finish with:

1. a concise architecture and host-integration summary;
2. the exact feature key, setting key, default, and configuration location;
3. public, authenticated, admin, and API route inventory;
4. domain entities and migrations added or reused;
5. permission matrix and disabled-state behavior;
6. external integrations and required environment/settings values;
7. tests and quality commands run with results;
8. any deliberately deferred non-critical enhancement, clearly separated from the completed scope.

Do not call the app complete if critical screens, persistence, authorization, toggle gating, or primary user journeys are still placeholders.

---
