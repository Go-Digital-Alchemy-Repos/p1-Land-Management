# Stabilization Sprint Changelog

Summary of all completed work from the Core Platform stabilization sprint.

---

## Recent Product App Additions

- **Added CRM pipeline app**
  - Lead stages: new, contacted, qualified, proposal, won, lost
  - Drag-and-drop lead movement
  - Lead notes and tasks
  - Manual lead creation
  - Inbound lead deduplication by email or phone
  - Automatic client creation when a lead moves to won
- **Expanded CRM client profiles**
  - Individual/business client types
  - Contact, company, billing, onboarding, account owner, service dates, renewal date, internal tags, notes, and tasks
  - Client search and status filtering
- **Added ecommerce module with Stripe checkout**
  - Public shop, product detail, cart, checkout, order success, and order lookup pages
  - Admin product, category, coupon, order, shipping, refund, and ecommerce Stripe settings areas
  - Ecommerce-specific Stripe settings, payment intents, and webhook handler
  - Orders, customers, line items, coupons, refunds, shipping zones/rates, shipments, and processed webhook event tables
- **Seeded starter shop catalog and navigation**
  - Starter categories and products are added during system bootstrap when missing
  - CMS shop shell and main navigation shop item are added without overwriting existing content
- **Added site feature app configuration**
  - Directory, blog, events, CRM, and ecommerce can be toggled from system configuration
  - Ecommerce public/admin APIs are feature-gated
- **Added platform performance guardrails**
  - Bundle budget script added as `npm run budget`
  - Frontend code-splitting and module-boundary docs updated to protect public bundle size
- **Improved public prerender fallback behavior**
  - Static prerender fallback stays hidden after app boot to avoid duplicate content flashes

---

## Build Stabilization (Phase A)

- **Fixed all 62 TypeScript build errors** across 6 files
  - `therapist-profile-page.tsx`: Aligned property names to actual schema columns (`instagramHandle` vs `instagramUrl`), removed references to non-existent fields
  - `applications.routes.ts` + `application.routes.ts`: Fixed Express v5 `req.params.id` typing (`string | string[]` → `string`)
  - `cms-menus.ts`: Fixed `z.lazy` input/output type mismatch on `openInNewTab`
  - `application-page.tsx`: Changed `variant="link"` to valid shadcn Button variant
  - `profile-edit-page.tsx`: Fixed `[...new Set()]` spread issue
- **Added ESLint configuration** with `lint` script (`eslint client/src server shared`)
- **Added Vitest test framework** with `test` script
- **`npm run check` now passes cleanly** (0 errors)

## Database Integrity (Phase C)

- **Added composite index** `idx_tp_directory_filter` on `therapist_profiles(isApproved, isActive, practiceMode, acceptingClients)` for common directory filter pattern
- **Added visibility index** `idx_tp_visibility` on `therapist_profiles(isApproved, isActive)`
- **Added GIN indexes** on `therapist_profiles.specializations` and `therapist_profiles.languages` array columns for efficient array containment queries
- **Added unique constraint** on `cms_pages.slug`
- **Audited and added missing FK constraints** (e.g., `cms_page_revisions.pageId → cms_pages.id`)

## Security Hardening (Phase D)

- **Added origin checking middleware** (`originCheck`) for state-changing requests
- **Configured Helmet CSP** with proper directives for Stripe, R2, Google Fonts, OpenStreetMap
- **Added per-endpoint rate limiters** (login, register, password reset, guest messages, global API)
- **Added request body size limits** (1 MB for JSON and URL-encoded bodies)
- **Added sensitive data redaction** in request logs (passwords, tokens, emails, PII)
- **Added production secret enforcement** (`enforceRequiredSecrets()`) — missing secrets cause immediate exit

## Directory Search Improvements (Phase B)

- **Added Zod validation** for directory search query parameters (`therapistSearchSchema`)
- **Added paginated listing** (`listProfilesPaginated()`) with proper total count
- **Added filter options endpoint** (`/api/therapists/filters`)
- **Added featured therapists endpoint** (`/api/therapists/featured`)
- **Added `paramString()` utility** for safe Express v5 param handling

## Frontend Improvements (Phase E)

- **Route-level code splitting** via `React.lazy()` for all page components
- **TanStack Query v5** with global defaults (5min stale, 10min GC, no window-focus refetch)
- **Theme system** with multiple presets and custom override support
- **CMS hybrid rendering** — pages check CMS first, fall back to hardcoded components

## Observability (Phase F)

- **Structured logging** via Pino with named sources (http, email, r2, stripe, auth, app, db, cms, metrics)
- **Request ID middleware** — UUID per request via `AsyncLocalStorage`, returned in `X-Request-Id` header
- **Health check endpoints** — `/api/health` (liveness) and `/api/health/ready` (readiness with DB check)
- **Metrics endpoint** — `/api/health/metrics` for in-memory request metrics
- **Error handler** with correlation IDs and environment-aware error messages

## Service Layer (Phase G)

- **Email service** (`email.service.ts`) — centralized email template rendering and dispatch
- **R2 service** (`r2.service.ts`) — file upload/delete/signed URL operations
- **Background check service** (`background-check.service.ts`) — provider verification workflow
- **Scheduled publish service** (`scheduled-publish.service.ts`) — CMS timed publishing

## Testing Infrastructure

- **Added 65 tests** across 5 test files:
  - Directory search/filtering logic (44 tests)
  - Auth middleware — password hashing and token generation (7 tests)
  - Request validation middleware (3 tests)
  - Logger utility (9 tests)
  - Route helpers (2 tests)
- **All tests pass** with Vitest

## Additional Improvements

- **Dynamic robots.txt** generation with SEO settings support
- **Dynamic sitemap.xml** generation from CMS pages, blog posts, and events
- **URL redirect middleware** with database-driven redirect rules
- **Stripe webhook signature verification** for payment event processing
- **Provider application workflow** with multi-step process (credentials, references, background checks, interviews, decisions)

## Task Mapping

| Task | Area | Summary |
|------|------|---------|
| #1 | Build Stabilization | Fix 62 TypeScript errors, add lint/test scripts |
| #2 | Schema & Types | Align schema types, fix Zod schemas |
| #3 | Directory Search | Pagination, filters, Zod validation |
| #4 | DB Indexing | Composite/GIN indexes, FK constraints |
| #5 | Security | Helmet CSP, rate limiting, origin check |
| #6 | Auth Hardening | JWT cookies, secret enforcement, role guards |
| #7 | Frontend Loading | React.lazy code splitting, query config |
| #8 | Cache Strategy | TanStack Query defaults, cache invalidation |
| #9 | Observability | Pino logging, request IDs, health endpoints |
| #10 | Error Handling | Error handler middleware, correlation IDs |
| #11 | Service Layer | Email, R2, background check services |
| #12 | CMS | Block builder, hybrid rendering, menus |
| #13 | Stripe Integration | Subscriptions, webhooks, recording purchases |
| #14 | Application Workflow | Multi-step provider applications |
| #15 | SEO & Sitemap | robots.txt, sitemap.xml, structured data |
