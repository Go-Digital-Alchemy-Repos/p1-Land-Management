# Website palette delivery

Marketing → Design → Color palette stores the original 18 branding color settings. Core exposes a separate public `GET /api/p1/website-colors` projection with `{schemaVersion:1, stackId:"p1-land-management", colors}`. Only recognized six-digit hex colors are emitted. Retained values without `#` are normalized; empty/invalid values are omitted. The existing muted-color fallback remains available to heading subtext, supporting copy and helper text. Company details, credentials, version digests and arbitrary settings never enter this projection. Private-category/storage failures return a generic 503.

The public gateway fetches that fixed path without visitor credentials. It rejects redirects, foreign identities, unknown fields/keys, invalid CSS strings, malformed UTF-8 and responses above 16 KiB. Requests have a 1.8-second timeout and coalesce within a 30-second memory cache. Unavailable or invalid refreshes drop expired overrides and retain built-in page styling. There is no disk/stale palette fallback. Clearing a setting therefore takes effect on a full document load after cache expiry; an already-open page or client-side navigation does not automatically refresh the global palette.

Validated values produce fixed CSS custom properties and selectors, never raw CSS supplied by users. Core's primary/secondary/accent/text token mappings are retained. The fourth brand color also maps to this website's existing clay accent. Heading defaults and selected semantic copy/link hooks use the palette. Home/shared hero titles retain their white fallback, with configured H1 then inverse text precedence. Hero subtitles retain their original alpha. Location introductions, breadcrumb metadata and editorial links use explicit semantic hooks. Page-specific inline styling, opacity variants and art-directed accents may still override global defaults; this is not a promise that every painted pixel uses a palette value.

Palette CSS is inserted only into configured public HTML documents, including website previews so editors see the saved website styling. It is never inserted into proxied admin/API responses, assets or unknown-page responses. Raw Owner head markup remains excluded from previews. Existing CSP permissions are unchanged. Clearing all values produces no palette style element and restores the original defaults.

## Release and rollback

Deploy the Core projection before the gateway consumer and the accompanying public bundle. The dashboard editor should ship with this delivery version before claiming publication. Existing stored palette choices can change public appearance on activation: inspect the current values and review contrast on light/dark surfaces, responsive layouts and configured public routes before production cutover. No such production review or activation has occurred in this task.

Rollback the gateway/bundle to remove palette application while retaining saved branding data and the editor. No schema migration or data deletion is required. Other branding fields (logos, identity, social links and typography) remain separate consolidation work.

## Local evidence

Core route tests verify the minimal normalized projection, muted fallback, empty settings, query/mutation rejection and generic failure responses. Gateway tests verify fixed CSS output, validation, coalescing, clear/failure/recovery, timeout, streaming size limits and actual HTTP document boundaries. A loopback-only browser rehearsal verifies computed colors on the homepage, a location page and its links/hover, and a preview; admin receives no palette. The same rehearsal checks raw head markup's CSP restrictions. None of these checks contact production services or activate stored production branding.
