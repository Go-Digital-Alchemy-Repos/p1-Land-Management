# Marketing: preserve the retained admin interface

Owner correction, September 19, 2026: Marketing must preserve the existing `/admin` tool sets, menus, icons, layouts and features. Backend/API compatibility alone is not acceptance. The current simplified native screens do not meet that requirement.

## Required implementation direction

Reuse retained page components and presentation, extracting shared components where required. Adapt routing, authenticated capability-aware transport and dashboard shell without recreating reduced forms. Preserve draft protection, reservations, version conflicts and confirmed-save behavior already added during consolidation. Do not embed a second independent login or weaken server authorization. Keep the unified dashboard's established system theme and colorful standalone icons.

Social Media is the first reference: `platform/p1-core/client/src/features/admin/settings/branding-tab.tsx` lines around785–876 contain its card, two-column profile fields, URL input behavior, adjacent style/preview layout and save toolbar. `design-page.tsx` supplies the title/description. The simplified `WebsiteSocial.tsx` retained safer versioned transport but replaced this interface with a long form. The shared extraction below corrects that first surface; it does not establish complete Marketing parity.

## Acceptance sequence

1. Extract/reuse Social Media presentation and verify original field behavior, preview, style options and save/error/conflict behavior at desktop and mobile sizes.
2. Apply the same component-reuse review to Branding, Colors, Typography, then Content and Website System pages. Inventory original tabs, toolbars, dialogs, nested actions and keyboard behavior per page.
3. Compare retained and consolidated pages visually and functionally under the same data and permissions. A feature must not be dropped merely because the simplified native screen omitted it.
4. Restore corresponding tool icons and maintain meaningful accessible labels. Do not add icon backgrounds.
5. Keep retained admin available until every page-family comparison is accepted. No redirect or retirement is authorized by a cosmetic improvement alone.

The initial icon correction restores distinct retained-admin Lucide symbols and associated colors in Marketing. It does not establish page/layout/feature parity. Menu and redirect delivery work already in progress remains preserved and uncommitted pending validation; interface restoration takes priority.

## Social Media presentation extraction

`SocialMediaEditor` in Core's shared client components now owns the retained Social
Media card structure and copy, ten profile labels and order, two-column field grid,
adjacent style/preview grid, empty-preview message and save toolbar placement.
Both `BrandingTab` and dashboard `WebsiteSocial` render that component. Core keeps
its Card/Input/Select/Button primitives through presentation slots. The dashboard
adapter supplies native controls and scoped CSS using the existing dashboard theme.
The original empty-input focus behavior inserts `https://` and leaves the caret at
the end; existing input values are not rewritten on focus. A full HTTP(S) URL
pasted after that focus prefix replaces the prefix, preventing doubled protocols. Preview icons match the retained
36px targets, 18px symbols, colors, outlines, solid style and hover treatment.

The dashboard still uses versioned changed-field saves, disables edits on uncertain
saves/conflicts, retains drafts until confirmed reload, and guards navigation. Its
reload recovery button and inline status/errors are intentional additions. Empty
and unsupported stored styles remain selectable without silently rewriting them.
The native style select has the same three choices but uses the browser's popup
and keyboard interaction rather than Core's Radix popup. Dashboard theme colors,
fonts and the colorful title icon intentionally follow the unified shell. These
adapter differences must remain explicit during visual acceptance; extraction is
not a claim that every Marketing page has achieved parity.

Focused integration coverage mounts the dashboard editor with controlled API
responses: empty URL prefix, safe preview, changed-field/version payload, confirmed
save, conflict retention and discard confirmation, style preview, failed post-save
reload and unload protection. The Core test uses its React runtime consistently
across this source boundary, mirroring dashboard Vite's existing React deduplication.

### Parent visual and interaction verification

The retained production `/admin/design/social-media` was read without changing settings.
The corrected dashboard was rendered with an isolated, in-memory loopback fixture:
ten fields in two columns on desktop, one column at 390px, and document width 390px
(no horizontal overflow). A full-URL entry and confirmed save passed after fixing a
focus-prefix duplication discovered in browser review. No production social settings
were changed. Shared Design headings/descriptions and capability-filtered Design
navigation now use the existing guarded route transition; unsaved-change protection
continues to apply. The existing unified dashboard shell/theme remains intentional.

## Source inventory: remaining corrections

Read-only source comparison on September 19 confirms these concrete gaps; this is
not a claim of live functional testing:

