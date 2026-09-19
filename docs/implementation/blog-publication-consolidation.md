# Blog publication consolidation

## Scope and current boundary

The original Blog list and Content/Layout/SEO editor are already shared between
Core admin and the consolidated dashboard. Presentation reuse does not complete
the accepted requirement for private drafts, revision restore, concurrent editing,
or dynamically published crawler-visible articles.

The September 19 foundation initially shipped as an internal service. The
coordinated cutover below adds routed editors and public delivery. Existing posts
are never adopted automatically; the five website-owned articles remain separate
pending their reviewed import. Release evidence is recorded below.

## Approved storage contract

### Coordinated editor/public delivery candidate

The coordinated cutover is deployed at `e6125fb9`; full acceptance remains open.
Both editor hosts now use the same publication APIs. The private `/blog/publications`
collection returns explicit legacy-adoption state or a versioned draft envelope.
New creation and reviewed adoption return an exact editor-instance lease. Actions
require version and lease proofs: Save changes only the draft; Save & Publish is
explicit; Restore creates a draft; scheduling pins an immutable revision rather
than publishing whatever happens to be in the editor later. Failed schedules must
remain visible to staff. Existing mutable writers must reject adopted records.

The public `/api/website/blog-publication` projection is a complete,
sanitized published collection. A successful empty collection removes dynamic
articles, while the five reserved website-owned articles remain. Missing dynamic
slugs return genuine 404 responses. Public snapshots omit draft, history, actor,
lease and adoption details. SSR, hydration, metadata and sitemap must consume the
same version. Temporary provider failure may retain the last valid published
collection; withdrawal during an outage is therefore not an immediate guarantee.

Publication capacity checks and the public endpoint share one serializer:
at most 1,000 published entries, 262,144 UTF-8 bytes of sanitized content per entry,
and 4,194,304 bytes for the whole envelope. Reject over-capacity publication with
an actionable error rather than truncate content or silently retain an older
public version. Private draft storage is not reduced by these public limits.

Release requires both editors, writer fences, scheduling, public delivery and
recovery checks together. Generating client types or exposing a bridge route alone
does not establish a working publication workflow.

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

## Concrete cutover touchpoints

The next coordinated change must include both editor controllers
(`artifacts/p1-dashboard/src/marketing/BlogManager.tsx` and retained
`client/src/features/admin/cms/cms-blog-editor-page.tsx`), the native
`useBlogReservation.ts`, retained Blog list deletion, and the Core CRUD router.
The native bridge is `artifacts/api-server/src/dashboard/marketing-cms.transport.ts`;
Core capability forwarding is in `business-center-cms.routes.ts`.

The approved implementation direction is a read envelope preserving existing
editorial field names plus version, revision pointers, visibility, publication
generation and authoritative timestamps. Mutations must carry expectedVersion,
editorInstanceId and leaseId, with explicit publication/withdrawal/restore actions.
A display-only `isPublished` projection must not turn ordinary draft save into an
implicit publication. New-post creation must create the legacy identity and initial
publication snapshot atomically rather than leave a partially initialized post.

`storage/blog.storage.ts` also writes posts during taxonomy rename/delete and
`publishScheduledPosts`; `services/scheduled-publish.service.ts` invokes the latter.
They cannot be left writing around the new versioned editor. Scheduling should pin
an exact immutable revision and due instant; later draft edits must not silently
change scheduled publication. The worker needs its own versioned system transition,
not a forged editor lease. Schedule cancellation/replacement must be race-tested.
This requires an explicit additive scheduling contract before implementation.

Public Blog list/detail and comment visibility in `server/routes/blog.routes.ts`
must use the same publication authority. Existing website articles and index in
`artifacts/p1-website/src/pages/blog/` remain authoritative until reviewed import,
URL ownership transfer and crawler/public-render equivalence are accepted.

## Coordinated cutover validation — September 19

Implemented together: both editors and generated client contract, exact-instance
leases, explicit legacy adoption, draft-only saves, publish/withdraw/restore,
pinned schedules and visible failure codes, legacy CRUD/seed/taxonomy/scheduler
fences, private sanitized preview, and the published website consumer. The public
consumer resolves registered CMS images through existing public same-origin paths;
unknown/private images reject publication rather than disappear silently. Original
publication dates and latest publication modification dates remain distinct.

