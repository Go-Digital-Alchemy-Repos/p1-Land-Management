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
| 1 | CMS Pages | Restored and live at `872d2bb7`: shared list/templates/builder; exact-instance and version-fenced Page writes. |
| 2 | Menus | Shared Theme Locations/cards/nested editor live at `effa8d77`; generic public consumer released at `4b7cf0f6` (four P1 slots, SSR/hydration, cached delivery and managed form dialogs). |
| 2 | Blog | Shared list and Content/Layout/SEO editor live at `effa8d77`; dynamic public delivery and server concurrency remain open. |
| 2 | Media | Restored and live at `4ee1a90`: shared library, details, upload and crop dialogs; optional multiselect caller parity remains open. |
| 2 | Galleries | Restored and live at `78fb0e72`: shared list, Details/Images/Display/Preview cards, upload and modal preview. |
| 2 | SEO | Restored at `7714ccb9`; truthful empty-audit correction live at `78fb0e72`. |
| 2 | Modules / Integrations | Modules restored and live at `2afc0d3`; Integrations provider cards/sheets are implemented in the Website System candidate below; deployment acceptance is recorded in handoff. P1 module restrictions preserved. |
| Recovery gate | Backups | Restore control is missing; release only after recovery acceptance, not as an unreviewed cosmetic port. |

Shared Design navigation, Social, Branding, Typography, Colors, Modules, Forms,
Media, Pages, Sections, SEO, Website, Galleries, Head Tags, Blog and Menus have verified releases. Remaining gaps above stay open; the retained admin must stay available.

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

## Sections and SEO — September 19 candidate verification

Both hosts now share the original Sections list/editor presentation and SEO audit,
settings-group/tab and redirect-row presentation. Native Sections uses the same
visual builder as CMS Pages, including structure/canvas/inspector, saved-section
insertion and mobile save controls. Its existing reservation checks, custom/unknown
block data, thumbnail settings, dirty guards and failed-save retention remain.
Sections inherits the unified dashboard theme. Generic duplicate Sections heading
was removed. This does not fix the pre-existing server-side section concurrency gap:
user reservations are not version/session-fenced like CMS Pages.

SEO restores the retained audit summary cards, issue rows/counts and Issue Reference,
colored tabs and grouped settings. Content edit links require the corresponding
content capability; Events honestly says “Open Events” because native direct-event
selection is not implemented. Existing same-site redirect restrictions and draft/error
handling remain. Core's existing Architecture tab is retained there, not represented
as a completed native feature.

Parent reran six Sections and seven SEO native adapter tests and both TypeScript checks. Isolated
HEAD plus this scoped candidate builds successfully for Core and dashboard; the
separate allowlisted dashboard runtime build without Core node_modules also passed.
A concurrent whole-tree Core build initially saw an incomplete Galleries import;
it is excluded from this release and the isolated candidate build passed. Existing
PostCSS/chunk warnings remain. The updated legacy browser test script was syntax
checked, not launched; interactive verification used the approved browser tool.

Browser verification used loopback synthetic data only: original Sections list/new
editor, block palette, Hero inspector and 390px mobile save toolbar; SEO settings,
audit cards/issue links/reference and mobile tabs. Both measured document width390
at viewport390. No production content, SEO settings or sections were saved. Backend
save-error/unknown-data handling is covered by controlled adapter tests, not a claim
of a complete production editing acceptance journey. Galleries, structured Website,
and remaining system-tool parity are still open. Release verification is recorded
separately after deployment; this entry alone is not a live-deployment claim.

Independent review caught fabricated public preview URLs built from retained CMS
slugs. Those links are omitted in native SEO until an authoritative destination is
available; editors remain the supported signed-preview path. A regression test uses
published page/post audit records to ensure no invented public link is rendered.

### Sections and SEO live release

