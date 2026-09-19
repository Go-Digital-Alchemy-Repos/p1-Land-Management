# Public website identity delivery

Status: implemented, locally validated and released at `4d85894689ad9f9e63597fc8823f675968458f4d` on September 19. This completes the public consumer connection for the existing Design → Branding identity settings, not the whole Business Center consolidation or legacy-admin retirement.

## Source and public contract

Core serves `GET /api/p1/website-identity` through `server/routes/public-website-identity.routes.ts`. The browser-safe schema is `shared/public-website-identity.ts`; normalization and bounded media resolution live in `server/services/public-website-identity.service.ts`.

The exact response fields are `schemaVersion: 1`, `stackId: "p1-land-management"`, a 64-character hexadecimal `version`, and nullable `companyName`, `companyAddress`, `phoneDisplay`, `phoneHref`, `logoUrl`, `faviconUrl`, and `googleBusinessUrl`. The version hashes the branding snapshot version and normalized projection. The endpoint reads the public-only branding snapshot, selects the six registered identity settings, rejects query parameters, and returns `Cache-Control: no-store`. It never returns raw settings, provider credentials, media-library records or audit details.

Names, addresses, URLs and phones have bounded validation. Address line breaks and tabs normalize to spaces. A configured phone list is validated line by line; the first number provides both display and dial destination. US ten-digit numbers acquire the `+1` dialing prefix. A configured Google Business URL must use HTTPS without credentials, on `google.com`, `www.google.com`, `maps.google.com`, `maps.app.goo.gl`, or `g.page`. Invalid identity or unresolved assets return a fixed 503 response so the public server can retain its previous valid snapshot.

## Asset delivery and inherited defaults

No arbitrary image proxy or outbound image fetch was added. Accepted output assets are:

- Known bundled paths: `/p1-symbol.svg`, `/favicon.svg`, `/favicon.ico`, `/favicon-32.png`, `/apple-touch-icon.png`.
- Verified CMS raster paths under `/uploads/cms/` or `/r2/cms/`, with PNG, JPEG, WebP or GIF extensions and compatible stored raster MIME types.

For an uploaded asset, resolution queries exact stored URL, canonical equivalent or logical R2 key with a two-row limit; ambiguous matches fail. External CDN URLs may resolve only through an existing CMS media record into the same-origin `/r2/cms/...` path. There are at most two lookups, for logo and favicon. Unknown records, traversal, unsupported MIME, private storage prefixes and generic `/assets` or administrative image paths are not projected. The existing same-origin image CSP remains in force. The identity write validator now accepts the same narrow `/r2/cms/` upload references as the public projection.

Existing bootstrap values are treated as inherited defaults rather than explicit public overrides: the exact company name `P1 Land & Property Management`, the known `/admin/p1-land-management-logo.png` seed (relative or canonical apex/www URL), and the `/p1-symbol.svg` favicon seed project as null. This is a value-based compatibility rule; no explicit-override provenance column was added. Other valid custom values project normally.

## CMS precedence and render consistency

Public rendering uses `src/lib/use-site-identity.ts` and `site-identity.ts`:

1. Valid configured identity fields override the corresponding public identity.
2. Missing identity fields retain existing published `site-chrome` values where applicable.
3. Missing published values retain the supplied P1 website defaults.

The global CMS logo, logo alternative text, phone display, phone destination and Google link fields remain registered through `cmsValue` during manifest collection. The matching public/Core manifests are maintained together. Identity rendering deliberately avoids a second generic JSX translation that could override the resolved result. Existing unrelated text and page fields remain CMS-managed.

Header, footer, contact surfaces and canonical P1 phone references consume the resolved identity. A published CMS phone override is resolved into a coherent display/dial pair. Structured-data changes target nodes identifying P1's own business; unrelated organizations remain untouched. Freeform company address is contact information and does not automatically become a claimed street-level storefront in structured data.

`server/index.mjs` obtains page content and identity together, renders that snapshot, and serializes the same snapshot into `p1-published-content`. Hydration therefore starts from the identity used for server HTML. `/api/p1/page-content` includes identity for subsequent navigation. While a route loads, `cms-route-snapshot.ts` retains identity and global chrome but clears the previous route's page content. An unavailable identity response retains the prior valid identity; a valid projection containing explicit null fields replaces it and restores the relevant fallback.

Server and browser icon helpers update favicon and touch-icon links together. Configured image URLs include the identity version as a cache-busting query. Null favicon configuration restores the existing bundled favicon and touch icon. No company identity update requires a code deployment after this consumer is released.

## Refresh and failure behavior

`server/website-identity.mjs` wraps `public-settings.mjs` with `preserveLastValid: true`. Reads deduplicate in-flight work, refresh on demand after a 30-second TTL, use a bounded 1.8-second fetch, reject redirects/invalid JSON/content types, and enforce a 16-KiB projection limit. It is not a background poller; an already-open browser sees a new identity when it next requests page content or reloads.

