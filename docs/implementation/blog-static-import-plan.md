# Five-article import and ownership transfer

Status: reviewed implementation plan, not an executed import. Scope is the five
existing public articles in `artifacts/p1-website/src/pages/blog/`. Preserve public
URLs, resolved published text, service links, metadata, media and layout. Do not
run ordinary create/publish: static routes currently take precedence and their
slugs are intentionally reserved across Core and website consumers.

## Review bundle

Capture resolved rendered pages using the exact website revision plus published
CMS overrides. Record source/build hash, page/global publication revisions,
article text/headings/links, trailing service-link aside, metadata, descriptive
image alt text, PageHero eyebrow/emphasis and image hashes. TSX defaults alone
are insufficient. Compare sanitized import content with the captured content;
report differences before any production write.

The five source slugs are:
- land-clearing-cost-per-acre-south-carolina
- how-to-manage-retention-pond-south-carolina
- best-grass-large-acreage-carolinas
- signs-property-drainage-problem
- preparing-land-agricultural-use-carolinas

Existing optimized image variants are in `src/assets/image-manifest.json`.
Register immutable reviewed copies through the existing media pipeline; record
old-to-new asset identities. Do not persist transient build-hashed asset URLs as
historical media references. Keep original bytes/derivatives and their hashes.

## Atomic import and cutover

Use the existing Blog publication lock and transaction with reviewed source
fingerprint, explicit actor/provenance, immutable revisions, media validation,
capacity preflight and idempotent import receipt. Replays verify the receipt and
must never overwrite later editorial changes. Extend route ownership deliberately
for these five known routes. Once ownership transfers, unpublish must yield404;
absence must never resurrect the static fallback. Coordinate Core reservations,
public projector/parser, Wouter/server precedence and static listing entries.

A durable ownership marker or verified coordinated removal of fallback routes is
required before cutover. Define and review that contract before implementing it.
Until then the existing five routes remain authoritative and unchanged.

## Preservation gaps to resolve

All five source pages declare June24 publication and September14 modification,
but source text changed afterward. These are declared dates, not verified history.
Preserve date-only precision; obtain authoritative evidence before asserting actual
publication dates. The current publication service stamps new publication dates.

Static pages use Organization author/publisher schema; dynamic output currently
uses Person. Existing PageHero treatment, alt text, emphasized title, eyebrow and
service-link aside need explicit supported presentation fields or equivalent
versioned content. Do not silently discard these while calling the import parity.

The static articles have no comments or configurable sidebars. Separately retained
Core supports sidebar widgets, comments, gallery shortcodes, taxonomy badges and
podcast sharing; these require their own published/private-state boundaries and
public consumers. They are not satisfied by storing sidebar IDs in drafts.

## Acceptance

Verify all five URLs; exact text/link/media preservation; SSR/hydration/schema
agreement; reviewed dates; importer replay, rollback and concurrent edit conflict;
private drafts; publish/restore; and withdrawal without static resurrection.
No production import is authorized by a passing dry run alone. Preserve existing
content until the reviewed mapping and coordinated consumer checks pass.

## Review-bundle tool — September 19

Implemented read-only `scripts/consolidation/prepare-blog-import.mjs` accepts a
directory containing the five captured `SLUG.html` files and a new output folder:

```sh
node scripts/consolidation/prepare-blog-import.mjs INPUT_DIR NEW_OUTPUT_DIR SOURCE_SHA DEPLOYMENT_ID
node --test scripts/consolidation/prepare-blog-import.test.mjs
```

Core development dependencies supply jsdom and the existing rich HTML sanitizer.
HTML is parsed without scripts or resource loading. The tool checks exact canonical
routes, singular article layout, snapshot route/revisions and article schema. It
preserves source hero/body/aside HTML, schema, SEO, declared dates and asset URLs;
produces candidate sanitized editorial content; compares text, ordered element
structure, headings, code whitespace, links/targets/relations and inline images.
It refuses an existing output directory. It never accesses a database or publishes.
`canApply` is always false. Media bytes/identity registration, date provenance,
layout field mapping and route ownership remain review gates, even when content
comparison passes. Asset URLs are references only, not durable registered media.

Source revision/deployment labels are caller-supplied: the tool cannot verify
Railway provenance. An initial local exploratory bundle had mismatched observation
labels and is discarded as provenance evidence. A fresh live capture was bracketed
by Railway SUCCESS checks for website `f75d9dce-bd05-4cdb-a82d-51ff22c976a7` at
`2c72c98f62f712c373a657b303d01993398ce68a`. All five content comparisons pass;
bundle source fingerprint is
`b89dfa689c4e1e71866b2ecbf89dea1c06118d6bb6ec7c0111b36d48f469f6c4`.
The capture is read-only and sequential, not an atomic publication freeze. Its
snapshot revisions/fingerprint must be rechecked inside the eventual import.
No claim of historical date verification or completed migration follows.

Independent review identified a false acceptance case in the initial normalized
text check: table/H5 structure could be lost while text stayed the same. Ordered
structure and exact code-whitespace evidence now prevent this; isolated regressions
cover the case without relying on unrelated unsafe links.

## Reviewed ownership contract for implementation

Use one immutable `blog_static_import_receipts` table as permanent ownership for
these five routes, with source slug primary key, unique receipt/post identity,
imported revision composite FK, reviewed bundle/editorial hashes, explicit actor,
import timestamp and source/media/date provenance. Deferred FKs preserve existing
backup restoration order; receipts cannot be updated/deleted and persist through
rename, withdrawal and soft deletion. Exact reviewed receipt replay must return the
current post without overwriting or republishing it. Different mappings conflict.