Commit `7714ccb997eb65f043d2d4892ba99fd680b7ebd2` is pushed to the task branch and
main. Railway production SUCCESS: dashboard `5589269e-8c82-4827-b985-b67a64637eac`,
Core `70723ab1-517c-46fc-9bbc-50214706a7ff`, public website
`77ddd6c3-4664-4daf-a871-3b122158a04c`. Authenticated read-only production checks
confirmed grouped SEO defaults, colored tabs, live audit counts/reference and the
original Reusable Sections list/filter/empty state with no alerts. The retained
catalogs currently contain zero audited records/sections; no synthetic production
records were added. Inherited audit empty-success copy (“All content has …”) should
be made explicit for zero records in the next polish pass; it is not a complete
public website SEO certification. No settings, publications or starter refresh ran.

## Website, Galleries and Head Tags restoration — September 19

Both hosts now share the original structured Website editor presentation, Gallery
list/editor/dropzone/renderer and Head Tags cards. The unified dashboard keeps its
existing permissions, transport, version checks and recovery guards; the retained
admin remains available. Website restores the field/revision sidebar and live-preview
workspace. Galleries restores all five layouts, image/settings controls and preview
dialog. Head Tags restores the original markup guidance and GA4 warning.

Review fixed stale Website readback adoption, inert gallery preview links, nested
upload buttons and native lightbox modal keyboard behavior. Public gallery links
retain their original behavior. The SEO empty audit no longer claims that an empty
CMS catalog proves the public website has complete metadata.

Parent validation: 15 Gallery, four Website, six Head Tags and eight retained Website
regression tests passed; both typechecks and dashboard production build passed.
Local browser checks used synthetic loopback data only: Website draft save advanced
revision without publishing, Head Tags save/readback completed, gallery lightbox
trapped focus and Escape restored the trigger. All three editors fit a 390px
document without horizontal overflow. The local Website preview iframe was blank;
this does not establish live draft preview acceptance. No production content or
settings were changed. Isolated Core and Docker-allowlisted dashboard builds passed; independent review
passed after endpoint-generation fencing fixed delayed responses across page switches.
Production verification is pending.

Remaining comparison work includes Blog, Team, Menus, Sidebars, Careers, Events and
Website System tools. This increment does not establish complete Marketing parity.

### Remaining feature gaps confirmed by source comparison

- Blog: restore Content/Layout/SEO tabs, cover/focal controls, complete SEO/social
  preview and published-post actions. Work started; keep native scheduling guards.
- Menus: Theme Locations and indent-under-previous-sibling/outdent-one-level
  controls are absent; preserve existing sibling drag and server-fenced edits.
- Team: restore member dialog/cards and upload/crop; keep dirty-close guards.
- Sidebars: restore Details/Widgets cards, icons, help and empty states; preserve
  all eight widget types (including Form) and unavailable references. Advisory reservations do not provide server CAS.
- Careers: restore job dialog/table and application list/detail workspace; preserve
  current review/résumé grants and deliberate UTC conversion.
- Events: restore original tabs/filter/cards, image/focal, speaker bio/photo and tags.
  Recurrence fields exist in the client model but server behavior needs verification
  before enabling generation. Payments/accounts/entitlements remain excluded.

These findings are source inventory, not live acceptance. Blog's retained generic
preview route must be adapted to P1's actual public route before release.

### Release verification

`78fb0e72f0fb7a7a255592cb13050ccfffe9d9da` is pushed to main and the task branch.
Railway SUCCESS: dashboard `89cf26e5-9730-4503-bdc9-6fd83493b676`, Core
`047fb6ae-fbcc-4d3c-a392-75efeb1dfe96`, public
`df5116a5-ddb3-4ab8-9822-47db4b0b7de7`. Authenticated live read-only Website
inventory and home editor loaded with the actual public homepage inside its preview
iframe. Gallery list shows the restored controls and real empty state. The homepage
entry currently reports draft0/published never; rendered defaults are not evidence
of a completed save/publish/restore lifecycle. No production content was written.
Head Tags also loaded its original cards/guidance with unchanged Save disabled.
Social Media was rechecked live: two-column profile fields, Design tabs and colorful
standalone Marketing icons. No production settings were saved.

## Remaining publication and concurrency gaps confirmed September 19

The public Website currently consumes the bounded `site-chrome` snapshot for
existing navigation labels/links; it does not read generic `/api/cms/menus`
assignments. Connecting full menu trees is still required. Native Menus must not
promise that these assignments appear publicly after 30 seconds.

