# CMS page concurrency repair

Status: Orchestrator-reviewed implementation plan. The Orchestrator authorized backend/contracts and bounded menu CAS on September 19, 2026. Both editors must be integrated and validation accepted before release. This document grants no deployment authority.

## Contract

Page responses expose `version` (positive integer). Existing-page save, publish, unpublish, schedule, revision restore, delete, and explicit menu-reference cleanup require JSON fields `expectedVersion`, `editorInstanceId` (UUID), and `leaseId` (UUID). Scheduling also carries `scheduledAt`; existing force query semantics remain. Creation and duplication do not overwrite a source and require no existing-page lease.

Page acquisition takes `{editorInstanceId}`. Heartbeat/release take `{editorInstanceId,leaseId}`. The existing lock row ID is the lease generation. Responses retain `ownedByCurrentUser`, add `ownedByCurrentEditor`, and expose nullable `lock.editorInstanceId`. GET/list has no instance context and never proves editor ownership. Different tabs belonging to the same user do not share an instance or lease. Missing old-client preconditions return 400 `CMS_CONCURRENCY_REQUIRED` with a reload instruction. Stale page/menu versions return 409 `CMS_PAGE_STALE`/`CMS_MENU_STALE`; absent, expired or mismatched leases return 409 `CMS_PAGE_LEASE_LOST`.

Menu responses expose `version`. Update/delete requires `expectedVersion`. Page relationship transforms and menu-location reassignment increment every changed menu's version. Menu CAS is required because transactionally synchronizing links alone cannot prevent a later stale full-JSON save from overwriting the synchronized links.

## Transaction boundaries

Add integer versions (default 1, non-null) to pages/menus and a nullable editor-instance ID to existing lock rows; retain all data. Page mutation and lease operations serialize on one transaction-scoped advisory resource lock. Mutations resolve the canonical ID, lock/read the page and lease, compare database-time expiry, exact user/instance/lease and version, then commit the page, its revisions and relevant menu transforms together. Expired leases cannot be refreshed. A stale release cannot delete its successor. The authorization linearization point is the lease check while the shared resource lock is held; short lock timeouts bound contention.

All menu writes and page relationship transforms share a separate menu transaction lock. Lock order is page resource first, menu lock second; menu writers never acquire a page resource lock. Derive transforms from current locked rows. Existing menus capability remains required for explicit cleanup. Restore changes title/content only and synchronizes page-derived labels; it does not broaden historical restore semantics.

Scheduled publishing remains a trusted internal operation, never an externally selectable bypass. It atomically publishes due rows and increments versions. Existing authorized schedules continue even with open editors; stale editor writes then conflict. Every direct page writer, including the seed script, increments versions. Creation/initial revision and duplication/initial revision are transactional. Duplication reads one coherent source-row snapshot before creating the copy; it does not lock or mutate the source, and may intentionally copy the snapshot that existed immediately before a concurrent source edit.

## Owned implementation surfaces

- `platform/p1-core/shared/schema/{cms-pages,cms-menus,editor-locks}.ts`, additive `p1-migrations/0003_cms_page_concurrency.sql` and `p1-migrations/meta/_journal.json`.
- New Core concurrency utilities, fenced page-lease service and transactional page/menu mutation services in `server/services`.
- `server/routes/admin/{cms,cms-menus,editor-locks}.routes.ts` and existing page/menu/revision storage; `cms-relationships.service.ts` pure transforms remain authoritative.
- `server/services/scheduled-publish.service.ts` / page storage scheduler and `scripts/seed-cms-pages.ts`.
- `lib/api-spec/dashboard.openapi.json`, generated dashboard clients/models, gateway `marketing-cms.transport.ts` and tests. DELETE bodies must explicitly survive transport.
- Coordinated client integration, owned separately: native PageManager/usePageReservation/CmsMenus; retained Core page editor/use-editor-lock/menu editor. No user-only lease fallback.

## Migration and release ordering

1. Apply additive columns before application code that selects them. No drop, rename or destructive backfill.
2. Integrate both hosts and generated API against the same contract. Use returned page/menu versions after each confirmed mutation; never retry stale writes with a newly fetched version silently.
3. Release backend enforcement and updated editors together after staging. Old cached tabs receive reload-required errors. Do not preserve blind-write compatibility.
4. Preserve the added columns on rollback. Rolling back to blind writers suspends the concurrency guarantee and requires an explicit release decision; restoring old UI alone is not a safe compatibility workaround.
5. Legacy user-only page leases may expire normally. They cannot authorize protected writes or be taken over silently by a new tab.

## Required validation

Use disposable loopback PostgreSQL only. Verify competing saves have exactly one winner; rejected writes create no revision/relationship effects; an injected menu failure rolls back page and revisions; same-user tabs cannot share, heartbeat or release another instance; expiry/reacquire plus delayed old heartbeat/release cannot alter the successor; wrong-user writes fail; stale publish/unpublish/schedule/restore/delete reject; scheduler increments version, works under an open lease, and races safely with reschedule/unpublish; stale menu saves cannot revert synchronized page links; menu location reassignment increments displaced versions. Test create/duplicate revision atomicity and title/content-only restore.

