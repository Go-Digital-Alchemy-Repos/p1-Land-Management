# Platform Module Boundaries

Core Platform apps should stay independently understandable and cheap to load. New modules must follow this structure unless there is a documented reason not to.

## Required Shape

Each first-class module should define:

1. **Feature flag** in `shared/site-features.ts`, exposed through `/api/site-config`.
2. **Database schema and migrations** under the module's domain, with indexes for slugs, status fields, foreign keys, external provider IDs, and common list filters.
3. **Storage/service layer** that owns business rules. Routes should validate input, call services/storage, and return responses.
4. **Public routes** gated by the feature flag.
5. **Admin routes** gated by role/permission and the feature flag.
6. **Navigation hooks** for public nav and admin sidebar that disappear cleanly when disabled.
7. **Lazy frontend entry points** in `client/src/App.tsx`; heavyweight components stay behind route or component-level `React.lazy()` boundaries.
8. **Operational status** for external integrations, including masked secrets and validation results.
9. **Tests** for service rules, route gates, and the highest-risk user flows.

## Import Rules

- Module pages may import shared UI, shared utilities, and their own module internals.
- Shared layout, route registration, and navigation must not import heavyweight module dependencies such as Stripe, maps, rich text editors, charting libraries, or page builders.
- Cross-module behavior belongs in a shared service or adapter, not in direct imports from another module's route/page internals.
- Client carts, prices, permissions, and provider IDs are never trusted as authority; server services re-read the database and enforce rules.

## Disabled Module Contract

When a module is disabled:

- Public and admin navigation entries are hidden.
- Public routes return `NotFound` or an equivalent disabled state.
- Admin routes are unavailable except for super-admin settings needed to re-enable the module.
- Public APIs must not expose disabled module catalog/list data.
- Background work and seeded menu/content should be idempotent and safe to leave in place, but should not create active user-facing links when the module is disabled.

## Review Checklist

Before merging a new module or major module expansion:

- `npm run check`
- `npm test`
- `npm run build`
- `npm run budget`
- Confirm the module has a feature flag and route gates.
- Confirm server-side validation and authorization on every endpoint.
- Confirm all sensitive provider secrets are encrypted/masked.
- Confirm the largest new dependencies are lazy-loaded or manually chunked.
- Confirm list/detail queries have appropriate database indexes.