Menu writes have expected-version CAS but user-owned advisory reservations. Blog
updates retain user-owned advisory reservations without a server version or lease
precondition; stale concurrent Blog edits can overwrite. These existing limits
are not closed by presentation reuse and remain consolidation acceptance work.
P1's existing five public Blog routes also remain distinct from arbitrary generic
CMS post publication; dynamic post delivery must be implemented and verified.

## Blog and Menus shared presentation acceptance — September 19

Restored shared original Blog cards, Content/Layout/SEO editor tabs, taxonomy
selection, focal controls and SEO previews. Restored original Menus location
cards and recursive row controls with nesting and reorder operations. Both hosts
consume the shared presentation; dashboard permissions and existing version
checks remain in place. A lost menu-create response now requires inspection
and explicit acknowledgement before another create attempt.

Validation: 9 native Blog, 4 native Menus and 9 retained editor tests passed.
Clean Core/dashboard typechecks and both production builds passed in an isolated
26-file runtime candidate; restricted dashboard packaging build passed without
Core node_modules. Existing chunk-size warnings remain. Fixed an explicit
ReactNode flatMap type inference issue found by the clean dashboard typecheck.

Local browser validation used synthetic in-memory fixtures only: Blog title
and tag edits, tag removal, Layout/SEO tabs, draft save and reload; Menu indent,
save and reload showing the nested item. Desktop visual checks and 390px mobile
Blog/Menu checks passed with no document horizontal overflow. This is not
production publication, upload, or concurrent-editor acceptance evidence.

Remaining tools, dynamic Blog delivery, generic public menu consumption, Blog
server concurrency and full publication/recovery acceptance remain open.

### Blog/Menus release verification

Revision `effa8d77ed0fc625ba1e142ca1a3ead907f228c7` is on main and the task
branch. Railway dashboard `270cc051-1560-44e1-800e-1881e1c0fedc`, Core
`70be8e31-67b4-4a6e-96ff-39f7bff8cb4a` and website
`5a7b5019-9253-4551-894c-80d8c4823761` reached SUCCESS. Authenticated
read-only live Blog and Menus controls loaded against empty real catalogs. No
production post/menu writes were used as evidence. Team and Sidebars are next.

## Team and Sidebars shared presentation — September 19

Both retained and native hosts now consume shared original Team cards/dialog fields
and Sidebars Details/Widgets cards, list, help and empty-state presentation. Team
keeps staged photo uploads/picker and dirty/busy handling. Its native modal returns
focus to the opener; nested media Escape returns to the photo action without
closing the member editor. A black-on-black library ghost button found in browser
review was corrected with Team-scoped variant styling.

Sidebars preserves all eight widget types, unknown settings, unavailable/ineligible
saved form references and existing reservation-protected edit/delete behavior.
Its native list intentionally retains deletion inside the editor. No schema, auth
or write-version contract changed. Team and Sidebars still have preexisting
unversioned/uncertain-create acceptance gaps; these are not closed by UI reuse.

Parent independently ran seven Team and six Sidebar adapter tests successfully.
Independent review found no new blocker. Synthetic loopback browser checks passed
Team draft save/readback, nested picker Escape/focus and clean close focus return;
Sidebar unavailable-reference preservation, add Callout/save/relist and mobile
390px layout. No production records or files were written. Upload/crop transfer
and production publication are not covered by these browser checks. Updated the
existing Team browser script selectors and checked its syntax; it was not run as
a separate browser suite. Final isolated build evidence is recorded at release.

Public menu integration decisions are captured in
[the public-menu contract](public-website-menus-plan.md); that consumer remains
unimplemented and is not implied by the restored Menus editor.

Final Team/Sidebars gate: isolated HEAD `effa8d77` plus 21 exact hashed overlays
passed both clean typechecks (`--incremental false`), both production builds and
the restricted dashboard build without Core node_modules. Source hashes matched
the tested manifest. Existing build chunk-size warnings remain.

## September 19 — Careers/Events restoration candidate

