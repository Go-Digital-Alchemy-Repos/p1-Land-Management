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
checks are not yet implemented and must ship as a coordinated change.
