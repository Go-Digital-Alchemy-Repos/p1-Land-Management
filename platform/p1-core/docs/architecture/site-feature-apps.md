# Site Feature Apps — P1 install policy

The P1-owned Core Platform installation deliberately exposes only the CMS, blog/content, forms, CRM, media, permissions, and operational capabilities required by P1. The reusable Core source retains feature infrastructure for maintenance, but P1 runtime policy is authoritative over generic upstream defaults.

| App | P1 runtime policy | Availability control |
| --- | --- | --- |
| CMS, blog/content, forms, CRM, media, permissions | Retained | Normal P1 configuration and role permissions |
| Directory, eCommerce, Membership, Portfolio | Excluded | Hard-disabled by `getSiteFeatures()`; settings cannot expose their UI or API surfaces |
| Events, Careers | Installed, disabled | Default off; may be explicitly enabled only after P1 accepts the related operating process |

The public gateway and the P1 Core API must return an unavailable response for every excluded app route. P1 verification currently covers public ecommerce, directory, membership, and portfolio endpoints plus disabled Events and Careers endpoints. Existing generic source and historical upstream documentation are retained as reference material; they do not authorize those products in P1.

## Configuration

Feature app settings live in the `system_configuration` settings category:

| Setting             | Shared Feature Key  | Default |
| ------------------- | ------------------- | ------- |
| `enable_directory`  | `directoryEnabled`  | Excluded in P1 |
| `enable_blog`       | `blogEnabled`       | Enabled |
| `enable_events`     | `eventsEnabled`     | Disabled in P1 |
| `enable_crm`        | `crmEnabled`        | Enabled |
| `enable_ecommerce`  | `ecommerceEnabled`  | Excluded in P1 |
| `enable_membership` | `membershipEnabled` | Excluded in P1 |
| `enable_careers`    | `careersEnabled`    | Disabled in P1 |
| `enable_portfolio`  | `portfolioEnabled`  | Excluded in P1 |

P1 administrators can manage only the retained and explicitly installable features. The excluded-module values are forced off at runtime and are not a future toggle.

## Runtime Contract

The shared feature type lives in `shared/site-features.ts`. The server reads settings through `getSiteFeatures()` and exposes the current feature set through `GET /api/site-config`.

Boolean settings are normalized from booleans and common string values:

- Enabled: `true`, `1`, `yes`, `on`, `enabled`
- Disabled: `false`, `0`, `no`, `off`, `disabled`

If settings cannot be read, the server logs a warning and returns the shared defaults.

## API Gating

Feature-specific middleware should be used for routes that must disappear when an app is disabled. Public and admin route groups should use the matching middleware, such as `requireEcommerceEnabled`, `requireMembershipEnabled`, `requireCareersEnabled`, or `requirePortfolioEnabled`.

When a gated app is disabled, the API returns a 404-style unavailable response instead of exposing the feature surface.

## Admin Navigation

Admin navigation uses the site configuration to hide or reveal major app sections. Existing data is preserved when a feature is disabled, so a feature can be turned back on without restoring records.

## Implementation Guidance

- Add new feature keys to `SiteFeatures`, `DEFAULT_SITE_FEATURES`, settings UI, and route/navigation gates together.
- Update public search collectors and sitemap/feed behavior when a feature controls public discoverability.
- Treat toggles as availability controls, not destructive cleanup operations.
- Gate public APIs, admin APIs, and visible navigation consistently.
- Keep migrations and seeders additive so disabled features do not remove data.