Shared original Careers job table/editor grouping/settings cards/application
list-detail workspace now drive both hosts. Shared original Events list cards,
filter toolbar, four tabs and Details card layout likewise drive both hosts.
Native adapters retain capability checks, uncertain-save fences, UTC conversion,
review versions and dirty-state protection. No modules or payments were enabled.
Independent review corrected embedded attendee buttons submitting the event form,
pending attendance navigation, and public-origin image preview resolution.

Verified: Careers native 6 tests; Events native 7 and retained 10 tests; clean
Core/dashboard typechecks/builds; restricted dashboard runtime closure build.
Local browser: Careers draft save/readback; Events Details/Registrants presentation.
The browser stalled at a synthetic attendance confirmation; that click was not
accepted as browser evidence. Its underlying embedded action has regression tests.

Still incomplete for Events: original presets, StructuredDataStatus diagnostic,
image upload dropzone, full-screen editor sheet, registration status/delete/bulk/
CSV operations, archive entitlement/payment controls and recurrence generation.
Payments/membership are excluded from P1 scope; do not activate them to fill a UI
gap. Remaining in-scope operations require capability-backed API parity.

Public menu delivery now has a complete candidate API, SSR consumer, hydration,
last-valid cache and lazy managed-form dialogs. Live catalog is empty; existing
navigation remains unchanged until a supported location is assigned. This closes
the generic menu consumer implementation gap, subject to deployment verification;
it does not close unrelated Blog, Sidebars or CMS publication/conflict gates.

Release accepted at `4b7cf0f6106b40af504f40a7a8e2c5e879a172c6`: all three Railway
services SUCCESS; live public menu endpoint and matching SSR/navigation snapshots
verified. Authenticated Menus notice/catalog and Careers disabled state verified.
Remaining feature gaps above are unchanged; this is not full project acceptance.


## Website System restoration — September 19 release

Integrations, Email Templates and Developer Resources now reuse shared original
presentation in both the retained Core hosts and the consolidated dashboard.
The native controllers retain their version checks, reservations, pending-state
protection, draft recovery and redacted credential handling. Shared runtime sources
are explicitly included in the restricted dashboard build context.

- Integrations: original provider library, search, group/category/status filters,
  branded cards and right-side configuration sheet. Native scope remains Mailgun,
  Mailchimp and Cloudflare R2; active Google reports still use deployment settings.
  Saved configuration is not represented as verified connectivity.
- Email Templates: module counts, descriptive/subject/status cards, search including
  subjects and variables, clear filters, Sheet-style editor, formatting/link controls,
  clickable variable insertion and preview panel. Activation stages an editor draft
  for a reservation/version-checked save. Preview remains explicit, and full-document
  HTML remains source-edited. Test email restrictions and preview sandbox remain.
- Developer Resources: original summary counts, ordered System Index, document cards
  with excerpts/generated badges, three-pane workspace, hierarchical outline and
  right-side editor. Markdown rendering and existing conflict/recovery tools remain.

Validation: 14 Integrations adapter tests, 14 Email adapter tests, 7 retained email
helper tests and 9 Documents adapter tests passed. Documents received an independent
9-test rerun; cross-component review found and corrected desktop filter-width loss.
Both clean typechecks, dashboard build, Core client build and restricted dashboard
context build passed. Parent browser review used an isolated memory-only server:
provider search and local configuration save; HTML/visual variable insertion at the
caret, preview and local template save; document outline, source editing, preview and
local save. All three libraries fit a 390px viewport without document overflow; the
email modal also fit. Synthetic fixture reference-endpoint warnings were not production
errors. No real email, provider connection check or production configuration write ran.

These changes close the identified presentation gaps for the supported controls.
They do not close active Google configuration management, real provider delivery,
whole-CMS publication/conflict acceptance, recovery or legacy admin retirement.

Release `001ac605a648d83fbefc6cbc49a07915003b3354` succeeded on all three Railway
services. Authenticated live library reads passed for Integrations, five saved
Email Templates and the empty Developer Resources workspace. The full Core
production build also passed. Inherited email branding/provider-template content
remains a separate reconciliation item; no templates were changed in production.
