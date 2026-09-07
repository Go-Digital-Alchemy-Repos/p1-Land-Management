# CMS Bolt-On App — Master Prompt

Append this prompt to [00 — Universal Bolt-On App Contract](./00-universal-bolt-on-app-contract.md).

---

Build the complete **CMS** bolt-on app described below.

## App Registration

- App id/slug: `cms`
- Display name: `CMS`
- Core Platform feature key: `cmsEnabled`
- Core Platform persisted setting: `system_configuration.enable_cms`
- Core Platform default: enabled; use disabled for a fresh external installation unless explicitly configured otherwise
- Public routes: published CMS slugs, draft preview routes, menus, galleries, sidebars/widgets, redirects, sitemap, and SEO outputs
- Admin route family: `/admin/cms`
- Public API family: `/api/cms`
- Admin API family: `/api/admin/cms`
- Core permissions: `content` for content operations and `design` for reusable sections, menus, and sidebars; map these to host equivalents

## Product Goal

Provide a structured, maintainable publishing system for non-technical editors. The app must manage site pages and reusable presentation content without becoming a freeform design tool that bypasses the host design system.

Public output must inherit the host brand. The editor canvas should render the same semantic components and tokens as the public site while the surrounding editing interface inherits the admin dashboard theme.

## Domain Model

Implement host-equivalent, namespaced models for:

- pages with title, unique slug/path, template, structured blocks, status, visibility, author/updater, SEO fields, publish/schedule timestamps, and preview state;
- immutable or append-only page revisions with actor and restore support;
- reusable sections made from validated block content;
- media assets with storage key/URL, type, dimensions, size, title, alt text, caption/description, focal point, metadata, and usage tracking;
- galleries and ordered gallery items with draft/published/archived states and grid, masonry, carousel, slider, or featured layouts;
- menus, theme locations, nested ordered menu items, labels, destinations, target behavior, and active state;
- sidebars and ordered typed widgets such as recent content, taxonomy, newsletter, custom text, or sanitized HTML;
- global and page-level SEO settings, redirects, sitemap controls, and structured-data settings;
- editor locks with owner, heartbeat, expiry, read-only state, and authorized takeover.

Use normalized tables where records need independent lifecycle, indexing, reuse, or referential integrity. Structured block/widget JSON is acceptable only behind versioned schemas and server validation.

## Public Experience

Build:

- published page resolution by normalized slug/path;
- a safe catch-all route that cannot shadow reserved system or app routes;
- an optional hybrid-rendering adapter so a host may fall back to an existing hardcoded page only when no published CMS page exists;
- rendering for active, validated content blocks; inactive blocks remain editable but produce no public markup;
- menus resolved by configurable theme locations;
- sidebar/widget and gallery rendering;
- draft preview using expiring, unguessable tokens without making drafts publicly discoverable;
- canonical URLs, meta title/description, social metadata, noindex controls, structured data, sitemap participation, and redirects;
- correct exclusion of drafts, scheduled-future content, private content, and disabled dependent-app embeds.

The base block registry should cover the host's common editorial needs: hero, rich text, image/media, call to action, cards/columns, statistics, testimonials, FAQ/accordion, gallery, spacer/divider, and safe embeds. App-specific dynamic blocks must register through an extension contract and render a useful unavailable state in the editor when their source app is disabled.

## Admin Experience

Create a CMS overview and the following complete workflows:

### Pages And Builder

- searchable/filterable page list with status, path, updated time, and author;
- create, duplicate, edit, save draft, publish, schedule, unpublish, archive/delete according to host retention rules, and preview;
- three-part visual builder: structure rail, live canvas, and grouped inspector;
- block insertion, selection, reorder, duplicate, delete, visibility toggle, and responsive preview;
- inspector groups for content, media, layout, and section settings;
- reusable-section save and insert;
- unsaved-change protection and clear save state;
- page quality checks for missing SEO, empty sections, incomplete CTAs, missing alt text, invalid links, and other schema-detectable issues;
- revision history and restore;
- live editor locking so one user edits while others receive read-only access, with administrator takeover and lock expiry.

### Media And Galleries

- upload with host file validation, size limits, type allowlist, metadata extraction, and image optimization;
- searchable media library, picker, metadata editing, alt-text workflow, focal-point/crop support, reuse, and usage inspection before deletion;
- gallery list/editor with ordered items, captions, alt text, layout, status, and public preview;
- optional object-storage adapter with a local-development fallback only if that matches host practice.

### Navigation, Sidebars, SEO, And Redirects

- menu location assignment and nested drag/reorder editing;
- sidebar/widget composition and assignment;
- global SEO settings, page audit, sitemap controls, and redirect CRUD with loop/conflict prevention;
- no hardcoded links from seed data when the relevant destination app is disabled.

## Rules And Integrations

- Sanitize stored or rendered rich text/HTML with an explicit allowlist.
- Validate block schemas on both write and render; unknown block versions must fail safely.
- Scheduled publishing must be idempotent and timezone-safe.
- Media deletion must be blocked or require an explicit reviewed override when active references exist.
- Search and sitemap adapters index only currently published public pages.
- CMS embeds for Blog, Events, Directory, Career Center, Ecommerce, Membership, or forms must depend on public adapter contracts, never those apps' internal pages.
- Bootstrap content must be additive and idempotent and must not overwrite editor changes.

## CMS Acceptance Criteria

- An editor can create a page from blocks, save it, preview it, pass quality checks, publish it, revise it, and restore an earlier revision.
- A second editor receives a read-only lock state and an administrator can take over safely.
- Media can be uploaded once, reused, inspected for references, and rendered accessibly.
- Menus, sidebars, galleries, SEO, redirects, preview, and scheduled publishing work with real persistence.
- Draft/private/future content never leaks through public routes, search, sitemap, embeds, or APIs.
- Disabling CMS hides its admin/public surfaces and dynamic pages while preserving all records and leaving unrelated hardcoded host pages operational.
- Public CMS content adopts host tokens and branding; the builder/admin UI adopts dashboard tokens in light and dark modes.

---