The server keeps the full published collection. Unrelated pages receive no Blog
payload; the index receives bounded card metadata, initially displays 24 entries,
and supports Load more; article routes receive only their matching revision.
Listing metadata has its own 262,144-byte limit. Public route HTML, navigation
snapshots and sitemap use the same collection revision. Existing static CMS field
identities, including the Read Article label, are preserved.

Independent parent validation completed before release:

- 32 actual PostgreSQL publication tests and 11 private-route/lease tests.
- Six populated backup/recovery tests and one actual migration-runner test.
- 15 native editor tests and seven retained-editor/lease-hook tests.
- 15 public projection/media/route tests and 26 website cache/HTTP tests.
- 20 dashboard bridge tests, API typecheck, final Core production build, and
  public layout/navigation checks.

Specialist validation also passed dashboard/website builds and typechecks, Core
clean typecheck, and synthetic Chrome desktop/mobile interaction. Browser evidence
uses a mocked local API, not a production mutation or a complete real-backend
editor acceptance. No existing article was adopted or published during validation.
The separately invoked live-access suite skipped without its disposable HTTP
fixture; it is not counted as passing. The backup suite initially rejected a
noncanonical fixture database name; it passed after using its required isolated
`core_backup_test` database. The original synthetic database was preserved.

Independent review found an encoded-image reference bypass in deletion protection.
The fix parses HTML image attributes and canonical/percent-decoded URL aliases;
its isolated PostgreSQL regression prevents the destructive callback for each
spelling. Delete and replace protect all stored immutable revision references,
including restorable history. This does not guarantee validity of arbitrary new
URLs supplied after an asset was already deleted.

Remaining acceptance: actual Owner editing/publication, full public sidebar and
comment presentation, explicit import of the five existing articles, application
and media recovery/rollback, and the broader CMS/admin-retirement gates. A saved
private preview displays sanitized article content; it is not a full website-theme
or sidebar preview. Production release identifiers and read-only live verification
must be recorded separately before describing this candidate as deployed.

Pre-release capture (2026-09-19T23:00:52Z): a private, read-only repeatable-read
snapshot captured 55 public tables / 592 rows from the Core service at `edddf3cd`.
The compressed archive SHA-256 is
`d946ccd12c32e7c813bb63bdfc683cf8debba199e07afabc27168b215759d6b9`.
It is stored privately outside Git, includes existing backup exclusions, and does
not include media bytes or DDL. Existing archives were not pruned. This is capture
evidence, not a claim of full production recovery. The final public route fails
with 503 on a settings-read failure rather than enabling a disabled Blog by default;
its six route tests, Core typecheck and production build passed.

Release packaging correction: Railway rejected the first Core build at `52a604d8`
because the retained editor referenced generated types outside the standalone Core
build context. Website and Dashboard built successfully; the previous Core runtime
remained available. Core now derives type-only serialized responses from its own
publication services. No runtime server code is imported by the editor. A clean
isolated typecheck and seven retained-editor tests passed; the isolated production build also passed. Coordinated redeployment follows. The initial isolated harness omitted the
migration folder; that harness omission was corrected before the build rerun.

## Verified Blog editor and public delivery release — September 19

Runtime `e6125fb9c76732ada9b1fae60a857f281197a986` is on main and the
consolidation branch. Railway SUCCESS:
- Core `7b27ec34-7a3b-4a8f-a98e-1e9aae4982bc`
- Website `dd553555-a49e-4f88-b719-6aa4788dcf7a`
- Dashboard `f854efd2-569b-4a67-86e4-4356479bbedb`

Core logs confirm migrations completed. Core readiness and Dashboard health return
200. The public Blog publication endpoint returns its valid empty collection;
private Core and Dashboard publication routes return 401 without authentication.
Public Blog SSR retains all five original article links. Authenticated browser
checks verified the restored Blog tools and new-post Content/Layout/SEO tabs,
rich-text toolbar and media picker; no post was saved, adopted or published.
Social Media retains its restored Design navigation, profile fields and icon preview.

The first Core build failed on an out-of-context generated type import; the fix
uses type-only responses derived from Core services and passed isolated typecheck,
production build and seven editor tests before this successful deployment.
See `docs/implementation/blog-publication-consolidation.md` for backup/test evidence.
Full Blog acceptance still requires actual editing/publication acceptance, reviewed
import of the five articles, full public sidebar/comment presentation and recovery.
Remaining CMS/System parity, Search Console access, CRM/account reconciliation,
operational acceptance and safe admin retirement remain open. Goal stays active.
