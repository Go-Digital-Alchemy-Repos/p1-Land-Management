# UX, visual and sales-experience audit

**MOCKUP ONLY — NOT IMPLEMENTED**

## Executive assessment

The current site has a substantial foundation: coherent identity, extensive services and regions, mobile navigation, usable calls to action, detailed service guidance, commercial-specific journeys and honest gallery disclosures. The central gap is the distance between claimed capability and actual project evidence. The homepage’s seasonal rotation can also make P1 feel like commercial lawn care before the broader land story is established.

No quantitative conversion lift is claimed. No analytics, prospect interviews or lead-quality dataset was supplied. These are evidence-based design hypotheses for owner review.

| ID / priority | Current evidence | Impact | Proposed design | Validation needed later |
|---|---|---|---|---|
| 01 / High | `home-desktop.jpg`: seasonal commercial-ground hero; named carousel states | First impression depends on slide | Stable land/water/ongoing-care statement; seasonal module below | Five-second comprehension tests with each audience |
| 02 / High | `gallery-desktop.jpg` and source: illustrations explicitly not completed jobs | Visitors cannot evaluate actual delivery | Separate verified work and capability illustrations | Approved jobs, matched photos and scope records |
| 03 / High | About uses illustrative crew; fleet fact field empty | Human/equipment trust remains unsubstantiated | Real people and equipment in real work | Owner fact and publication verification |
| 04 / High | `/services`: ten peer cards | Connected scope is hard to understand | Four groups, plain needs and cross-links | Service-findability test |
| 05 / High | Contact form requests work type, name, email, address, acreage, property type and description | More effort than intro’s “few sentences” suggests | Core fields first, optional property detail disclosure | Form completion and qualification quality |
| 06 / High | Brief includes estates/HOAs; live excludes residential | Eligibility conflict creates wrong leads | Explicit owner decision and coherent qualifier | Approved target/property policy |
| 07 / High | Source grading body contains “more than 80%” claim | False precision can erode technical trust | Explain grading/water relationship without unsupported statistic | Reliable source or owner-approved removal in future phase |
| 08 / High | Source contact includes timing UI but submitted payload omits it | Prospect can believe timing reached staff | Specify visible-field-to-lead mapping before future implementation | End-to-end receipt test; no fix made here |
| 09 / Medium | Live desktop Services menu differs from local source | Checkout is not production truth | Maintain separate evidence and future deployment baseline | Compare intended release revision |
| 10 / Medium | Long service H1s include service, scale and cities | Mobile headlines are visually dense | Short H1; geography in a visible qualifier | Search/content review and mobile reading test |
| 11 / Medium | Dark hero overlays and gradients obscure the image | Physical work becomes decorative background | Photo beside text with factual caption | Subject visibility and crop tests |
| 12 / Medium | Repeated FeatureRow/card patterns | Long pages lack distinct decision stages | Scope, sequence, image evidence, FAQs and related work | Reading/scanning test |
| 13 / Medium | 30 area destinations and repeated service content | Geography can overwhelm usefulness | Region → local context → relevant capability | Local-page usefulness/content differentiation |
| 14 / Medium | Skyline/resort-like area illustrations | Region may be inferred rather than demonstrated | Real regional terrain/work and verified project locations | Provenance and location approval |
| 15 / Medium | Live reviews have source links and verification date | Good authenticity, weak project context | Keep sources; associate only confirmed service/project | Review attribution, eligibility and affiliation checks |
| 16 / Medium | Drainage image looks like an ideal swale | Shows a solution without the diagnostic logic | Problem → water path → possible scope → review | Technical owner review, no engineered drawing claim |
| 17 / Medium | Secure-facility page has specialised exterior scope | Procurement may infer guarantees | Clear responsibility and protocol boundaries | Verified facility work and commitments |
| 18 / Medium | New live articles absent in local route table | Inventory can miss current content | Discover all observed public links and preserve contextual article paths | Source/CMS ownership reconciliation |
| 19 / Medium | Local GoogleReviewShowcase hardcodes five-star visual | Rating glyph can diverge from rating data | Future design should represent the actual value | Data-driven rating UI check; no edit made |
| 20 / Medium | Mobile quick-contact exists; no page-width overflow in core 390px checks | Valuable property-side contact path | Retain restrained action rail with content clearance | Keyboard, zoom, device safe-area and screen-reader tests |

## Brand position

Land is the hero. Scale must be visible. Equipment explains capability. Evidence carries confidence. Technical knowledge should help someone decide what to do next without implying engineering credentials. Single-point accountability should be supported by a defined process and verified customer feedback, not exaggerated slogans.

## Sales journey

Search/referral → identify the property problem → review relevant scope → see comparable verified work → confirm geography and property fit → request a site walk. The first screen should answer what, scale, property types, region and next step. A proof system belongs before repetitive calls to action; until actual work is available, label illustrations and use source-backed feedback without invented job context.

## Navigation and state observations

Desktop service expansion and mobile service expansion were exercised. The live desktop menu groups categories; local source lists individual services. Mobile panel offers persistent call and inquiry actions. Home carousel pause and FAQ expansion worked in this run. FAQ appeared as native/generic semantics in the DOM capture while native AX exposed a control; this difference requires keyboard/screen-reader testing before declaring a defect. Gallery filtering and empty-result feedback should remain explicit.

## Forms and lead handling

Two distinct production inquiry systems exist in source. The general estimate form uses `/api/forms/p1-estimate/submit`, an idempotency key, timeout, receipt check, input retention on failure and success-heading focus. The commercial page uses its own validation/payload/receipt logic and supports email or phone as the contact channel. These are important reliability patterns to preserve later. The design phase does not authorise API convergence or live submissions. The proposed inquiry is a local simulation with no fetch or backend.

## Accessibility and performance limits

Screenshots establish visible layouts, not WCAG compliance. Source shows skip links, focus styling, reduced-motion rules, image optimisation metadata and accessible form patterns, but complete keyboard, assistive-technology, zoom and contrast testing remain necessary. No Lighthouse score, field performance, lead delivery or server error is reported as tested. Entrance animations caused premature screenshots; those were rejected and recaptured, not counted as permanent blank content.

## Existing map: retain and refine

The live map is already a useful differentiator: two state colours, named community pins, zoom controls, attribution and a linked community list. The proposal should preserve that interaction rather than replace it with decorative geography. The isolated regional screens include a captured reference, not a working map. Test pin selection, list/map synchronisation, keyboard alternatives and tile-failure fallback in a future authorised implementation.