| Priority | Tool | Retained interface / current status |
| --- | --- | --- |
| 1 | Branding | Restored and live at `f2335f4`: separate logo/favicon cards, media picker and company layout; adapter differences documented below. |
| 1 | Typography | Restored and live at `fb2d322`: heading/body visual font cards and serif/sans groups. |
| 1 | Colors | Restored and live at `7733706`: three groups, descriptions and original palette preview. |
| 1 | Forms | Restored and live at `7ea1fee`: shared Builder/Entries, library, canvas and inspector; native delivery monitoring retained. |
| 1 | CMS Pages | Shared builder canvas, structure panel, inspector and responsive preview (`cms/builder/page-builder*.tsx`); retain reservations, templates and revisions. |
| 2 | Menus | Theme Locations overview and original menu cards/editor (`cms-menus-page.tsx`); existing hierarchy/drag support must survive. |
| 2 | Media | Restored and live at `4ee1a90`: shared library, details, upload and crop dialogs; optional multiselect caller parity remains open. |
| 2 | Galleries | Details/Images/Display/Preview cards and preview dialog (`cms-gallery-editor-page.tsx`). |
| 2 | SEO | Icon tabs, settings cards and omitted Roadmap/SEO Architecture material (`cms-seo-page.tsx`). |
| 2 | Modules / Integrations | Modules restored and live at `2afc0d3`; Integrations provider cards/sheets remain open. P1 module restrictions preserved. |
| Recovery gate | Backups | Restore control is missing; release only after recovery acceptance, not as an unreviewed cosmetic port. |

Shared Design navigation, Social, Branding, Typography, Colors, Modules, Forms and
Media have verified releases. Remaining gaps above stay open; the retained admin must stay available.

## Typography increment and Social live verification

Social is verified live on dashboard deployment `d1ddbb62-160d-4ca3-94bd-bfdd05e17fc8`
at `a9a7d79` (Railway SUCCESS). The first attempt at `3697235` failed at build because
the restricted root Docker context excluded the shared component. The follow-up
explicitly allows that source and deduplicates its Lucide runtime dependency.
An isolated committed-source Vite build passed without Core's installed dependencies.
The live authenticated Social page renders the shared editor; no settings were saved.

Typography now shares its original retained presentation too: Heading and Body
selectors, 20 allowed font choices per picker, sans/serif groups, sample cards,
selection indicators and combination preview. The dashboard keeps versioned
changed-field saves, custom stored values, API allowlist enforcement and recovery
controls. Parent local browser review confirmed 40 cards, selection options and
390px document containment at a 390px viewport. Original control popup differences
(native dashboard select versus retained Radix select) remain explicit. The P1 sample
heading replaces unrelated inherited Core business copy. No public fonts were changed.
Typography's shared component is explicitly included in the restricted Docker context.

## Colors presentation restoration

Both hosts now use `ColorEditor` for the retained Core Colors, Typography Colors,
and Text on Color Surfaces sections, all 18 picker/hex control pairs, descriptions,
and full Palette Preview. Dashboard keeps its existing changed-field/version save
contract, invalid-value rejection, unknown stored-value preservation and recovery
controls. Parent browser verification used only synthetic loopback state: 18 pairs,
three groups, draft-to-preview color update, confirmed save, and document containment
at 390px. No production colors were saved. Five focused Colors integration cases
cover validation, safe preview fallbacks, changed-only payloads and conflict/reload.
The original selected-typography preview remains in Core; dashboard currently uses
its own font family in the color sample, an explicit remaining presentation difference.
The new shared runtime component is allowlisted in the dashboard Docker build context.

Colors release `7733706` is verified on Railway: dashboard deployment
`d3fe33ab-202f-43b1-bcb1-7d1a10e8b115` and Core deployment
`42510145-0b45-4694-918e-5af509276add` both SUCCESS. Read-only authenticated
live inspection confirmed all three groups, 18 picker/hex pairs, full preview
and disabled unchanged Save Color Palette. No production settings were written.

## Website Modules presentation restoration

The retained Feature Apps card is shared by Core System Configuration and native
Website Modules. It restores the original bordered rows, labeled switches, help
copy and Save Configuration action. Native defaults, versioned writes, conflict
blocking, confirmed reloads and dirty guards remain unchanged. Events/Careers
remain off by default; excluded apps remain absent. Defaults only stage selections.
Three focused tests passed; an independent review found only stale browser-script
assertions, which were updated for disabled switches and actual-control readiness.
Local synthetic browser checks confirmed switch/default/save behavior and a 390px
layout without document overflow. No production module settings were changed.

Website Modules release `2afc0d3` is verified live: dashboard
`9805748a-fd16-4324-9075-21896f56d687` and Core
`210f1aee-d0bc-4798-8371-b9cdc8dd4489` both SUCCESS. Authenticated read-only
inspection confirmed five labeled switches, Events/Careers off and unchanged Save
disabled. No module settings were changed.

