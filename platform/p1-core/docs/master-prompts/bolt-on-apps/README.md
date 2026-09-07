# Bolt-On App Master Prompt Suite

For client migrations, this suite is governed by the canonical
[Client Migration Master Plan](../../core-project-plan.md). Bolt-on public pages must use the imported
React site's theme adapter and must not establish a competing visual system.

This suite turns the current Core Platform feature apps into portable implementation prompts. It is intended for an engineering agent working in this repository or in another dashboard product.

The prompts preserve the product behavior of Core Platform while requiring the implementation to adapt to the host system's architecture, visual language, authentication, permissions, data layer, and operational conventions.

## Included Apps

| App           | Core feature key                          | Prompt                                               |
| ------------- | ----------------------------------------- | ---------------------------------------------------- |
| CMS           | `cmsEnabled` / `enable_cms`               | [CMS](./01-cms-master-prompt.md)                     |
| Directory     | `directoryEnabled` / `enable_directory`   | [Directory](./02-directory-master-prompt.md)         |
| Blog          | `blogEnabled` / `enable_blog`             | [Blog](./03-blog-master-prompt.md)                   |
| Events        | `eventsEnabled` / `enable_events`         | [Events](./04-events-master-prompt.md)               |
| CRM           | `crmEnabled` / `enable_crm`               | [CRM](./05-crm-master-prompt.md)                     |
| Ecommerce     | `ecommerceEnabled` / `enable_ecommerce`   | [Ecommerce](./06-ecommerce-master-prompt.md)         |
| Membership    | `membershipEnabled` / `enable_membership` | [Membership](./07-membership-master-prompt.md)       |
| Career Center | `careersEnabled` / `enable_careers`       | [Career Center](./08-career-center-master-prompt.md) |

Portfolio is intentionally excluded from this prompt suite.

## How To Use A Prompt

If the target dashboard does not already have a server-authoritative feature-app system, run [System Configuration Foundation](./00-system-configuration-foundation-master-prompt.md) first. It creates the registry, persistence, settings screen, guards, and empty state where future app toggles will appear.

Each complete build prompt has two parts:

1. Copy [00 — Universal Bolt-On App Contract](./00-universal-bolt-on-app-contract.md).
2. Append the selected app prompt.

Replace only the bracketed inputs that matter. The engineering agent must inspect the host repository and infer the rest from evidence. For Core Platform, preserve the existing feature key, setting key, route families, and enabled behavior.

For a fresh installation, the safe default is disabled until an authorized administrator enables the app. For an existing installation where the feature already exists, migrations must preserve current availability and data.

The foundation prompt is intentionally separate from the app prompts. Run it once per host system, then add apps incrementally in any order.

## Expected Result

A completed app is:

- independently understandable and isolated behind a module boundary;
- registered in the host dashboard's feature-app settings;
- configurable per client instance (or the host system's equivalent scope) through an authorized toggle;
- visually native to the host system in public, admin, light, and dark contexts;
- gated consistently across navigation, routes, APIs, search, feeds, jobs, and embeds;
- non-destructive when disabled;
- backed by additive migrations, validation, permissions, observability, documentation, and tests;
- usable without placeholder screens, fake persistence, or unfinished critical flows.

## Core Platform Sources Used

The suite was derived from the current implementation and documentation, especially:

- `shared/site-features.ts`
- `client/src/features/admin/settings/system-configuration-tab.tsx`
- `client/src/App.tsx`
- `client/src/features/admin/admin-sidebar.tsx`
- `server/middleware/site-features.ts`
- `docs/architecture/module-boundaries.md`
- `docs/architecture/site-feature-apps.md`
- `docs/architecture/frontend-code-splitting.md`
- `docs/architecture/public-search-and-discovery.md`
- the app-specific files under `docs/admin`, `shared/schema`, `server/routes`, `server/services`, `server/storage`, and `client/src/features`

The prompts describe behavior, not a mandatory technology stack. A target system may use different frameworks or providers as long as the resulting contracts and user flows are equivalent.
