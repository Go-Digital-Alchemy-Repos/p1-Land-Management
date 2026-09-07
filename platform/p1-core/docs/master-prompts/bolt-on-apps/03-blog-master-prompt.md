# Blog Bolt-On App — Master Prompt

Append this prompt to [00 — Universal Bolt-On App Contract](./00-universal-bolt-on-app-contract.md).

---

Build the complete **Blog / Insights** bolt-on app described below.

## App Registration

- App id/slug: `blog`
- Display name: configurable, default `Blog`
- Core Platform public label: `Insights & Articles`
- Core Platform feature key: `blogEnabled`
- Core Platform persisted setting: `system_configuration.enable_blog`
- Core Platform default: enabled; use disabled for a fresh external installation unless explicitly configured otherwise
- Public routes: `/insights`, `/insights/:slug`
- Admin route family: `/admin/cms/blog` with posts, settings, and comments views
- Public API family: `/api/blog`
- Admin API family: `/api/admin/blog`
- Core permission: `content`; map create/edit/publish/moderate privileges to host permissions

## Product Goal

Provide a complete editorial publishing app for posts, categories, tags, featured layouts, SEO, sidebars, and moderated comments. It must work as a standalone bolt-on while integrating with the CMS when available.

If CMS is disabled or absent, Blog must still render its own archive and detail pages with host layout primitives. CMS-only enhancements such as reusable sidebars or page-builder preview blocks must degrade cleanly.

## Domain Model

Implement host-equivalent, namespaced models for:

- posts with title, unique slug, excerpt, rich body, featured image and alt/focal data, author, status, visibility, featured state/order, publish/schedule timestamps, SEO fields, and created/updated timestamps;
- taxonomies supporting category and tag types, stable slugs, descriptions, active state, and post assignments;
- comments with post, authenticated user or guest identity, sanitized body, status, moderation metadata, timestamps, and safe request metadata needed for abuse controls;
- blog settings for labels/copy, archive layout, featured presentation, pagination/load-more mode, posts per page, sidebar assignment, comments, guest comments, moderation, links, and spam controls;
- editor locks and revisions when the host's shared editing facilities support them.

## Public Experience

Build:

- archive with featured article treatment, post grid/list, taxonomy filters, bounded pagination or load more, and empty states;
- detail page with article semantics, author/date/taxonomy metadata, featured media, sanitized rich text, share controls when configured, related content where appropriate, and canonical/SEO/structured data;
- category/tag views or equivalent filterable URLs using stable slugs;
- comments display and submission according to sitewide and post-level settings;
- guest comment validation requiring name and valid email when guest comments are enabled;
- pending-comment behavior that does not disclose moderation or spam decisions;
- CMS preview block adapter for recent, featured, or filtered posts when CMS is enabled;
- unified search, sitemap, feed, and related-content participation for published public posts only.

Never expose drafts, scheduled-future posts, hidden/rejected/spam comments, commenter email addresses, private moderation notes, or raw request metadata.

## Admin Experience

Create a Blog workspace with:

- searchable/filterable post list and status indicators;
- create/edit post with title, slug, excerpt, rich content, media, author, category, tags, featured state, SEO, and publish controls;
- save draft, preview, publish, schedule, unpublish/archive/delete according to host retention rules, and duplicate;
- stable category/tag CRUD with duplicate prevention and usage awareness;
- settings for archive/featured layouts, labels, page size, sidebar, comments, guest access, approvals, links, and spam prevention;
- comment queue with search/filter and approve, hide/spam, reject, and delete actions;
- live editor lock/read-only/takeover behavior matching the shared host editor;
- clear save state, unsaved-change protection, validation, and query invalidation.

## Rules And Integrations

- Sanitize rich text and comment content on the server.
- Normalize and uniquely enforce post and taxonomy slugs.
- Put comment submission behind host-appropriate rate limiting and abuse prevention.
- Use host media and email adapters; send moderation/author notifications only when configured.
- Treat CMS sidebars as an optional adapter. Provide a native Blog sidebar configuration if no CMS sidebar capability exists.
- Search, feeds, sitemap, structured data, and CMS embeds must all obey Blog's feature toggle and publication rules.
- Scheduled publishing and notification work must be idempotent.

## Blog Acceptance Criteria

- An editor can draft, preview, publish/schedule, categorize, tag, feature, and revise an article.
- Visitors can browse the archive, filter taxonomy, read accessible articles, and submit comments only under configured rules.
- Administrators can configure presentation and moderate comments without exposing commenter email or private metadata publicly.
- Blog remains usable without CMS; CMS blocks/sidebars integrate when CMS is enabled.
- Disabling Blog removes archive/detail routes, admin navigation, APIs, search/feed/sitemap records, comments, and embeds while preserving all post, taxonomy, setting, and moderation data.
- Blog public pages inherit host brand tokens and admin pages inherit dashboard tokens in light, dark, and responsive states.

---
