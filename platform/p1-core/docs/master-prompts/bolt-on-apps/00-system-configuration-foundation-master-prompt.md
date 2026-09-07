# System Configuration Foundation — Run-First Master Prompt

Run this prompt before any app prompt when the target dashboard does not yet have a trustworthy place for configurable feature-app toggles.

---

You are a senior product/platform engineer. Build the **System Configuration and Feature App Registry foundation** for an existing dashboard product. This task creates the stage on which optional bolt-on apps can register themselves and be enabled or disabled later. Do not build any bolt-on app in this task.

## Inputs

- Host system: `[HOST_SYSTEM_NAME]`
- Configuration scope: `[TENANT_OR_SITE_SCOPE]`
- Settings navigation location: `[SYSTEM_CONFIGURATION_LOCATION]`
- Administrators allowed to change app availability: `[SYSTEM_CONFIGURATION_PERMISSION]`

Treat bracketed values as inputs. Inspect the repository and infer missing values from established host conventions.

## Objective

Create a production-ready, server-authoritative feature-app system with:

- a central typed app manifest/registry;
- tenant/site-scoped persisted enablement;
- an authorized System Configuration screen with a Feature Apps section;
- shared client and server feature resolution;
- reusable route/API/navigation/search/job gating helpers;
- auditability, tests, documentation, and an empty state;
- automatic rendering of a new app's toggle when that app later registers a valid manifest.

The result must work with zero registered apps and must not contain fake app rows, placeholder toggles, or a hardcoded list that future teams must edit in several places.

## 1. Inspect And Preserve The Host

Before changing code, inspect:

- routing, API, authentication, permissions, tenancy, database/ORM, migrations, validation, caching, and settings storage;
- dashboard navigation, settings pages, forms, switches, cards, alerts, toasts, skeletons, error boundaries, and responsive patterns;
- design tokens, light/dark modes, typography, spacing, focus behavior, and accessibility conventions;
- existing feature flags, environment flags, entitlement checks, experiments, app/module registries, audit logs, and configuration APIs;
- production quality commands and test patterns.

If a suitable server-authoritative feature system already exists, extend and normalize it rather than building a competing system. Keep experiments, subscription entitlements, and deploy-time flags conceptually separate from administrator-controlled app availability.

## 2. Define The Feature App Manifest

Create a typed, validated manifest contract with the smallest useful fields:

- stable `id`;
- display `name`;
- plain-language `description`;
- optional `category` and host-native `icon` reference;
- stable `featureKey`;
- stable persisted `settingKey`;
- explicit fresh-install `defaultEnabled`;
- configuration `scope` such as site or tenant;
- permission required to view/manage the app;
- optional metadata describing public/admin navigation, routes, API groups, search sources, jobs, embeds, integration dependencies, configuration route, and documentation route;
- manifest/schema version.

Registry rules:

- reject duplicate ids, feature keys, or setting keys at startup/build time;
- validate manifests without executing app business code;
- keep heavy app modules out of shared bundles;
- allow deterministic ordering by category and name;
- expose only safe manifest metadata to the client;
- make app registration the single source that drives the settings toggle list.

Do not require the platform shell to import a payment SDK, editor, map, calendar, chart, or other app-only dependency.

## 3. Persist App Availability

Implement canonical, tenant/site-scoped storage for app enablement.

Requirements:

- unique record per scope plus setting key or an equivalent normalized settings structure;
- additive migration with useful uniqueness/index constraints;
- explicit default behavior when no override exists;
- canonical boolean storage;
- compatibility normalization for common legacy values such as `true/false`, `1/0`, `yes/no`, `on/off`, and `enabled/disabled` at import/read boundaries only;
- actor and timestamps through the host audit mechanism;
- no deletion of app data when a setting changes;
- concurrency-safe writes and a stable read model.

For existing apps or flags, migrate without unexpectedly changing current availability. For newly installed apps, default disabled unless the app manifest or product requirements explicitly say otherwise.

Distinguish:

- manifest default;
- tenant/site override;
- effective value.

Return all three to authorized configuration users when useful, but public clients need only the effective safe feature map.

## 4. Build Server APIs And Resolution

Add host-conventional endpoints/services for:

- resolving the effective safe feature map for the current public site/tenant;
- listing registered app manifests plus effective state for authorized administrators;
- changing one app's availability or saving a validated batch;
- optionally resetting an override to the manifest default;
- returning actionable validation/conflict errors.

Security:

- enforce administrator permission and tenant/site ownership on the server;
- apply the host's CSRF/origin and rate-limit conventions;
- validate app id/feature key against the registry—never accept arbitrary setting keys from the client;
- never expose secrets or private integration configuration;
- record an audit event with actor, scope, app, old effective value, new effective value, and timestamp;
- use a transaction for batch changes;
- invalidate or version cached configuration immediately after commit.

