# Core Platform — Stabilization & Improvement Plan

Generated from full codebase audit. Non-destructive; preserves all existing features.

---

## Audit Findings

### TypeScript Build Errors (62 lines of diagnostics, 6 files)

| File | Errors | Root Cause |
|------|--------|------------|
| `client/src/features/directory/therapist-profile-page.tsx` | 18 | References `address`, `instagramUrl`, `education`, `sessionFee`, `sessionLength`, `insuranceAccepted` — none exist on `TherapistProfile` schema. Schema columns use `Handle` suffix (e.g. `instagramHandle`) and lack `address`, `education`, session detail fields. |
| `server/routes/admin/applications.routes.ts` | 18 | Every `req.params.id` usage passes `string \| string[]` where `string` is expected (Express v5 param typing); one `isApproved` property used in `updateUser()` but `users` table has no `isApproved` column. |
| `server/routes/application.routes.ts` | 2 | Same Express v5 `req.params.id` typing mismatch. |
| `shared/schema/cms-menus.ts` | 1 | `z.lazy` + `.default()` creates input/output type mismatch on `openInNewTab`. |
| `client/src/features/therapist/application-page.tsx` | 1 | Button `variant="link"` is not a valid shadcn Button variant. |
| `client/src/features/therapist/profile-edit-page.tsx` | 1 | `[...new Set()]` needs `downlevelIteration` or `target ≥ es2015`. |

### Package Scripts

- `dev`, `build`, `start`, `check`, `db:push` exist.
- No `lint`, `test`, or `format` scripts.

### Test & Lint Setup

- No test framework (no jest/vitest config).
- No ESLint config at project root.

### Auth / Session Secret

- `SESSION_SECRET` falls back to `"dev-secret-change-me"` in dev.
- Production enforcement via `enforceRequiredSecrets()` in `security.ts` — exits on missing or default secret. Good.
- `settings.storage.ts` also uses `SESSION_SECRET` as an encryption key with same fallback. Acceptable for dev, enforced in prod.

### Directory Search

- Server: `TherapistStorage.listProfiles()` with filter builder, pagination, country/language/specialization/practiceMode/acceptingClients/willingToTravel filters. Uses `ilike` for text search against name/title/bio/city/credentials. Returns `TherapistWithUser`.
- Client: `directory-page.tsx` manages filter state, debounced search, paginated fetch. Map toggle. Adequate for current scale (<1k profiles).
- Scalability concern: full-text search via `ilike` won't scale past ~5k profiles with complex filters.

### Schema Indexes

- 45+ B-tree indexes already defined. Key tables well-indexed.
- Missing: no composite index on `therapist_profiles(isApproved, isActive, country)` for filtered directory queries; no GIN index on `specializations` array column.

### Logging

- Structured logger in `server/utils/logger.ts` with named sources (http, email, r2, stripe, auth, app, db). Request ID middleware exists. Adequate foundation.

### Route File Sizes

- `application.routes.ts` (551 lines), `applications.routes.ts` (479 lines) are the largest. Not critical to split now but candidates for Phase H.
- `block-renderer.tsx` (1481 lines), `block-registry.ts` (1108 lines) are large frontend files. Noted.

### React Query Caching

- Global defaults: `staleTime: 5min`, `gcTime: 10min`, no window-focus refetch, no retry. Reasonable but everything shares the same stale time.

### Frontend Loading

- `App.tsx` (285 lines) uses `React.lazy()` for most pages. Route-level code splitting in place.

---

## Implementation Phases

### Phase A: Build Stabilization & Quality Gates
**Goal**: `npm run check` passes cleanly; add lint/test scaffolding.

