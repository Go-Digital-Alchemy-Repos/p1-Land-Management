from pathlib import Path
import json,re
D=Path(__file__).resolve().parent; E=D/'evidence'
def write(name,body):
 if (D/'concept-3-refinement/README.md').exists():
  if name in ['README.md','FINAL_PRESENTATION.md']:
   i=body.find('\n');body=body[:i+1]+'\nLatest owner feedback: Concept 3 is preferred. See the [brand-and-content refinement](concept-3-refinement/README.md) and [seven-page visual index](concept-3-refinement/index.html). This preference does not authorise implementation.\n'+body[i+1:]
  if name=='DESIGN_DECISIONS.md':body+='\n## October 2 owner feedback — Concept 3 refinement\n\nThe Owner prefers Concept 3 and requires the actual P1 logo and current content. This supersedes the earlier A-based exploration recommendation. See [the seven-page refinement](concept-3-refinement/README.md). No production implementation is authorised.\n'
 (D/name).write_text(body)
status='**MOCKUP ONLY — NOT IMPLEMENTED**\n\n'
urls=json.loads((E/'live-routes.json').read_text())
# Evidence is from this run only; each route retains its own captured DOM and screenshots.
rows=[]
for url in urls:
 route=url.split('p1landmanagement.com')[-1] or '/'; slug=route.strip('/').replace('/','-') or 'home'
 f=E/(slug+'-desktop.txt'); text=f.read_text() if f.exists() else ''
 headings=re.findall(r'heading "([^"]+)" \[level=(\d)\]',text)
 images=re.findall(r'img "([^"]+)"',text)
 if route=='/': kind='home'; audience='All qualifying prospects'; purpose='Recognise capability, acreage and region'; issue='Rotating seasonal hero changes the first impression; broad land capability appears later.'
 elif route=='/contact':kind='quote';audience='Ready-to-contact owners and managers';purpose='Submit a qualified inquiry';issue='The short introduction precedes a comparatively long form. Response expectations and eligibility need one consistent policy.'
 elif route=='/commercial':kind='commercial';audience='Commercial property manager or owner';purpose='Evaluate a recurring and corrective exterior vendor';issue='Strong whole-property framing; add verified comparable commercial work before the lengthy inquiry.'
 elif '/commercial/' in route:kind='secure-facility';audience='Facility and procurement managers';purpose='Review exterior scope around facility protocols';issue='Useful specialised scope; avoid implying security credentials, emergency dispatch or contracted service levels without evidence.'
 elif route=='/about':kind='about';audience='Prospects checking the company';purpose='Establish people, experience and accountability';issue='Illustrative crew image cannot establish actual staff. Experience, fleet and credentials need factual support.'
 elif route=='/gallery':kind='gallery';audience='Prospects looking for comparable work';purpose='Compare service illustrations';issue='Honest disclosure is a strength; this is not a completed-project portfolio. Titles can sound like job descriptions despite the disclaimer.'
 elif route=='/services':kind='services';audience='Owners unsure which service fits';purpose='Understand the full offer';issue='Ten peer cards flatten the relationship between land, water, ongoing care and vegetation.'
 elif route.startswith('/services/'):
  kind=route.split('/')[-1];audience='Service-specific search or referral prospect';purpose='Understand scope, fit and next step';issue={'drainage':'Show the water path and site-review logic before listing systems. Avoid promising a universal fix.','grading-site-preparation':'Show plan/access/rough/finish sequence. Local source contains an unsupported “more than 80%” drainage claim; verify or retire in a future phase.','land-clearing':'Explain selective clearing and forestry mulching as land-use decisions, not generic tree removal.','commercial-landscaping':'Connect recurring care to property condition, communication and corrective work.','commercial-snow-ice-management':'Separate seasonal planning from emergency response commitments.','pond-waterway-management':'Separate bank/vegetation maintenance from construction, water quality and compliance responsibilities.','property-reconstruction':'Explain cause, order of work and intended use; do not imply a completed transformation with illustration.','turf-installation-seeding':'Connect soil, grade, species and establishment responsibilities.','tree-services':'Explain access and retained vegetation; illustrations of handling equipment require scrutiny.','industrial-agricultural':'Distinguish industrial grounds from farm production and access needs.'}.get(kind,'Clarify scope and show verified evidence.')
 elif route=='/service-areas':kind='service-areas';audience='Prospects checking coverage';purpose='Find a relevant regional or local page';issue='Useful coverage discovery; a region-first hierarchy can reduce the burden of scanning thirty destinations.'
 elif route.startswith('/service-areas/'):
  kind='region' if route.endswith(('upstate-south-carolina','charlotte-north-carolina')) else 'location';audience='Local search prospect';purpose='Confirm geography and relevant property work';issue='Keep local context and relevant services; generic illustrative landscapes do not prove local projects or offices.'
 elif route=='/blog':kind='blog';audience='Research-stage property owners';purpose='Find practical decision guidance';issue='Seven live articles, including two absent from local route declarations. The two newer article cards use text placeholders rather than field imagery.'
 else:kind='article';audience='Research-stage service prospect';purpose='Understand a property issue and reach relevant scope';issue='Preserve substantive guidance and contextual links; technical, cost and regulatory claims require editorial source review.'
 rows.append(dict(route=route,url=url,slug=slug,kind=kind,audience=audience,purpose=purpose,issue=issue,headings=headings,images=images))