If configuration storage cannot be read, follow the host's reliability policy. Use explicit manifest defaults, log a structured warning with request/scope context, and do not silently enable an app whose safe default is disabled.

## 5. Build The System Configuration UI

Add a host-native System Configuration page or tab with a **Feature Apps** section.

The section must:

- render from safe registry data, not a duplicated client constant;
- show app name, description, optional icon/category, effective state, and an accessible switch;
- support zero registered apps with a polished empty state explaining that installed feature apps will appear here;
- use the host dashboard's cards, labels, switches, buttons, save bar, toasts, loading skeletons, errors, spacing, typography, and responsive layout;
- work in light, dark, system, keyboard, and small-screen contexts;
- disable or annotate controls the current user cannot change;
- show pending state and prevent conflicting repeated writes;
- show success and actionable failure feedback;
- refresh the shared feature map and affected navigation after save;
- optionally warn that disabling hides access but preserves data;
- optionally group apps by manifest category without hiding search/accessibility semantics.

Use either immediate per-toggle saves or a deliberate Save Configuration action according to the host's established settings pattern. Do not mix both ambiguously.

## 6. Provide Reusable Gating Primitives

Create documented helpers that future app prompts can use:

- server middleware/guard such as `requireFeature(featureKey)`;
- server service function such as `isFeatureEnabled(scope, featureKey)`;
- client hook/provider for the effective feature map;
- client route wrapper or route-registration filter;
- admin/public navigation filtering;
- search/sitemap/feed source filtering;
- job/worker eligibility check;
- CMS block/embed availability check;
- test factories for enabled/disabled feature maps.

The server remains authoritative. Client helpers improve UX but may not grant access.

Use a consistent unavailable response matching the host—prefer a 404-style result when app existence should not be disclosed. Make the label safe and generic.

## 7. Define The Disabled-App Policy

Document the contract every future app must obey:

- hide public/admin nav, routes, shortcuts, cards, commands, and creation actions;
- reject public/admin APIs before business logic;
- remove records from public search, sitemap, feeds, structured data, related content, and embeds;
- stop new app-originated jobs and active seeded links;
- preserve all records, files, settings, audit history, and provider ids;
- preserve narrowly scoped webhook/reconciliation work required for payments, refunds, subscriptions, security, or integrity;
- keep only the authorized System Configuration surface needed to re-enable the app;
- restore existing records and settings when re-enabled.

The foundation supplies primitives; each app remains responsible for applying them to every owned surface.

## 8. Reliability And Performance

- Keep feature configuration reads cheap and cacheable per tenant/site with correct invalidation.
- Avoid a database query for every individual navigation item or route check.
- Make resolution deterministic and safe during partial deploys where a setting may exist before or after a manifest version.
- Log unknown legacy settings for migration review without exposing them as toggles.
- Do not eagerly import app code to build the registry or settings list.
- Make registration and bootstrap idempotent.
- Provide structured logs and metrics for configuration reads, writes, failures, and unknown app references without flooding logs.

## 9. Tests

Add tests for:

- manifest validation and duplicate detection;
- default, override, and effective-value resolution;
- legacy boolean normalization;
- tenant/site isolation;
- unauthorized and cross-tenant write rejection;
- single and batch updates plus cache invalidation;
- audit event contents;
- empty registry/UI state;
- automatic UI appearance from a registered test manifest;
- enabled/disabled server guard behavior;
- navigation/route/search/job helper behavior;
- light/dark/responsive/accessibility behavior where the host supports UI tests;
- safe fallback when configuration storage fails.

Run formatting, linting, type checking, unit/integration tests, production build, and any bundle or end-to-end checks used by the host. Fix failures caused by this work.

## Completion Criteria

This foundation is complete only when:

- the System Configuration destination is reachable by authorized administrators;
- it renders a polished empty state with no registered apps;
- registering one lightweight test/example manifest makes one real toggle appear without editing the settings page;
- toggling that manifest persists per tenant/site and updates the effective server/client feature map;
- reusable guards prove enabled and disabled behavior;
- no app data is deleted by disablement;
- no bolt-on app itself was unnecessarily built or coupled into the platform shell.

Remove any temporary example manifest after its automated tests unless the host already has a real feature app to register.

## Required Handoff

Report:

1. the System Configuration route and required permission;
2. manifest type and registry location;
3. persistence model/migration;
4. public and admin configuration endpoints;
5. client/server gating helpers;
6. cache and audit behavior;
7. how a future app registers its manifest and toggle in one place;
8. tests and quality-command results.

---
