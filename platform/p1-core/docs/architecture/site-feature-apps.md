# Site Feature Apps — P1 install policy

The P1-owned Core Platform installation exposes only the CMS, blog/content, forms, CRM, media, permissions, and operational capabilities required by P1. The P1 feature contract contains no switch for Directory, eCommerce, Membership, or Portfolio; those routes are rejected before application routing, and their remaining legacy source is being removed in dependency-safe slices. Upstream reference material does not authorize those products in P1.

| App | P1 runtime policy | Availability control |
| --- | --- | --- |
| CMS, blog/content, forms, CRM, media, permissions | Retained | Normal P1 configuration and role permissions |
| Directory, eCommerce, Membership, Portfolio | Excluded | No P1 feature setting; API boundary returns 404 and P1 admin settings do not expose these products |
| Events, Careers | Installed, disabled | Default off; may be explicitly enabled only after P1 accepts the related operating process |

The public gateway and the P1 Core API must return an unavailable response for every excluded app route. The `p1-module-exclusions` regression test keeps the Core API boundary explicit. Events and Careers remain installed but disabled until P1 accepts the related operating process.

P1’s CMS builder and public renderer do not offer Directory, Portfolio, or Membership blocks. These excluded blocks and the Membership access-rule editor are removed from the P1 client bundle; ordinary CMS pages, galleries, blog posts, managed forms, and CRM intake remain available.

## Configuration

Feature app settings live in the `system_configuration` settings category:

| Setting             | Shared Feature Key  | Default |
| ------------------- | ------------------- | ------- |
| `enable_blog`       | `blogEnabled`       | Enabled |
| `enable_events`     | `eventsEnabled`     | Disabled in P1 |
| `enable_crm`        | `crmEnabled`        | Enabled |
| `enable_careers`    | `careersEnabled`    | Disabled in P1 |

P1 administrators can manage only the retained and explicitly installable features. Excluded modules have no P1 setting and are not a future toggle.

## Runtime Contract

The shared feature type lives in `shared/site-features.ts`. The server reads settings through `getSiteFeatures()` and exposes the current feature set through `GET /api/site-config`.

Boolean settings are normalized from booleans and common string values:

- Enabled: `true`, `1`, `yes`, `on`, `enabled`
- Disabled: `false`, `0`, `no`, `off`, `disabled`

If settings cannot be read, the server logs a warning and returns the shared defaults.

## API Gating

Feature-specific middleware is used for retained configurable modules. Public and admin route groups use the matching middleware, such as `requireCmsEnabled`, `requireEventsEnabled`, `requireCrmEnabled`, and `requireCareersEnabled`.

When a retained gated app is disabled, the API returns a 404-style unavailable response instead of exposing the feature surface. The P1 API exclusion boundary rejects excluded module paths independently of the feature settings.

## Admin Navigation

Admin navigation uses the site configuration to hide or reveal major app sections. Existing data is preserved when a feature is disabled, so a feature can be turned back on without restoring records.

## Implementation Guidance

- Add new retained feature keys to `SiteFeatures`, `DEFAULT_SITE_FEATURES`, settings UI, and route/navigation gates together. Do not add P1 switches for excluded modules.
- Update public search collectors and sitemap/feed behavior when a feature controls public discoverability.
- Treat toggles as availability controls, not destructive cleanup operations.
- Gate public APIs, admin APIs, and visible navigation consistently.
- Keep migrations and seeders additive so disabled features do not remove data.
