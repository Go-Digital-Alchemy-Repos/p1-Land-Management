# Content overhaul implementation evidence

## Scope and authority

Owner-approved consolidated plan: `../2026-09-16-content-overhaul-plan.md`. Original specification and Addendum A are preserved alongside this record. Nineteen new pages and images; optional Wave 4 excluded. Direct production release and the exact sitewide button label **Get a Free Site Assessment** are authorized.

## Implementation

- Nineteen route entrypoints use one existing-style LocationPage renderer and page-specific content. FAQs and schema share the same data. County parents, visible breadcrumbs, regional coverage, service links, and required inbound links are included.
- Existing homepage, About, county community lists, commercial hub, and grounds service copy updated. Empty Google review UI remains hidden until real rating/review data arrives. Owner-confirmed nearly 30 years of experience is used without an invented founding date.
- Sitewide header/mobile/shared quote actions use the requested label. Existing contact and assessment endpoints remain unchanged. Existing acquisition `landingPath` retains location/service entry context without a new API contract.
- Snow & Ice old path redirects to its service path, preserving query parameters. Shared business identity and service catalog are retained without fake local branches.
- Nineteen generated image sources and responsive WebP variants are stored under website assets. Internal provenance and prompt template: `image-provenance.json`. No visible AI captions. A 19-image contact sheet was visually inspected; these images are illustrative, not customer proof.

## Editorial verification and adjustments

The supplied location facts are used as editorial input, not evidence that P1 has worked for any named organization. Removed dated population, investment, and floor-space statistics where unnecessary. Added distinct property-operating considerations to all nineteen 'Why' sections. The named local context was strengthened using these primary/local public sources:

- Fort Mill planning and Kingsley/downtown: https://fortmillsc.gov/DocumentCenter/View/326/2040-Comprehensive-Plan-PDF and https://fortmillsc.gov/621/Fort-Mill--Our-Path-Forward
- Rock Hill Knowledge Park/Winthrop: https://www.cityofrockhill.com/Home/Components/FacilityDirectory/FacilityDirectory/199/151
- Indian Land RedStone/521/160: developer https://mpvre.com/past-developments/redstone-phase-i/
- Cornelius Catawba Avenue/Jetton Road/I-77: https://www.ncdot.gov/projects/catawba-avenue/Pages/default.aspx
- Mount Holly river/greenway/parks: local tourism authority https://www.gogastonnc.org/mount-holly
- Easley Doodle Trail/Fleetwood Drive: https://www.cityofeasley.com/subpages/doodle-trail
- Greer inland port/US29/I85: https://scspa.com/wp-content/uploads/sc-inland-port-flyer.pdf (location context only; not historic operations/hours)
- Simpsonville street/park context: https://www.simpsonville.com/wp-content/uploads/2024/11/comprehensive_plan_2020_with_maps_official.pdf
- Matthews Sportsplex: https://www.matthewsnc.gov/pview.aspx?catid=0&id=20924
- Kannapolis research campus/ballpark: https://www.kannapolisnc.gov/news/ID/164/NCRC-STEM-Night-Brings-Science-and-Baseball-Together-on-April-29

Google FAQ rich results are retired; valid FAQ markup and content parity remain required, not a rich-result appearance. See https://developers.google.com/search/updates.

## CMS and integration baseline

Before release, all 35 existing public `/api/p1/page-content` snapshots reported page revision 0 and global revision 0. No currently served published overrides were observed. No CMS records were changed or deleted. Existing generated-manifest changes included source revision and the newer grading image; retain those while regenerating matching public/Core manifests.

Production public baseline discovered via Railway: deployment `4ae0b9fc-9d48-461f-a4e9-b5af40d18073`, source `e88e3ee5f6445dba30a08c816e7e1e03fb2248ef`, SUCCESS. It includes newer Google Analytics work absent from the initial checkout. Release integration must retain that work and exclude unrelated dashboard branch changes.

## Validation so far

Local build/prerender: 54 routes. Public QA: all 54 routes passed SSR, metadata, CMS overrides, internal links, proof, FAQ parity and React-warning checks; maximum initial JS was 143.7 KiB gzip before latest integration. All 78 managed images passed responsive image budgets. Initial server suite: 27 passing tests; a specific Snow & Ice redirect regression has since been added. Commercial inquiry transport: 5 passing tests. Typecheck, FAQ, navigation, media, and shared-frame checks passed. The shared-frame source check was adapted to inspect the shared LocationPage used by thin entrypoints.

The overhaul-specific check covers nineteen routes, required inbound/outbound anchors, all 54 CTA surfaces, schema parity, sitemap membership, and footer boundaries. Desktop and 390px mobile Greer layout were visually checked; the mobile sticky CTA was corrected following that review. Final integrated validation and deployment evidence will be added before completion.