(E/'route-inventory.json').write_text(json.dumps(rows,indent=2))
inv='# Experience inventory\n\n'+status+f'Captured {len(rows)} live routes in this run. Every route has a desktop capture; mobile route capture is recorded separately. Tablet captures cover the 18 core surfaces; location and article tablet review is not implied.\n\nProduction can differ from the checkout. `app-routes.tsx` declares the local routes; the live resource index adds two articles. No standalone live testimonials, equipment or completed-project pages were found among the observed navigation and index destinations. These are proposed experiences, not existing routes.\n\n'
inv+='## Global experience\n\n| Surface | Purpose / action | Strength | Opportunity | Evidence | Priority |\n|---|---|---|---|---|---|\n| Header / sticky nav | Orient; choose service or inquiry | Brand and phone persist on desktop | Bring commercial, work and geography into direct navigation | `02-navigation-expanded.jpg` | High |\n| Mobile navigation | Reach service, call, inquiry | Scrollable service group and large contact actions | Add work and region paths; verify focus return and menu boundary | `navigation-mobile-expanded.jpg` | High |\n| Hero carousel | Seasonal recognition | Named slide controls and pause | Keep broad positioning invariant, put seasonal messages below | `home-desktop.jpg`, `home-mobile.jpg` | High |\n| CTA system | Advance toward contact | Call and site visit consistently available | Match context while retaining one primary action | Captured page DOMs | High |\n| Footer | Recover navigation, phone, hours | Wide service and region coverage | Group routes and preserve legibility on mobile | All full-page captures | Medium |\n| FAQ | Resolve eligibility and scope | Expandable questions | Audit semantic controls and focus; do not infer compliance from screenshot | `faq-mobile-open.txt` | Medium |\n| Review carousel | Support confidence | Live source links and verification date visible | Select relevant feedback without inventing project affiliations | `home-mobile.txt` | High |\n| Gallery filters | Compare categories | Pressed state and result count | Separate illustration collection from verified project portfolio | `gallery-desktop.txt` | High |\n| Breadcrumbs | Show location hierarchy | Present in newer location system | Use consistently in all page systems | Location DOMs / source | Medium |\n\n'
for r in rows:
 h=' → '.join(h for h,l in r['headings'] if l in ('1','2'))
 inv+=f"## `{r['route']}`\n\n- Purpose: {r['purpose']}.\n- Audience: {r['audience']}.\n- Primary action: {'Read a relevant guide' if r['kind']=='blog' else 'Explore relevant scope' if r['kind'] in ['services','gallery','service-areas'] else 'Request a site visit / discuss the property'}. Secondary: {'Read related service scope' if r['kind']=='article' else 'Call P1 or inspect related services / coverage'}.\n- Observed hierarchy: {h or 'Refer to saved DOM; transient headings were not used as evidence'}.\n- Photography: {'; '.join(dict.fromkeys(r['images'])) or 'No descriptive image labels captured in the saved DOM'}; illustrative origin and project attribution require verification.\n- Visual strength: shared navy/blue identity, restrained geographic and service context. UX strength: relevant destination and contact recovery in the shared footer.\n- Weakness / opportunity: {r['issue']}\n- Conversion role: {'Research before inquiry' if r['kind'] in ['article','blog'] else 'Fit and confidence before inquiry'}. Trust role: show scope and regional relevance; add verified evidence at decision points.\n- Responsive: desktop and mobile screenshots available; stacked layouts and mobile quick-contact checked at 390px. {'Tablet family captured at 820px.' if r['route'] in [x['url'].split('p1landmanagement.com')[-1] for x in json.loads((E/'tablet-checks.json').read_text())] else 'Tablet route not individually captured; do not infer a complete responsive test.'}\n- Redesign priority: {'High' if r['kind'] in ['home','gallery','quote','commercial','drainage','grading-site-preparation'] else 'Medium'}.\n- Evidence: [Desktop](evidence/{r['slug']}-desktop.jpg), [DOM](evidence/{r['slug']}-desktop.txt). Mobile filenames use the full route slug.\n\n"
