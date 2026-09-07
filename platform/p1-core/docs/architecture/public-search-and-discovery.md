# Public Search & Discovery

Public search is a unified discovery layer for pages, CMS content, events, blog posts, careers, portfolio projects, and other public records.

## Endpoint

`GET /api/search?q=...`

The route is registered inline in `server/routes/index.ts` and delegates to `searchPublicSite(query)`.

## Indexed Sources

Search documents can come from:

- CMS pages
- fallback hardcoded system pages
- blog posts
- events
- career jobs
- portfolio projects
- ecommerce products where supported by the active implementation

Fallback page records make core pages searchable even when a CMS-managed version does not exist.

## Matching Model

Search scoring is intentionally lightweight and in-process.

Scoring considers:

- exact title match
- title contains query
- path contains query
- body contains query
- per-term matches across title, body, and path

Results include a type, title, URL, optional metadata, and excerpt. Excerpts are built around the first query or term match when possible.

## Feature Flags

Search should respect site feature availability. If a module is disabled, its public records should not become discoverable through search.

## Maintenance Rules

- Add a fallback page document when introducing an important hardcoded public page.
- Add a source collector when introducing a new public content module.
- Prefer searchable text that reflects what users see, not admin-only metadata.
- Keep snippets free of private fields, unpublished drafts, and payment/customer data.

## Related Files

- `server/services/public-search.service.ts`
- `server/routes/index.ts`
- `shared/types/public-search.ts`
- `client/src/features/public/search-results-page.tsx`
- `client/src/components/layout/navbar-search-popover.tsx`
