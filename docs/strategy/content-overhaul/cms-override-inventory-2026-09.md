# CMS override inventory — 23 September 2026

This inventory is a read-only baseline for the Revision 3 WP2 copy freeze. It contains no unpublished copy. The machine-readable [route inventory](./cms-override-inventory-2026-09.json) lists all 54 manifest paths, their field paths, published component responses, and live snapshot differences. It also lists the global site-chrome component.

## Production baseline

- Production website origin: `https://www.p1landmanagement.com`. The active Railway website deployment observed at the time was `648dee07-76dc-4a09-b26e-381830617e50`, main commit `6c9cf25a66d8c0fe76bc61a6b1c6ee54f7c63469` (created 2026-09-23T03:23:50.866Z).
- All 54 public `GET /api/p1/page-content?path=…` route snapshots returned HTTP 200 and matched their manifest default fields. All 55 `GET /api/client-site-content/:routeId/:componentKey` component requests (54 routes plus `home/site-chrome`) returned HTTP 404: no published component override was observed. The site-chrome live snapshot is not a route, so has no path-level response to compare.
- In the authenticated, non-impersonated Owner Dashboard, Marketing > Pages with All statuses showed “No pages yet”; Marketing > Blog with All showed exactly five Published posts and no drafts or scheduled posts. Those five slugs match the static public blog routes in the manifest. These are **UI observations**, not a database export or direct authenticated API response; they support no observed CMS-only pages or blog posts. The public blog publication projection also contained those five static slugs.
- The homepage H1 title-case rendering versus lowercase `home.tsx` text is expected: `src/lib/cms-jsx-runtime.ts` applies `toTitleCase` to heading strings. It is not evidence of a CMS override. The Owner's current live H1 and subheading remain authoritative for later copy work; WP2 does not edit them.

## Staging baseline and release sequence

At inventory capture, the website staging Railway hostname redirected HTTP 308 to production because the checked-in manifest names the canonical origin. It was **not** valid staging evidence. WP2 adds an explicit `P1_WEBSITE_STAGING=enabled` server flag to make staging non-indexable and keep its own hostname. A staging deployment must initially set `P1_CMS_CONTENT_OVERLAY=enabled` to preserve the old content behavior while route and CMS-only inventory is checked on the actual staging host. Only after that inventory is reviewed may staging change the overlay flag to disabled and verify source defaults, while Core staging has `P1_CMS_EDITING` paused. No production variables or deployment change in WP2. Production overlay must remain explicitly enabled until the same release as WP3 approved copy.

## Owner decisions

No published production overrides were found requiring a field-by-field content decision. The Owner checkpoint still governs beginning WP3, any production overlay switch, production deployment, and any copy/layout change. The CMS-only lists are based on authenticated UI visibility rather than direct database enumeration; if a backend export later contradicts them, pause and reconcile before release.