inv+='## State discovery and limits\n\nNavigation expanded and mobile services expanded were exercised. Home carousel pause and FAQ expansion were exercised. Gallery filtering is checked separately. The production inquiry was not submitted: successful delivery, server errors, receipt creation and downstream lead handling are source-reviewed, not transaction-tested. No customer data was used. Loading captures were rejected and recaptured. Source contains form pending, retained-input failure, idempotency and success-focus behavior. The commercial inquiry has a separate payload and receipt path; do not merge these contracts in a design phase.\n'
write('EXPERIENCE_INVENTORY.md',inv)
write('AUDIENCE_AND_INTENT.md','# Audience and intent\n\n'+status+'''The brief includes farms, estates and HOA properties; the live site and inquiry emphasise commercial, industrial, agricultural, municipal and institutional sites and exclude residential services. Treat estates/HOAs as owner decisions, not a silent expansion of eligibility.

| Audience | Concern / objection | Search intent | Information before contact | Trust and desired proof | Preferred next action |
|---|---|---|---|---|---|
| Commercial property manager | A vendor may miss work, communicate poorly or leave drainage issues unresolved | Commercial grounds maintenance; property drainage | Recurring scope, scheduling approach, contact ownership, corrective work | Comparable commercial scope, communication reviews, verified vendor documents | Discuss the property / request site assessment |
| Commercial owner | Will the company handle the whole problem and work at this scale? | Commercial land improvement, clearing, drainage | Property fit, related capabilities, site access, process | Real before/during/after work and scope | Request a site visit |
| Developer / builder | Equipment, plan coordination, tolerances and schedule | Grading, site preparation, land clearing | Delivery scope, access, approved plans, specialist responsibilities | Actual equipment in relevant work and project sequence | Discuss the site |
| HOA / community manager — eligibility pending | Common areas, ponds and resident disruption | HOA pond maintenance; erosion remediation | Eligible scope, access, communication, approvals | Similar common-area work, verified outcomes | Discuss community property |
| Farm / agricultural owner | Land use, drainage, roads, brush and seasonal constraints | Forestry mulching; field drainage; agricultural clearing | Selective clearing, soil/water context, intended use, access | Genuine acreage views, working-property photos, matching scope | Discuss the land |
| Estate / large residential acreage — eligibility pending | May be mistaken for a lawn-care lead; property character matters | Acreage clearing; pond restoration; trails | Which acreage projects qualify, retained vegetation, scope | Believable land transformation and approachable process | Check project fit |
| Industrial / distribution manager | Access routes and operational disruption | Industrial grounds vendor; drainage and vegetation | Work zones, timing, access coordination, ongoing management | Comparable industrial work and agreed communication | Request site assessment |
| Municipal / institutional manager | Procurement and responsibility boundaries | Campus grounds and land services | Vendor documents, scope, approvals, schedule | Verified credential facts and relevant projects | Discuss scope and vendor requirements |

## Funnel design

Recognition → scope → relevant evidence → property and geographic fit → clear next step. Proof should precede repeated sales asks. A person unsure of the service can choose “Not sure yet”; the site should not require technical diagnosis.

## Four review journeys

A: Commercial landing → recurring/corrective capabilities → verified project profile → source-backed review → inquiry → confirmation.

B: Drainage search → observe the water problem → understand site-review logic → relevant work → site-visit inquiry.

C: Grading search → delivery scope → plans/access/equipment → actual project sequence → inquiry.

D: Homepage → working-property fit → clearing/grading scope → gallery → inquiry. Estate and HOA paths stay conditional until eligibility is confirmed.

Each journey is linked in `mockups/r/journeys.html`; all directions have the same complete path coverage. A simulated confirmation does not represent a received production lead.
''')
write('DESIGN_RESEARCH.md','# Design research and reference locks\n\n'+status+'''Research conducted in this run. Three Refero search angles: civil/construction grids, premium architecture portfolios, industrial equipment marketing. Full references retrieved for Norgram, Studio Emmerer and MANNA; saved in `research/refero-styles.md`. A broad screen search returned mostly irrelevant software workflows; those results were rejected rather than used to make P1 resemble software.

| Reference | What works and why | P1 adaptation | Do not copy |
|---|---|---|---|
| [Norgram](https://www.norgram.co) — Refero full style | Dramatic sans hierarchy, precise grid, photography as content, flat surfaces | A: image-led land work, numbered capabilities, clear large-type positioning | Device photography, tiny 10–12px labels, brand identity or exact layouts |
| [Studio Emmerer](https://emmerer.com) — Refero full style | Tabular project index, hairline structure and plain documentary presentation | B: need / scope / next-step matrix and operational sequence | Abstract cultural portfolio tone, compressed body line height, ambiguous reference token descriptions |
| [MANNA](https://www.mannaarchitects.com) — Refero full style | Large horizontal imagery, material warmth and uncluttered caption rhythm | C: land-first regional gallery and ochre background bands | Architectural projects, pale/tiny typography, excessive aesthetic quietness that hides inquiry |
| [Barnhill](https://www.barnhillbuilt.com/) — official current content | Distinct building/civil positioning, people, safety and factual company identity | Explain P1 capability and actual people before broad slogans | Barnhill scale, history, credentials, service breadth or claims |
| [Sasaki projects](https://www.sasaki.com/projects/) — official current interface structure | Filters by service, sector, type and region | Separate service and property filters for a sufficiently large verified project collection | Architecture/civil-engineering credentials or overwhelming taxonomy |
| [John Deere construction](https://www.deere.com/en-us/industries/construction) | Official equipment reference was reached but the web text tool required JavaScript | Reference candidate for a future verified fleet treatment only | No visual claim is based on the blocked text response; no model or ownership inferred |

## A — Modern Landworks

Primary: Norgram. Preserve bright canvas, strong sans headlines, flat sharp imagery, open grid and restrained metadata. Borrow Emmerer’s structured scope rows. P1 blue is an action role grounded in the existing brand, not Norgram’s palette. Reject ornamental shadows, oversized rounded containers, warm neutral averaging and serif word swaps. Media: existing illustrations, visibly labelled; intended final role is approved documentary P1 photography.

## B — Commercial Field Operations

Primary: Emmerer’s tabular precision. Preserve scope-first information and hairline structure. Graphite canvas is a deliberate concept choice supported by the retrieved dark style description; reference tokens conflict in places, so source body colours/line heights are not copied blindly. Borrow Norgram’s high-contrast hierarchy. Reject dashboard widgets, unsupported numbers and fleet boasts. Media: field work and process, no fake project metrics.

## C — Carolina Land Specialists

Primary: MANNA. Preserve full-width landscape imagery, horizontal rhythm and ochre background bands; ochre stays a surface role, not a CTA. Borrow a limited capability index from Emmerer. P1 blue remains the functional action role. Reject rustic display type, ornamental landscapes that suggest resort maintenance, and muddy all-green palettes. Media: regional working land, not anonymous skyline decoration.

## Recommended hybrid

A owns the canvas, typography, imagery and section rhythm. B contributes scope, process and inquiry clarity only. C contributes attention to land context, not its colour palette. This is a recommendation for owner review, not a selected or approved production direction.

## Decision ledger

| Decision | Source | Role preserved / adaptation | Reason |
|---|---|---|---|
| Large photographic land panels | Norgram + user brief | Primary content, not background decoration | Make acreage and equipment legible |
| Numbered capability rows | Emmerer + user brief | Scope navigation | Avoid ten indistinguishable peer cards |
| Blue primary action | Existing P1 identity | Interaction only | Preserve brand recognition and consistent inquiry path |
| Project facts adjacent to photos | Sasaki taxonomy + proof brief | Evidence metadata | Explain what the image actually demonstrates |
| Label all illustrative media | Live gallery + user fact constraint | Provenance | Prevent invented P1 proof |
| 17px body and ≥44px controls | Accessibility brief | Readability over reference’s tiny labels | Mobile property-side use |
| No auto-rotating proposed hero | Live audit + stable-positioning brief | Fixed first impression | Recognition should not depend on time |
| Optional inquiry details | Existing commercial form pattern | Progressive disclosure | Reduce initial effort without losing qualification |

The image boards are explorations, not authoritative copy. Generated text, equipment, map labels, project associations and dates need checking; exact editable concept text is maintained in the isolated HTML screens.
''')
write('UX_AUDIT.md','# UX, visual and sales-experience audit\n\n'+status+'''## Executive assessment

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
''')
write('PHOTOGRAPHY_AUDIT.md','# Photography audit\n\n'+status+'''All 78 source PNG images were catalogued and viewed in four contact sheets. Metadata is saved in `evidence/asset-metadata.json`; shipped responsive variants are recorded by the existing `image-manifest.json`. The concepts copy existing optimised images into this folder only. No production image was replaced or optimised.

**Origin cannot be proved from pixels.** “Questionable / illustration” below is a provenance and realism flag, not a claim that a particular generator produced the image. No image reviewed here qualifies as verified documentary P1 project evidence. “Usable” means usable as a labelled illustration, not proof.

## High-priority close review

- `features/about-who.png`: staged crew lineup, uniformity and faces need full-resolution review and provenance. Never describe these people as actual staff without confirmation.
- `service-tree.png`: grapple/branch handling, suspended material and worker positions deserve equipment and safety review. Do not use as a technical process example.
- `service-reconstruction.png` and `features/reconstruction.png`: unusually expansive operation and multi-machine scenes can imply unsupported scale. Do not use as a completed P1 transformation.
- `features/turf-prep.png`: foreground tablet/tools and machine relationship look staged. Operator and instrument details need scrutiny.
- `blog-drainage.png`, `features/drainage-fix.png`: trench and pipe imagery is not an installation specification. Depth, access, protection and site geometry require technical review before instructional use.
- `pond-management.png` and `service-pond.png`: ideal symmetrical banks, immaculate water/grass and little process context feel generic rather than documentary. Use for capability illustration only.
- Regional/location scenes: repeated immaculate campus/pond/grass compositions weaken distinct local identity. They do not prove a real regional project, office or exact location.

## Asset-by-asset register

| Asset | Dimensions | Classification | Visible concern / opportunity | Recommendation |
|---|---|---|---|---|
'''+''.join(f"| `{Path(a['file']).relative_to('artifacts/p1-website/src/assets')}` | {a['width']}×{a['height']} | {'Questionable / visually stylised' if any(v in a['file'] for v in ['about-who','service-tree','reconstruction.png','turf-prep','services-hero','blog-drainage']) else 'Generic regional illustration' if '/locations/' in a['file'] or 'hero-' in a['file'] and any(v in a['file'] for v in ['county','region','metro','norman','service-areas']) else 'Usable labelled illustration'} | {'Human/equipment identity and physical details require close verification' if any(v in a['file'] for v in ['about-who','tree','turf-prep']) else 'Location and project attribution unverified' if '/locations/' in a['file'] or 'hero-' in a['file'] else 'Polished scene; needs real scope and provenance to act as evidence'} | {'Reserve for concept review; replace with approved real work before proof use' if any(v in a['file'] for v in ['about-who','service-tree','reconstruction.png']) else 'Retain disclosure; plan authentic documentary replacement'} |\n"for a in json.loads((E/'asset-metadata.json').read_text()))+'''
## Photography commissioning brief

Build each project record from the same property: wide view showing acreage/context, mid-range equipment in work, detail showing the relevant drainage/grade/vegetation, and matched before/after views. Include the operator or accountable team when permission allows. Prefer neutral daylight, regional soils and terrain, accurate machinery, useful shadows and honest condition over golden-hour spectacle. Capture horizontal 3:2 masters plus vertical compositions; preserve the outlet, bucket, tracks and slope context in crops. Never manufacture a before/after pair from unrelated scenes.

Record project ID, location publication permission, customer permission, date, service, scope, photo origin, photographer rights, identifiable people consent and reviewer. Technical detail captions should be reviewed by someone who knows the actual work. Alt text describes what the image shows; it must not add unsupported scope, acreage or outcome.

## Priority

First: three strongest real projects across grading, drainage and land clearing, plus a real commercial recurring-care example. Second: actual people/equipment and regional work. Third: article process photography. An honest small verified collection is more credible than a large illustrated portfolio.
''')
write('DESIGN_DECISIONS.md','# Design decision log\n\n'+status)
decisions=[
('Stable brand hero','Three seasonal slides','Make land capability invariant','Fixed split land-work hero, seasonal content below','Comprehension should not depend on timing','Keep carousel; lead with one verified project','Seasonal promotions lose first-screen prominence'),
('Four capability groups','Ten peer service cards','Explain relationships','Land/site; water; ongoing care; vegetation/surfaces','Prospects choose a need before a technical label','Flat list; audience-first categories','Some services span groups; cross-link without duplicating claims'),
('Separate proof and illustration','Gallery openly states illustrative purpose','Add real evidence without misleading','Verified project collection plus labelled service illustrations','A service illustration is not a customer result','Replace gallery wholesale; keep capability-only gallery','Verified collection cannot be populated until owner facts arrive'),
('Project profile','No verified case-study data found','Explain work scope and outcome','Problem/work/result with pending verified facts','Images need context','Photo-only grid; long narrative case study','Requires content and publication workflow'),
('Commercial program','Commercial page combines recurring/corrective scope','Show vendor fit early','Condition/access/communication, program sequence, comparable proof','Manager concerns differ from one-off acreage work','Separate maintenance microsite','Avoid implying undocumented service levels'),
('Inquiry hierarchy','General form long; commercial uses optional disclosure','Reduce initial effort','Name, contact, location, need; optional detailed property fields','Reuse proven progressive-disclosure pattern','Long single page; multistep form','Qualification fields and contact-channel policy need owner/operations agreement'),
('Geographic hierarchy','Thirty region/city/county routes','Make coverage scannable','Two regional starting points, meaningful local pages','Region first, exact address qualification next','Huge map; flat city list','Exact boundary and map artwork remain unverified'),
('Equipment story','Illustrative machines; equipment fact field blank','Demonstrate actual delivery resources','Equipment photographed in relevant work, verified captions','Scope matters more than catalog specs','Fleet catalogue; generic badges','Ownership and capability details pending'),
('Typography','Fraunces/Manrope, italic colour word treatments','Communicate precision','Large sans headline; readable prose and restrained labels','Norgram/Emmerer hierarchy; brief rejects ornamental contractor style','Keep full serif system; condensed industrial type','HTML uses installed fallback sans; final licensed font choice requires review'),
('Motion','Hero rotation, entrance and image transitions','Support story without blocking content','Concept: short image reveal and accordion transition; stable hero','Readable content and reduced motion first','Parallax; auto sequences','No motion implementation is proposed in production'),
('Eligibility','Brief includes estates/HOAs; live excludes residential','Prevent misleading property-fit messages','Pending owner decision beside conceptual audience routes','Business policy precedes attractive copy','Accept all acreage; commercial-only stance','Cannot finalise inquiry options before decision'),
('Technical boundaries','Service FAQs mention approvals/specialists','Keep informed confidence','Plain water-path and grading-sequence explanations','Avoid engineering credentials or universal outcomes','More technical diagrams; purely promotional copy','Diagrams need technical review and genuine site data')]
with (D/'DESIGN_DECISIONS.md').open('a') as f:
 for name,current,opp,proposal,why,alts,trade in decisions:f.write(f'## {name}\n\n### Current State\n{current}.\n\n### Opportunity\n{opp}.\n\n### Proposed Design\n{proposal}.\n\n### Rationale\n{why}.\n\n### Alternatives\n{alts}.\n\n### Tradeoffs\n{trade}.\n\n### Status\nMOCKUP ONLY — NOT IMPLEMENTED\n\n')