Under the existing Blog publication transaction lock, import must recheck source
revisions, media registration, slug ownership and capacity before writing receipt,
publication state/revisions and route ownership together. Reserved-slug exceptions
must follow receipt ownership, never a general request flag.

A versioned public projection must include permanent ownership even when a post
is absent from published content. SSR, hydration, listing, sitemap and client routing
must distinguish unknown ownership from confirmed unowned routes. After adoption,
withdrawal returns404; cold-cache upstream failure cannot assume static fallback.
Preserve last valid ownership and fail closed when ownership is unknown.

Backup preflight must prevent restoring an archive that erases or changes existing
receipt ownership, including archives with an empty receipts table. Row immutability
alone does not protect against restore's TRUNCATE. A separately reviewed website
rollback would be necessary to relinquish ownership. This contract is an approved
Orchestrator implementation direction; schema, importer, consumers and restore
checks are implemented in the foundation below; the actual importer remains pending.

## Ownership foundation — September 19

Migration 0006 adds immutable receipts with deferred revision/state foreign keys.
The internal receipt helper verifies revision identity, reviewed editorial hash and
exact replay without overwriting later state. No HTTP import endpoint is exposed.
Public schema v2 includes the permanent source slug/post mapping even when Blog is
disabled or posts are withdrawn. Only the recorded owner may publish a reserved URL.
Restore preflight protects complete existing receipts before any TRUNCATE.

The website consumer requires confirmed v2 ownership before rendering the five
static fallbacks, keeps the last valid snapshot and rejects ownership removal or
remapping. Unknown ownership returns 503/noindex; known owned but unpublished
routes return 404. SSR, hydration, listings and sitemap use the same decision.
Build-time static extraction remains explicit so existing CMS field IDs are retained.
This guarantees permanent route ownership, not globally monotonic editorial versions;
reviewed content restoration remains an allowed operation.

Release order is mandatory: deploy migration/Core v2, verify a live valid v2 response,
then deploy the website consumer. No real transfers until both are verified. Keep the
additive migration during rollback. After transfers, never roll the website back to
static-only dispatch; use an ownership-aware build. Before transfers, the previous
website remains a viable rollback because no source ownership has changed.

Validation: 21 Core projection/media/route tests, 14 original actual-PostgreSQL
publication tests, 6 receipt tests, 8 backup tests and migration replay passed.
Core typecheck and build passed. Website validation/release evidence follows in
handoff.md. These are scoped checks, not final CMS import acceptance.

A fresh read-only private Core snapshot was captured before rollout at
2026-09-19T23:33:48.781Z from f44a43f25087836420a91db811ea1d7b93dec3cc:
56 tables/592 rows, gzip SHA256
8046fac8fc1ab59d820820cc00d48006c2aec70d54e7aac08aecad48e67d1c99.
It remains outside Git and includes no media bytes or database DDL. No production
restore, content import or source-media registration was performed.

## Presentation preservation foundation — September 19

Optional nullable `presentation` metadata now lives in immutable editorial snapshots:
versioned editorial layout, eyebrow, plain-text title emphasis parts, image alt text,
separate sanitized related-content aside, structured-data headline/description/type,
author type, and explicit date-only source values. No default is injected into older
snapshots, so old editorial hashes retain their meaning. Explicit null clears the
layout; omitted metadata from older clients preserves existing metadata on save.
Restore follows the selected immutable revision exactly. New-post creation writes
metadata directly into the revision instead of losing it through the legacy table.

Both editors preserve metadata through unrelated edits and flatten hero emphasis
only when the title actually changes. This increment adds preservation, not new
presentation editing controls. Those controls remain required before actual import.
The public renderer reuses PageHero and the original body/aside layout. Unsafe
related HTML is sanitized/validated; inline images in the aside are unsupported.
Organization authors other than P1 are not assigned P1's canonical business identity.
Explicit declared date-only strings remain strings; missing values use actual
publication timestamps. This is not verification of historical publication dates.

Review bundle schema2 emits body and aside separately and structured presentation
metadata, refusing unsupported hero markup or invalid date/author data. A rerun of
the prior verified source capture preserves all five articles and the same source
fingerprint. `canApply` remains false. The import must still recheck live revisions.
Registered-media ownership and responsive variants remain mandatory: build-manifest
srcset URLs cannot simply be replaced with an R2 URL and called equivalent.

Validation: review tooling6, real PostgreSQL publication/cutover19, Core pipeline/
route25, native editor20, retained editor9 and website40 tests passed. Source
field identities for all six Blog routes remain unchanged. Core and website builds
and typechecks passed; exact release observations are recorded in handoff.md.
No production content import or mutation occurred in this increment.

## Registered image delivery gate — source inventory

Read-only inventory confirmed five original PNGs and fifteen 480/768/1280 WebP
variants against the image manifest (original SHA256 and derivative byte counts).
Original dimensions are1408×768. Existing `createCmsMediaAssetFromUpload` supports
`optimize:false`; ordinary upload routes re-encode by default and cannot be used
as evidence of exact reviewed-byte preservation. Existing create-only storage and
bounded readback helpers provide the necessary primitive operations, not a complete
import workflow. `cms_media` currently has no variant-set, dimensions or hash fields.

Next implementation must prepare a reviewed20-file manifest, preserve original
bytes through create-only storage with hash-verified readback, register each asset,
and record all identities in immutable import provenance. An additive optional
editorial media-set contract must bind the retained original and responsive variants
before public URL/dimension projection. Both revision deletion protection and
PageHero SSR/hydration must cover the complete set. Object writes cannot be made
transactional with PostgreSQL: use staged idempotent create-only uploads and then
atomic DB registration/publication, with an explicit recoverable orphan/retry policy.
Do not describe a successful upload as completed import or media-recovery acceptance.
