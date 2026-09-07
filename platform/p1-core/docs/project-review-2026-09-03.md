# Core Platform project review — September 3, 2026

Follow-up: production was subsequently redirected to Railway Postgres and deployment `d3496ee7-2116-4ef8-8eb1-f3c72c2fbe99` passed database-aware readiness. The careers migration defect and destructive ecommerce bootstrap behavior described below were repaired as part of that cutover. The remaining migration-journal detection and fresh-install gaps were then repaired and covered by a disposable PostgreSQL fresh-install/second-start check. Authentication tokens now bind to the current password hash, and required and optional authentication both reject suspended users. Deploying that authentication change intentionally invalidates legacy cookies that do not carry the password-derived session version.

## Assessment

Core Platform is a substantial React/Vite + Express + PostgreSQL/Drizzle application with CMS and visual editing, directory/provider workflows, events, memberships, CRM, ecommerce, careers, portfolio content, permissions, media, backups, and operational tooling. Its separation into routes, services, storage, and shared schemas is a useful foundation. There are 94 `pgTable` declarations and 77 passing test files in the reviewed checkout.

The project remains in stabilization ahead of the theme/section architecture described in `core-project-plan.md`. It is not yet a tenant-isolated platform: the roadmap explicitly defers tenant context, tenant-scoped data, domains, and permissions. There is no reason from this review to accelerate a framework rewrite ahead of stabilization.

The three reproduced release blockers below were repaired after this assessment. Their original evidence and recommendations are retained as the record of why the changes were required.

## Reviewed baseline

- Checkout: `codex/uncommitted-work-audit`, commit `ccaa62c`.
- GitHub refs verified with `git ls-remote`: review branch `ccaa62c`; `main` `b73006e`.
- Review branch is three commits ahead of `main`, with an aggregate diff affecting 466 files. The reconciliation commit includes substantial formatting and cleanup, so file count alone does not establish risk or new functionality.
- Local `main` is behind `origin/main`; the Security Center worktree is at `b73006e`.
- Pre-existing untracked files: root `AGENTS.md` and `docs/master-prompts/`. They were preserved.
- No live Railway deployment, production database, or production integration was inspected or changed.

## Immediate findings

### CP-REV-001 — High: existing sessions survive account suspension and password replacement

`server/middleware/auth.ts:93` verifies a JWT and loads the current user, but only rejects a missing user. It does not reject `isSuspended` or compare a session version. `optionalAuth` has the same suspension gap. Login checks suspension, but that does not stop an already-issued cookie. Password reset/change replaces the password hash without invalidating existing JWTs. Tokens expire after seven days.

**Evidence:** Three isolated probes using the actual authentication middleware and a mocked user store confirmed that a pre-existing token still passes authentication and the admin role check after suspension, optional authentication retains a suspended identity, and a token remains accepted after replacing the stored password hash. These are reproductions of undesirable behavior, not tests showing the application is secure.

**Action:** Enforce suspension in both authentication paths and implement the session invalidation design already proposed in `architecture/security-ops-stabilization-roadmap.md`. Add regression coverage for password reset/change and suspension, with a deliberate transition for existing cookies.

### CP-REV-002 — High: startup replaces edits to seeded ecommerce records

`server/index.ts` calls `runSystemBootstrap()` before serving requests. Bootstrap unconditionally invokes `ensureSystemEcommerce()`. In `server/services/system-ecommerce.service.ts:126`, existing categories matching seed slugs are updated, and existing products matching seed SKUs have their title, descriptions, price, sale price, URL, images, SEO fields, and category assignments replaced with seed values.

**Evidence:** An isolated probe supplied an edited product with SKU `CP-WORKBOOK-001`, custom title/URL, and price `9900`. Bootstrap issued an update replacing those values with the seed title/URL and price `4900`, and also replaced an edited category name. The scope is records matching the seed identifiers, not every product.

**Action:** Separate optional demo seeding from required bootstrap. Preserve existing merchant edits; make any seed refresh explicit. Verify preservation across restarts and ensure deleted demo records do not silently reappear in deployments intended for real content.