manifest=json.loads((D/'mockups/manifest.json').read_text()); keys=list(dict.fromkeys(v['experience'] for v in manifest.values()))
coverage='# Mockup coverage\n\n'+status+'All 32 screen types have A, B, C and recommended isolated HTML mockups (128 screens). “Responsive” means an editable layout is provided; screenshot verification is logged in `VALIDATION.md` and capture files, not inferred from file existence. City and article routes share representative templates; the matrix below lists every discovered live route and maps it explicitly.\n\n| Experience | Reviewed | Desktop Mockup | Mobile Mockup | States | Flow | Needs Further Work |\n|---|---:|---|---|---|---|---|\n'
for r in rows:
 coverage+=f"| `{r['route']}` | Live + source family | [A](mockups/a/{r['kind']}.html), [B](mockups/b/{r['kind']}.html), [C](mockups/c/{r['kind']}.html), [R](mockups/r/{r['kind']}.html) | Responsive template | [Stateboard](mockups/r/states.html) | [Journeys](mockups/r/journeys.html) | {'Local facts and projects; representative template, not a unique city redesign' if r['kind']=='location' else 'Verified project content, owner eligibility and final copy' if r['kind'] in ['home','commercial','gallery','quote'] else 'Technical/editorial review and approved photography'} |\n"