## Branding presentation restoration

Both hosts now share separate Frontend Logo/Favicon cards and Company Information
layout. Core retains its media and company mutation adapters; dashboard retains
changed-field/versioned writes, staged image changes, safe URL validation, conflict
blocking and dirty guards. Its existing Media Library mounts only with media capability.
Dashboard Save Branding Settings explicitly includes staged images; native library
dialog, visible image actions and upload status differ from retained primitives.
Independent review found no blocking behavior regression; nested interactive controls
and globally unhidden file inputs were corrected. Six focused tests passed, plus
dashboard/Core typechecks and builds. Local synthetic browser inspection verified
desktop/mobile layout, confirmed company save, real Media Library dialog loading, and
hidden file inputs. No production branding data was changed.

Branding release `f2335f4` is live: dashboard
`a3746239-ab2d-434f-8611-e3f03f0529a9` and Core
`eb74fdc6-36b4-4630-97c7-39262480963c` both SUCCESS. Authenticated read-only
inspection confirmed separate cards, existing logo, library/replace/remove actions,
company fields and disabled unchanged Save. The existing nonconforming favicon
address remains preserved (shown as Existing image address), not silently replaced.
No production branding data was written.

## Forms restoration candidate acceptance

Both hosts consume the retained Forms workspace: library, settings, 21-field palette,
canvas/reordering, inspector, Builder/Entries tabs, submission details and exports.
Native transport retains versioned writes, active-form confirmation, preview, media,
delivery monitoring and inactive-entry access. Unknown configuration is preserved.
Independent review found and verified fixes for reload/draft races, stale reservation
responses and one unsupported form hiding the entire library.

Parent reran all 14 tests (six shared/retained; eight actual React19 native adapter).
An isolated HEAD-plus-Forms candidate passed Core and dashboard typechecks/builds,
excluding in-progress Media code. Browser checks on synthetic loopback state verified
clean Entries transition/details, new inactive form creation, Email palette/inspector,
confirmed save/relisted draft and 390px document containment. Prior blocked local
confirmation tab was a browser-control issue; fresh-turn verification succeeded.
No production forms/submissions changed. Scoped CSS reset and accessible names were
corrected from browser findings. Native selects and extra preview/reload/delivery
actions remain explicit adapter differences. Retained admin retirement remains gated.

Forms `7ea1fee` verified live: dashboard `5c6bcfc0-aab4-4f8b-9072-de3403cfe795`
and Core `8f0b4b82-26c1-48f9-970d-48fd09f9bad2` SUCCESS. Authenticated read-only
inspection confirmed one Forms heading, Builder/Entries tabs, palette and no alerts.
The verification tab was closed to release its editor reservation.

## Media Library restoration

Shared original presentation now supplies square responsive tiles, usage badges/counts,
scrollable details dialog, all nine metadata fields with guidance, live/draft reference
paths and upload dialog/dropzone. The retained crop editor is shared with native
authenticated blob transport, original drag handles/compression and native numeric
controls. Dirty-close guards, download source authorization, destructive confirmation,
partial upload retention and existing single-selection filtering remain. Optional
multiselect picker parity remains a separate unresolved caller-level requirement.

Dependencies reuse existing Core exact versions: react-image-crop11.0.10(ISC),
browser-image-compression2.0.2(MIT,uzip transitive). Vite deduplicates these at the
dashboard package; isolated build without Core node_modules passes. Dashboard crop
compression uses its main thread to preserve CSP. Both application typechecks/builds
and eight focused tests pass. Independent review's hidden upload-error finding was
fixed with an assertion that errors render inside the modal. Parent synthetic browser
checks confirmed metadata save, usage path, authenticated download link, crop width
adjustment/preview, upload dialog and390pxdialogcontainment. Browser destructive crop
replacement was not submitted; codec/dimension/failure coverage is automated. No
production media/metadata/files were modified during verification.

Media `4ee1a90154c04b2cf9cf91156b9209a052fbf6dc` deployed successfully:
- Dashboard: `6e7ab84d-ce4b-49ff-a1e3-0f8c29b21c2d`.
- Core: `a788aeeb-5b07-4e53-85bb-9a35e9fe3d57`.
Authenticated live read-only verification confirmed the single Media Library heading,
upload controls, search/type/usage/sort toolbar and genuine empty state (zero media).
Production has no media fixture, so grid/details/crop interactions were verified with
synthetic local assets as recorded above, not represented as live production data.

## Next shared extraction: CMS Pages