Add route/transport contract tests for missing preconditions, stable domain codes, canonical-ID lease resolution, unchanged capability boundaries and DELETE body forwarding. Run Core typecheck/build, generated contract checks and both editor adapter tests. Browser validation must cover same-user tabs, retained drafts after conflicts and explicit reacquisition. Final acceptance belongs to the Orchestrator; no partial-parity claim before all assigned gates pass.

Relationship cleanup returns the unchanged page `version` because it changes menus only. Each affected menu version increments in the same transaction. The lease expiry is checked again with database time after waiting for menu locks, before any mutation.

## Implementation evidence (September 19, 2026)

Migration `p1-migrations/0003_cms_page_concurrency.sql` adds only `cms_pages.version`, `cms_menus.version` (integer, non-null, default 1) and nullable `editor_locks.editor_instance_id`. The fixture executes the migration twice. Existing nullable legacy lease instances cannot authorize new protected mutations; they expire normally. Migration application must precede the new Core application starting/serving reads because Drizzle selects the new columns even on read endpoints. Apply through the existing migration runner; do not drop these columns on rollback. Both editor hosts and the gateway contract must ship with enforcement. Cached clients fail closed with a reload instruction.

Validation uses a disposable PostgreSQL18 container bound to `127.0.0.1:55441`, database `cms_concurrency_test`. `CMS_CONCURRENCY_TEST_DATABASE_URL` is mandatory to run the database suite; without it that suite explicitly skips. The suite rejects non-loopback hosts and databases without test/fixture/acceptance names. It creates only its four CMS fixture tables and uses real PostgreSQL transactions, row/advisory locks, unique constraints and failure triggers. It mocks only the database connection and unrelated storage imports, not transaction behavior. This is scoped migration/transaction evidence, not proof of a full production database migration or a production deployment.

Executed checks:

- `CMS_CONCURRENCY_TEST_DATABASE_URL=<isolated-loopback-fixture> pnpm --dir platform/p1-core exec vitest run server/services/cms-page-concurrency.database.test.ts server/__tests__/cms-relationships.service.test.ts server/__tests__/editor-locks.service.test.ts server/routes/admin/editor-locks.routes.test.ts server/routes/business-center-cms.routes.test.ts`: 81 passed, including 11 database tests.
- `pnpm --dir artifacts/api-server exec tsx --test ../../lib/api-client-react/tests/dashboard-concurrency.test.ts src/dashboard/marketing-cms.test.ts`: 20 passed. Tests cover generated DELETE bodies and exact gateway forwarding, with legacy unrelated DELETE behavior retained.
- `pnpm --dir platform/p1-core exec tsc --noEmit`, `pnpm --dir platform/p1-core run build`, and `pnpm --dir artifacts/api-server run typecheck`: passed.
- `pnpm --dir lib/api-spec run codegen:dashboard`: passed; generated outputs accompany the source contract.

Browser acceptance and both clients' lifecycle behavior remain separately owned by the Orchestrator/client integration task. No production mutation, migration application, deployment, commit or release was performed by this backend task.

Production startup (`server/index.ts`) awaits `runMigrations()` before `runSystemBootstrap()`, route registration, and listening. `server/migrate.ts` selects only `p1-migrations`; `script/build.ts` copies that directory to `dist/p1-migrations`. Nonproduction startup does not auto-apply migrations; use the existing `db:verify` command against an explicitly selected local database. The legacy/upstream `migrations` directory is not a P1 deployment migration source.

A second database gate, `server/services/cms-page-migration.database.test.ts`, applies the three prior P1 journals to a **fresh** loopback fixture database with real Drizzle, inserts existing page/menu/legacy-lease rows, and calls the actual `runMigrations()` twice. It passed with four journal entries, retained record content, version 1 defaults, and null legacy lease instance. Run with `CMS_MIGRATION_TEST_DATABASE_URL=<fresh-loopback-fixture> pnpm --dir platform/p1-core exec vitest run server/services/cms-page-migration.database.test.ts server/migrate.test.ts` (3 tests passed). Unlike the scoped concurrency fixture, this gate creates the complete prior P1 schema. It refuses a nonempty database and never drops one. Build packaging was re-run: `dist/p1-migrations/0003_cms_page_concurrency.sql` matches source, and the packaged journal contains the new entry. The upstream legacy migration journal remains unchanged.

The post-migration-path Core build passed. Its concurrent full typecheck reported one separately owned UI error in `client/src/components/shared/company-information-card.tsx` (nullable BrandingSettings companyName); the earlier full typecheck passed, and no backend type errors were reported. The Orchestrator was notified for integration resolution.

Orchestrator final integration check: both current Core and dashboard TypeScript checks pass after the concurrent contact-card type fix. Parent independently reran the11 actual PostgreSQL concurrency cases successfully. Native browser tests verified same-user second-tab read-only behavior, a successful save, and stale-write rejection retaining unsaved content; immediate reservation release on abrupt tab close was not confirmed.