A valid projection is atomically written to `website-identity.json` under `P1_CONTENT_CACHE_DIR`, defaulting to `/tmp/p1-public-content`. Memory and validated disk state can retain the last valid identity during Core failure. Disk writes are best-effort and invalid/oversized cache files are ignored. The shared cache helper has generation-aware invalidation support; this identity flow does not depend on a cross-service save notification, so normal propagation is TTL-bound.

**Operational limitation:** the default `/tmp` cache can survive a process restart on the same filesystem, but is not a durable Railway volume or a backup. Container replacement/redeployment can discard it. A cold instance without a valid cache and without Core falls back to existing CMS/bundled values. Do not claim last-valid identity survival across infrastructure replacement until persistent cache storage has been configured and tested.

## Writes and conflicts

`business-center-identity.routes.ts` preserves its Branding capability boundary. Before writing, it merges incoming fields with a fresh public branding snapshot and runs the same projection validator. An invalid merged state returns a fixed 400 without writing; users can explicitly clear or repair invalid historic values. The subsequent atomic settings write still compares the supplied expected version, preventing a concurrent settings edit from being silently overwritten. Uploading an image prepares a media record; only the separate versioned identity save makes it active.

## Local validation and release gate

The integration coordinator reports the current validation set as passed:

- 63 focused Core tests, including projection validation, known-media resolution, rejected invalid saves, authorization and versioned-write coverage.
- 58 public-server tests, including runtime rendering, strict projection handling, cache recovery and icon behavior.
- Core and public-website typechecks and production builds.

Additional focused sources include `site-identity.test.ts`, `cms-route-snapshot.test.ts`, and `tests/dashboard/public-identity-icons.test.tsx`. These checks are local evidence, not proof of a deployed revision or full consolidation acceptance.

For release closeout, record the actual Git revision and successful Railway services, then perform read-only checks:

1. Read the live public identity endpoint and verify its exact public shape, provenance and sanitized fields without recording private settings.
2. Inspect raw homepage/contact HTML and serialized identity revision; confirm the visible logo, phone links, company identity and icon links agree.
3. Open the public pages in a browser, navigate between them, and check hydration, mobile layout, phone destinations and favicon consistency.
4. Confirm inherited P1 assets and existing published chrome remain unchanged where no custom identity override exists.
5. Read the authenticated Branding screen to confirm retained configured values and usable controls; do not save fabricated branding or mutate production records merely to demonstrate the integration.

Keep outage, invalid-media, cache-restart and concurrent-write experiments in isolated fixtures. The recorded live checks below establish the scoped release; they do not close full CMS parity or Owner edit acceptance.

## Live release evidence — September 19

Railway reported SUCCESS on the exact implementation revision above:

- Core: `4e2ee406-2a38-417b-824a-9d53450a5193`.
- Dashboard: `ca8fa4e1-79bf-49b2-b122-598683eb173a`.
- Public website: `1ce67d00-4514-482c-a897-2b0b67bb74e1`.

The live projection returned HTTP 200 with identity version `7e28bb3d3e207a1c30f18749d224dd8336007dd2de8b7ab4f001d3d962530c67`. All overrides were null, consistent with inherited P1 settings. Raw homepage and contact HTML serialized that same version. Existing P1 logo, Google profile and bundled icons remained intact; phone links dial the existing P1 number. Homepage-to-contact browser navigation passed with no captured console errors. The contact page at 390px had document width 390px and retained the mobile call/assessment controls. All three public health endpoints returned 200.

Authenticated Branding loaded the retained company name, seed logo URL and favicon with Save disabled; no fields were edited, saved or uploaded. This exposed outdated integration-pending help text, corrected in the subsequent guidance patch. Actual live custom-branding writes, outage experiments and asset replacement were not performed; their current evidence is isolated automated validation, not Owner edit acceptance.

Guidance follow-up `06acff2f7901be42e7ea88d247e5cb6cd59e4c81` also reached SUCCESS: Dashboard `4bbfe749-b86f-4817-9fb1-86b16e65e72b`, Core `4f605b64-e82b-4f69-b172-521adef14240`, public `d0800905-887a-43e8-9c63-952be447f3a5`. Reloaded authenticated Branding shows the new 30-second propagation/upload guidance; unchanged fields and disabled Save were preserved. Dashboard typecheck/build passed for this text correction.

### Mobile quick-contact consistency — September 19

The sticky mobile Call P1 link now consumes the same resolved published identity as the header, including an accessible label with its matching display number. Existing styling and visible label are preserved. Two component checks plus nine identity checks and website type checking passed; the production build prerendered all 54 routes (existing source-map/large-chunk warnings remain). No production identity fields were changed. Live changed-number acceptance remains separate from synthetic revision/fallback checks.
