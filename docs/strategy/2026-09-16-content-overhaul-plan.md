# P1 website content overhaul — consolidated implementation plan

Status: implemented, deployed, and live-verified on September 16, 2026 (Eastern time). See content-overhaul implementation evidence for exact release and validation details. Optional Wave 4 remains excluded; Search Console resubmission requires authenticated access.

## Authority and inputs

This plan combines the Owner-supplied `P1_Website_Implementation_Spec.md` and `P1_Implementation_Spec_Addendum_A.md` (Digital Alchemy, September 16, 2026), plus the Owner's subsequent decisions. The source documents currently reside in `/Users/mikedickerman/Downloads/`. Their exact page slugs, page briefs, and linking matrices remain implementation inputs, subject to the resolutions below.

Owner decisions: retain the existing CMS; generated images require no visible AI caption; use nearly 30 years of experience without implying the current business name is that old; direct production release is authorized after validation. Do not invent additional metrics, reviews, customers, or project evidence. This document records scope and decisions, not evidence of completion.

## Deliverables and sequence

1. Implement the original eleven cities: Greer, Simpsonville, Easley, Gaffney, Duncan, Inman, Boiling Springs, Huntersville, Matthews, Kannapolis, and Waxhaw. Complete original-spec existing-page edits, technical work, and inbound/outbound links together.
2. Add Wave 1: Fort Mill, Rock Hill, and Indian Land. Retrofit York County, Lancaster County, and Union County pages with distinct rural/agricultural sections and linked Communities We Serve lists.
3. Add Wave 2: Indian Trail and Monroe.
4. Add Wave 3: Belmont, Mount Holly, and Cornelius.
5. Keep Wave 4 (Mint Hill, Harrisburg, Stallings) in the future backlog. It is excluded from this release and its completion criteria; do not create links to unpublished pages. A later expansion decision should use actual indexing, relevant search impressions, and qualified inquiry evidence rather than an undefined promise that earlier pages are performing.

Owner addition: change the sitewide assessment/estimate CTA buttons to **Get a Free Site Assessment**, including desktop navigation, mobile navigation, sticky mobile actions, and shared CTA/footer buttons. Preserve existing form endpoints and destinations.

Total committed scope: nineteen new location pages and nineteen distinct generated hero images, plus revisions to existing pages. Development follows this sequence; a combined production release is acceptable after all required checks pass.

## Content and imagery

- Preserve the existing design system and page components. Each new page gets the supplied sections, metadata, service list, CTA, visible breadcrumbs, and FAQs, with local editorial improvements.
- Apply the city/county content standard to existing and new location pages. Each city/community page needs at least three verified locally relevant features and a useful explanation of their property-management implications. Features need not be exclusive to a municipality: shared corridors are legitimate, but a list of place names alone does not establish distinct content. Verify locality boundaries and entity types rather than treating every community as an incorporated city.
- Retain only the three existing county landing pages. Give them rural acreage, agriculture, soils/water movement, and multi-community coverage distinct from city commercial content. Verify any specific permitting or regulatory statement against current official sources; avoid unsupported regulatory advice.
- Add standalone introductory definitions, explicit eligible property types and one-acre minimums, city-named FAQ answers, and plain-text service lists. Use grounds management and exterior facility maintenance naturally without implying unrelated facilities services.
- Resolve the documents' contradictory residential-word requirements with affirmative eligibility wording: service is exclusively for commercial, industrial, agricultural, municipal, and institutional properties of at least one acre. Remove prohibited terms from the supplied new-page FAQs and copy while preserving that restriction.
- Separate `/commercial` (assessment, coordination, and work sequencing) from commercial landscaping (recurring grounds programs). Preserve existing forms; add the prescribed hub-to-service link. Improve capability-first copy and retain concise necessary scoping language.
- Revise homepage, About, existing location pages, and specified service pages. Remove empty proof modules. Use Owner-confirmed experience; omit unprovided equipment/acreage figures and unsupported testimonials. Verify or generalize dated external statistics and competitive assertions. Named local organizations are geographic context, not implied customers.
- Generate nineteen relevant, distinct images through imagegen, save assets and prompt/provenance records in the repository, and use existing responsive optimization. No visible AI captions. Do not depict or describe fictional scenes as actual P1 projects, equipment ownership, or photographed locations. Alt text describes the scene; city relevance must not turn into a false location claim.

## Routing, SEO, CMS, and inquiry handling

- Implement both source linking matrices and neighbor pairs, including Matthews–Waxhaw. Update the service-area hub and specified homepage city lists without expanding the footer. Link only released destinations. Preserve natural anchors rather than imposing an arbitrary numerical anchor-repeat limit.
- Add county breadcrumbs/parent links wherever one of the three retained county pages is genuinely applicable, including original-spec city pages. Handle boundary-spanning markets accurately; do not invent county pages.
- Keep a single stable P1 business identity in JSON-LD, with consistent name/phone and truthful coverage. Connect each location's Service entity to that business; do not imply a separate branch/address in every city. Include FAQ and breadcrumb markup matching visible content, self-canonicals, and matching social metadata.
- Treat title/description lengths as editorial targets, not rigid character-count gates. Preserve service, locality, and clarity without keyword stuffing.
- Move Snow & Ice to `/services/commercial-snow-ice-management`; return a server-side 301 from the old path, preserve query strings, and update all references and the sitemap.
- Preserve the CMS and existing public API, database, and form contracts. Review existing uncommitted manifest changes before regeneration. Keep public/Core manifests aligned; reconcile published CMS overrides with new defaults and preserve previous revisions for rollback. Check content-cache behavior with the expanded route count.
- Retain city/service context in inquiries using existing supported form capabilities. No new integration or schema is authorized solely for attribution.

## Acceptance and release

- Run type checking, build/prerender, server tests, FAQ consistency, navigation, layout, media-loading, and image-budget checks. Verify all nineteen exact routes, required link edges, metadata, canonical/breadcrumb correctness, structured-data semantics, and sitemap coverage.
- Inspect mobile/desktop layouts, keyboard access, image crops and overlays, and both inquiry funnels. Use controlled submissions without unnecessary customer notifications. Check actual CMS-rendered pages, not only source defaults.
- Validate FAQ JSON-LD and visible-content parity independently of Google's Rich Results Test. Google retired FAQ rich results effective May 7, 2026; FAQ rich-result appearance is not an acceptance gate or promised benefit. Other supported markup can still be checked with Google's tooling. Source: https://developers.google.com/search/updates (May 8 and June 15, 2026 entries; checked during planning).
- Publish through the existing production workflow after checks pass. Preserve code/content rollback points, verify terminal deployment success and live routes, redirects, assets, metadata, and inquiry behavior. Resubmit the sitemap if authenticated access exists; otherwise record the remaining external step.
- Record exact deployed revision, CMS changes, validation evidence, image provenance, linking completion, and limitations. Do not conflate implementation, deployment, indexing, rankings, or lead generation.

## Changes advised to Addendum A

The incorporated refinements above replace: unsupported FAQ rich-result expectations; city-specific image alt text that falsely claims a generated scene's location; separate implied business branches; exclusive-to-one-town specificity; arbitrary anchor-repeat quotas; and contradictory scope wording. Several supplied expansion briefs still need more local detail to satisfy their own three-specifics standard. Their supplied copy is a starting point, not automatically publication-ready.
