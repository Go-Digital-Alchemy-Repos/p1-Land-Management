# Blog publication consolidation

## Scope and current boundary

The original Blog list and Content/Layout/SEO editor are already shared between
Core admin and the consolidated dashboard. Presentation reuse does not complete
the accepted requirement for private drafts, revision restore, concurrent editing,
or dynamically published crawler-visible articles.

The September 19 publication foundation is an additive internal service candidate.
It has no routed callers, does not initialize existing posts automatically, and
has not replaced legacy writers, scheduling or the five existing public articles.
Do not treat its presence as a public Blog cutover.

## Approved storage contract

- `blog_publication_state` owns a monotonically increasing mutation version,
  draft/current-published/last-published pointers and a publication generation.
- `blog_post_revisions` stores immutable complete editorial snapshots, actor,
  editor instance, provenance and source revision. Database triggers reject revision
  updates and deletes. Restore makes a new draft; it never silently publishes.
- `blog_publication_routes` owns canonical slugs permanently for each post.
  Withdrawal leaves a tombstone. Renaming withdraws the previous route atomically;
  another post cannot silently take its URL.
- Every mutation takes the common Blog publication transaction lock, locks the
  state and existing lease rows, checks expected version and exact editor-instance
  lease generation, then records the complete change in the same transaction.
- Initialization requires explicit provenance. It stages an unpublished snapshot
  regardless of the legacy published flag. Legacy editorial fields and timing
  provenance are preserved; no legacy row is rewritten by this foundation.
- The normalized legacy fingerprint prevents accepting an unseen legacy mutation.
  This is a temporary cutover guard, not a replacement for coordinating all writers.
- New publication timestamps use timezone-aware storage. Existing legacy columns
  retain their original definitions and data.

The five current website-owned article slugs are reserved until a reviewed import
assigns their exact content, metadata and URL ownership. An empty new CMS catalog
must never replace the existing articles with missing pages.

## Recovery gate discovered in review

The existing backup service captures all public table rows and restores them in a
single transaction. Circular state/revision references require deferred foreign
keys so its restore ordering remains valid; referential integrity still must pass
at commit. A populated round trip must preserve snapshots, pointers, route
withdrawals, generations and timestamps, and a corrupt pointer must roll back.

Historical archives predate these tables. Once publication sidecars contain data,
an archive that omits the publication family or its legacy posts must be rejected
before truncation. Silently leaving newer publication state after restoring older
legacy content is not acceptable. Empty-sidecar historical recovery remains a
required compatibility case. The preflight and restore must serialize against
publication initialization and mutation.

Review also reproduced a preexisting capture defect under a non-UTC process
timezone: a naive `10:11:12.123456` became `14:11:12.123Z`, changing its wall time
and losing microseconds. New archive capture now uses query-local raw text parsers
for PostgreSQL date, timestamp and timestamptz values. Application parsers remain
unchanged. Actual round-trip coverage preserves dates, naive wall times and zoned
instants with microseconds. Previously written archives are not rewritten; their
historical timezone/precision limitations remain a separate recovery boundary.

## Required next integration sequence

1. Inventory and coordinate every legacy writer: CRUD, taxonomy rename/delete,
   scheduler, seed/import paths and generic editor-lock endpoints. A same-user old
   editor must not renew or delete another editor instance's new lease. An old
   hard delete must not strand a published snapshot that cannot be withdrawn.
2. Add authorized versioned editor APIs and the capability-aware dashboard bridge,
   preserving the original editor UI. Route schemas must strictly validate actions
   and payloads. The internal publication reader is not an HTTP sanitizer.
3. Provide private authenticated draft preview, published-safe projections and
   explicit revision restore. Scheduling needs a defined versioned transition;
   it must not remain a legacy mutable published flag.
4. Import the five existing articles with exact URL ownership, genuine dates and
   reviewed editorial content, preserving the last valid live version throughout.
5. Connect published collection/detail contracts to public SSR, matching hydration,
   dynamic routes, metadata, sitemap modification dates and publication caching.
   Withdrawal must invalidate live content; backend failures retain only valid
   published snapshots, never draft content.
6. Verify both editors, stale/same-user tabs, preview privacy, publish/withdraw/
   restore, taxonomy/scheduler behavior, crawler HTML, failure recovery and the
   populated application backup round trip before declaring Blog accepted.

No legacy admin retirement, production content mutation or automatic adoption is
part of the internal foundation release.

## Schema-tooling boundary

P1 startup applies the reviewed SQL migration journal. New schema declarations
must match SQL foreign-key/check/unique names. Deferred constraints and immutable
revision triggers remain SQL-owned because the installed Drizzle model cannot
represent all of their attributes. The copied P1 `db:push` command is disabled with an actionable migration-only
error. Its data-loss flag is not proof of constraint preservation. Review any
future generated migration against the hand-authored journal; its historical
snapshot baseline predates the manual incremental migrations.

The installed Drizzle schema-push introspector also loses composite-column order
when independently joining foreign-key column arrays. A read-only plan suggested
constraint removal/recreation despite `hasDataLoss:false`; matching declarations
alone cannot make that tool safe. Acceptance therefore uses exact PostgreSQL
catalog constraint/deferral/trigger assertions and the actual migration runner,
not a claimed zero-difference push plan. No schema-push plan was applied.

## Candidate validation

- Specialist actual PostgreSQL publication tests cover initialization, CAS,
  exact-instance leases, immutable revisions, draft/public separation, restore,
  withdrawal, ownership, legacy drift and rollback. Final counts are recorded in
  the release handoff after schema freeze.
- Parent independently reran five populated publication backup tests successfully.
- Parent ran 29 existing backup unit/database tests under `America/New_York`,
  then the 11 database tests under `UTC`; all passed. The timezone regression
  failed before the capture correction, proving it exercises the defect.
- Parent Core typecheck and full production build passed. The disabled schema-push
  command returned the expected nonzero migration-only error without DB access.
- Production backup status was read before release: September19 08:56 Eastern,
  52 tables/584 rows/0 media records, stack `p1-land-management`. No manual backup,
  restore or retention operation was invoked during this check.

Rollback for this unexposed increment is the previously verified runtime revision;
leave additive empty tables in place, do not drop history. Once adoption/publication
starts, rollback and historical-archive compatibility require the explicit cutover
and reconciliation acceptance above.