coverage+='\n## Proposed or global experiences\n\n| Experience | Reviewed | Desktop Mockup | Mobile Mockup | States | Flow | Needs Further Work |\n|---|---:|---|---|---|---|---|\n'
for k in keys:
 if k not in {r['kind'] for r in rows}:coverage+=f'| {k} | Source/global or proposed | [A/B/C/R via review index](mockups/index.html) | Responsive | [States](mockups/r/states.html) | [Journeys](mockups/r/journeys.html) | Owner facts, interaction/accessibility refinement as appropriate |\n'
write('MOCKUP_COVERAGE.md',coverage)
write('DESIGN_SYSTEM.md','# Proposed design system\n\n'+status+'''Recommended: light #fbfcfc canvas, #17262e ink, #52616a secondary text, #245e8b action blue, #162a38 dark proof/process bands, #bdc7cd structural lines. Colour communicates hierarchy and interaction. No image is evidence merely because it has a professional treatment.

Type: proposed contemporary grotesk with broad readable forms. Isolated HTML uses Arial/Helvetica fallback to avoid new dependencies or external font calls. Evaluate Inter, Helvetica Now or equivalent licensing later; generated boards are aesthetic reference only. H1 42–88px depending viewport/direction; recommended hero capped at 66px. H2 30–52px; H3 25px; body 17px at 1.6; metadata 12px minimum. C uses Georgia prose as an exploration. No decorative serif/italic headline swaps.

Grid: 1340px maximum canvas, 48px desktop gutters, 28px tablet, 22px mobile. Core split layouts become single column; capability rows stay text-led. Section spacing 75px desktop / 48px mobile. Photo roles: hero 5:4 or wide landscape; capability previews 16:10; content 4:3. Captions adjacent to every illustration.

Controls: 48px typical button, at least 44px contact action. Default/hover/active/focus/disabled/loading are displayed in stateboards. 3px focus ring with offset; error includes words, not just red; loading uses text and busy semantics. Primary CTA is Request a site visit; commercial context may use Discuss your property or Request a site assessment. Secondary is scope/proof; phone remains optional/direct.

Accessibility: validate all final combinations against WCAG AA, including dark surfaces, image overlays and status colours. Use semantic H1/H2 order, descriptive links and actual buttons for toggles. Announce gallery result counts. Form error summary links to fields, keep input on network failure and focus the success heading after confirmed receipt. Avoid automatic motion, honour reduced-motion preference and retain readable content without animation. Full keyboard, screen-reader, 200–400% zoom, 320px reflow and device testing remain future validation tasks.

Conceptual motion only: 150–250ms purposeful menu/accordion transitions, optional photograph reveal; no parallax, scroll hijacking or cursor effects. These are notes, not implemented production motion.
''')
write('OWNER_REVIEW.md','# Owner decisions and future considerations\n\n'+status+'''1. Choose A, B, C or the recommended hybrid after reviewing desktop and mobile screens.
2. Confirm which property types qualify: HOA common areas, estates and large residential land conflict with current commercial-only language.
3. Supply/approve real projects, scopes, locations and photos. Never populate the profile with the illustrative 40-acre example from the brief.
4. Verify fleet ownership and actual equipment capability, experience basis, people, licences and insurance publication details.
5. Confirm free-visit/free-estimate and response-time commitments; proposed confirmation deliberately avoids inventing a new service promise.
6. Agree required versus optional inquiry fields, email/phone policy and photo-upload support before changing any form contract.
7. Confirm exact territory and any genuine office locations before final map artwork or local office modules.
8. Verify review authors, provenance, project affiliations and republication context; review presentation is not automatically project evidence.

Future implementation should begin only under a separate instruction. Preserve shared route/schema contracts, live CMS additions, lead idempotency and failure recovery. Reconcile the live site with the intended source revision, then implement one approved page family at a time with accessibility and receipt validation. No packages, schema changes, CMS changes, API changes, deploy or production edits are authorised by this package.
''')
write('MOCKUP_CRITIQUE.md','# Mockup critique and refinement log\n\n'+status+'''| Criterion | A | B | C | Recommended |
|---|---|---|---|---|
| Substantial land/company impression | Strong grid and photographic scale | Strongest operational tone | Strong regional land identity | A’s scale with B’s process |
| Equipment capability | Visible in scope context | Most explicit process/equipment framing | Quieter, needs field details | Field work beside scope; no ownership claim |
| Commercial credibility | Strong | Strongest | Needs more procurement proof | Dedicated commercial path retained |
| Farm/acreage approachability | Direct | Can feel severe | Strongest | Plain language and land context |
| Landscaping differentiation | Clearing/grading/water early | Technical scope early | Land-use story early | Stable land-specialist hero |
| Authenticity | All imagery remains illustrative | Same limitation | Same limitation | Requires verified photography |
| Technical accuracy | General scope, no engineered promise | Avoid invented specifications | Avoid overly scenic pond story | Plain diagnosis and responsibilities |
| Custom feel | Typography + open capability index | Tabular structure + graphite | Full-width regional imagery | Capability index, image evidence and process rhythm |
| Longevity | Low visual gimmick risk | Low; avoid fashionable dashboard look | Low; avoid earth-tone template repetition | Stable layout, restrained brand colour |

Refinements made during review: shortened recommended hero and capped type to avoid excessive line breaks; switched copied raster logo to existing vector source; hid skip link visually until focus; retained explicit captions; avoided fictitious testimonials and project facts. Generated boards may contain stray invented incidental text, dates, maps or service implications; the editable HTML and factual constraints take precedence.

Unresolved: authentic project media, technical diagram artwork, final font licensing, owner-confirmed map coverage and complete assistive-technology testing. These are content/fidelity limits, not production changes hidden in the task.
''')
write('FINAL_PRESENTATION.md','# P1 design presentation\n\n'+status+'''## 1. Executive assessment

The website has coherent branding, extensive service and regional coverage, commercial-specific paths and useful inquiry foundations. Its biggest opportunity is to make large-property land capability unmistakable and replace illustrative confidence with verified work evidence. See [audit](UX_AUDIT.md).

## 2. Brand position

Land specialists with clear responsibility for ground, water, vegetation and access. Scale visible, capability shown, confidence factual. The interface should be precise without becoming an equipment catalogue or software product.

## 3. Audience

Commercial managers, owners, developers, farms and institutional/industrial sites. HOA, estate and large residential eligibility requires owner confirmation. See [audiences](AUDIENCE_AND_INTENT.md).

## 4. User journeys

Four complete review paths: commercial management, drainage, site preparation and acreage. Open [journey board](mockups/r/journeys.html) to follow the linked concept screens through inquiry and simulated confirmation.

## 5. Design research

Norgram: photographic scale and sans hierarchy. Emmerer: scope index and documentary precision. MANNA: regional land-gallery warmth. Barnhill and Sasaki supply bounded industry/content patterns. See [reference locks](DESIGN_RESEARCH.md).

## 6. Visual directions

[A / Modern Landworks](mockups/a/home.html): bright, bold, image-led. [B / Commercial Field Operations](mockups/b/home.html): graphite, operational, scope-led. [C / Carolina Land Specialists](mockups/c/home.html): regional, warm, landscape-led. Each direction has 32 editable screens.

## 7. Recommended direction

[Recommended](mockups/r/home.html): A’s visual foundation with B’s operational clarity, retaining P1 blue for actions. Pending owner selection; this is not approval to implement.

## 8. Design system

Readable grotesk typography, restrained blue/ink palette, open layouts, sharp imagery, few contained objects, clear interaction states. See [design system](DESIGN_SYSTEM.md) and [stateboards](mockups/r/states.html).

## 9. Homepage

Stable broad positioning → needs/capabilities → work context → property types → equipment/process → territory → feedback → inquiry. Seasonal services remain available without defining the entire first impression.

## 10. Services

Four connected groups and ten service screens. Each explains scope, fit, process, evidence, decision questions and related work. Drainage, grading, clearing, ponds and reconstruction include specific narrative sections.

## 11. Commercial experience

Property condition, access and communication; recurring care connected to corrective land/water work. Commercial and secure-facility concepts remain distinct.

## 12. Project proof

Illustrations stay labelled. Project profile structure is ready for verified problem/work/result records; no real project is fabricated. [Gallery](mockups/r/gallery.html), [profile template](mockups/r/project-profile.html), [photo audit](PHOTOGRAPHY_AUDIT.md).

## 13. Service area

Two regional starting points, substantive local context, exact-address qualification. The regional concepts include the existing live map as a reference. Preserve community pins, attribution and the text list; exact coverage still needs confirmation. No coverage boundary or office pin is invented.

## 14. Contact / quote

A simpler starting point and optional property detail. Local form simulation, error and confirmation are separate states. No request is sent to P1.

## 15. Mobile

Stacked land imagery, readable headings, short menu paths and restrained call/site-visit rail. Critical page types have responsive concepts; current live routes were captured at 390px.

## 16. Accessibility

Visible focus, 44px+ targets, semantic headings, labelled fields and explicit error/status content. Screenshots cannot establish full compliance; keyboard, assistive technology, zoom and all colour-state combinations need later validation.

## 17. Mockup inventory

128 isolated concept screens. [Complete review index](mockups/index.html), [coverage matrix](MOCKUP_COVERAGE.md), [experience inventory](EXPERIENCE_INVENTORY.md).

## 18. Open decisions

Visual selection, residential/HOA eligibility, actual project proof, fleet/credentials, response commitments, inquiry policy and exact territory. See [owner review](OWNER_REVIEW.md).

## 19. Future implementation considerations

Separate future authorisation required. Preserve source/CMS ownership, lead contracts and reliability. No website source, production content, metadata, API, database or deployment changes were made by this exploration.
''')
write('README.md','# P1 design exploration\n\n'+status+'''Start with [Final presentation](FINAL_PRESENTATION.md) and the [complete visual review](mockups/index.html).

- [UX audit](UX_AUDIT.md)
- [Experience inventory](EXPERIENCE_INVENTORY.md)
- [Audiences and journeys](AUDIENCE_AND_INTENT.md)
- [Research and reference locks](DESIGN_RESEARCH.md)
- [Photography audit](PHOTOGRAPHY_AUDIT.md)
- [Design system](DESIGN_SYSTEM.md)
- [Decisions](DESIGN_DECISIONS.md)
- [Coverage](MOCKUP_COVERAGE.md)
- [Critique](MOCKUP_CRITIQUE.md)
- [Owner decisions](OWNER_REVIEW.md)
- [Validation](VALIDATION.md)

All files are isolated in `docs/design-exploration`. Existing source and unrelated uncommitted work remain untouched. The three generated visual boards are exploratory; exact text and factual boundaries live in the editable HTML.

For local review: `python3 -m http.server 8766 --bind 127.0.0.1 --directory docs/design-exploration`, then open `http://127.0.0.1:8766/mockups/index.html`.

Regenerate isolated screens: `python3 docs/design-exploration/build_review.py`. Regenerate inventories/docs: `python3 docs/design-exploration/write_documentation.py`. Neither script edits production.
''')
print(f'Documentation written; {len(rows)} live routes inventoried; {len(keys)} concept types')