### CP-REV-003 — High: fresh database provisioning is incomplete

The journal in `migrations/meta/_journal.json` does not cover all SQL files. The two paths in `server/migrate.ts:505` and `server/migrate.ts:529` perform different reconciliation steps. The fresh-database path omits ecommerce setup, among other gaps. Journal discovery also queries `public.__drizzle_migrations`, whereas the installed Drizzle migrator defaults to `drizzle.__drizzle_migrations`.

**Evidence:** Against a disposable local PostgreSQL 17 container:

1. The actual `runMigrations()` routine returned success on an empty database.
2. Calling the actual `runSystemBootstrap()` then failed with `relation "ecommerce_categories" does not exist`.
3. Running migrations again created ecommerce tables but failed with `relation "career_jobs" does not exist` while applying the career-location change.

The probes used the source routines with `NODE_ENV=test` and an explicitly isolated database URL. They did not start the production server or contact a production database. The disposable container was removed after verification.

**Action:** Reconcile the migration journal and legacy upgrade path, correct journal schema detection, and make one migration run provision a complete database. Require fresh-install and existing-database upgrade tests before release. Avoid casually using schema push against production to mask this discrepancy.

## Release and validation issues

### CP-REV-004 — Medium: documented CI and real workflow coverage are missing

`quality-gates.md` describes an automatic GitHub CI workflow, but this checkout contains no `.github` directory or tracked workflow files. External CI settings and branch protection were not inspected, so this finding is limited to repository-defined automation.

The Playwright suite consists of two responsive CSS fixtures exercised at multiple viewport sizes. It replaces the page body with synthetic markup and does not perform real login, CMS publishing, checkout, or database setup. The 369 passing tests are useful but did not catch the reproduced startup or session defects.

**Action:** Add repository CI and database-backed startup/authentication coverage, then real browser smoke tests for critical workflows. Preserve the responsive fixtures as targeted CSS checks.

### CP-REV-005 — Medium: release state and documentation need reconciliation

The current branch differs from GitHub `main`, and the July QA status says the checkout and main should be aligned. The architecture overview describes `@neondatabase/serverless`, but current code uses `pg` and `drizzle-orm/node-postgres`. Production hosting/database provider cannot be established from that driver alone. The new agent rules also remain uncommitted, so they will not travel with a new clone or worktree based solely on existing commits.

**Action:** Confirm the intended release branch and deployed commit, review the pending reconciliation changes, synchronize canonical status/architecture documents, and include the project rules in the reviewed release. Do not merge stale branches wholesale.

## Validation performed

- Clean dependency install: passed (`npm ci --no-audit --no-fund`).
- TypeScript: passed (`npm run check`).
- ESLint: passed without reported errors or warnings.
- Prettier formatting check: passed.
- Existing Vitest suite: 77 files, 369 tests passed.
- Production build: passed; non-blocking build warnings remain, including large chunks.
- Bundle budgets: passed; shared vendor bundle is 1,068 KiB against its 1,100 KiB limit.
- Four isolated reproduction probes: passed, confirming the authentication and seed-overwrite findings.
- Fresh database migration/bootstrap checks: failed to produce a usable complete schema, as detailed above.

Local probe scripts and logs are retained in ignored `test-results/project-review/`. They are review evidence, not additions to the permanent regression suite. The probe configuration uses mocked storage for the auth/seed checks; migration/bootstrap checks used a real disposable database.

## Recommended sequence

1. Fix session invalidation and seed overwrite behavior before the next release.
2. Repair and verify fresh-install and upgrade migrations.
3. Add CI and critical integration checks, then reconcile release state and project documentation.
4. Resume theme and reusable-section contract work. Defer Neon infrastructure changes, tenancy implementation, Next.js migration, and the agent panel until this baseline is reliable.

Background-job durability, backup/restore consistency under concurrent writes, tenant isolation, and broader security/UI review remain follow-up areas. This review did not validate live payments, email delivery, production backups/restores, public-site rendering, or the deployed environment. No production incident or compromise is established by these findings.