Preserve the original structure/canvas/inspector and Builder/Settings/SEO/Quality
editor tabs, templates, responsive preview and revision presentation. Native transport
already supports CRUD, scheduling, revision restore, reservations and catalogs.
Share presentation while injecting host UI primitives, media/rich text, catalog and
section-library access, notifications and block-preview rendering. The original
renderer imports Core public forms/router/query modules; audit and isolate those
dependencies before reuse rather than connecting the dashboard to Core auth paths.
The existing isolated preview protocol does not alone reproduce an interactive canvas.
Additional renderer data endpoints require an explicit contract review if necessary.
Sections should reuse this builder afterward. Website's structured route-content
editor is a separate contract and must not be replaced with generic block content.

## Owner editor capability correction

Marketing host props now use the existing shared capability helper for media, sections
and menu controls, consistent with Forms and Branding. Explicit leaf-list checks
incorrectly hid tools from owners, whose known-tool access is derived from their role.
No server authorization or role policy changed: staff still require leaf grants, and
crew/client and unknown capabilities remain denied. Dashboard typecheck and all five
existing business-access policy tests passed.

## CMS Pages restoration candidate — September 19, 2026

The original page list, templates, landing-page wizard, four editor tabs, structure/canvas/inspector, responsive controls, block editors and reusable-section controls now share presentation between the retained admin and Business Center. Core and native adapters supply their existing authorization, data transport, media and rich text. Dynamic previews use existing capability-gated forms, blog, team, gallery, events, careers, branding and social reads. Draft preview remains isolated; canvas navigation/submissions are inert. Directory stays excluded; recording metadata can render but playback/purchases remain unavailable and recording URLs are stripped, consistent with P1's no-commerce scope.

New runtime packages reuse Core's existing exact MIT versions: clsx2.1.1, tailwind-merge2.6.0, react-resizable-panels2.1.7 and sanitize-html2.17.7. Dashboard Vite deduplicates them, and Docker includes explicitly allowlisted shared files rather than Core auth/router modules. An isolated allowlisted dashboard build without Core node_modules passed. Local Docker validation could not fetch node24-bookworm-slim registry metadata (deadline exceeded); this is not a successful Docker build.

Page and menu writes now carry version/instance/lease preconditions. The detailed contract, migration sequencing and transaction evidence are in `cms-page-concurrency-plan.md`. Production startup uses the P1 migration journal, not the upstream migration directory; the additive migration was corrected to that actual path before release.

Parent browser review on synthetic loopback data confirmed original Hero inspector controls, canvas heading edit/save, same-user second-tab read-only behavior, and stale-save rejection retaining unsaved block content. The first browser pass found nested CSS hiding both desktop/mobile builder views at1280px; the builder utility scope was strengthened and desktop1279/1280/1440 breakpoints subsequently displayed the intended layout. A390px shell overflow was then corrected; final mobile recheck and release evidence follow separately. Abrupt tab close did not immediately release the synthetic reservation; expiry remains the fallback, and immediate close recovery is not claimed. No production content was mutated during these checks.

Remaining wider parity includes Sections adopting this shared builder, the separate structured Website editor, Galleries/SEO/system tools and any unreconciled caller-level controls. Inherited inspector selects lacking accessible names are a known follow-up. Retained admin remains available; this candidate does not authorize retirement.

Final candidate checks: Core and dashboard typechecks pass after the contact-card nullable-field adapter fix. Parent reran all11 real PostgreSQL concurrency cases successfully. The final allowlisted dashboard build passes without Core node_modules. At390px the corrected editor now has document scrollWidth390 and a334px builder, with wrapping actions and horizontally scrollable tabs. Browser stale-save testing retained the exact unsaved Hero heading; the second same-user tab remained read-only.

Pre-release backup observation: the live Backups tool lists the September19 08:56am Eastern scheduled archive (52tables,584rows,0media records), key `clients/p1landmanagement.com/backups/db/2026-09-19T12-56-00-072Z-scheduled.json.gz`. A manual-backup click stalled browser control and a fresh status read showed no new archive; a fresh manual backup is not claimed. The additive migration preserves data and columns on application rollback; the existing same-day archive remains the recorded backup checkpoint. Full media recovery/admin-retirement gates remain open.

Release872d2bb verified successful on Railway dashboard7340a4fd-56bf-4e7a-9874-ffebcff8e5ea and Core40c4e535-b5a5-435b-8d1b-b8a9428e536a. Core runtime migration completion was observed. The live authenticated Pages list renders the original controls and genuine empty state. No production page/lease mutation was used for acceptance. Sections and SEO are the next bounded restorations; wider parity is still incomplete.

Live direct new-page route also rendered Builder/Page Settings/SEO/Quality tabs, original structure/canvas/inspector and template actions with no error. No save/publish was submitted.
