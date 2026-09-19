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
