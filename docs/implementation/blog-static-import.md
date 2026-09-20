# Reviewed static article import

The five original public articles remain Website-owned until their permanent Blog
receipts commit. The importer has a bounded operational command and no public API.
Production transfer is an explicit operator action; building or deploying it does
not import content.

## Admission and transaction

`importStaticBlogArticles` accepts an exact five-article plan, an authorized actor,
twenty reviewed image files, storage and a separately approved plan hash. The plan
binds artifact fingerprints, deployment observation, date policy, source admission,
the full reviewed Website manifest and exact file metadata. Cover sets are built
only from fully decoded, create-only staged objects with verified readback.

Source admission distinguishes absent, unpublished and published source rows. It
checks the five article components and shared home/site-chrome component against
reviewed defaults, captured revisions and effective content. It requires READ
COMMITTED isolation and acquires the Blog advisory lock followed by a SHARE lock
on client_site_content with a five-second lock timeout. This blocks both updates
and insertion of previously absent rows. No filesystem or provider calls occur
while this fence is held. Website deployment identity remains a separate release
coordination check, not a claim established by the database lock.

The service first rejects stale source before staging, then repeats admission in
the final transaction. All media registrations, initial revisions, immutable
ownership receipts, publication states and lease-validated publication operations
commit together. Media registration is also locked against concurrent metadata
changes. Capacity or source conflicts roll back all database changes. Immutable
objects may remain after failure; do not delete them automatically. An exact retry
returns existing ownership and does not republish subsequent edits, renames,
withdrawals or deleted posts. Partial ownership or a different plan fails closed.

## Source preparation and remaining production gates

`scripts/consolidation/prepare-blog-source-admission.mjs` takes one JSON file with
the schema2 reviewBundle, five capturedHtml entries keyed by slug, reviewedManifest
and six explicit sourceRows observations. Each source row contains routeId,
componentKey and either row:null or id/draftRevision/publishedRevision/publishedContent.
It reconstructs each reviewed article from raw HTML, checks the original capture
fingerprint, requires consistent shared content and compares effective source
content/revisions. Output is exclusive mode0600 review evidence with canApply:false.
It has no database or network access. Full manifest and Core field validation are
repeated by the server service.

The internal importer cannot establish that a caller's artifact hash represents
the raw reviewed file. The privileged local builder now verifies raw captures,
listing summaries, reviewed manifest/source rows, original images and served image
variants and constructs the plan. Its output is still canApply:false. The operator
must separately review the resulting expectedPlanSha256 before running the command.
A matching hash supplied by an unreviewed caller is not approval.

`prepare-blog-apply-plan.mjs` takes an explicit options JSON and exclusive output
file. Required options: captureDirectory, listingHtmlPath, reviewBundlePath,
mediaReviewPath, reviewedManifestPath, sourceRowsPath, assetsRoot, builtPublicRoot,
actorId, datePolicy, sourceRevision, deploymentId. Excerpts come from the actual
listing. Case-only card-title differences are recorded and use the article title.
The existing Blog chronological sort replaces the static array's card ordering.

Core packages `dist/operations/apply-static-blog-import.mjs`. Arguments, in order:
`--apply --plan PATH --expected-plan-sha SHA --files-root ROOT --expected-bucket BUCKET --ledger NEW_PATH`.
It only runs in the exact P1 Core production project/environment/service, requires
an unsuspended current local administrator, matches the dedicated upload bucket,
uses the exact P1 uploads prefix and honors upload freezes. Safe bounded file reads
and a private exclusive ledger precede dispatch. Logical cms/blog-static keys map
to physical clients/p1landmanagement.com/uploads/cms/blog-static keys. After import
or replay every object is read back and verified before success is reported.
Errors preserve possible-object/database-write flags even if ledger writes fail.
No object deletion, overwrite, provider creation or general permission grant exists.

The command does not independently verify the Website deployment identity. The
operator must recheck it immediately before and after dispatch, using fresh source
admission and an unchanged reviewed release. Preserve the plan, files and ledger
for exact replay and recovery. Do not rerun a changed plan after an uncertain result.

The chosen date policy is clear-unverified: actual CMS publication dates replace
unverified historical declarations. Populated database backup/restore and actual
article render rehearsals now pass. This does not prove recovery of lost provider
objects. Source files and original/variant hashes must remain recoverable outside
the database. Production transfer and live editor mutation acceptance remain open.

## One editor after transfer

Website content GET optionally returns ownedBlog for these exact five source
components. Both retained and native Website editors preserve old fields and
history read-only and offer a permission-gated Blog link. Save, publish and restore
are rejected server-side under the same Blog lock after ownership transfers,
including requests from already-open editors. Other Website components retain
their existing workflow. No new permission grant or public endpoint is introduced.

## Validation

Dedicated local PostgreSQL tests cover source fencing and isolation, atomic import,
rollback, exact replay, concurrent retry, source changes and ownership guards.
Browser-component tests cover read-only behavior, dirty draft preservation and
permission-gated navigation. Parent integration reran36 existing publication,
cover-ledger and staging tests plus16 read-only review-tool tests, all passing.
Core, dashboard and API-package typechecks and Core/dashboard production builds
passed. These checks are scoped; production import and overall Marketing parity
are not complete.

## September19 rehearsal evidence

Parent independently reran5 populated backup/restore checks,7 artifact-builder
checks and19 operational-command checks. Actual local import used all five captured
articles and20 repository images, with5 receipts and exact replay. Website SSR
comparisons preserve title emphasis, body/aside text, headings and links; listing
excerpts match. Managed image URLs, genuine publication dates, title capitalization
and chronological listing order are intentional differences.

Browser checks on the exact local projected data covered desktop and390px mobile,
loaded responsive images, oneH1, no horizontal overflow, client navigation from
listing to another article, correct updated canonical metadata and no console
errors. These are representative browser checks plus all-five SSR comparisons,
not a claim of full Marketing or production editor acceptance.
