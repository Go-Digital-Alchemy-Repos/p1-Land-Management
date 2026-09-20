# Reviewed static article import

The five original public articles remain Website-owned until their permanent Blog
receipts commit. This implementation is an internal service, not a public API or
an executable production migration. It does not itself transfer production data.

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
the raw reviewed file. A future privileged apply entry point must verify those
files and construct the plan from their contents; passing a matching hash string
alone is insufficient. Before production transfer, also complete fresh capture and
deployment correlation, explicit historical-date policy, populated backup/restore
rehearsal, browser publication/preview acceptance and rollback verification. Current
source dates are declarations, not verified historical publication evidence.

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
