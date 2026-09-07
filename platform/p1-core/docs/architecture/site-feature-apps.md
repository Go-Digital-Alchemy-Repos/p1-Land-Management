# Site Feature Apps

Core Platform can now turn major apps on or off per site through system configuration. This allows the same codebase to serve sites that do not need every product area.

## Configuration

Feature app settings live in the `system_configuration` settings category:

| Setting             | Shared Feature Key  | Default |
| ------------------- | ------------------- | ------- |
| `enable_directory`  | `directoryEnabled`  | Enabled |
| `enable_blog`       | `blogEnabled`       | Enabled |
| `enable_events`     | `eventsEnabled`     | Enabled |
| `enable_crm`        | `crmEnabled`        | Enabled |
| `enable_ecommerce`  | `ecommerceEnabled`  | Enabled |
| `enable_membership` | `membershipEnabled` | Enabled |
| `enable_careers`    | `careersEnabled`    | Enabled |
| `enable_portfolio`  | `portfolioEnabled`  | Enabled |

Admins manage these toggles in `Admin > Settings > System Configuration`.

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