1. Fix all 62 TypeScript errors:
   - `therapist-profile-page.tsx`: align property names to actual schema columns (`instagramHandle` not `instagramUrl`, etc.); remove references to non-existent fields (`address`, `education`, `sessionFee`, `sessionLength`, `insuranceAccepted`) or render them conditionally from available data.
   - `applications.routes.ts` + `application.routes.ts`: cast `req.params.id as string` (Express v5 returns `string | string[]` for params).
   - `applications.routes.ts` line 133: `isApproved` is on `therapistProfiles`, not `users`. Fix to update therapist profile instead. Already handled: `isApproved` is set on `therapistProfiles` table.
   - `cms-menus.ts`: move `MenuItem` interface before `menuItemSchema` or adjust `z.lazy` to avoid input/output mismatch.
   - `application-page.tsx`: change `variant="link"` to `variant="ghost"`.
   - `profile-edit-page.tsx`: add `"es2015"` to `tsconfig.json` target or use `Array.from()`.
2. Add `lint` script (use `tsc --noEmit` alias or add ESLint later).
3. Document remaining risks.

### Phase B: Directory Search Scalability
**Goal**: Prepare for >5k profiles without full rewrite.

1. Add GIN index on `specializations` array column.
2. Add composite index `(isApproved, isActive, country)` for common directory filter pattern.
3. Add `pg_trgm` trigram index on name/bio for faster text search (optional, deferred).
4. Add cursor-based pagination option for directory API.
5. Consider server-side `tsvector` column + GIN index for full-text search (major, deferred).

### Phase C: DB Indexing & Relational Integrity
**Goal**: Ensure all foreign keys are explicit; add missing indexes.

1. Audit all `varchar` FK columns — confirm they have `references()` declarations.
2. Add missing FK constraints (e.g., `cms_page_revisions.pageId → cms_pages.id`).
3. Add unique constraint on `cms_pages.slug`.
4. Review migration numbering (duplicate `0003_*` and `0004_*` prefixes exist).

### Phase D: Security Hardening
**Goal**: Strengthen input validation, CSRF, and secret handling.

1. Enable CSRF protection for state-changing endpoints (double-submit cookie or SameSite=Strict).
2. Audit all admin routes for consistent `requireAdmin` middleware.
3. Add request body size limits on JSON endpoints.
4. Add Stripe webhook signature verification audit.
5. Review `sanitize-html` usage — ensure it's applied to all user-generated HTML content.
6. Enforce HTTPS-only cookies in production.

### Phase E: Frontend Loading & Cache Strategy
**Goal**: Differentiate cache policies; improve perceived performance.

1. Categorize queries by freshness need: `STATIC` (specializations list, theme), `SESSION` (user profile, current user), `LIVE` (notifications, events).
2. Apply `staleTime` overrides per query category.
3. Add optimistic updates for common mutations (save/unsave professional, mark notification read).
4. Consider prefetching for directory → profile navigation.

### Phase F: Observability & Operations
**Goal**: Production debugging and monitoring readiness.

1. Add `npm run health` script that hits `/api/health`.
2. Add structured error logging with correlation IDs on all API error responses.
3. Add slow-query logging (log queries > 500ms).
4. Add `/api/admin/system/health` extended health check (DB connectivity, Redis/memory store, R2 reachability).

### Phase G: Service/Support Layer Refinement
**Goal**: Clean service boundaries and reduce route-level business logic.

1. Extract email-sending logic from routes into `email.service.ts` (already partially done).
2. Extract Stripe-related logic from webhook handler into `stripe.service.ts`.
3. Ensure all storage methods return typed results (no `any`).

### Phase H: Route Decomposition & Documentation
**Goal**: Keep route files maintainable; improve onboarding docs.

1. Split `application.routes.ts` (551 lines) into sub-routers if it grows further.
2. Split `applications.routes.ts` (479 lines) similarly.
3. Keep `replit.md` up to date with architectural decisions.
4. Add API route documentation (consider auto-gen from route definitions).

---

## Priority Order

| Priority | Phase | Risk | Effort |
|----------|-------|------|--------|
| 1 | A — Build stabilization | Low | Small |
| 2 | C — DB integrity | Low | Small |
| 3 | D — Security hardening | Medium | Medium |
| 4 | B — Search scalability | Low | Medium |
| 5 | E — Cache strategy | Low | Small |
| 6 | F — Observability | Low | Medium |
| 7 | G — Service refinement | Low | Medium |
| 8 | H — Route decomposition | Low | Large |
