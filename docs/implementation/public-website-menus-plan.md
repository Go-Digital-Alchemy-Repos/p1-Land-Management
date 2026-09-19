# Public website menu delivery — implementation contract

Status: released and live-verified at `4b7cf0f6106b40af504f40a7a8e2c5e879a172c6`, September 19.
Four P1 menu slots now have a bounded public projection, persisted last-valid
cache, server rendering and matching browser snapshot. Live menu catalog was
read-only checked and has no assignments; existing navigation remains fallback.

## End state

An additive fixed read-only `/api/p1/website-menus` projection supplies exactly
`main_navigation`, `p1_footer_services`, `p1_footer_service_areas` and
`p1_footer_company`. The envelope has schemaVersion 1, P1 stack identity and a
content-derived revision. Each slot is null or an assigned bounded menu tree.
Only public rendering fields are exposed; no database rows are spread into JSON.

Null means retain existing published site-chrome/static navigation for that slot.
An assigned empty tree intentionally removes its links. Other generic/legacy
locations remain stored but do not silently map into P1 columns. Menus have no
draft state: successful version-checked saves, deletion and reassignment publish
configuration. Preserve existing expectedVersion mutation checks. Show this
publication behavior and unsupported-location guidance in both editor hosts.

## Safety and compatibility

- Validate three levels, bounded total items and bytes, unique IDs, text lengths,
  and explicit link/action fields. Never render labels as HTML. Reject executable
  schemes, protocol-relative URLs, credentials, control characters and backslashes.
- Resolve pageId only against published pages; never expose draft titles or
  destinations. Filter references with no actual P1 public route against the
  current route manifest and report that limitation in the editor. A generic
  published CMS record alone does not establish a reachable website page.
- Support form-modal actions with the existing active-only public form endpoint
  and durable idempotent submission API. Do not turn them into inert hash links.
  No new credentials, schema changes or provider integrations are required.
- Read only the fixed configured Core origin. Use the existing bounded public
  settings store with request deduplication, timeout, strict validation, 30-second
  refresh and last-valid fallback. Valid null/empty configuration replaces old
  assignments; transport errors retain the last valid snapshot.
- Invalid slot data must not invalidate independent valid slots. Keep fallback
  behavior distinct from an intentionally empty assignment.
- Inspect real assignments before release: activating a formerly disconnected
  menu is a public behavior change. The last live read-only menu catalog was empty;
  recheck immediately before activation rather than assuming it remains empty.

## Website integration

Attach the menu snapshot to pageSnapshot alongside content and identity. SSR and
initial hydration receive the same revision. Preserve menus across client route
changes and refresh through page-content. Assigned labels/URLs bypass automatic
cmsValue transformation so old site-chrome fields cannot rewrite them. Keep the
existing fallback JSX unchanged.

Replace only header navigation and the three footer link lists. Preserve logo,
phone, assessment CTA, headings, legal copy and contact details. Support three
levels at desktop/mobile with independent parent-link and expand actions, keyboard
operation, focus visibility and mobile Sheet closure. Preserve Service Areas
styling in the existing fallback. Use a website-owned form-modal transport adapter
around retained FormPresentation, never Core's application/query-client wrapper.
Preserve modal focus restoration, mobile handoff, loading/error/validation states,
submission-key reuse and durable success; disable real submits in CMS previews.

## Required evidence before completion

Projection tests must cover draft filtering, unavailable routes/forms, malformed
URLs, nesting/size limits and slot isolation. Store tests must cover assignments,
removal, intentional emptiness, timeout/malformed responses, cache recovery and
valid snapshot replacement. Render tests must prove SSR/hydration equivalence,
client navigation retention and unchanged fallback. Browser checks must cover
desktop/mobile three-level keyboard interaction and form-modal focus, unavailable
forms, validation and idempotent retry. Existing mutation/version checks must
continue to pass. No API-only increment closes this requirement.

Key files: Core shared/schema/cms-menus.ts, server/storage/cms-menus.storage.ts,
server/routes/cms-public.routes.ts and routes/index.ts; website
server/public-settings.mjs, server/index.mjs, src/lib/cms.tsx,
src/lib/cms-route-snapshot.ts, src/components/layout/SiteHeader.tsx and
SiteFooter.tsx. New contract/projection/store/renderer files should follow the
existing public identity and redirect patterns.

## Candidate validation and operational behavior

22 backend tests, 10 store tests (included in 76 public-server tests), 3 snapshot
tests, 4 native menu adapter tests and 5 shared-form/accessibility tests passed.
Core/site/dashboard typechecks/builds passed; restricted public/dashboard builds
verified runtime closure. Browser fixture verified three levels, nested focus
restoration, 390px sheet-to-modal handoff, input retention after failure, same
idempotency key/payload on retry, accepted receipt and disabled preview submission.
Runtime tests verify one menu revision across SSR, serialized hydration and route
responses, with no forwarded private credentials.

CMS disabled returns all-null slots. Invalid slots fall back independently;
transport failures preserve the last valid snapshot. An assigned empty menu is
intentionally empty. Unassign/delete restores the existing site-chrome fallback.
Saved assignments publish without a second draft/publish step, normally within
30 seconds. Both editor hosts state this explicitly. Form dialogs reuse the
original CMS presentation and durable public submission endpoint; no admin app
bundle, account credentials, or private submission data are included in public
menu projections. No production test forms were submitted.

Rollback: redeploy the preceding three service revisions together if necessary;
no database schema or stored menu migration is involved. Existing assignments are
preserved and old consumers ignore them. Retain `/admin` throughout acceptance.

Live closeout: all three Railway services SUCCESS at the above revision. Public
projection returns 200 with four null assignments; homepage SSR and contact-route
JSON carry identical menu revision. Existing fallback navigation remains visible.
Authenticated editor shows the publication notice and empty saved catalog.
