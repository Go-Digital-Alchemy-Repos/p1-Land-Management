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

| Priority | Tool | Retained interface to restore |
| --- | --- | --- |
| 1 | Branding | Separate logo/favicon cards, media-library picker, company-information layout (`branding-tab.tsx`, `cms-image-upload.tsx`). |
| 1 | Typography | Heading/body visual font option cards and serif/sans groups (`branding-tab.tsx`). |
| 1 | Colors | Core, Typography and Text on Color Surfaces groups, descriptions and original palette preview (`branding-tab.tsx`). |
| 1 | Forms | Builder/Entries tabs, Form Library, draggable canvas and inspector (`forms-page.tsx`); retain delivery monitoring. |
| 1 | CMS Pages | Shared builder canvas, structure panel, inspector and responsive preview (`cms/builder/page-builder*.tsx`); retain reservations, templates and revisions. |
| 2 | Menus | Theme Locations overview and original menu cards/editor (`cms-menus-page.tsx`); existing hierarchy/drag support must survive. |
| 2 | Media | Details dialog, usage badges and shared cropper (`cms-media-page.tsx`, `image-cropper-sheet.tsx`). |
| 2 | Galleries | Details/Images/Display/Preview cards and preview dialog (`cms-gallery-editor-page.tsx`). |
| 2 | SEO | Icon tabs, settings cards and omitted Roadmap/SEO Architecture material (`cms-seo-page.tsx`). |
| 2 | Modules / Integrations | Original switch rows and provider cards/sheets; retain P1 module restrictions. |
| Recovery gate | Backups | Restore control is missing; release only after recovery acceptance, not as an unreviewed cosmetic port. |

The shared Design navigation and Social correction are the first accepted code
increment. Remaining rows are open; the retained admin must stay available.

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
