# P1 Land & Property Management: Master Content Improvement Spec

**Site:** https://www.p1landmanagement.com
**Prepared by:** Digital Alchemy, September 2026
**For:** Codex (implementation agent) and the Digital Alchemy dev team

---

## 0. How to use this file (read this first, Codex)

This file replaces the body copy on every existing page in the sitemap. It does **not** change URLs, slugs, the page template/component system, or the navigation structure unless a section below says so.

**For each page block in Section 4 onward:**

1. Find the page by its URL path.
2. Replace the `<title>`, meta description, OG title/description, H1, hero subhead, and all body sections with the copy in the block. Keep existing layout components (hero, cards, accordions, link modules, CTA band). Map each `##` heading in the block to the page's H2s in order, and each `###` to H3s.
3. Blocks marked **FAQ** render in the existing FAQ accordion *and* feed the page's `FAQPage` JSON-LD. The JSON-LD text must match the visible text exactly.
4. Blocks marked **Links** replace the page's "Explore More / Services and Nearby Communities" module. Use the anchor text given. Every link target already exists.
5. Blocks marked **CTA** set the CTA band for that page. The CTA variants are defined in Section 2.2.
6. Keep the sticky "Call P1" / primary CTA bar sitewide, but point its secondary button at the page's CTA variant.
7. Do not add copy that is not in this file. If a component needs filler, leave it out. Do not generate text.

**Reading this file:**

- Numbered headings like `## 4. Core pages` and `### 4.1 Homepage` are file structure. They are never rendered.
- Inside a page block, `##` is an H2 and `###` is an H3 on the page.
- `## FAQ` renders as the H2 **"FAQ: {short page subject}"** (for example "FAQ: Land clearing" or "FAQ: Greenville, SC"). This keeps FAQ headings unique across pages.
- Lines in bold ending in a colon (**Title:**, **Meta description:**, **Eyebrow:**, **H1:**, **Hero subhead:**, **Qualifier:**, **Links:**, **CTA:**, **Implementation note:**) are fields and instructions, not body copy.
- `**Credentials strip** (Section 2.4)` marks where that component goes on the page.

**Placeholders.** Values P1 still has to supply look like `{{LIKE_THIS}}`. Rules:

- If the value exists in `src/content/site-facts.(json|ts)` (create this file; see Section 3.1), render it.
- If it does not exist yet, **drop the entire sentence or list item containing the placeholder**. Never render braces, "TBD", or an empty value.
- Blocks wrapped in `[[OPTIONAL: … ]]` render only when every placeholder inside them has a value.

**Do not change:**

- The "1 acre and up / commercial, industrial, agricultural, municipal, institutional / no residential" positioning. It stays on every page, once.
- The phone number (704) 221-8928.
- Canonical URLs, redirects, the sitemap URL list.

**After implementation,** run the checks in Section 9 and fix anything that fails before opening the PR.

---

## 1. Voice and copy rules

These apply to every string on the site, including alt text, button labels, and schema descriptions.

### 1.1 Who is talking

The copy is written in the voice of the owner walking a site with a facility manager or a farmer. He has done this for close to 30 years. He is calm, direct and specific. He says what he'd do and why, and he's willing to say when something is a bad idea. He doesn't sell. He explains.

### 1.2 Rules

1. **Say what P1 does, then stop.** Describe scope in one plain statement per page. Don't hedge each section.
2. **Specifics beat adjectives.** Name the ground, the machine type, the season, the road, the problem. Never "reliable," "experienced," "full-service," "comprehensive," "tailored."
3. **Short sentences, varied rhythm.** Mix a 5-word sentence with a 20-word one. Don't stack three short sentences in a row more than once per section.
4. **One idea per paragraph.** Two to four sentences.
5. **Say the property list once.** Use the full "commercial, industrial, agricultural, municipal and institutional" list no more than once per page. After that, "your site," "the property," "the ground."
6. **State the size rule once per page,** in the qualifier line. Vary the wording across pages ("1 acre and up," "an acre or more," "properties over an acre").
7. **Have an opinion.** Each service page includes at least one "here's what we'd tell you" statement (e.g., "If the pad is going under a building, don't mulch it. Grub it.").
8. **Answer questions directly.** FAQ answers open with "Yes," "No," or a direct fact, then give the reason in one or two sentences.
9. **American English, contractions allowed,** second person ("you," "your site").

### 1.3 Banned patterns (hard fail in lint)

| Pattern | Why | Use instead |
|---|---|---|
| "not just …", "more than just …", "isn't just …", "…, not a …" (closing contrast) | The formula the client called out | State the positive claim alone |
| "Whether you're … or …" / "Whether you need …" | AI opener | Name the buyer directly |
| "help you plan" / "help you decide" | Used 61× today | Say what P1 does: "we'll lay out," "we'll price," "we'll sequence" |
| "needs attention" / "what needs attention" | Used 62× | Name the problem |
| "specialist" | Hedge (33×) | Max 1 per page, only where a licensed engineer or applicator is actually required |
| "confirm" / "confirmed" | Hedge (30×) | Max 1 per page |
| "Property Partner" | Template H2 | Varied H2s given per page |
| "one team to call" | Repeated slogan | Max 1 use sitewide (homepage) |
| "seamless", "tailored", "comprehensive", "cutting-edge", "top-notch", "peace of mind", "look no further", "second to none", "premier", "leading", "trusted partner", "we pride ourselves", "dedicated to", "elevate", "unlock", "robust", "navigate", "in today's" | Filler | Delete or replace with a fact |
| "From X to Y, we…" sentence openers | Template cadence | Max 1 per page |
| Em dash (—) | Density was 294 sitewide | Max 2 per page. Use a period or comma |
| "Illustration" / "Illustrative" in any alt text or caption | Signals no real work | See 2.6 |
| Exclamation points | Voice | None |

### 1.4 Word targets

Length is not the goal. Every sentence has to carry a fact, a decision or a local detail. These ranges are what the copy in this file already hits; don't pad to reach them.

| Page type | Target words (body copy, excluding link modules, CTA band and footer) |
|---|---|
| Homepage | 800–1,000 |
| Service pages | 550–900 |
| /commercial, data centers | 700–850 |
| County and regional hubs | 450–600 |
| City / town pages | 370–550 |
| About, Contact, Services hub, Gallery | 250–450 |

Measured on this file's copy: the highest shingle overlap between any two service-area pages is 9%, down from 44–56% on the live town pages.

---

## 2. Sitewide components

### 2.1 Footer blurb (replace current)

> P1 Land & Property Management clears, grades, drains, seeds and maintains commercial, industrial and farm property of an acre or more across Upstate South Carolina and the Charlotte region. Licensed and insured in North and South Carolina.

### 2.2 CTA variants

Replace the single "Get a Free Site Assessment" band with these five variants. Each page block names which one to use. All buttons go to `/contact` with a `?type=` parameter that preselects the form's inquiry type (see 2.5).

**CTA-MAINT: grounds contracts (facility and property managers)**
- Heading: "Put your grounds on a schedule"
- Body: "Send us the address and a rough idea of what's there. We'll walk it, write up a visit schedule and a price per visit, and you'll have it in writing before you commit to anything."
- Primary button: "Request a Maintenance Bid" → `/contact?type=maintenance`
- Secondary button: "Call (704) 221-8928" → `tel:+17042218928`

**CTA-SITE: clearing, grading, drainage, reconstruction (developers, GCs, owners)**
- Heading: "Send us the site"
- Body: "Plans help, but an address and a few photos are enough to start. We'll walk the ground, tell you what order the work should go in, and send a written price."
- Primary: "Get a Site-Work Quote" → `/contact?type=sitework`
- Secondary: "Call (704) 221-8928"

**CTA-FARM: agricultural and large acreage**
- Heading: "Tell us about the land"
- Body: "How many acres, what's on it, and what you want it to be. A few phone photos go a long way. We'll come look and give you a straight number."
- Primary: "Get a Price on Your Acreage" → `/contact?type=farm`
- Secondary: "Call (704) 221-8928"

**CTA-SNOW: seasonal only (show Aug 1 – Feb 28; outside that window fall back to CTA-MAINT)**
- Heading: "Get your site walked before the first freeze"
- Body: "We map the lots, docks and walkways that have to open first, agree on the triggers, and put the plan in writing before winter."
- Primary: "Schedule a Pre-Season Walk" → `/contact?type=snow`
- Secondary: "Call (704) 221-8928"

**CTA-GENERAL: core pages and hubs**
- Heading: "Let's walk your property"
- Body: "Tell us where it is and what's going on. The site visit and written estimate are free."
- Primary: "Request a Site Visit" → `/contact`
- Secondary: "Call (704) 221-8928"

### 2.3 Pre-footer band (currently "A better plan for your land")

Replace the heading and line with:

- Heading: "Close to 30 years of Carolina land work"
- Line: "Our crew leads have been clearing, grading and keeping up large properties for close to 30 years. P1 is the company we built to do it our way."
- Button: "Request a Site Visit" → `/contact`

### 2.4 Credentials strip (new component)

A single-row strip rendered on `/`, `/about`, `/commercial`, `/commercial/data-centers-secure-facilities`, `/services/commercial-landscaping`, `/services/commercial-snow-ice-management`, and `/contact`, directly above the CTA band.

Items (render each only if its value exists):

- "Licensed in NC and SC" + `{{LICENSE_LIST}}` (small text under it, e.g. license types and numbers)
- "Fully insured" + `{{INSURANCE_SUMMARY}}` (e.g., "General liability, auto, workers' comp")
- "COI on request" + `{{COI_TURNAROUND}}` (e.g., "Usually same day")
- "Close to 30 years in Carolina land work"
- `[[OPTIONAL: "{{GOOGLE_RATING}} on Google ({{GOOGLE_REVIEW_COUNT}} reviews)"]]` (render only when the count is 20 or more)

### 2.5 Contact form changes

- Add a required first field, **"What kind of work is this?"** (radio): Grounds maintenance contract · Clearing, grading or drainage project · Farm or large acreage · Pond or waterway · Snow and ice · Not sure yet. Preselect from `?type=`.
- Make **Approximate acreage** required. Options: Under 1 acre · 1–5 · 5–20 · 20–100 · 100+. If "Under 1 acre" is selected, show inline: "We work on properties of an acre or more. If your site is smaller, we're probably not the right fit, but call us and we'll point you to someone good."
- Make **Property type** required. Options: Commercial / office / retail · Industrial / manufacturing / distribution · Farm / agricultural · Municipal / public · Institutional (school, church, hospital, campus) · Other.
- Add optional **"When do you need this done?"**: As soon as possible · Within 30 days · 1–3 months · Planning ahead.
- Add optional **file upload** (plans, photos). Max 5 files, 20 MB each.
- Submit button label: "Send It Over".
- Success message: "Got it. Someone from P1 will call or email you within one business day to set up a time to walk the property."

### 2.6 Images and alt text (applies now, before real photos exist)

- Remove the word "Illustration:" / "Illustrative" from every caption, title, and alt attribute.
- Alt text describes what is in the image in plain terms, with no location claim (e.g., "Forestry mulcher working through dense brush," not "P1 crew clearing land in Greer").
- On `/gallery`, see that page's block. Rename the page's visible title to "Our Work" once real photos land. Until then, use the copy given.
- When real photos arrive: filename pattern `{service}-{town}-{st}-{nn}.webp` (e.g., `land-clearing-monroe-nc-01.webp`), alt pattern "{What's happening} on a {property type} in {Town}, {ST}".

### 2.7 Local office block (new component, hidden until offices open)

P1 is opening offices in several towns. Build a reusable `LocalOffice` component that renders on a service-area page **only** when `site-facts.offices[]` contains an entry whose `slug` matches the page.

Rendered copy:

> **P1 {{OFFICE_TOWN}} office**
> {{OFFICE_STREET}}, {{OFFICE_TOWN}}, {{OFFICE_STATE}} {{OFFICE_ZIP}}
> {{OFFICE_PHONE}} · {{OFFICE_HOURS}}
> Our {{OFFICE_TOWN}} crew handles work across {{OFFICE_COVERAGE}}.

When an office goes live, also add it to the `LandscapingBusiness` schema as a `department` with its own `PostalAddress` and `geo` (see 3.2), and create a matching Google Business Profile.

---

## 3. Data, metadata and schema

### 3.1 New content file: `site-facts`

Create `src/content/site-facts.json` (or `.ts` to match the codebase). All placeholders read from here. Leave values empty until P1 provides them.

```json
{
  "legalName": "P1 Land & Property Management",
  "gbpName": "P1 Land & Property Management",
  "phone": "(704) 221-8928",
  "yearsLabel": "close to 30 years",
  "hq": { "street": "", "city": "", "state": "", "zip": "", "lat": null, "lng": null },
  "LICENSE_LIST": "",
  "INSURANCE_SUMMARY": "",
  "COI_TURNAROUND": "",
  "GOOGLE_RATING": "",
  "GOOGLE_REVIEW_COUNT": "",
  "EQUIPMENT_SUMMARY": "",
  "OWNER_NAME": "",
  "OWNER_BIO": "",
  "offices": []
}
```

### 3.2 Schema updates (all pages)

- `LandscapingBusiness.name` must equal `gbpName`. **Flag to Digital Alchemy:** the GBP is currently "P1 Land Management." One of them has to change.
- Add `address.addressLocality` and `address.postalCode` from `hq` when present. Add `geo` when lat/lng are present.
- Remove `"priceRange": "$"`.
- Add `"foundingDate"` only when P1 supplies it. Do not guess.
- Add `"slogan": "Land and grounds work for properties of an acre or more."`
- Replace the `description` with the footer blurb from 2.1.
- `Article` schema on blog posts: set `datePublished` to the real first-publish date per post and `dateModified` to the actual last content edit. Do not use the build timestamp. Set `author` to a `Person` (`OWNER_NAME`) when present, otherwise keep the Organization.
- `sitemap.xml`: each URL's `lastmod` must be the page's real last content change, not the build time.
- `FAQPage` JSON-LD must mirror the new visible FAQs on each page exactly.

### 3.3 Title and meta rules

- Titles: ≤ 60 characters, end with `| P1`. Every title in Section 4 is already written to this length.
- Meta descriptions: 140–158 characters. Each one is written in its page block. Do not auto-generate.

---

## 4. Core pages

---

### 4.1 Homepage: `/`

**Title:** Land Clearing, Grading & Grounds Care in the Carolinas | P1
**Meta description:** Clearing, grading, drainage, ponds, turf and grounds contracts for commercial, industrial and farm property of an acre or more in Upstate SC and Charlotte.
**Eyebrow:** Upstate SC · Greater Charlotte · 1 acre and up
**H1:** Land and grounds work for properties that are too big for a lawn crew
**Hero subhead:** We clear it, grade it, drain it, plant it, and keep it maintained afterward. Commercial, industrial, municipal, institutional and farm properties across Upstate South Carolina and the Charlotte region.
**Hero buttons:** "Request a Site Visit" → `/contact` · "Call (704) 221-8928"

**Hero stat row (replace current three items):**
- Close to 30 years in Carolina land work
- Properties of an acre or more
- Licensed and insured in NC and SC

## What we do

Most large properties end up with three or four contractors: someone to clear, someone to grade, someone to fix the drainage, and a landscaper who shows up afterward and inherits whatever the first three left behind. We do all of it. The crew that shapes the ground is the same company that will be mowing it next spring, so we build it to be easy to maintain.

**Service cards (10).** Keep the current card grid and links. Replace card text:

| Card | Text |
|---|---|
| Commercial Landscaping | Scheduled mowing, edging, beds and seasonal work on large commercial and public grounds. |
| Commercial Snow & Ice | Pre-treatment, plowing and walkway clearing for lots, docks and entrances. |
| Industrial & Agricultural Land | Pasture mowing, fence lines, farm roads, perimeter and buffer control. |
| Land Clearing & Mulching | Forestry mulching, full clearing, selective clearing and stump removal. |
| Fine Grading & Site Prep | Rough and finish grade, pads, swales and access roads. |
| Drainage Solutions | French drains, swales, culverts, catch basins and ditch work. |
| Turf Installation & Seeding | Sod, drill seeding and hydroseeding for grounds, slopes and pasture. |
| Tree & Brush Management | Limbing, removals, tree lines, storm cleanup and stump grinding. |
| Pond & Waterway Management | Farm ponds, stormwater basins, banks, outlets and ditches. |
| Property Reconstruction | Neglected or damaged ground brought back to working order. |

## Why owners bring us in

### We think about year two on day one
When we grade a site, we're thinking about where the mower will turn, where water will sit in February, and which slope will wash if it isn't seeded before July. It costs less to build it right than to maintain around a mistake.

### Big equipment when it's needed, small when it isn't
A forestry mulcher belongs on a 20-acre overgrown tract. Along a finished parking lot island, a hand crew does better work. We bring the machine that fits the job and the access, so you aren't paying for iron that sits on a trailer.

### Water is usually the real problem
Rutted access roads, dead turf, eroded pond banks, standing water behind a building. Most of the time it traces back to how water moves across the property. We look at that before we quote anything else.

### You get a written plan and a price
After the site walk, you get a written scope: what we'll do, in what order, how long it takes, and what it costs. If something needs an engineer or a permit, we'll tell you up front.

## Who we work for

- **Industrial and distribution sites** along I-85 and I-77 that need perimeter mowing, retention pond upkeep and erosion repair.
- **Commercial and office campuses** that want the entrance to look sharp and the back 30 acres kept under control.
- **Farms and cattle operations** that need pasture mowed, fence lines opened and farm roads rebuilt.
- **Towns, schools and churches** with ball fields, detention basins and wooded edges.
- **Developers and GCs** who need a lot cleared and graded, then turned over with turf established.

We don't do residential lawns or home yards. Our crews and equipment are set up for an acre and up.

**Credentials strip** (Section 2.4)

## Where we work

**H3: Upstate South Carolina**
Greenville · Spartanburg · Anderson · Greer · Simpsonville · Easley · Gaffney · Duncan · Inman · Boiling Springs

**H3: Charlotte region and the SC line**
Charlotte · Concord · Mooresville · Lake Norman · Gastonia · Matthews · Waxhaw · Kannapolis · Huntersville · Indian Trail · Monroe · Belmont · Mount Holly · Cornelius · Fort Mill · Rock Hill · Indian Land

Plus Union County, York County and Lancaster County. [View all service areas → `/service-areas`]

[[OPTIONAL: **Local offices:** {{OFFICE_LIST_INLINE}}]]

## FAQ

**What does P1 Land & Property Management do?**
We clear, grade, drain, seed and maintain large properties. That covers forestry mulching and land clearing, fine grading and pads, drainage and ponds, sod and seeding, tree work, and recurring grounds maintenance contracts.

**Is there a minimum property size?**
Yes. We work on properties of one acre or more: commercial, industrial, agricultural, municipal and institutional. We don't take residential lawn or yard work.

**What areas do you serve?**
Upstate South Carolina, including Greenville, Spartanburg and Anderson, and the Charlotte region, including Mecklenburg, Cabarrus, Gaston, Iredell and Union counties, plus York and Lancaster counties in South Carolina.

**How much does it cost to get an estimate?**
Nothing. We walk the property, talk through what you want, and send a written estimate. There's no charge and no obligation.

**Are you licensed and insured?**
Yes. P1 is licensed and insured in North and South Carolina. [[OPTIONAL: {{LICENSE_LIST}}. {{INSURANCE_SUMMARY}}.]] We'll send a certificate of insurance naming you as additional insured when you need one.

**Commercial callout band** (keep component, replace copy):

**Heading:** Running a plant, a distribution center or a campus?
**Body:** We'll take the whole exterior on one contract: mowing, perimeter and buffers, retention ponds, erosion repair and access roads.
**Buttons:** "Commercial Site Management" → `/commercial` · "Data Center & Secure Facility Grounds" → `/commercial/data-centers-secure-facilities`

**CTA:** CTA-GENERAL

---

### 4.2 About: `/about`

**Title:** About P1 Land & Property Management | P1
**Meta description:** P1 is a Carolinas land and grounds contractor built by crew leads with close to 30 years of clearing, grading and maintaining commercial and farm property.
**H1:** Close to 30 years on the ground. A new name on the trucks.
**Hero subhead:** P1 is new. The people running it aren't.

## How P1 started

The people behind P1 have spent close to 30 years clearing, grading and maintaining land across the Carolinas, working for other companies. We ran crews, bid jobs, and fixed plenty of work that other outfits did wrong the first time.

We started P1 because we kept seeing the same problem. A property owner would hire one company to clear, another to grade, another to fix the drainage, and a landscaper to take over at the end. Nobody owned the whole result. When the pond bank washed out or the turf died, everyone pointed at someone else.

P1 does the whole job, so there is no one else to point at.

[[OPTIONAL: ## Who runs P1

**{{OWNER_NAME}}**, owner. {{OWNER_BIO}}]]

## What we believe about land work

**The ground tells you what it needs.** Red clay sheds water, sandy bottomland holds it, and a slope with no cover will be in the ditch by August. We read the site before we price it.

**Order matters.** Clear, then rough grade, then drainage, then finish grade, then seed. Skip a step or do them out of order and you'll pay for the work twice.

**Maintenance starts at construction.** If we grade a slope too steep to mow safely, that's a problem for whoever maintains it, and that's usually us. So we don't build it that way.

**Say the price out loud.** You'll get a written number after the site walk. If something changes, you hear about it before we do the extra work.

## Who we work for

Property managers, plant and facility managers, farm owners, developers, general contractors, towns and counties, schools and churches. Every property we take on is at least an acre. We don't take residential yard work, and we're upfront about that so nobody wastes a phone call.

## What we do

- Grounds maintenance contracts: weekly, biweekly, monthly and seasonal
- Land clearing and forestry mulching
- Fine grading, pads and site preparation
- Drainage installation and repair
- Sod, seeding and hydroseeding on large acreage
- Tree removal, limbing and tree line work
- Pond and waterway maintenance, repair and construction
- Full property reconstruction
- Commercial snow and ice management

## Where we're headed

We work across Upstate South Carolina and the Charlotte region today, and we're opening local offices in several of the larger towns we serve so crews are closer to the work. [[OPTIONAL: Offices open now: {{OFFICE_LIST_INLINE}}.]]

**Credentials strip** (Section 2.4)

**Links:**
- "See everything we do" → `/services`
- "Commercial site management" → `/commercial`
- "Where we work" → `/service-areas`

**CTA:** CTA-GENERAL

---

### 4.3 Services hub: `/services`

**Title:** Land Clearing, Grading & Grounds Services in NC & SC | P1
**Meta description:** Every service P1 offers for properties of an acre or more: grounds contracts, clearing, grading, drainage, turf, trees, ponds, reconstruction and snow.
**Eyebrow:** What we do
**H1:** Services for large properties, from raw ground to routine upkeep
**Hero subhead:** Pick the job you have in front of you. Most properties end up needing two or three of these, and it's cheaper when one crew does them in the right order.

## The order the work usually goes in

Clearing opens the site up. Grading shapes where water goes. Drainage handles what grading alone can't. Turf holds the soil in place. Then maintenance keeps it that way. When one company handles all five, nobody has to redo the last company's work.

**Service cards (keep current 10 links; use the card text from the homepage table in 4.1).**

## How we price

- **Maintenance contracts** are priced per visit or per season, based on acreage, how much is fine-mowed versus rough-cut, and how many beds, ponds and edges are in scope.
- **Clearing** is priced by the acre, by vegetation density, and by what happens to the debris (mulched on site, hauled, or burned where allowed).
- **Grading and drainage** are priced by scope: yards of material moved, linear feet of pipe or swale, and finish tolerance.
- **Turf** is priced by square footage or acreage and method: sod, drill seed or hydroseed.

Every price comes in writing after a site visit.

## Properties we take on

Commercial, industrial, agricultural, municipal and institutional properties of one acre or more. No residential lawns.

## Two regions

We work across Upstate South Carolina (Greenville, Spartanburg, Anderson and the surrounding counties) and the Charlotte region (Mecklenburg, Cabarrus, Gaston, Iredell and Union counties, plus York and Lancaster counties in SC).

**Links:**
- "Upstate South Carolina" → `/service-areas/upstate-south-carolina`
- "Charlotte, NC" → `/service-areas/charlotte-north-carolina`
- "All service areas" → `/service-areas`

**CTA:** CTA-GENERAL

---

### 4.4 Contact: `/contact`

**Title:** Request a Site Visit or Estimate | P1
**Meta description:** Tell us about your property and we'll walk it with you. Free site visit and written estimate for sites of an acre or more in Upstate SC and Charlotte.
**H1:** Tell us about the property
**Hero subhead:** An address and a few sentences are enough. We'll call you back within one business day to set up a time to walk it. The visit and the written estimate are free.

**Form:** see Section 2.5.

**Sidebar: Contact details**
- (704) 221-8928
- Monday–Friday, 7 AM–6 PM · Saturday by appointment
- Upstate South Carolina and the Charlotte region
- [[OPTIONAL: {{OFFICE_LIST_BLOCK}}]]

**Sidebar quote (replace):** "Photos from after a hard rain tell us more than photos on a dry day."

## What happens next

1. **We call you back** within one business day to ask a few questions and set a time.
2. **We walk the property with you.** Bring whoever knows where the problems are.
3. **You get a written estimate** with the scope, the order of work, the timeline and the price.
4. **You decide.** No pressure and no follow-up calls every other day.

**Credentials strip** (Section 2.4)

## FAQ

**What's your minimum property size?**
One acre. We work on commercial, industrial, agricultural, municipal and institutional property. We don't take residential lawns.

**Do you work in both North and South Carolina?**
Yes. We cover Upstate South Carolina and the Charlotte region, including York and Lancaster counties on the SC side of the line.

**How soon can you start?**
It depends on the season and the size of the job. Your estimate includes a start date, and maintenance contracts can usually begin soon after you sign.

**Do you offer ongoing maintenance contracts?**
Yes. Weekly, biweekly, monthly and seasonal schedules, priced per visit or per season.

**Are you licensed and insured?**
Yes, in both states. [[OPTIONAL: {{LICENSE_LIST}}. {{INSURANCE_SUMMARY}}.]] If your company needs a certificate of insurance or vendor paperwork, tell us in the form and we'll send it with the estimate.

**CTA:** none (form is the CTA)

---

### 4.5 Gallery: `/gallery`

**Title:** Our Work: Land Clearing, Grading & Grounds | P1
**Meta description:** Clearing, grading, drainage, pond and grounds work for commercial, industrial and farm properties across Upstate South Carolina and the Charlotte region.
**H1:** Our work
**Hero subhead:** Project photos from P1 crews are being added as jobs wrap up. In the meantime, here's the kind of work each service covers.

**Implementation note:** Remove every "Illustration:" prefix from image titles and captions. Use these captions for the existing images until real photos replace them:

| Image file | New caption | New alt |
|---|---|---|
| service-clearing | Forestry mulching opens overgrown acreage without hauling debris. | Forestry mulcher working through brush and small trees |
| service-grading | Finish grade on a commercial pad before paving. | Graded dirt pad on a construction site |
| service-drainage | A grassed swale carrying runoff away from the building. | Grass-lined drainage swale across an open field |
| service-turf | New turf on a large, freshly graded area. | Newly established turf on a wide open site |
| service-pond | A stabilized pond bank with clean outlet access. | Pond with grassed, stable banks |
| service-reconstruction-smaller-scale | Regrading and drainage rock on a neglected property edge. | Compact excavator regrading ground next to drainage rock |
| service-commercial | Maintained lawns and edges on a commercial campus. | Mowed lawn and trees on a commercial property |
| equestrian-estate-hero | Fenced pasture, pond and gravel lane on a working farm. | Fenced pasture with a pond and gravel lane |
| service-tree | Removing limbs over an access road. | Machine removing tree limbs |
| fine-grading | Smooth finish grade ready for seed. | Smooth finish-graded soil |

**Filter bar:** keep.

## Find the service you need

Pick a category above, or go straight to the service page:

- "Land clearing" → `/services/land-clearing`
- "Grading and site prep" → `/services/grading-site-preparation`
- "Ponds and waterways" → `/services/pond-waterway-management`

**CTA:** CTA-GENERAL

---

## 5. Service pages

Keep the existing service sub-nav chips ("01 Commercial Landscaping · 02 …"). Replace everything else.

---

### 5.1 Commercial Landscaping: `/services/commercial-landscaping`

**Title:** Commercial Grounds Maintenance for Large Sites | P1
**Meta description:** Scheduled mowing, edging, beds, turf care, pond and ditch upkeep for commercial and public grounds of an acre or more in Upstate SC and the Charlotte region.
**Eyebrow:** Commercial Landscaping
**H1:** Grounds maintenance for commercial properties with more land than lawn
**Hero subhead:** Office parks, plants, distribution centers, schools and public grounds. We keep the front looking right and the back acreage under control, on a schedule you can put in a budget.

## Two properties in one

Most large commercial sites are really two properties. There's the part people see, with the entrance, the parking lot islands, the beds and the lawn by the front door. Then there's everything else: the retention pond, the slope behind the loading docks, the tree line along the fence, and the five acres nobody has touched since the building went up.

Most landscape companies are good at the first part and price the second part like it's the first. We're set up for both. Finish mowers and hand crews handle the front. Bush hogs, slope mowers and mulching heads handle the back. You get one schedule and one invoice.

## What a maintenance contract covers

We build each contract from the site walk. A typical scope includes:

- Mowing, string trimming and edging on turf areas, on a weekly or biweekly growing-season schedule
- Rough mowing of fields, slopes, buffers and outparcels on a monthly or seasonal cycle
- Bed maintenance: weeding, pruning, mulch refresh
- Leaf removal in the fall and cleanup after storms
- Turf programs: fertilization, overseeding and weed control
- Retention and detention pond upkeep: mowing banks, clearing outlets and pulling woody growth off embankments
- Ditch and swale clearing so water keeps moving
- Tree limbing along drives, sidewalks and sightlines
- Erosion spot repairs before they turn into regrading jobs

Anything outside the contract, like a failed drain, a washed-out slope or a dead stand of turf, gets priced separately and approved by you before we touch it.

## How we set the schedule

Plants and distribution centers run shifts and trucks. Schools have drop-off and pickup times. Offices want the mowers gone before the 9 AM meetings. Before the first visit, we'll ask when the lot is busiest, where trucks stage, and which doors people use. Then we build the route around that.

In the Carolinas, warm-season turf needs the most attention from April through October. Cool-season fescue wants its seed in the fall. We schedule overseeding, fertilization and leaf work around those windows so you aren't paying for work at the wrong time of year.

## What you get from us in writing

- A site map showing fine-mow, rough-mow and no-mow areas
- A visit schedule with frequency by area and by season
- A per-visit or per-season price
- A named contact for the account
- A quick report after each visit when your team needs one for its records

## Our take on commercial mowing contracts

If your current contract prices every acre the same, you're probably overpaying for the back of the property and under-serving the front. Split the site into zones. Fine-cut the entrance weekly, rough-cut the fields monthly, and let the naturalized areas go to a twice-a-year bush hog. The site looks better and the bill usually goes down.

## Vendor paperwork

P1 is licensed and insured in North and South Carolina. [[OPTIONAL: {{INSURANCE_SUMMARY}}.]] Send us your vendor packet, W-9 request or COI requirements with your inquiry and we'll return them with the estimate.

**Credentials strip** (Section 2.4)

## FAQ

**What's included in a commercial maintenance contract?**
Whatever your site needs, mapped by zone. Most contracts include mowing and edging, rough mowing of fields and slopes, bed work, pond and ditch upkeep, leaf cleanup and tree limbing. We write it all down before the first visit.

**How often will you mow?**
Weekly or biweekly on visible turf during the growing season, usually April through October. Fields, slopes and buffers usually get monthly or seasonal passes. We set frequency zone by zone.

**Is there a minimum property size?**
Yes. We take on commercial, industrial, municipal and institutional grounds of one acre or more.

**Can you take over a property that's been neglected?**
Yes. We'll usually quote a one-time cleanup first, covering overgrowth, edges, beds and debris, then start the regular contract once it's back to a maintainable condition.

**Do you handle insurance and vendor setup?**
Yes. Send your requirements and we'll return the COI, W-9 and any vendor forms with the estimate.

**Links (Related services):**
- "Commercial snow and ice management" → `/services/commercial-snow-ice-management`
- "Tree and brush management" → `/services/tree-services`
- "Retention pond upkeep" → `/services/pond-waterway-management`
- "Whole-site commercial management" → `/commercial`

**Links (Service areas):**
- "Commercial landscaping in Charlotte" → `/service-areas/charlotte-north-carolina`
- "Commercial landscaping in Greenville" → `/service-areas/greenville-sc`
- "Greer" → `/service-areas/greer-sc`
- "Simpsonville" → `/service-areas/simpsonville-sc`
- "Huntersville" → `/service-areas/huntersville-nc`
- "Fort Mill" → `/service-areas/fort-mill-sc`
- "Rock Hill" → `/service-areas/rock-hill-sc`
- "Indian Land" → `/service-areas/indian-land-sc`

**CTA:** CTA-MAINT

---

### 5.2 Commercial Snow & Ice: `/services/commercial-snow-ice-management`

**Title:** Commercial Snow & Ice Management in the Carolinas | P1
**Meta description:** Pre-treatment, plowing, de-icing and walkway clearing for distribution centers, plants and commercial lots in the Charlotte region and Upstate South Carolina.
**Eyebrow:** Commercial Snow & Ice
**H1:** Snow and ice service for commercial sites in a place that rarely plans for it
**Hero subhead:** We pre-treat, plow and de-ice parking lots, truck courts, docks and walkways for commercial and industrial properties around Charlotte and the Upstate.
**Hero buttons:** "Schedule a Pre-Season Walk" → `/contact?type=snow` · "Call (704) 221-8928"

**Hero badges (replace):** Commercial and industrial only · Pre-season site plan · Timestamped service logs · Insured, COI on request

## The Carolina problem is ice

Charlotte and the Upstate don't get much snow. They get ice. A cold rain overnight, temperatures that drop through the early morning, and by 6 AM the lot, the dock aprons and the front steps are glazed. The first shift arrives before anyone has thought about salt.

That's the event that shuts down a loading dock and sends someone to urgent care. You can't fix it with a plow. You need brine down before the storm and granular material on the walks before people arrive. That only happens if the plan was made in October.

## Who this is for

- **Distribution and fulfillment centers:** dock aprons, truck courts, staging lanes and employee lots, planned around shift changes
- **Manufacturing plants:** yards, loading zones and shift parking
- **Data centers and mission-critical sites:** staff, security and emergency vehicle access, plus entrances and generator yard approaches
- **Retail centers:** fire lanes, storefront walks and customer parking
- **Office and medical campuses:** entrances, connector walks, ADA ramps and parking decks at grade

We don't do residential driveways or small lots.

## What we do

### Pre-treatment
Liquid brine on lots, drives and ramps ahead of a forecast event, so ice doesn't bond to the pavement. For most Carolina storms, this matters more than plowing.

### Plowing
Truck-mounted plows for lots, drive lanes and truck courts, with routes laid out ahead of time so the high-priority areas open first.

### De-icing
Granular and liquid de-icer after the event and during refreeze, which here often means two or three passes over two days.

### Walks, entrances and ramps
Hand crews for entrances, sidewalks, crosswalks and ADA ramps, timed with the lot work.

### Snow relocation
When there's nowhere to push it without blocking parking, fire lanes or sightlines, we move it.

## How the season works

1. **Site walk (August–November).** We map priority zones, stacking areas, drains, curbs and anything a plow blade could catch.
2. **Written plan.** Triggers (for example, "pre-treat when the forecast shows freezing precipitation"), service order, response windows and pricing.
3. **Pre-season staging.** Material, equipment and crew assignments are set before the first freeze.
4. **Storm monitoring.** We watch the forecast and dispatch against the triggers in your plan.
5. **Service logs.** Every visit is logged with times and areas treated, so your team has records if there's ever a slip-and-fall claim.

## Why a land company does snow

We already know your site's grades, curbs, drains and island edges from the rest of the year. That matters at 4 AM in the dark. It's also why we stack snow where it will melt toward a drain instead of refreezing across a drive lane.

## Pricing

Seasonal contracts are usually priced as a retainer plus per-event or per-application rates. Some sites prefer a flat seasonal fee. We'll price it both ways if you want to compare.

## Where we cover snow

**North Carolina:** Charlotte, Huntersville, Concord, Gastonia, Monroe, Matthews, Indian Trail and the surrounding industrial corridors.
**South Carolina:** Rock Hill, Fort Mill, Indian Land, Lancaster and the I-77 and I-85 corridors.

Outside those areas, call and ask. It depends on how many sites we already have on the route.

**Credentials strip** (Section 2.4)

## FAQ

**Do you do residential snow removal?**
No. We serve commercial and industrial properties only.

**Why sign a snow contract in a place that barely gets snow?**
Because the storms that do come are usually ice, and they come overnight. Without a plan and material on hand, you're calling around at 5 AM with everyone else. A contract puts your site on a route with priorities set in advance.

**How fast do you respond?**
Response windows are written into each site's plan and depend on the priority level you choose. Pre-treatment happens before the event, so the most important work is already done when the storm hits.

**What's the difference between plowing and snow removal?**
Plowing pushes snow to a stacking area on your property. Removal (relocation) loads it and moves it when there's no room to stack without losing parking or blocking lanes.

**When should we set up a contract?**
Late summer or early fall. That leaves time for the site walk, the written plan and staging before the first freeze.

**Are you insured for snow work?**
Yes. [[OPTIONAL: {{INSURANCE_SUMMARY}}.]] We'll send a COI naming you as additional insured with the plan.

**Links:**
- "Year-round grounds maintenance" → `/services/commercial-landscaping`
- "Data center and secure facility grounds" → `/commercial/data-centers-secure-facilities`
- "Charlotte, NC" → `/service-areas/charlotte-north-carolina`
- "York County, SC" → `/service-areas/york-county-sc`
- "Union County, NC" → `/service-areas/union-county-nc`
- "Lancaster County, SC" → `/service-areas/lancaster-county-sc`

**CTA:** CTA-SNOW (falls back to CTA-MAINT outside Aug 1 – Feb 28)

---

### 5.3 Industrial & Agricultural: `/services/industrial-agricultural`

**Title:** Farm & Industrial Land Maintenance in NC & SC | P1
**Meta description:** Pasture and field mowing, fence line clearing, farm roads, ponds, ditches and perimeter vegetation for farms and industrial sites in Upstate SC and Charlotte.
**Eyebrow:** Industrial & Agricultural
**H1:** Maintenance for working land: farms, plants and everything in between
**Hero subhead:** Pastures, hay fields, fence lines, farm roads, ponds and ditches, plus the perimeter and buffer acreage around industrial sites. Big-acreage work with the equipment to match.

## Farms and plants have more in common than you'd think

A cattle farm in western York County and a manufacturing plant off I-85 look nothing alike from the road. On the ground, they share the same problems: acreage that grows back faster than anyone can mow it, fence lines disappearing into privet and sweetgum, gravel roads that rut every winter, and ditches that stopped moving water years ago.

Both need a tractor and a bush hog more than a zero-turn and a leaf blower.

## On the farm

- **Pasture and hay field mowing,** including clipping for weed control and topping after grazing
- **Fence line clearing** with mulching heads or saws, so you can repair or replace fence without fighting brush
- **Farm road and lane grading,** with crown, ditch and crushed stone where it needs it
- **Farm pond work:** bank mowing, clearing woody growth off the dam, outlet and spillway cleanout
- **Drainage ditch cleanout** and reshaping
- **Brush and cedar removal** to take back pasture that's been lost
- **Field establishment:** soil prep, lime and seeding for pasture and hay (see Turf & Seeding)
- **Food plots and wildlife openings** for landowners who manage for game

## At the plant, warehouse or industrial park

- **Perimeter and fence line vegetation control,** keeping cameras, lights and patrol routes clear
- **Rough mowing** of outparcels, pads and expansion land
- **Retention and detention pond upkeep:** bank mowing, woody vegetation removal and outlet clearing
- **Ditch and swale maintenance** so stormwater leaves the site
- **Erosion repair** on slopes and around inlets
- **Expansion-land clearing** when you're ready to build
- **Storm cleanup** of downed trees and debris

## Scheduling around animals, crops and shifts

On a farm, we plan around what's in the field: cattle that need moving, hay that's about to be cut, ground too wet to run on. At a plant, it's shift changes, truck traffic and whatever the safety manager needs us to know before we're through the gate. We ask about all of it on the first walk.

## The equipment

We match the machine to the acreage and the ground. That means tractor-mounted rotary cutters for pasture and fields, boom and slope mowers for banks and ditches, mulching heads for brush and fence lines, and compact track loaders and excavators for grading, ditching and road work. [[OPTIONAL: Current fleet: {{EQUIPMENT_SUMMARY}}.]]

## Our take on reclaiming pasture

If a field has been let go for five years or more, mowing alone won't bring it back. The cedars and sweetgum have root systems now. Mulch it, let it green up, spray or clip the regrowth, then lime and reseed in the right window. It's two seasons of work instead of one, but you only pay for it once.

## FAQ

**What farm services do you offer?**
Pasture and field mowing, fence line clearing, farm road grading, pond and ditch maintenance, brush and cedar removal, and pasture or hay field establishment.

**Do you work on industrial sites?**
Yes. We handle perimeter vegetation, rough mowing, retention ponds, ditches, erosion repair and expansion-land clearing for plants, warehouses and industrial parks.

**Can you clear land to add pasture or crop ground?**
Yes. We'll clear it, remove stumps if the ground will be cultivated, rough grade it, and seed it. For grazing, forestry mulching is often enough. For row crops, stumps need to come out.

**What's the smallest job you'll take?**
The property needs to be at least an acre. Beyond that, we're happy to do a single fence line or one pond if that's what you need.

**Links:**
- "Land clearing and forestry mulching" → `/services/land-clearing`
- "Drainage and ditch work" → `/services/drainage`
- "Farm ponds and waterways" → `/services/pond-waterway-management`
- "Pasture and hay field seeding" → `/services/turf-installation-seeding`
- "Union County, NC" → `/service-areas/union-county-nc`
- "Gaffney, SC" → `/service-areas/gaffney-sc`
- "Inman, SC" → `/service-areas/inman-sc`
- "Waxhaw, NC" → `/service-areas/waxhaw-nc`
- "Monroe, NC" → `/service-areas/monroe-nc`

**CTA:** CTA-FARM

---

### 5.4 Land Clearing: `/services/land-clearing`

**Title:** Land Clearing & Forestry Mulching in SC & Charlotte | P1
**Meta description:** Forestry mulching, full clearing, selective clearing, stump removal and right-of-way work for commercial, industrial and farm land in Upstate SC and Charlotte.
**Eyebrow:** Land Clearing & Mulching
**H1:** Land clearing for commercial sites, farms and large tracts
**Hero subhead:** Forestry mulching, full clearing and grubbing, selective clearing, and fence line and right-of-way work. We'll tell you which method fits your land and what it's for.

## Pick the method by what comes next

The right way to clear land depends on what you're going to do with it.

- **Building on it?** The trees, stumps and root mat have to come out, and the organic layer has to go, so the pad compacts properly. That's clearing and grubbing, and it usually goes straight into grading.
- **Grazing it, hunting it, or just taking it back from the brush?** Forestry mulching is usually the better choice. One machine grinds trees and brush into a layer of mulch that stays on the ground, holds the soil and breaks down over a season or two. Nothing gets hauled off.
- **Keeping the good trees?** Selective clearing. We mark what stays, take out what doesn't, and clean up the understory so you can see through the woods again.

Pick the wrong method and you pay twice. We've seen building pads that were mulched instead of grubbed and had to be dug out again before the grader could start.

## What we clear

- Overgrown pasture and fields
- Wooded lots and pad sites for commercial and industrial development
- Fence lines and property lines
- Rights-of-way, access routes and utility corridors
- Pond banks, dams and waterway access
- Expansion land behind existing plants and warehouses
- Storm-damaged timber and blowdowns

## Services

- Forestry mulching of brush and trees
- Full clearing, grubbing and stump removal
- Selective clearing and understory cleanup
- Stump grinding
- Fence line and right-of-way clearing
- Debris hauling or on-site processing
- Post-clearing erosion control and seeding

## Forestry mulching, plainly

A forestry mulcher is a heavy tracked machine with a spinning drum on the front. It can take down brush, vines and trees up to several inches thick and leave them as mulch where they fell. For pasture recovery, hunting land, fence lines and perimeter work, it's usually faster and cheaper than cutting and hauling, and it leaves the soil covered instead of bare.

It's the wrong tool for a building pad, a septic field or anything that needs compacted fill. There, the organic material has to come out.

## After clearing

Cleared ground in the Carolinas doesn't stay bare for long. It either grows back or washes away. Most of our clearing jobs roll into rough grading, erosion control and seeding, and many roll into a maintenance contract after that. Since we do all of it, there's no gap between contractors where the site sits exposed through a summer of thunderstorms.

## What drives the price

- **Acreage and density:** light brush clears several times faster than mature mixed hardwood
- **Tree size:** past a certain diameter, trees need to be felled and handled separately
- **Method:** mulching versus clearing and grubbing
- **Debris:** left as mulch, hauled off, or burned where it's legal and permitted
- **Access and terrain:** slopes, wet ground, creeks and gates
- **What comes after:** grading, stabilization and seeding

[[OPTIONAL: **Typical ranges:** {{PRICE_RANGE_CLEARING}}]]

## Where we clear

Upstate South Carolina, including Greenville, Spartanburg, Anderson, Cherokee and Pickens counties, and the Charlotte region, including Mecklenburg, Cabarrus, Gaston, Union and Iredell counties, plus York and Lancaster counties in SC.

## FAQ

**How much does land clearing cost per acre?**
It depends on how thick the vegetation is, how big the trees are, how the debris is handled, and what the land will be used for. Forestry mulching of moderate brush costs far less per acre than clearing and grubbing a wooded pad site. We walk the land and give you a written price. [[OPTIONAL: {{PRICE_RANGE_CLEARING_SENTENCE}}]]

**Is forestry mulching or traditional clearing better?**
Mulching is better when the land will stay in grass, pasture or woods. Traditional clearing and grubbing is better when you're going to build, pave or cultivate. We'll recommend one after we see the site and hear the plan.

**Do you clear land for commercial construction?**
Yes. We clear, grub and remove stumps on commercial and industrial pad sites, then continue into rough and fine grading, drainage and seeding if you want one contractor for the whole site.

**How big a job can you take?**
From a single fence line to large tracts. The property itself needs to be at least an acre.

**Do I need a permit to clear land?**
Often, especially on commercial sites, near streams, or when disturbance crosses the state's one-acre threshold for erosion control. The owner or engineer usually holds the permit. We'll work to it and tell you early if we think one is needed.

**Links:**
- "Grading after clearing" → `/services/grading-site-preparation`
- "Tree and stump work" → `/services/tree-services`
- "Seeding cleared ground" → `/services/turf-installation-seeding`
- "What drives land clearing cost" → `/blog/land-clearing-cost-per-acre-south-carolina`
- "Gaffney" → `/service-areas/gaffney-sc`
- "Greer" → `/service-areas/greer-sc`
- "Kannapolis" → `/service-areas/kannapolis-nc`
- "Indian Trail" → `/service-areas/indian-trail-nc`
- "Monroe" → `/service-areas/monroe-nc`
- "Rock Hill" → `/service-areas/rock-hill-sc`

**Secure-campus callout (keep component):**
Heading: "Clearing around an active facility?"
Body: "Buffer management, sightlines and perimeter clearing around plants, data centers and distribution campuses."
Button: "Secure campus grounds" → `/commercial/data-centers-secure-facilities`

**CTA:** CTA-SITE

---

### 5.5 Grading & Site Preparation: `/services/grading-site-preparation`

**Title:** Fine Grading & Site Preparation in SC & NC | P1
**Meta description:** Rough grading, fine grading, pads, slopes, swales, access roads and field leveling for commercial and farm properties in Upstate South Carolina and Charlotte.
**Eyebrow:** Grading & Site Prep
**H1:** Grading and site prep, done to a finish you can build on or mow
**Hero subhead:** Rough grade, finish grade, pads, slopes, swales and access roads. We work to your plans, or we'll help you figure out what the ground needs when there aren't any.

## Grading is drainage work

Every grading decision is a drainage decision. A half-percent of slope in the wrong direction puts water against a building. A swale cut too shallow overflows in the first August storm. A pad that isn't crowned holds a puddle for a week.

In Piedmont red clay, water doesn't soak in quickly. It runs. Where it runs is decided by the grade, and it's much cheaper to get that right with a machine than to fix it later with pipe.

## Services

- **Rough grading:** cutting and filling to bring the site close to plan after clearing
- **Fine grading:** the finish surface for seed, sod, pavement or slab, to plan tolerance
- **Building and equipment pads:** fill placed and compacted in lifts
- **Slopes and embankments:** shaped to a grade that holds and can be maintained
- **Swales and drainage grading:** moving water off the site on purpose
- **Regrading:** fixing failed or settled grades on existing properties
- **Access roads and gravel lanes:** crown, ditches and stone
- **Field leveling:** smoothing agricultural ground for equipment and drainage

## Working from plans, or without them

On commercial jobs we work to the approved grading plan and the engineer's elevations, and we coordinate with your GC or site superintendent on sequencing. On farms and existing properties there often aren't any plans. In that case we shoot grades, show you where water is going now, and propose the fix in plain terms. If it's big enough to need an engineer or a permit, we'll say so before we price it.

## Grading for turf and maintenance

If a slope is steeper than about 3:1, it's hard to mow safely and hard to keep seeded. We'll push back when a design leaves slopes that will be a maintenance problem for years, and we'll suggest where a low-mow grass or a ground cover makes more sense than turf. We'd rather flag it now than mow around it forever.

## Grading for new construction

Before footings, pavement or utilities go in, the subgrade has to be at elevation, compacted, and graded to drain. We place fill in lifts, compact to the spec, and hand off a pad the next trade can start on the same day.

## Our take on "just smooth it out"

A lot of calls start with "we just need it smoothed out." Sometimes that's true. Often the rough ground is a symptom of water moving across it, and smoothing it just resets the clock until the next heavy rain. We'll look at where the water comes from before we grade anything.

## FAQ

**What's the difference between rough grading and fine grading?**
Rough grading moves the bulk of the dirt to get the site close to its final shape. Fine grading is the finish pass that sets the exact surface for seed, sod, stone or pavement.

**Can regrading fix a drainage problem?**
Often, yes, when the slope is the cause. Sometimes regrading has to be paired with a drain, swale or culvert. We'll show you which on the site walk.

**Do you grade pads for commercial construction?**
Yes. We build pads to plan elevations with compacted fill and hand off to the next trade.

**Do you grade farm roads and fields?**
Yes. We regrade lanes with a proper crown and ditches, add stone where it's needed, and level fields to improve drainage and equipment access.

**Links:**
- "Drainage installation and repair" → `/services/drainage`
- "Seeding and sod after grading" → `/services/turf-installation-seeding`
- "Full property reconstruction" → `/services/property-reconstruction`
- "All service areas" → `/service-areas`
- "Site prep in Greer" → `/service-areas/greer-sc`
- "Site prep in Easley" → `/service-areas/easley-sc`
- "Site prep in Huntersville" → `/service-areas/huntersville-nc`
- "Site prep in Fort Mill" → `/service-areas/fort-mill-sc`
- "Site prep in Indian Land" → `/service-areas/indian-land-sc`
- "Site prep in Indian Trail" → `/service-areas/indian-trail-nc`

**CTA:** CTA-SITE

---

### 5.6 Drainage: `/services/drainage`

**Title:** Drainage Solutions for Large Properties in SC & NC | P1
**Meta description:** French drains, swales, culverts, catch basins, ditches and regrading for commercial, industrial and farm properties in Upstate SC and the Charlotte region.
**Eyebrow:** Drainage Solutions
**H1:** Drainage work for large properties in Carolina clay
**Hero subhead:** Standing water, washed-out roads, soggy fields and eroding banks. We find where the water is coming from and give it somewhere better to go.

## Why Carolina properties hold water

Most of the Piedmont sits on red clay. It's good for a lot of things, but water doesn't pass through it quickly. When rain can't soak in, it runs across the surface, collects in low spots, and follows whatever path the grade gives it. Add compacted ground from years of equipment traffic, a parking lot or roof shedding water uphill, and a ditch that silted in a decade ago, and you get the problems we get called for.

Before we recommend any drainage work, we walk the property to find three things: where the water comes from, where it collects, and where it can legally and physically go. Sometimes the fix is a swale and a regrade. Sometimes it's pipe. Sometimes it's cleaning out a ditch that hasn't been touched since the building went up.

## What we install and repair

- **French drains:** perforated pipe in stone to catch subsurface water and move it away
- **Grassed swales:** shallow graded channels that carry surface water across a site
- **Catch basins and inlets** tied into pipe
- **Culverts** under farm roads, drives and access lanes
- **Solid drainage pipe** from downspouts, low spots and drain lines to an outlet
- **Ditch cleanout, reshaping and lining,** including rock where velocity is high
- **Regrading** to move surface water away from buildings and roads
- **Field drainage** on farm ground: surface ditches and subsurface tile
- **Outlet protection:** riprap and energy dissipation where pipes discharge
- **Erosion repair** on slopes and banks in drainage paths

## Problems we get called for

- Water standing behind a building or in the lot after every rain
- Turf that stays soggy and dies back in the same spots each year
- Gravel roads and farm lanes that rut and wash every winter
- Ditches that are silted, overgrown or too small for what drains into them
- Pond banks and slopes cutting away
- Fields too wet to work in the spring

## Farm drainage

Wet ground costs a farm twice: you can't get equipment on it when you need to, and it grows weeds instead of forage. We cut and clean surface ditches, install subsurface drainage where the soil and outlet allow, and regrade low spots so water leaves the field instead of sitting in it.

## Commercial stormwater

On commercial sites, drainage features like ponds, swales and inlets are often part of a permitted stormwater system. We maintain and repair those features, keeping them clear, stable and flowing. Inspection and compliance responsibility stays with the owner and their engineer, and we'll work alongside both.

## Our take

Don't start with pipe. Pipe is the right answer sometimes, but it's the expensive answer, and it hides problems underground where you can't see them fail. If grading and a swale will move the water, that's cheaper to build and easier to maintain.

## FAQ

**Why does my property have standing water after it rains?**
Usually some combination of clay soil, compaction, and a grade that sends water to a low spot with no way out. Sometimes a ditch or pipe downstream is blocked. We find the cause before recommending a fix.

**What drainage systems do you install?**
French drains, swales, catch basins, culverts, solid pipe, ditches and field drainage, plus the grading and outlet protection that go with them.

**Can you fix drainage on farm fields and pastures?**
Yes. We cut and clean ditches, regrade low areas, and install subsurface drainage where the ground and the outlet allow it.

**Do you handle stormwater pond and ditch maintenance for commercial sites?**
Yes. We keep ponds, swales, ditches and inlets clear and stable. Your engineer or inspector handles required inspections and certification.

**Do I need an engineer?**
For small repairs on your own property, usually not. For work that changes a permitted stormwater system, discharges to a stream, or affects a neighbor's property, often yes. We'll tell you which case you're in.

**Campus callout (keep component):**
Heading: "Drainage on a campus or plant?"
Body: "We handle drainage alongside pond upkeep, perimeter vegetation and access roads on large facilities."
Button: "Secure facility grounds" → `/commercial/data-centers-secure-facilities`

**Links:**
- "Grading and site prep" → `/services/grading-site-preparation`
- "Pond and waterway management" → `/services/pond-waterway-management`
- "Property reconstruction" → `/services/property-reconstruction`
- "5 signs of a drainage problem" → `/blog/signs-property-drainage-problem`
- "Duncan, SC" → `/service-areas/duncan-sc`
- "Boiling Springs, SC" → `/service-areas/boiling-springs-sc`
- "Matthews, NC" → `/service-areas/matthews-nc`
- "Rock Hill, SC" → `/service-areas/rock-hill-sc`
- "Belmont, NC" → `/service-areas/belmont-nc`
- "Mount Holly, NC" → `/service-areas/mount-holly-nc`

**CTA:** CTA-SITE

---

### 5.7 Turf Installation & Seeding: `/services/turf-installation-seeding`

**Title:** Large-Acreage Sod, Seeding & Hydroseeding in NC & SC | P1
**Meta description:** Sod, drill seeding, hydroseeding and pasture establishment for commercial grounds, slopes, fields and farms in Upstate South Carolina and the Charlotte region.
**Eyebrow:** Turf Installation & Seeding
**H1:** Sod and seeding for grounds, slopes and pasture measured in acres
**Hero subhead:** Commercial lawns, campus grounds, graded slopes, hay fields and pasture. We prep the soil, pick the grass for the site, and plant it in the window when it will actually take.

**Implementation note:** the page currently has two H1s. Keep only this H1. Render "Turf Installation & Seeding" as the eyebrow.

## Timing is half the job

We're in the transition zone: too hot for cool-season grass to love summer, too cold for warm-season grass to stay green in winter. That makes timing matter more here than almost anywhere else in the country.

- **Tall fescue** goes in during the fall, roughly September into October, so it has two cool seasons to root before its first summer.
- **Bermuda, zoysia and centipede** go in late spring into summer, once soil temperatures are up and the grass can spread.
- **Temporary cover** (annual rye in the cool months, millet or similar in the warm months) holds bare ground in between.

Plant fescue in May and you'll be replanting it in September. We'd rather tell you to wait, or put down temporary cover, than sell you seed that won't make it.

## Sod

- Large-area sod for commercial entrances, campus lawns, ball fields and high-visibility areas
- Bermuda, zoysia, centipede and tall fescue
- Grade check and correction before the first roll goes down
- Soil prep and amendment based on a soil test
- A watering schedule for establishment, and clear agreement on who handles watering

## Seeding

- **Drill seeding** for fields, pasture and large open areas, which puts seed in contact with soil and uses less of it
- **Broadcast seeding** with incorporation for rough or uneven ground
- **Hydroseeding** for slopes, ditches and disturbed construction areas, with mulch and tackifier to hold it in place
- **Erosion control seeding** with straw or matting on cut and fill slopes
- **Pasture and hay establishment:** bermuda, tall fescue, bahia and mixes suited to grazing or cutting

## Choosing the grass

| Grass | Where it works | Watch out for |
|---|---|---|
| Bermuda | Full sun, heavy traffic, sports fields, sunny pasture and hay | Goes dormant and brown in winter; won't grow in shade |
| Tall fescue | Shade to part sun, cool-season green, commercial lawns | Struggles in summer heat without water; needs fall seeding |
| Zoysia | Dense, attractive commercial turf with moderate traffic | Slow to establish; sod is the practical route |
| Centipede | Low-maintenance, acidic, lower-fertility soils | Weak under traffic; doesn't like heavy fertilizer |
| Bahia | Drought-tolerant pasture and erosion control on sandy ground | Coarse texture and tall seed heads; looks rough as a lawn |

For pasture and hay ground, ask your county extension agent too. Clemson Extension and NC State Extension both have forage recommendations by county, and we're happy to work from theirs.

## Soil prep

Most failed turf we see failed before it was planted. The ground was compacted, the pH was off, the topsoil was scraped away during construction, or the grade held water. We test the soil, correct pH with lime, loosen compacted areas, and fix the grade before planting.

## FAQ

**Which grass grows best in Upstate SC and around Charlotte?**
It depends on sun, traffic and how much maintenance you want. Bermuda for full sun and traffic, tall fescue for shade and year-round green, zoysia for dense commercial turf, centipede for low-input areas, and bahia for drought-tolerant pasture.

**Should we sod or seed?**
Sod for entrances, high-visibility lawns and places that need to look finished right away. Seed for large areas, slopes and pasture, where it costs far less per acre and establishes well if the timing is right.

**When is the best time to plant?**
Fall for tall fescue. Late spring and early summer for bermuda, zoysia and centipede. Outside those windows, we put down temporary cover to hold the soil until the right season.

**How much area can you seed or sod?**
From an acre-sized commercial lawn to pasture and hay fields covering dozens of acres.

**Why do big turf installations fail?**
Compacted or scraped soil, bad pH, water sitting on the surface, or planting the wrong grass in the wrong month. We check all of those before we plant.

**Links:**
- "Grading before planting" → `/services/grading-site-preparation`
- "Drainage fixes" → `/services/drainage`
- "Ongoing grounds maintenance" → `/services/commercial-landscaping`
- "Best grass for large acreage" → `/blog/best-grass-large-acreage-carolinas`

**CTA:** CTA-SITE

---

### 5.8 Tree Services: `/services/tree-services`

**Title:** Tree Removal & Tree Line Work for Large Properties | P1
**Meta description:** Tree removal, limbing, tree line and fence line clearing, storm cleanup and stump grinding for commercial, farm and institutional properties in SC and NC.
**Eyebrow:** Tree & Brush Management
**H1:** Tree work for large properties
**Hero subhead:** Removals, limbing, tree lines, fence lines, storm cleanup and stump grinding on commercial grounds, farms and campuses.

**Implementation note:** the page currently has H1 "Tree Services" plus an H2 styled as a heading. Use the H1 above and render "Tree & Brush Management" as the eyebrow.

## What trees on a large property actually need

On a big property, tree work is rarely about one pretty oak. It's about the pines leaning toward the fence, the sweetgums closing in on the access road, the dead limb hanging over the employee lot, and the tree line that's crept 20 feet into the pasture over a decade.

Most of that is machine work: mechanical felling for removals, mulching heads for tree lines and understory, and grinders for the stumps. Saws come out for the detail work around buildings and fences.

## Services

- **Removals** of dead, leaning, damaged or unwanted trees
- **Limbing and clearance pruning** over roads, drives, walks, lots and buildings
- **Tree line and fence line clearing,** pushing edges back to where they belong
- **Selective thinning** to open up wooded areas while keeping the best trees
- **Storm cleanup** of downed trees and hangers after wind or ice
- **Stump grinding** below grade so the area can be seeded or mowed
- **Sightline clearing** for signs, cameras, intersections and security lighting

## Storm cleanup

After a wind or ice event, call us with what you're seeing. We schedule storm work as fast as crews allow, starting with what blocks access or threatens a structure. We aren't an emergency dispatch service, and we'll tell you honestly when we can get there.

## Keeping the good trees

When a client wants the big white oaks kept and the understory gone, we walk the stand together, flag every tree that stays, and keep equipment outside their drip lines. Root damage from a tracked machine can kill a tree two years later, so we plan access around them.

## Tree lines and fence lines

Tree lines creep. A few feet a year doesn't look like much, but after ten years a pasture or a plant perimeter has lost a strip of usable ground and the fence is buried in growth. We cut edges back to the property line or fence, mulch the undergrowth, and take out leaning or dead trees that could fall on the fence. Then we recommend a cycle, usually every two to three years, to keep the line where it belongs.

## When to call an arborist

For a specimen tree, a disease question or a tree-risk assessment on a campus, a certified arborist is the right call. We'll say so, and we'll work alongside yours.

## FAQ

**What tree services do you provide?**
Removals, limbing and clearance pruning, tree line and fence line clearing, selective thinning, storm cleanup and stump grinding.

**Do you handle storm damage?**
Yes. We prioritize blocked access and trees on structures, and we'll give you a realistic arrival time. We're not an emergency dispatch service.

**Can you take some trees and leave others?**
Yes. We flag the keepers with you, clear around them, and keep machines off their root zones.

**What kinds of properties do you do tree work on?**
Commercial and industrial grounds, farms, municipal and institutional properties, all an acre or larger. We don't take residential tree jobs.

**Do you grind stumps?**
Yes, below grade, so the area can be seeded or mowed.

**Links:**
- "Land clearing and forestry mulching" → `/services/land-clearing`
- "Grounds maintenance contracts" → `/services/commercial-landscaping`
- "Property reconstruction" → `/services/property-reconstruction`
- "All service areas" → `/service-areas`

**CTA:** CTA-SITE

---

### 5.9 Pond & Waterway Management: `/services/pond-waterway-management`

**Title:** Pond, Stormwater Basin & Waterway Management | P1
**Meta description:** Farm pond and stormwater basin maintenance, bank repair, outlet clearing, sediment work, ditch cleanout and pond construction in Upstate SC and the Charlotte region.
**Eyebrow:** Pond & Waterway Management
**H1:** Pond and waterway work for farms and commercial properties
**Hero subhead:** Farm ponds, stormwater retention and detention basins, ditches and creek banks. We keep them clear, stable and draining, and we rebuild them when they fail.

**Implementation note:** fix the heading order. The current page has H1 "Pond & Waterway Management" and the real headline as H2. Use the H1 above.

## Two kinds of ponds, same failures

A farm pond and a stormwater basin behind a shopping center serve different purposes, but they fail the same way. Trees root into the dam. The outlet clogs with debris. Sediment fills the shallow end. Banks slump where mowers can't reach. Eventually water goes where it wasn't designed to go.

Most of that is preventable with routine upkeep. The rest is earthwork, which we also do.

## Routine pond and basin upkeep

- Mowing banks, dams and embankments
- Removing trees and woody growth from dams (roots in a dam are a leak waiting to happen)
- Clearing trash racks, risers, outlet pipes and spillways
- Checking for erosion, slumping and animal burrows
- Clearing vegetation along the shoreline and inflow channels
- Service logs after each visit for your records

**Aquatic weeds and algae:** we manage vegetation physically. Chemical treatment of weeds or algae in water requires aquatic pesticide licensing. [[OPTIONAL: P1 holds {{AQUATIC_LICENSE}}.]] If we don't hold the license for your state, we'll bring in a licensed applicator and coordinate the work.

## Repair and restoration

- **Bank and shoreline stabilization:** regrading, riprap, matting and seeding
- **Dam and embankment repair:** filling washouts and rebuilding eroded sections
- **Inlet and outlet repair:** pipe, headwalls and energy dissipation
- **Sediment removal** from forebays and silted areas
- **Overgrown pond reclamation:** clearing years of growth from banks and surrounding ground

## Pond construction

We build farm ponds and rebuild failed ones: layout, excavation, a compacted clay core in the dam, spillway and outlet structure, and stabilization. Larger dams and anything that impounds a stream need an engineer and state review, and we'll tell you early if your project falls in that category.

## Ditches and creeks

- Ditch cleanout and reshaping
- Culvert clearing and replacement
- Creek bank stabilization on your property
- Clearing debris jams and blockages

Work in or along regulated streams and wetlands needs permits. We'll help you figure out who to call before anything gets disturbed.

## Stormwater basins on commercial sites

Most commercial sites in the Charlotte region and the Upstate have at least one stormwater control, often a wet pond or dry detention basin, with maintenance requirements attached to the site's permit. We do the maintenance work: mowing, woody vegetation removal, outlet clearing, erosion repair and sediment work. The required inspections and certification stay with your inspector or engineer. We'll give them clean records of what we did and when.

## FAQ

**Do you build new ponds?**
Yes. We build and rebuild farm ponds, including excavation, dam construction, spillways, outlets and stabilization. Larger dams and stream impoundments need an engineer and state review.

**How often should a pond be maintained?**
Most ponds and basins need bank mowing several times a season and a check of the outlet and dam at least quarterly, plus after big storms. We set a schedule based on the pond's size and condition.

**Can you restore a pond that's silted in or overgrown?**
Yes. We clear the banks, remove woody growth from the dam, dig out sediment, and repair the inlet, outlet and shoreline.

**Do you maintain stormwater ponds for commercial properties?**
Yes. We handle the maintenance work and keep service records. Required inspections and compliance certification stay with your inspector or engineer.

**Do you treat algae and aquatic weeds?**
We remove vegetation physically. Chemical treatment in water requires an aquatic pesticide license. [[OPTIONAL: P1 holds {{AQUATIC_LICENSE}}.]] Otherwise we'll coordinate a licensed applicator.

**Links:**
- "Drainage and ditch work" → `/services/drainage`
- "Grading and bank repair" → `/services/grading-site-preparation`
- "Stormwater ponds on secure campuses" → `/commercial/data-centers-secure-facilities`
- "Retention pond management guide" → `/blog/how-to-manage-retention-pond-south-carolina`
- "Mooresville and Lake Norman" → `/service-areas/mooresville-lake-norman-nc`
- "Inman, SC" → `/service-areas/inman-sc`
- "Huntersville, NC" → `/service-areas/huntersville-nc`
- "Cornelius, NC" → `/service-areas/cornelius-nc`
- "Belmont, NC" → `/service-areas/belmont-nc`

**CTA:** CTA-SITE

---

### 5.10 Property Reconstruction: `/services/property-reconstruction`

**Title:** Property Reconstruction & Land Restoration | P1
**Meta description:** Clearing, regrading, drainage, pond repair and new turf in one plan to restore neglected, storm-damaged or eroded properties in Upstate SC and Charlotte.
**Eyebrow:** Property Reconstruction
**H1:** Bringing neglected and damaged property back to working order
**Hero subhead:** For ground that's past the point where mowing will fix it. We clear it, reshape it, fix the water, and replant it, in that order.

**Implementation note:** hero image alt currently says "smaller rural property." Change it to "Compact excavator regrading an overgrown property edge."

## When maintenance stops working

Some properties get away from their owners. A farm sits for eight years during an estate settlement. A commercial outparcel gets forgotten after the anchor store closes. A storm takes out half a tree line and the drainage along with it. Mowing won't touch it anymore, and every contractor you call only wants one piece of the problem.

Reconstruction is taking the whole property on at once, in the right order, with one contractor responsible for how it turns out.

## The usual sequence

1. **Clear:** brush, trees, vines, debris and anything else that has to go
2. **Rough grade:** reshape the land so water moves where it should
3. **Drainage:** ditches, swales, culverts or pipe where grading alone won't do it
4. **Stabilize:** erosion control on slopes and banks, riprap where water is fast
5. **Ponds and waterways:** dam repair, sediment removal, outlet work
6. **Finish grade and soil prep:** lime, amendments, and a smooth surface for seed
7. **Plant:** sod, seed or pasture mix for how the land will be used
8. **Hand off to maintenance:** a schedule to keep it from sliding back

Not every property needs all eight. But when steps get skipped, they're usually the ones that make the rest last.

## Who calls us for this

- **New owners** who bought a neglected farm, tract or commercial property
- **Farm families** taking back land that hasn't been worked in years
- **Developers** with sites that need more than a basic clear-and-grade
- **Property managers** recovering from storm, flood or erosion damage
- **Owners** who've paid for the same drainage fix two or three times already

## Our take

Don't reseed a slope that's still moving water. Don't regrade a field before you know where the water will go when it leaves. And don't clear 30 acres in April unless you've got a plan to cover it before summer storms. Most failed restoration jobs come down to sequencing.

## One contract, one contact

You'll get a written plan that lays out the stages, the timeline for each, the price, and what's outside our scope (surveys, engineering or permitting, for example). One P1 contact runs the job from first cut to first mow.

## FAQ

**What is property reconstruction?**
Taking a neglected or damaged property and fixing it as one project. That includes clearing, grading, drainage, erosion control, pond repair, soil prep and new turf or pasture, followed by a maintenance plan.

**How do I know if I need reconstruction instead of maintenance?**
If drainage has failed, slopes are eroding, brush has taken over, or a pond has silted in, mowing won't fix it. Those are ground problems, and they need earthwork first.

**Do I need separate contractors for clearing, grading, drainage and turf?**
No. We do all of it and sequence it ourselves.

**How long does it take?**
It depends on acreage, conditions and planting windows. Many projects run a few weeks of earthwork, then wait for the right season to seed. The plan will show the timeline.

**Links:**
- "Land clearing" → `/services/land-clearing`
- "Grading and site prep" → `/services/grading-site-preparation`
- "Drainage" → `/services/drainage`
- "Turf and seeding" → `/services/turf-installation-seeding`

**CTA:** CTA-SITE

---

## 6. Commercial pages

---

### 6.1 Commercial Site Management: `/commercial`

**Title:** Commercial & Industrial Site Management | P1
**Meta description:** One contractor for the whole exterior of large commercial and industrial sites: grounds, ponds, drainage, clearing, grading, access roads and snow. SC and Charlotte.
**H1:** The whole exterior of a large commercial site, on one contract
**Hero subhead:** Grounds, ponds, drainage, perimeter, access roads, erosion repair and winter service for plants, distribution centers, campuses and industrial parks.
**Hero buttons:** "Request a Maintenance Bid" → `/contact?type=maintenance` · "Call (704) 221-8928"
**Hero footnote:** Upstate South Carolina and the Charlotte region.

**Implementation note:** delete the current hedging lines, including "not a blanket promise," "no security clearance, uptime guarantee or response commitment is implied," "Your inquiry does not reserve a time," and "any fee." The site assessment is free. Keep the page's visual layout (capability grid, lifecycle, assessment steps). Replace copy as below.

## Outside the building is our job

Facility managers usually have a vendor for mowing, another for the pond, another for snow, and a list of phone numbers for everything else: the washed-out slope, the ditch backing up behind the dock, the tree line growing into the fence. Every one of them bills separately, and none of them talk to each other.

We take the whole exterior on one agreement. One schedule, one contact, one invoice, and one company that knows the whole site.

## What we self-perform

Mowing and grounds maintenance, perimeter and buffer vegetation, tree work, land clearing and forestry mulching, grading, drainage, erosion repair, gravel access roads, pond and basin maintenance, turf installation, and snow and ice service.

## What we coordinate

Engineering, surveying, permits, paving, fencing, irrigation repair and chemical aquatic treatment go to licensed partners or your existing vendors. We'll coordinate the schedule so their work and ours don't collide.

## Eight capability areas

**Keep the numbered 01–08 card grid; replace copy:**

**01 · Grounds and vegetation.** Fine mowing at the front, rough mowing at the back, beds, leaves, and buffers kept where they belong. → `/services/commercial-landscaping`

**02 · Stormwater and drainage.** Ponds, basins, swales, inlets and ditches kept clear and flowing. → `/services/drainage`

**03 · Grading and erosion.** Washouts filled, slopes rebuilt, grades corrected before they undermine pavement. → `/services/grading-site-preparation`

**04 · Trees and land.** Tree lines pushed back, hazards removed, expansion land cleared. → `/services/tree-services`

**05 · Access roads and exterior infrastructure.** Gravel service roads regraded and stoned, culverts cleared, shoulders rebuilt. → `/services/property-reconstruction`

**06 · Storm and corrective work.** Downed trees, debris and damaged ground after a storm, scheduled by priority. → `/services/property-reconstruction`

**07 · Recurring site management.** A scheduled program with a site map, visit log and one account contact. → `/services/commercial-landscaping`

**08 · Snow and ice.** Pre-treatment, plowing, docks and walks under a seasonal plan. → `/services/commercial-snow-ice-management`

## From construction to operations

**Phase 01 · Development.** We clear and grade, install drainage, and hold erosion control in place while the building goes up.
**Phase 02 · Turnover.** We establish turf, clean up after the other trades, and set the site baseline with your facility team.
**Phase 03 · Operations.** Recurring maintenance, inspections of ponds and slopes, and corrective work priced and approved as it comes up.

A contractor who was there during construction knows where the fill is, where the pipe runs, and which slope was built too steep. That knowledge is worth something for the next 20 years.

## Sites we're set up for

Manufacturing and automotive-supplier plants, distribution and logistics centers, industrial parks, corporate and office campuses, biopharmaceutical and research campuses, data centers, utility properties, mixed-use developments and large commercial acreage.

## What a recurring program looks like

1. We walk the site with your team and map every zone: fine mow, rough mow, buffer, pond, slope, road.
2. We agree on visit frequency, reporting (photos, notes, logs) and the contact on both sides.
3. Each visit gets logged. Anything we see that's outside scope gets written up with a photo and a price.
4. We review the site with you once a season and adjust.

## The site assessment

It's free, and it's a real walk of the property with the people who know it.

1. **Send us the property:** address, acreage, what you manage now, and what isn't working.
2. **We walk it with you:** usually 60–90 minutes for a large site. Bring your maintenance tech if you have one.
3. **You get a written baseline:** what we saw, what we'd prioritize, a recurring program price, and separate prices for any corrective work.

## Vendor setup and procurement

P1 is licensed and insured in North and South Carolina. [[OPTIONAL: {{INSURANCE_SUMMARY}}.]] We'll complete your vendor packet, provide a W-9 and COI, and work within your safety orientation and site access rules.

**Credentials strip** (Section 2.4)

**Data center callout (keep component):**
Heading: "Data centers and secure campuses"
Body: "Perimeter buffers, sightlines, stormwater ponds, service roads and undeveloped acreage around access-controlled sites."
Button: "Data center and secure facility grounds" → `/commercial/data-centers-secure-facilities`

**Links:**
- "Commercial landscaping" → `/services/commercial-landscaping`
- "Commercial snow and ice" → `/services/commercial-snow-ice-management`
- "Data center and secure facility grounds" → `/commercial/data-centers-secure-facilities`
- "Charlotte, NC" → `/service-areas/charlotte-north-carolina`
- "Greenville, SC" → `/service-areas/greenville-sc`
- "Spartanburg, SC" → `/service-areas/spartanburg-sc`

**CTA:** CTA-MAINT

---

### 6.2 Data Centers & Secure Facilities: `/commercial/data-centers-secure-facilities`

**Title:** Data Center & Secure Facility Grounds Management | P1
**Meta description:** Perimeter vegetation, sightlines, stormwater ponds, slopes, service roads and buffer acreage for data centers, secure facilities and distribution campuses in NC and SC.
**Eyebrow:** Data centers · Secure facilities · Distribution campuses
**H1:** Grounds and land management for data centers and secure campuses
**Hero subhead:** The building is someone else's job. We handle the acres around it: perimeter buffers, fence lines, stormwater ponds, slopes, service roads and undeveloped land.
**Hero buttons:** "Request a Maintenance Bid" → `/contact?type=maintenance` · "Call (704) 221-8928"

**Implementation note:** the four hero H3 badges ("Heavy-Equipment Land Management," etc.) have no body copy. Change them from H3 to plain badge text: "Heavy equipment on staff · One exterior contract · Works within your site protocols · Commercial and industrial only".

## Big campuses have a lot of ground

A data center, a regulated manufacturing site or a large distribution hub might sit on 50 to 200 acres, and the building covers a fraction of it. The rest is perimeter buffer, security setback, stormwater basins, graded slopes, service roads, tree lines and undeveloped land held for the next phase.

That ground has to drain, stay accessible, and keep sightlines open for cameras, lighting and patrols. A standard landscape crew with zero-turns can handle the lawn by the front entrance. They can't handle a 3:1 pond embankment, a quarter mile of fence line going back to brush, or a washed-out gravel road to the substation. We can.

## What we manage

### Perimeter and security-aware vegetation
Fence lines, setbacks and buffers kept at the height and distance your security team specifies, so vegetation doesn't block cameras, lights or patrol routes. Buffers that are supposed to screen the site stay dense where they should.

### Stormwater ponds and basins
Wet ponds, dry detention basins, swales, embankments and outlets are mowed, cleared of woody growth, and kept flowing. We log each visit so your team and your inspector have records.

### Grading, erosion and slopes
Washouts filled, slopes rebuilt and stabilized, pond embankments repaired before they threaten pavement or structures.

### Clearing, buffers and overgrowth
Selective clearing and forestry mulching to hold back encroachment on undeveloped acreage without stripping the screening you need.

### Service roads and exterior access
Gravel roads regraded and restoned, culverts cleared, shoulders rebuilt, so maintenance and security vehicles can get where they need to go.

### Storm and corrective work
Downed trees, debris and damaged ground, scheduled by the priorities in your service agreement.

### Recurring site management
Scheduled visits, zone maps, visit logs and one contact.

## Working inside your protocols

Before a crew arrives, we'll go through your access procedures, escort requirements, work windows, PPE and safety orientation, photography rules, and reporting format. Crews are briefed on your rules before they're on your site. If your facility requires specific credentials or background checks, tell us up front and we'll let you know whether and how we can meet them.

## Where P1 stops

We handle exterior land and grounds. Building systems, security systems, compliance certification for stormwater controls, and engineering decisions stay with the owner and their professionals. We'll give those people clean records and coordinate around their work.

## Where the work is

Large campuses in our area are concentrated along I-85 through Spartanburg, Greer and Greenville, around Charlotte and Concord, and along I-77 through Fort Mill and Rock Hill. We serve all of them.

**Links (corridors):** "Charlotte region" → `/service-areas/charlotte-north-carolina` · "Union County" → `/service-areas/union-county-nc` · "York County" → `/service-areas/york-county-sc` · "Lancaster County" → `/service-areas/lancaster-county-sc` · "Spartanburg" → `/service-areas/spartanburg-sc` · "Greer" → `/service-areas/greer-sc`

**Credentials strip** (Section 2.4)

## FAQ

**What exactly does P1 manage at a data center or secure facility?**
Everything outside the building envelope: perimeter vegetation, buffers, stormwater ponds and basins, slopes, tree lines, service roads and undeveloped acreage.

**Do your crews need security clearance?**
We follow your facility's access, escort and background-check requirements. Tell us what's required and we'll tell you how we'll meet it before we schedule any work.

**Can you maintain our stormwater ponds?**
Yes. We mow banks, remove woody vegetation, clear outlets, repair erosion and keep service records. Inspections and compliance certification remain with your inspector or engineer.

**How does grounds work relate to site security?**
We keep vegetation clear of fences, cameras, lighting and patrol routes to the specs your security team sets, and we keep screening buffers dense where they're supposed to be.

**Do you guarantee a response time for storm work?**
Response windows are written into each site's service agreement based on the priority level you choose.

**What size sites do you take on?**
Commercial and industrial sites of an acre and up, through large multi-building campuses.

**Links (related):**
- "Commercial site management" → `/commercial`
- "Commercial landscaping" → `/services/commercial-landscaping`
- "Drainage" → `/services/drainage`
- "Commercial snow and ice" → `/services/commercial-snow-ice-management`

**CTA:** CTA-MAINT

---

## 7. Service-area pages

### 7.0 Rules for every service-area page

- **Each page has its own H2 structure.** Do not force pages back into a shared template. The old H2 pattern ("Your {Town} Property Partner / Land & Property Management Services in {Town} / Commercial & Development Site Work in {Town} / Why {Town} Property Teams Choose P1") is retired.
- **The service list is not repeated as a 9-bullet block on every page.** Each page names the three to five services most relevant to that town, in prose or a short list. The full list lives on `/services`.
- **Qualifier line** under the breadcrumb: use the exact line given in each block. Each one is worded differently.
- **LocalOffice component** (Section 2.7) renders below the hero when an office exists for that page.
- **Link module** heading: "Nearby" (towns) and "Services here" (services). Use the links given.
- **Eyebrow:** `SERVICE AREA · SC` or `SERVICE AREA · NC` (keep).
- **Hero image alt:** "{Short description of the image} near {Town}, {ST}". Do not claim the photo shows P1 work until real photos are in.

---

### 7.1 Service areas hub: `/service-areas`

**Title:** Service Areas: Upstate SC & Charlotte Region | P1
**Meta description:** Where P1 works: Upstate South Carolina, the Charlotte region, and Union, York and Lancaster counties. Land and grounds work for properties of an acre or more.
**H1:** Where we work
**Hero subhead:** Two regions that share an interstate, a lot of red clay, and a steady stream of new plants, warehouses and farms changing hands.

**Map component:** keep. Replace the caption with: "Pins mark the towns and counties we serve. They aren't office locations, except where marked."

## Two regions, one kind of work

**Upstate South Carolina** runs from Anderson and Easley through Greenville and Spartanburg to Gaffney, strung along I-85. It's plant and warehouse country along the interstate, with cattle, hay and orchards a few miles off it.

**The Charlotte region** spreads from Mooresville and Lake Norman down through Mecklenburg, Cabarrus, Gaston and Union counties and across the state line into York and Lancaster counties. It has more corporate campuses and fast-growth development, with plenty of farmland still in the eastern and southern counties.

The ground is similar across both: Piedmont clay, rolling terrain, lots of water with nowhere to go. That's why the same crews and the same approach work in both.

**Lists:** keep the "Browse all service locations" list and the two regional town lists.

[[OPTIONAL: ## Local offices

{{OFFICE_LIST_BLOCK}}]]

## FAQ

**Which areas does P1 cover?**
Upstate South Carolina, centered on Greenville, Spartanburg and Anderson, and the Charlotte region, including Mecklenburg, Cabarrus, Gaston, Iredell and Union counties in NC and York and Lancaster counties in SC.

**Do you work outside the towns listed?**
Yes. Most of our work is on rural and unincorporated land between towns. If the property is an acre or more and it's in either region, call and ask.

**Is every service available everywhere?**
Yes, with one exception: snow and ice service is limited to the Charlotte region and the I-77 corridor in South Carolina. Everything else, including clearing, grading, drainage, ponds, turf, trees, reconstruction and grounds contracts, is available in every area we serve.

**Are you opening local offices?**
Yes. We're opening offices in several of the larger towns we serve over the coming months. Each one will be listed on its town page as it opens.

**Links (services):** "All services" → `/services` · "Commercial site management" → `/commercial` · "Land clearing" → `/services/land-clearing` · "Drainage" → `/services/drainage`

**CTA:** CTA-GENERAL

---

### 7.2 Upstate South Carolina: `/service-areas/upstate-south-carolina`

**Title:** Land Clearing & Grounds Care in Upstate South Carolina | P1
**Meta description:** Commercial grounds contracts, land clearing, grading, drainage and pond work for plants, campuses and farms across Greenville, Spartanburg, Anderson and Cherokee counties.
**H1:** Land and grounds work across Upstate South Carolina
**Hero subhead:** From the plants and distribution centers on I-85 to the pastures and orchards off it, we clear, grade, drain and maintain property of an acre or more.
**Qualifier:** Commercial, industrial, agricultural, municipal and institutional properties of one acre and up. No residential work.

## The Upstate in one drive

Drive I-85 from Anderson to Gaffney and you see most of what we do. New distribution buildings with fresh-graded slopes and retention ponds that were seeded last year and are already eroding. Older plants with back acreage going to sweetgum. Office parks off I-385. Then take any exit north or south and within ten minutes it's cattle, hay, peach orchards and woods.

A contractor working here has to handle both, often in the same week. That's how we're set up.

## What we do most in the Upstate

**Industrial and distribution sites.** Perimeter mowing, fence line control, retention pond upkeep and erosion repair around the plants and warehouses in Greenville, Spartanburg and Cherokee counties. Expansion-land clearing when a site grows.

**Commercial grounds contracts.** Office parks, retail centers, medical campuses, schools and churches, split into fine-mow and rough-mow zones so you pay the right rate for each.

**Farm work.** Pasture mowing and reclamation, fence lines, farm roads and ponds in Anderson, Spartanburg, Cherokee, Pickens and Laurens counties.

**Site work.** Clearing, grading, drainage and turf establishment on commercial and institutional projects.

## Upstate ground

The Upstate is Piedmont red clay that gets steeper toward the Blue Ridge. Water runs off fast, cuts channels in anything left bare, and carries sediment straight into the Reedy, the Enoree, the Tyger and the Broad. On a new site, the gap between grading and seeding is when the damage happens. On an old one, it's the ditch that silted in years ago. We plan every job around where the water will go.

Tall fescue does well in the cooler, shadier spots here, especially toward the foothills. Bermuda takes over in full sun and traffic. We'll pick the grass that fits your site, even when a cheaper seed is on the truck.

## Communities we serve in the Upstate

- Greenville, Greer, Taylors, Travelers Rest, Mauldin, Simpsonville and Fountain Inn
- Spartanburg, Duncan, Lyman, Wellford, Inman, Boiling Springs and Landrum
- Anderson, Belton, Williamston, Pendleton and Powdersville
- Easley, Pickens, Liberty and Piedmont
- Gaffney and Cherokee County
- Laurens and Union counties

[[OPTIONAL: ## Our Upstate office

{{OFFICE_UPSTATE_BLOCK}}]]

## FAQ

**Which parts of the Upstate do you serve?**
Greenville, Spartanburg, Anderson, Pickens and Cherokee counties, plus Laurens and Union counties, including the rural land between the towns.

**Do you work with Upstate farms?**
Yes. Pasture mowing and reclamation, fence line clearing, farm roads, pond work and field seeding are a big part of our Upstate work.

**Can you maintain grounds for a plant or distribution center on I-85?**
Yes. We handle perimeter vegetation, rough and fine mowing, retention ponds, ditches and erosion repair on one contract.

**Is there a minimum property size?**
One acre. We don't take residential lawns.

**Links (Nearby):** "Greenville" → `/service-areas/greenville-sc` · "Spartanburg" → `/service-areas/spartanburg-sc` · "Anderson" → `/service-areas/anderson-sc` · "Greer" → `/service-areas/greer-sc` · "Gaffney" → `/service-areas/gaffney-sc` · "Easley" → `/service-areas/easley-sc`
**Links (Services here):** "Industrial and agricultural land" → `/services/industrial-agricultural` · "Commercial grounds maintenance" → `/services/commercial-landscaping` · "Land clearing" → `/services/land-clearing`

**CTA:** CTA-GENERAL

---

### 7.3 Charlotte, NC: `/service-areas/charlotte-north-carolina`

**Title:** Commercial Grounds & Land Management in Charlotte, NC | P1
**Meta description:** Grounds maintenance contracts, retention pond upkeep, clearing, grading and drainage for large commercial and industrial sites in Charlotte and Mecklenburg County.
**H1:** Grounds and land management for large Charlotte properties
**Hero subhead:** Corporate campuses, distribution centers, industrial parks and public grounds across Mecklenburg County, plus the land that's still waiting to be developed.
**Qualifier:** For Charlotte properties of an acre or more: commercial, industrial, municipal and institutional. We don't do residential.

## Charlotte's big properties have a lot of back acreage

Charlotte's growth put a lot of buildings on a lot of land. Around the airport, along I-85 and I-77, and out toward the I-485 loop, you'll find distribution centers with truck courts and detention basins, corporate campuses with tree buffers and slopes, and industrial parks with outparcels that haven't been touched since the pad was graded.

The entrance usually gets taken care of. The retention pond, the slope behind the docks and the tree line creeping into the fence usually don't. That's the work we're built for.

## Where most of our Charlotte work is

- **West Charlotte and the airport area:** distribution and logistics sites with big paved areas, basins and perimeter buffers
- **University City and the I-85 corridor:** research, office and industrial campuses
- **South Charlotte and the I-485 loop:** office and medical campuses, retail centers and their stormwater ponds
- **The edges of the county:** remaining farmland and wooded tracts being cleared for development

## Stormwater ponds and basins

A lot of commercial property in Mecklenburg County carries stormwater controls, such as wet ponds, dry basins and swales, with ongoing maintenance requirements tied to the site's approval. Those controls fail in predictable ways: trees root into the embankment, outlets clog, banks slump, sediment fills the forebay.

We do the maintenance work that keeps them functioning. Your inspector or engineer handles the required inspections and certification, and we give them clean records of what we did and when.

## Maintenance contracts for Charlotte campuses

We split the site into zones: weekly fine mowing at the entrance and around the buildings, monthly rough mowing on slopes and fields, and seasonal cutting on buffers and naturalized areas. Pond banks, ditches and tree limbing go on the same schedule. You get one contact and one invoice.

## Snow and ice

Charlotte is inside our snow and ice service area. We pre-treat, plow and de-ice lots, truck courts and walks on a seasonal plan. [Commercial snow and ice → `/services/commercial-snow-ice-management`]

## Communities around Charlotte

Pineville, Matthews, Mint Hill, Huntersville, Cornelius and Davidson in Mecklenburg County, plus Concord, Gastonia, Mooresville and Monroe in the surrounding counties.

## FAQ

**Which parts of Charlotte do you serve?**
All of Mecklenburg County, including Uptown-area commercial property, University City, the airport and I-85 corridors, South Charlotte and the county edges.

**Do you maintain retention ponds for Charlotte commercial properties?**
Yes. We mow banks, remove woody vegetation, clear outlets, repair erosion and dig out sediment. Required inspections stay with your inspector or engineer.

**Do you clear and grade land for development in Charlotte?**
Yes. We clear, grub, rough and fine grade, install drainage and establish turf on commercial and industrial sites.

**Do you handle both the grounds and the site repairs?**
Yes. Regular maintenance runs on a contract. Repairs like washouts, failed drains and dead turf get priced separately and approved by you before we start.

**Links (Nearby):** "Concord" → `/service-areas/concord-nc` · "Huntersville" → `/service-areas/huntersville-nc` · "Matthews" → `/service-areas/matthews-nc` · "Union County" → `/service-areas/union-county-nc` · "Indian Land, SC" → `/service-areas/indian-land-sc` · "Indian Trail" → `/service-areas/indian-trail-nc`
**Links (Services here):** "Commercial site management" → `/commercial` · "Commercial grounds maintenance" → `/services/commercial-landscaping` · "Pond and basin upkeep" → `/services/pond-waterway-management` · "Snow and ice" → `/services/commercial-snow-ice-management`

**CTA:** CTA-MAINT

---

### 7.4 Union County, NC: `/service-areas/union-county-nc`

**Title:** Land Clearing, Farm & Grounds Work in Union County, NC | P1
**Meta description:** Pasture and farm work, land clearing, grading, drainage and commercial grounds contracts across Union County, from Monroe and Indian Trail to Waxhaw and Marshville.
**H1:** Land and grounds work in Union County, NC
**Hero subhead:** Home ground for P1. Farms, poultry operations and hay fields in the east and south, and new commercial and industrial development spreading out from Monroe, Indian Trail and Waxhaw.
**Qualifier:** Union County farms and commercial, industrial, municipal and institutional properties of an acre and up. No residential yards.

## Two counties in one

Western Union County, including Indian Trail, Stallings, Weddington, Marvin and Waxhaw, has grown into the Charlotte suburbs over the last 20 years. That means business parks, schools, churches with ball fields, and retail with stormwater basins behind it.

The rest of the county is still some of the most productive farmland in the region. Poultry houses, cattle, hay and row crops run from Unionville and New Salem out through Marshville and Wingate toward the Anson County line. The land work there is different: pasture that's gone to brush, farm roads that wash every winter, ponds that need their dams cleared.

We work both halves every week.

## Farm work in Union County

- Pasture mowing, clipping and reclamation
- Fence line clearing with a mulching head
- Farm road and lane grading, with culverts where water crosses
- Ditch cleanout on field edges
- Pond dam and bank clearing, outlet repair, sediment removal
- Clearing and seeding to bring old ground back into pasture or hay

On poultry farms, we keep ditches and pad edges draining and the ground around houses mowed and clear. We'll schedule around flock turns and the integrator's requirements.

## Commercial and development work

Around Monroe, Indian Trail and Waxhaw we clear and grade commercial pads, install drainage, establish turf and then maintain the grounds. The US 74 corridor and the Monroe Expressway have brought a steady run of industrial and distribution sites into the county, and every one of them has perimeter acreage and a detention basin that needs regular care.

## Union County ground

Union County's soils run heavy on clay, and the county sits in the slate belt, where rock can be close to the surface. That affects how deep a ditch can go, how a pond holds water, and what a grading job really costs. We'll check before we price it.

## Communities we serve

Monroe · Indian Trail · Stallings · Waxhaw · Marvin · Weddington · Wesley Chapel · Mineral Springs · Wingate · Marshville · Unionville · Fairview · Hemby Bridge · Lake Park · New Salem, and the unincorporated land in between.

[[OPTIONAL: ## Our Union County office

{{OFFICE_UNION_BLOCK}}]]

## FAQ

**Do you work with poultry and cattle farms in Union County?**
Yes. We handle ditches and drainage around poultry houses, pasture mowing and reclamation, fence lines, farm roads and ponds, scheduled around flocks and cattle.

**Can you clear and grade a commercial site in Monroe or Indian Trail?**
Yes. We clear, grade, install drainage and seed, and we can keep maintaining the grounds after the building opens.

**Do you maintain detention basins for Union County businesses?**
Yes. We mow the banks, clear outlets and woody growth, and repair erosion on a regular schedule.

**Is rock a problem for grading in Union County?**
Sometimes. Parts of the county have rock close to the surface. We check before pricing any job that involves deep ditching, pond work or significant cut.

**Links (Nearby):** "Monroe" → `/service-areas/monroe-nc` · "Indian Trail" → `/service-areas/indian-trail-nc` · "Waxhaw" → `/service-areas/waxhaw-nc` · "Matthews" → `/service-areas/matthews-nc` · "Lancaster County, SC" → `/service-areas/lancaster-county-sc` · "Charlotte" → `/service-areas/charlotte-north-carolina`
**Links (Services here):** "Farm and industrial land" → `/services/industrial-agricultural` · "Land clearing" → `/services/land-clearing` · "Ponds" → `/services/pond-waterway-management` · "Commercial grounds maintenance" → `/services/commercial-landscaping`

**CTA:** CTA-FARM

---

### 7.5 Lancaster County, SC: `/service-areas/lancaster-county-sc`

**Title:** Land Clearing & Grounds Work in Lancaster County, SC | P1
**Meta description:** Clearing, grading, drainage, pasture and timber work, and grounds contracts across Lancaster County, SC, from Indian Land and Van Wyck to Kershaw and Heath Springs.
**H1:** Land clearing, site work and grounds care in Lancaster County, SC
**Hero subhead:** The fast-growing panhandle around Indian Land, and the farms and timber that make up most of the county south of it.
**Qualifier:** Lancaster County properties over an acre, including commercial, industrial, farm, municipal and institutional. No residential lawns.

## A county that changes every ten miles

Start at the top of the panhandle in Indian Land and you're in Charlotte's suburbs: new retail on US 521, office and medical buildings, schools and a lot of land being cleared. Drive south past Van Wyck and it thins into pasture and pine. By the time you reach Lancaster, Kershaw and Heath Springs, it's timber, cattle and big rural tracts.

Our work follows that line. Up north, it's site clearing, grading, detention basins and new-build turf. Down south, it's pasture, fence lines, farm roads, ponds and timber edges.

## Development work in the panhandle

Along the US 521 and SC 160 corridors we clear pad sites, rough and finish grade, install drainage, and seed or sod when the building's done. New sites in the panhandle often go straight from grading into a summer of heavy thunderstorms, so we plan stabilization before we open the ground up.

## Farm and timber land in the rest of the county

- Pasture mowing and reclamation around Lancaster, Kershaw and Heath Springs
- Forestry mulching of cutover timber land, fence lines and hunting land
- Farm road grading and culverts
- Pond dam and bank work
- Clearing and seeding to put land back into pasture

## Along the Catawba

Property along the Catawba River and its creeks on the county's western edge needs extra care with runoff and bank erosion. Work near the water can involve buffer rules and permits, so we sort that out before any equipment goes near the bank.

## Communities we serve

Indian Land · Van Wyck · Lancaster · Kershaw · Heath Springs · Pleasant Hill · Elgin · Rich Hill · Taxahaw, and the rural land in between.

[[OPTIONAL: ## Our Lancaster County office

{{OFFICE_LANCASTER_BLOCK}}]]

## FAQ

**Do you clear land for new construction in Indian Land?**
Yes. We clear, grade, install drainage and stabilize commercial and institutional sites along US 521 and SC 160.

**Can you work on timber land and hunting property?**
Yes. Forestry mulching is often the best fit for cutover land, overgrown lanes and food plot openings.

**Do you maintain farms in southern Lancaster County?**
Yes. Pasture mowing, fence lines, farm roads, ponds and reseeding around Lancaster, Kershaw and Heath Springs.

**Can you work near the Catawba River?**
Yes, with care. Work near regulated streams and buffers may need permits. We'll help you figure that out first.

**Links (Nearby):** "Indian Land" → `/service-areas/indian-land-sc` · "York County" → `/service-areas/york-county-sc` · "Union County, NC" → `/service-areas/union-county-nc` · "Fort Mill" → `/service-areas/fort-mill-sc` · "Rock Hill" → `/service-areas/rock-hill-sc`
**Links (Services here):** "Land clearing" → `/services/land-clearing` · "Grading and site prep" → `/services/grading-site-preparation` · "Farm and industrial land" → `/services/industrial-agricultural`

**CTA:** CTA-SITE

---

### 7.6 York County, SC: `/service-areas/york-county-sc`

**Title:** Land Clearing & Grounds Management in York County, SC | P1
**Meta description:** Commercial grounds contracts, site clearing and grading, pasture and farm work, and pond and shoreline care across York County, from Fort Mill and Rock Hill to Clover and York.
**H1:** Land and grounds work across York County, SC
**Hero subhead:** Corporate campuses and industrial growth along I-77 on the east side. Cattle, hay and timber on the west. Lake Wylie in between.
**Qualifier:** York County properties of an acre and up: commercial, industrial, agricultural, municipal and institutional. Not residential.

**Implementation note:** remove the old copy's claims "most contractors can't bring," "exactly what P1 is built for," and "We're not a regional franchise or a national chain…". Use the copy below.

## East, west and the lake

York County is really three places.

**The I-77 side:** Fort Mill, Tega Cay and Rock Hill have taken on corporate headquarters, office parks, distribution buildings and industrial parks as Charlotte spilled south. Those sites come with detention ponds, graded slopes, and buffer acreage that needs regular work.

**The west side:** York, Clover, Sharon, Hickory Grove, McConnells and Smyrna are cattle, hay and timber country between the Catawba and the Broad. The work there is pasture, fence lines, farm roads and ponds.

**Lake Wylie:** Commercial waterfront, marinas, public parks and institutional land along the lake need slope and shoreline care alongside the grounds.

## Commercial and corporate grounds along I-77

For campuses around Fort Mill and Rock Hill, we run zone-based maintenance contracts: fine mowing near the buildings, rough mowing on slopes and fields, buffer cutting, pond banks, and leaf and storm cleanup, all on one schedule with one contact. When the site needs repair work like a washed-out swale or an eroding bank, we price it separately.

This side of York County is also inside our snow and ice service area.

## Farm work in western York County

- Pasture mowing and reclamation on cattle and hay ground
- Fence line clearing
- Farm road grading and culverts
- Farm pond construction, dam clearing and outlet repair
- Clearing to add pasture, and seeding it once it's open

## Lake Wylie and the Catawba

Lakeside slopes shed water fast, and once a bank starts to go, it goes quickly. On non-residential waterfront property, we handle bank stabilization, runoff control, and turf or ground cover on slopes too steep to mow. Shoreline work can involve buffer rules and permits, and we'll sort those out before we start.

## Communities we serve

Rock Hill · Fort Mill · Tega Cay · Lake Wylie · York · Clover · Sharon · Hickory Grove · McConnells · Smyrna · Bethany, and the I-77 and Catawba River corridors.

[[OPTIONAL: ## Our York County office

{{OFFICE_YORK_BLOCK}}]]

## FAQ

**Do you maintain corporate campuses in Fort Mill and Rock Hill?**
Yes. We run grounds contracts split by zone, covering mowing, slopes, buffers, ponds, leaves and storm cleanup.

**Do you work on farms in western York County?**
Yes. Pasture, fence lines, farm roads, ponds and land reclamation around York, Sharon, Hickory Grove, McConnells and Smyrna.

**Do you work on Lake Wylie waterfront property?**
Yes, on commercial, municipal, institutional and farm waterfront, but not private residential lots. We handle slope and bank stabilization, runoff control and turf.

**Do you offer snow and ice service in York County?**
Yes, along the I-77 corridor, including Fort Mill, Tega Cay and Rock Hill.

**Links (Nearby):** "Rock Hill" → `/service-areas/rock-hill-sc` · "Fort Mill" → `/service-areas/fort-mill-sc` · "Lancaster County" → `/service-areas/lancaster-county-sc` · "Indian Land" → `/service-areas/indian-land-sc` · "Charlotte" → `/service-areas/charlotte-north-carolina` · "Gastonia" → `/service-areas/gastonia-nc`
**Links (Services here):** "Commercial grounds maintenance" → `/services/commercial-landscaping` · "Farm and industrial land" → `/services/industrial-agricultural` · "Ponds and shorelines" → `/services/pond-waterway-management` · "Snow and ice" → `/services/commercial-snow-ice-management`

**CTA:** CTA-GENERAL

---

### 7.7 Greenville, SC: `/service-areas/greenville-sc`

**Title:** Commercial Grounds & Land Clearing in Greenville, SC | P1
**Meta description:** Grounds maintenance contracts, clearing, grading, drainage and pond work for corporate campuses, plants and large properties across Greenville County, SC.
**H1:** Land clearing and grounds management in Greenville, SC
**Hero subhead:** Corporate and office campuses off I-385, plants and warehouses along I-85, and the steeper, wooded ground north toward Travelers Rest.
**Qualifier:** Greenville County commercial, industrial, farm, municipal and institutional properties of one acre or more.

## Greenville County is steeper than people think

South of the city, along I-85 and I-385, the land is rolling Piedmont: business parks, manufacturing and distribution, and retail with detention ponds behind it. North of US 29 it starts climbing toward the foothills. By Travelers Rest and Marietta, you're working slopes, rock and fast-moving creeks.

That matters for everything we do here. A swale that works on flat ground in Mauldin will scour out on a hillside in northern Greenville County. Fescue that thrives in a shaded campus near Paris Mountain will cook in a full-sun lot in Fountain Inn. So we plan each site on its own terms.

## What Greenville clients call us for

**Corporate and office campuses.** Zone-based grounds contracts: sharp, weekly-cut turf and beds near the buildings, and rough mowing on the slopes and buffers behind them. Pond banks, ditches and tree limbing ride on the same schedule.

**Industrial and distribution sites.** Perimeter mowing, fence lines kept clear for cameras and patrols, retention ponds, and erosion repair on the slopes that come with a big graded pad.

**Development sites.** Clearing, grading, drainage and stabilization for commercial and institutional projects, with turf installed before the site is handed over.

**Wooded and sloped tracts.** Forestry mulching and selective clearing on the hillier land north of the city, where we keep as many good trees as possible and hold the soil in place.

## Water in Greenville County

Much of Greenville drains to the Reedy River and its tributaries, and the county takes sediment and stormwater seriously. Any job that opens more than an acre of ground has to be planned around erosion control. We don't leave slopes bare between grading and seeding, and on steep ground we'll use matting or hydroseed instead of straw.

## Where we work in Greenville County

Greenville, Greer, Taylors, Travelers Rest, Mauldin, Simpsonville, Fountain Inn, Piedmont and the unincorporated land around them.

## FAQ

**Can you maintain a corporate campus off I-385?**
Yes. We set up zone-based contracts with fine mowing and beds near the buildings and rough mowing on slopes and buffers, plus pond banks, ditches and tree limbing.

**Do you work on the steeper land north of Greenville?**
Yes. We do selective clearing, forestry mulching, slope stabilization and drainage on hillside tracts toward Travelers Rest and the foothills.

**Do you clear and grade land for development in Greenville County?**
Yes. We clear, grade, install drainage, stabilize and seed commercial and institutional sites.

**Do you take residential jobs in Greenville?**
No. We work on properties of an acre or more that are commercial, industrial, agricultural, municipal or institutional.

**Links (Nearby):** "Greer" → `/service-areas/greer-sc` · "Simpsonville" → `/service-areas/simpsonville-sc` · "Easley" → `/service-areas/easley-sc` · "Spartanburg" → `/service-areas/spartanburg-sc` · "Upstate SC" → `/service-areas/upstate-south-carolina`
**Links (Services here):** "Commercial grounds maintenance" → `/services/commercial-landscaping` · "Land clearing" → `/services/land-clearing` · "Drainage" → `/services/drainage`

**CTA:** CTA-MAINT

---

### 7.8 Spartanburg, SC: `/service-areas/spartanburg-sc`

**Title:** Industrial Grounds & Land Clearing in Spartanburg, SC | P1
**Meta description:** Perimeter mowing, retention ponds, expansion-land clearing, grading and farm work for plants, distribution centers and farms across Spartanburg County, SC.
**H1:** Industrial grounds and land work in Spartanburg County
**Hero subhead:** Plants and distribution centers where I-85 meets I-26, and cattle, hay and orchard ground in the rest of the county.
**Qualifier:** Spartanburg County industrial, commercial, farm and public properties of an acre or more.

## Built around the interchange

Spartanburg County has been one of the busiest manufacturing and logistics markets in the Carolinas for years. Automotive suppliers, distribution centers and industrial parks line I-85 and I-26, and each one sits on more land than it uses. There's a pad, a building, a truck court, a detention basin or two, and acres of perimeter and expansion land around it.

That outer ground is where most plant managers need help. It isn't landscaping. It's land management.

## Industrial work we do in Spartanburg County

- **Perimeter and fence line control,** keeping vegetation off fences and out of camera and lighting sightlines
- **Rough mowing** of expansion pads, outparcels and fields on a monthly or seasonal cycle
- **Retention and detention ponds:** bank mowing, woody vegetation removal, outlet clearing
- **Erosion repair** on the cut and fill slopes that come with big graded pads
- **Expansion-land clearing** when the next phase gets approved
- **Gravel road and laydown yard grading**

## Scheduling around a running plant

We'll ask about shift changes, truck staging, contractor check-in, PPE and any areas we can't enter. Crews get briefed on your site rules before the first visit. When the work needs to be done off-hours, we'll price it that way from the start.

## The rest of the county

North and west of the city, Spartanburg County turns into pasture, hay fields and peach orchards around Inman, Landrum, Chesnee and Campobello. We mow and reclaim pasture, clear fence lines, grade farm roads, and clean out and repair ponds for farms across that part of the county.

## Where we work in Spartanburg County

Spartanburg, Duncan, Lyman, Wellford, Moore, Roebuck, Boiling Springs, Inman, Landrum, Chesnee, Campobello and Cowpens.

## FAQ

**Do you work at manufacturing and distribution sites along I-85 and I-26?**
Yes. Perimeter vegetation, rough mowing, retention ponds, erosion repair and expansion-land clearing are the core of our Spartanburg work.

**Can your crews follow our plant's safety and access rules?**
Yes. We go through your orientation, PPE, access and reporting requirements before the first visit and brief the crew on them.

**Do you work on farms in Spartanburg County?**
Yes, around Inman, Landrum, Chesnee, Campobello and the rest of the county: pasture, fence lines, farm roads and ponds.

**Can you clear expansion land next to an operating plant?**
Yes. We'll plan access, dust and noise control, and erosion control around your operations.

**Links (Nearby):** "Duncan" → `/service-areas/duncan-sc` · "Greer" → `/service-areas/greer-sc` · "Inman" → `/service-areas/inman-sc` · "Boiling Springs" → `/service-areas/boiling-springs-sc` · "Gaffney" → `/service-areas/gaffney-sc`
**Links (Services here):** "Commercial site management" → `/commercial` · "Industrial and agricultural land" → `/services/industrial-agricultural` · "Pond and basin upkeep" → `/services/pond-waterway-management`

**CTA:** CTA-MAINT

---

### 7.9 Anderson, SC: `/service-areas/anderson-sc`

**Title:** Farm, Lake & Grounds Work in Anderson, SC | P1
**Meta description:** Pasture reclamation, farm roads, ponds, land clearing and commercial grounds contracts across Anderson County, from I-85 to Lake Hartwell, Belton and Pendleton.
**H1:** Farm, lakefront and commercial land work in Anderson County
**Hero subhead:** Cattle and hay ground, timber tracts and Lake Hartwell frontage, plus the industrial and commercial sites along I-85 and US 76.
**Qualifier:** Anderson County farms and commercial, industrial, municipal and institutional sites, one acre and up.

## Anderson is farm country with an interstate through it

Anderson County still has a lot of working land. There's cattle and hay around Belton and Honea Path, timber and pasture toward Pendleton and Starr, and big rural tracts on both sides of I-85. Along the interstate and US 76, plants, warehouses and commercial development have been filling in the gaps.

Most of our Anderson work is on the farm side, and that shapes how we approach the whole county.

## On the farm

- **Pasture reclamation:** mulching back cedars, sweetgum and briars that have taken over, then liming and reseeding
- **Fence line clearing** so fence can be rebuilt without fighting brush
- **Farm road work:** regrading lanes that rut every winter, adding culverts and stone
- **Pond work:** clearing trees off dams, fixing outlets and spillways, digging out sediment, building new ponds
- **Hay field establishment:** soil prep, lime and bermuda or fescue seeding in the right window

## Near Lake Hartwell

Commercial, institutional and farm property along Lake Hartwell and its coves deals with steep ground that sheds water straight toward the lake. We handle clearing on those slopes carefully, stabilize banks, and grade to slow runoff down. Anything at the shoreline itself may fall under the Corps of Engineers' shoreline rules, so we'll help you check before work starts.

## Commercial and industrial sites

Along I-85 and around Anderson, Powdersville and Williamston, we maintain grounds on commercial and industrial property, including perimeter mowing, retention ponds, slopes and buffers, and clear and grade sites for new construction.

## Where we work in Anderson County

Anderson, Belton, Honea Path, Williamston, Pelzer, Pendleton, Starr, Iva, Powdersville and the rural land in between.

## FAQ

**Can you bring overgrown pasture back?**
Yes. We mulch the brush and small trees, let it green up, control the regrowth, then lime and reseed in the right season. It's usually a two-season job.

**Do you build farm ponds in Anderson County?**
Yes. We build new ponds and rebuild failed ones, including dams, spillways and outlets. Larger dams need an engineer and state review.

**Can you work on property near Lake Hartwell?**
Yes, on commercial, institutional and farm land. We handle slope clearing, erosion control and drainage. Shoreline work may fall under Corps of Engineers rules, and we'll help you check.

**Do you maintain commercial property along I-85?**
Yes. Grounds contracts, perimeter mowing, retention ponds and erosion repair.

**Links (Nearby):** "Easley" → `/service-areas/easley-sc` · "Greenville" → `/service-areas/greenville-sc` · "Simpsonville" → `/service-areas/simpsonville-sc` · "Upstate SC" → `/service-areas/upstate-south-carolina`
**Links (Services here):** "Farm and industrial land" → `/services/industrial-agricultural` · "Ponds" → `/services/pond-waterway-management` · "Pasture seeding" → `/services/turf-installation-seeding`

**CTA:** CTA-FARM

---

### 7.10 Greer, SC: `/service-areas/greer-sc`

**Title:** Logistics & Industrial Grounds Work in Greer, SC | P1
**Meta description:** Truck court perimeters, retention ponds, erosion repair, clearing and grounds contracts for logistics and industrial sites around GSP, Inland Port Greer and I-85.
**H1:** Grounds and land work for Greer's logistics and industrial sites
**Hero subhead:** Around GSP airport, Inland Port Greer and the I-85 corridor, the buildings are big and the land around them is bigger.
**Qualifier:** Greer-area commercial and industrial property, plus farms and public grounds, of an acre or larger.

## Greer runs on freight

Between the airport, the inland port and the automotive plant up the road, Greer has become a major freight hub. That means big distribution and manufacturing buildings on big graded pads, with truck courts, trailer parking, detention basins and a lot of slope.

New pads in Greer are usually cut and filled hard, and the slopes that result are steep, long and exposed. If they aren't stabilized and maintained, they erode into the basins below, and the basins stop working.

## What we do around Greer

- **Slope maintenance and erosion repair** on cut and fill banks around truck courts and pads
- **Detention and retention pond upkeep:** bank mowing, woody growth removal, outlet and forebay clearing
- **Perimeter and fence line control** for security sightlines
- **Rough mowing** of trailer lots, laydown yards and outparcels
- **Clearing and grading** for pad expansions and new yard space
- **Turf establishment** on disturbed ground after construction

## Working around trucks

Truck courts don't stop for mowers. We'll schedule around your peak dock hours and yard traffic, keep equipment out of drive lanes, and stage off the pavement.

## Commercial grounds in town

Closer to downtown Greer and along Wade Hampton Boulevard, we also maintain grounds for commercial, medical and institutional properties on zone-based contracts.

## What a Greer slope program looks like

Freshly built slopes around a distribution pad need more attention in their first two years than they will for the next twenty. For the first season, we check them after every heavy rain, fill rills before they turn into gullies, and overseed thin spots in the right window. Once the cover is solid, the slopes move to a regular mowing cycle, usually monthly in the growing season, with a basin cleanout at least once a year. If a slope is too steep to mow safely, we'll recommend a low-mow cover instead of forcing a mower onto it.

## FAQ

**Do you maintain slopes and ponds at distribution centers near GSP?**
Yes. Slope mowing, erosion repair and basin upkeep are the bulk of our Greer work.

**Can you work around an active truck court?**
Yes. We schedule around dock hours, keep equipment off drive lanes and stage off the pavement.

**Do you handle clearing and grading for pad expansions?**
Yes. We clear, grade, set up erosion control and seed as expansion areas open up.

**What properties do you serve in Greer?**
Commercial, industrial, municipal, institutional and farm property of one acre or more.

**Links (Nearby):** "Duncan" → `/service-areas/duncan-sc` · "Greenville" → `/service-areas/greenville-sc` · "Spartanburg" → `/service-areas/spartanburg-sc` · "Simpsonville" → `/service-areas/simpsonville-sc`
**Links (Services here):** "Commercial site management" → `/commercial` · "Grading and erosion" → `/services/grading-site-preparation` · "Pond and basin upkeep" → `/services/pond-waterway-management`

**CTA:** CTA-MAINT

---

### 7.11 Simpsonville, SC: `/service-areas/simpsonville-sc`

**Title:** Commercial Grounds Maintenance in Simpsonville, SC | P1
**Meta description:** Grounds contracts, detention pond upkeep, drainage repair and turf work for retail centers, medical campuses, schools and business parks in Simpsonville and the Golden Strip.
**H1:** Commercial grounds and drainage work in Simpsonville
**Hero subhead:** Retail centers on Fairview Road, medical and office buildings near Harrison Bridge Road, schools and churches around Five Forks, all with more ground behind them than in front.
**Qualifier:** Simpsonville-area commercial, municipal and institutional grounds of an acre and up.

## The Golden Strip grew fast

Simpsonville, Mauldin and Fountain Inn filled in quickly along I-385. A lot of the commercial property here was built in a hurry, and it shows in the back: detention basins that have never been cleaned, slopes behind shopping centers that have been sliding for years, and turf that's thin because the topsoil left with the grading contractor.

## What we do in Simpsonville

- **Grounds contracts** for retail centers, medical offices, business parks, schools and churches
- **Detention pond upkeep** behind retail and office buildings
- **Drainage repair** on lots and lawns that stay wet after rain
- **Turf renovation:** aerating, amending and reseeding tired commercial lawns
- **Slope stabilization** behind parking lots and buildings

## Fixing the turf

Thin commercial turf in Simpsonville usually comes from compacted clay with no topsoil left on it. Fertilizer alone won't fix it. We core-aerate, amend the soil, correct pH, and overseed or resod in the right season. Tall fescue goes down in the fall, and bermuda goes in late spring on the sunny sites.

## Public grounds

We also maintain larger public and institutional grounds, including ball fields, school campuses and church properties, where fields take heavy use and need to hold up to it.

## Behind the shopping center

The problems that cost the most on Simpsonville commercial property are usually out of sight. A detention basin behind a strip center fills with sediment and cattails, the outlet clogs, and the next big storm sends water across the back lot. A slope behind the loading area loses its cover and starts dropping clay onto the pavement. Neither shows up on a drive-by inspection. We walk the back of the property on the first visit, write down what we find with photos, and give you a price to fix it separately from the maintenance contract.

## FAQ

**Can you maintain a retail center or business park in Simpsonville?**
Yes. We split the site into zones, with weekly work near the storefronts and entrances and less frequent cutting on slopes and pond banks, all on one contract.

**Can you fix a detention pond that hasn't been maintained?**
Yes. We clear woody growth off the banks and dam, open the outlet, repair erosion and remove sediment.

**Why won't our commercial lawn stay green?**
Usually compacted clay, low pH and no topsoil. We aerate, amend, lime and reseed in the right window.

**Do you work in Mauldin and Fountain Inn too?**
Yes. We cover the whole Golden Strip.

**Links (Nearby):** "Greenville" → `/service-areas/greenville-sc` · "Greer" → `/service-areas/greer-sc` · "Easley" → `/service-areas/easley-sc` · "Anderson" → `/service-areas/anderson-sc`
**Links (Services here):** "Commercial grounds maintenance" → `/services/commercial-landscaping` · "Drainage" → `/services/drainage` · "Turf installation" → `/services/turf-installation-seeding`

**CTA:** CTA-MAINT

---

### 7.12 Easley, SC: `/service-areas/easley-sc`

**Title:** Land Clearing, Grading & Grounds Work in Easley, SC | P1
**Meta description:** Slope stabilization, clearing, grading, drainage and grounds contracts for industrial, commercial and public properties in Easley and across Pickens County, SC.
**H1:** Clearing, grading and grounds work in Easley and Pickens County
**Hero subhead:** Industrial and commercial sites along US 123 and SC 153, public ground around the Doodle Trail, and hillier land to the north.
**Qualifier:** Pickens County properties of one acre or larger that are commercial, industrial, farm, municipal or institutional.

## The ground starts climbing here

Easley is where the Upstate starts to tilt toward the mountains. The farther north you go into Pickens County, the steeper the ground and the faster the water. That's great scenery. It's also why so many sites here have eroded slopes, gullied ditches and gravel roads that wash out every spring.

## What we do most in Easley

**Slopes and erosion.** Rebuilding eroded banks behind commercial and industrial buildings, then keeping them covered with the right mix of grass, matting or hydroseed.

**Clearing on hillsides.** Selective clearing and forestry mulching that removes brush without stripping the soil, which matters on a slope.

**Grading and drainage.** Swales, ditches and culverts sized for how fast water moves on this terrain, with rock where it needs it.

**Industrial and commercial grounds.** Along US 123 and SC 153: perimeter mowing, retention ponds and routine grounds care.

**Public and institutional ground.** Parks, trail corridors, school campuses and church properties.

## Our take on Pickens County ditches

If a ditch on a slope is cutting deeper every year, cleaning it out won't fix it. The water is moving too fast for bare soil. It needs to be reshaped and armored, with rock check dams, riprap or a lined channel, depending on the grade and volume. We'd rather fix it once than clean it out every spring.

## Where we work

Easley, Pickens, Liberty, Central, Six Mile, Powdersville and the rest of Pickens County.

## Gravel roads on hilly ground

Plenty of properties around Easley have long gravel drives or service roads climbing a slope. They wash out the same way every time: water runs down the road instead of off it, and it takes the stone with it. The fix is to shape the road so water leaves it every few dozen feet. That means turnouts, broad dips or water bars on the steep sections, and a ditch on the uphill side that empties somewhere stable. Fresh stone on an unshaped road is gone by spring.

## FAQ

**Can you fix eroding slopes behind our building?**
Yes. We regrade where needed, add drainage to take water off the face of the slope, and stabilize it with seed and matting or hydroseed.

**Do you clear land on steep ground?**
Yes. Forestry mulching and selective clearing work well on slopes because they leave the soil covered.

**Do you maintain industrial sites along US 123?**
Yes. Perimeter mowing, retention ponds, erosion repair and grounds contracts.

**What's the smallest property you'll take?**
One acre.

**Links (Nearby):** "Greenville" → `/service-areas/greenville-sc` · "Anderson" → `/service-areas/anderson-sc` · "Simpsonville" → `/service-areas/simpsonville-sc` · "Upstate SC" → `/service-areas/upstate-south-carolina`
**Links (Services here):** "Grading and slopes" → `/services/grading-site-preparation` · "Drainage" → `/services/drainage` · "Land clearing" → `/services/land-clearing`

**CTA:** CTA-SITE

---

### 7.13 Gaffney, SC: `/service-areas/gaffney-sc`

**Title:** Farm, Orchard & Industrial Land Work in Gaffney, SC | P1
**Meta description:** Pasture and orchard ground, farm roads, ponds, clearing and industrial grounds care across Gaffney and Cherokee County, SC, from I-85 to the Broad River.
**H1:** Farm and industrial land work in Gaffney and Cherokee County
**Hero subhead:** Distribution and manufacturing sites along I-85, and peach orchards, pasture and timber from Blacksburg to the Broad River.
**Qualifier:** Cherokee County farms and industrial, commercial and public properties of an acre or more.

## Peaches and pallets

Cherokee County has two economies side by side. Big distribution and manufacturing buildings have gone up along I-85, and the county is still one of South Carolina's peach-growing centers, with pasture and timber filling in the rest.

Both sides need land work, and they need it on different calendars.

## Orchard and farm ground

- **Mowing orchard middles and edges** on a schedule that stays clear of harvest
- **Pasture mowing and reclamation**
- **Fence line and field edge clearing**
- **Farm roads and orchard lanes** that hold up to equipment in wet weather
- **Ponds used for irrigation or livestock:** dam clearing, outlet repair, sediment removal
- **Clearing old orchard or timber ground** to replant or convert to pasture

We work around bloom, spray and harvest, and around cattle on pasture.

## Industrial sites on I-85

The distribution and manufacturing buildings along I-85 sit on large graded pads with steep slopes and detention basins. We keep perimeters clear, mow slopes and outparcels, maintain the basins, and repair erosion before it reaches the pavement.

## Near the Broad River

Land toward the Broad River gets steeper and wetter. We take extra care with clearing and grading near creeks and the river, where buffer rules can apply, and we'll help you sort out permits before we start.

## Where we work in Cherokee County

Gaffney, Blacksburg, Cowpens and the rural county out to the Broad River and the NC line.

## FAQ

**Do you work in peach orchards?**
Yes. We mow middles and edges, clear field borders, maintain lanes and ponds, and schedule around bloom, spray and harvest.

**Can you maintain the grounds at a distribution center on I-85?**
Yes. Perimeter mowing, slopes, detention basins and erosion repair, all on one contract.

**Can you clear old orchard or timber land?**
Yes. We clear it, remove stumps if it's going back into cultivation, and grade and seed it for its next use.

**Do you build ponds in Cherokee County?**
Yes. Irrigation and livestock ponds, plus repair of existing dams and outlets.

**Links (Nearby):** "Spartanburg" → `/service-areas/spartanburg-sc` · "Boiling Springs" → `/service-areas/boiling-springs-sc` · "Inman" → `/service-areas/inman-sc` · "Upstate SC" → `/service-areas/upstate-south-carolina`
**Links (Services here):** "Farm and industrial land" → `/services/industrial-agricultural` · "Land clearing" → `/services/land-clearing` · "Ponds" → `/services/pond-waterway-management`

**CTA:** CTA-FARM

---

### 7.14 Duncan, SC: `/service-areas/duncan-sc`

**Title:** Warehouse & Industrial Grounds Care in Duncan, SC | P1
**Meta description:** Perimeter mowing, detention basins, slope repair and expansion clearing for warehouses, plants and logistics parks around Duncan and the I-85 and SC 290 corridor.
**H1:** Grounds and land care for Duncan's warehouses and plants
**Hero subhead:** A small town surrounded by some of the largest industrial buildings in the Upstate, along I-85 and SC 290 near the Tyger River.
**Qualifier:** Duncan-area industrial, commercial and public properties of one acre and up.

## Big buildings, bigger lots

Duncan has more warehouse square footage than its size suggests. The logistics and manufacturing buildings around I-85 and SC 290 are long, and so are their perimeters. A single site can have a mile of fence line, a couple of detention basins, and 20 or 30 acres of slopes and open ground.

Most of that ground gets mowed when someone complains. We'd rather put it on a schedule.

## A maintenance plan for a warehouse site

Here's how we usually set one up:

- **Monthly in the growing season:** rough mowing of slopes, basins and open ground, and string trimming along fences and building edges
- **Quarterly:** detention basin outlet checks and clearing, and fence line brush control
- **Twice a year:** woody growth removal off basin embankments, and ditch cleanout
- **As needed:** erosion repair, priced and approved before we do it
- **Weekly, if you want it:** entrance, office frontage and employee lot turf

You get a zone map, a visit log and one contact.

## Near the Tyger River

Sites that drain toward the Tyger River and its creeks see a lot of sediment washing off new slopes. Keeping basins clear and slopes covered does most of the work. When it doesn't, we regrade and armor the problem spots.

## Expansion land

Many Duncan sites were bought with room to grow. When it's time, we clear it, grade it and stabilize it, working around the operating building next door.

## FAQ

**Can you maintain the perimeter and basins at our distribution center?**
Yes. We put slopes, basins, fence lines and open ground on a scheduled program with a zone map and visit logs.

**How often should a warehouse detention basin be maintained?**
Most need bank mowing several times a season, outlet checks at least quarterly and after big storms, and woody growth removed at least once a year.

**Can you clear land next to an operating building?**
Yes. We plan access, traffic, dust and erosion control around your operations.

**Do you work in Lyman and Wellford?**
Yes, and across western Spartanburg County.

**Links (Nearby):** "Greer" → `/service-areas/greer-sc` · "Spartanburg" → `/service-areas/spartanburg-sc` · "Inman" → `/service-areas/inman-sc` · "Boiling Springs" → `/service-areas/boiling-springs-sc`
**Links (Services here):** "Commercial site management" → `/commercial` · "Pond and basin upkeep" → `/services/pond-waterway-management` · "Drainage" → `/services/drainage`

**CTA:** CTA-MAINT

---

### 7.15 Inman, SC: `/service-areas/inman-sc`

**Title:** Pasture, Orchard & Farm Land Work in Inman, SC | P1
**Meta description:** Pasture reclamation, orchard ground, fence lines, farm roads, ponds and clearing for farms and rural properties around Inman, Lake Bowen and northern Spartanburg County.
**H1:** Farm and rural land work around Inman
**Hero subhead:** Peach orchards, pasture and timber across northern Spartanburg County, from US 176 out toward Lake Bowen and Campobello.
**Qualifier:** Farms and rural tracts around Inman, plus commercial and public grounds, at one acre or larger.

## A wet pasture, a worn road and a silted pond

On a lot of Inman-area farms, those three are the same problem. Water comes off the higher ground, runs across the pasture, cuts the farm road on its way down, and dumps its sediment in the pond at the bottom. Fixing any one of them without the others doesn't last.

So when we walk a farm here, we start at the top of the hill.

## What we do on Inman farms

- **Pasture mowing and reclamation**, including pulling back years of cedar and brush
- **Orchard work:** mowing middles, clearing edges and maintaining lanes, scheduled around bloom and harvest
- **Farm road regrading** with a proper crown, ditches, culverts and stone
- **Diversions and swales** to move water around pastures instead of through them
- **Pond dam and outlet repair** and sediment removal
- **Fence line clearing**

## Lake Bowen

Lake Bowen is a drinking water reservoir, and land around it drains toward it. For work on non-residential property in its watershed, we take erosion control seriously: we keep ground covered, put in silt control before we disturb anything, and seed quickly.

## Commercial ground in town

Along US 176 and near I-26, we also maintain commercial and institutional grounds, including churches, schools and business properties with open acreage.

## Where we work

Inman, Campobello, Landrum, Gramling, Chesnee and the rural land around Lake Bowen.

## FAQ

**Can you fix a farm road that washes out every year?**
Yes. We regrade it with a crown, cut ditches on the uphill side, add culverts where water crosses, and add stone where it's soft.

**Do you work in peach orchards around Inman?**
Yes. We mow, clear edges and maintain lanes, scheduled around bloom and harvest.

**Can you clean out a silted farm pond?**
Yes. We dig out the sediment and fix what's washing it in upstream, so it doesn't fill right back up.

**Do you take small jobs on big farms?**
Yes. The property needs to be at least an acre, but we'll take a single road, pond or fence line.

**Links (Nearby):** "Spartanburg" → `/service-areas/spartanburg-sc` · "Boiling Springs" → `/service-areas/boiling-springs-sc` · "Gaffney" → `/service-areas/gaffney-sc` · "Duncan" → `/service-areas/duncan-sc`
**Links (Services here):** "Farm and industrial land" → `/services/industrial-agricultural` · "Drainage" → `/services/drainage` · "Ponds" → `/services/pond-waterway-management`

**CTA:** CTA-FARM

---

### 7.16 Boiling Springs, SC: `/service-areas/boiling-springs-sc`

**Title:** School, Church & Commercial Grounds in Boiling Springs | P1
**Meta description:** Grounds contracts, athletic field turf, drainage and clearing for schools, churches, medical and retail properties along Highway 9 in Boiling Springs, SC.
**H1:** Grounds and land work for Boiling Springs schools, churches and businesses
**Hero subhead:** The Highway 9 corridor packs schools, churches, medical offices and retail into one fast-growing stretch of northern Spartanburg County.
**Qualifier:** Institutional, commercial and public properties of an acre or more in Boiling Springs.

## Grounds that get used hard

Boiling Springs grew up fast without ever becoming a city, and a lot of its biggest properties are schools and churches. Those are some of the hardest-working grounds anywhere. Ball fields get used six days a week, parking lots overflow onto lawns, and a campus has to look presentable every Sunday or every school morning regardless of the weather.

## What we do for schools and churches

- **Weekly grounds maintenance** timed around school hours and services
- **Athletic field turf:** aeration, overseeding, and bermuda renovation on worn fields
- **Drainage on fields and lawns** that stay soggy after rain
- **Parking lot edges and overflow areas** regraded and reseeded after they get torn up
- **Tree limbing and removals** near walkways, lots and playgrounds
- **Clearing** for new buildings, lots or fields as campuses expand

## Commercial property on Highway 9

Retail, medical and office properties along Highway 9 get zone-based grounds contracts, with weekly care at the frontage and less frequent work on slopes, basins and back acreage.

## Around Rainbow Lake and Old Furnace Road

Away from the main corridor, the ground gets more wooded and more varied. We clear and grade for new development there, and we plan access around tree cover and slopes.

## Fields that hold up to a season

A school or church field in Boiling Springs might host practices, games, camps and community events from February through November. Bermuda is usually the right grass for that kind of use, but only if the field drains and the soil isn't packed hard. Our usual approach is to core-aerate in early summer, topdress low spots, fix the crown so water sheds to the sidelines, and overseed or sprig worn areas while the bermuda is actively growing. Fields that get that treatment once a year stop turning to mud in the spring.

## FAQ

**Can you maintain a school or church campus?**
Yes. We schedule around school hours, services and events, and we handle athletic fields, lawns, beds, trees and drainage on one contract.

**Can you fix a ball field that holds water?**
Often, yes. It's usually a grading and compaction problem. We'll test it, then regrade, aerate or add drainage as needed and reestablish the turf.

**Do you work on commercial property along Highway 9?**
Yes. Retail, medical and office properties, on zone-based grounds contracts.

**Is there a minimum size?**
One acre. We don't take residential lawns.

**Links (Nearby):** "Spartanburg" → `/service-areas/spartanburg-sc` · "Inman" → `/service-areas/inman-sc` · "Gaffney" → `/service-areas/gaffney-sc` · "Duncan" → `/service-areas/duncan-sc`
**Links (Services here):** "Commercial grounds maintenance" → `/services/commercial-landscaping` · "Turf installation" → `/services/turf-installation-seeding` · "Drainage" → `/services/drainage`

**CTA:** CTA-MAINT

---

### 7.17 Concord, NC: `/service-areas/concord-nc`

**Title:** Land Clearing & Grounds Work in Concord, NC | P1
**Meta description:** Clearing, grading, drainage, grounds contracts and farm work across Concord and Cabarrus County, from the I-85 and Concord Mills area to the Rocky River and Mount Pleasant.
**H1:** Land clearing, site work and grounds care in Concord and Cabarrus County
**Hero subhead:** Speedway-scale paved property, the I-85 corridor around Concord Mills, and farms that still cover much of eastern Cabarrus County.
**Qualifier:** Cabarrus County properties over an acre: commercial, industrial, agricultural, municipal and institutional.

## Big events, big lots, big land

Concord has some of the largest single properties in the Charlotte region. Motorsports venues, event grounds, the regional airport and the retail and distribution around Concord Mills all come with acres of turf, parking overflow, slopes and stormwater ponds that have to look right on busy days and drain every other day.

Farther east, toward Mount Pleasant and Midland, Cabarrus County is still farms, pasture and timber, and more of it gets cleared for development every year.

## Event and large-venue grounds

Properties that host crowds need grounds that recover. Grass parking fields get rutted, slopes get walked down, and drainage paths get blocked by temporary setups. We regrade and reseed after heavy use, keep swales and basins open, and put maintenance on a calendar that works around the event schedule.

## Commercial and industrial sites along I-85

- Zone-based grounds contracts for retail, office and industrial properties
- Retention pond and basin upkeep
- Perimeter and buffer mowing
- Erosion repair on graded slopes
- Clearing and grading for new pads

## Clearing and development in eastern Cabarrus

When farmland along NC 49, NC 73 and the Rocky River gets sold for development, it usually needs clearing, grubbing, rough grading and erosion control before anything else happens. We do that work, and we can stay on for finish grading, turf and maintenance after the buildings go up.

## The Rocky River and its creeks

Much of Concord drains to the Rocky River. Stream buffers apply along it and its tributaries, and they matter on any clearing or grading job near the water. We lay out the work around those buffers from the start.

## Where we work

Concord, Kannapolis, Harrisburg, Midland, Mount Pleasant and the rest of Cabarrus County.

## FAQ

**Can you maintain grounds that host large events?**
Yes. We handle turf recovery, regrading and reseeding after heavy use, and routine maintenance scheduled around the event calendar.

**Do you clear land for development in Cabarrus County?**
Yes. Clearing, grubbing, rough and fine grading, drainage and erosion control, then turf and maintenance if you want one contractor from start to finish.

**Do you work on farms in eastern Cabarrus County?**
Yes. Pasture mowing and reclamation, fence lines, farm roads and ponds around Mount Pleasant and Midland.

**Do you maintain retention ponds around Concord Mills?**
Yes. Bank mowing, woody vegetation removal, outlet clearing and erosion repair.

**Links (Nearby):** "Kannapolis" → `/service-areas/kannapolis-nc` · "Charlotte" → `/service-areas/charlotte-north-carolina` · "Mooresville" → `/service-areas/mooresville-lake-norman-nc` · "Huntersville" → `/service-areas/huntersville-nc`
**Links (Services here):** "Land clearing" → `/services/land-clearing` · "Grading and site prep" → `/services/grading-site-preparation` · "Commercial grounds maintenance" → `/services/commercial-landscaping`

**CTA:** CTA-SITE

---

### 7.18 Mooresville & Lake Norman: `/service-areas/mooresville-lake-norman-nc`

**Title:** Grounds & Land Work in Mooresville & Lake Norman, NC | P1
**Meta description:** Corporate campus grounds, lakefront slope and shoreline work, drainage and clearing for commercial and institutional property around Mooresville and Lake Norman.
**H1:** Grounds, slopes and shoreline work around Mooresville and Lake Norman
**Hero subhead:** Corporate campuses and race shops off I-77, marinas and waterfront commercial property on the lake, and farmland in the rest of Iredell County.
**Qualifier:** Commercial, industrial, municipal, institutional and farm property of one acre or more around Lake Norman.

## Everything slopes toward the lake

Lake Norman has more than 500 miles of shoreline, and most of the land around it tilts toward the water. On any property near the lake, runoff decides where erosion happens, where turf fails, and where sediment ends up. On waterfront sites it ends up in a cove.

We look at the slope and the water path first on every Lake Norman job.

## Corporate and commercial campuses

Mooresville has a lot of large corporate and motorsports property along I-77 and NC 150. Those campuses usually have manicured frontage and a lot of sloped, wooded or open ground behind it. We maintain both on one contract: weekly work near the buildings, rough mowing and slope care at the back, and pond banks and tree limbing on the same schedule.

## Waterfront and shoreline work

For marinas, public parks, institutional land and commercial waterfront:

- Slope and bank stabilization with regrading, matting, riprap and deep-rooted cover
- Runoff control above the shoreline, so water spreads out instead of cutting a channel to the lake
- Turf and ground cover on slopes too steep to mow safely
- Clearing and vegetation management inside the rules for lakefront buffers

Work at the shoreline itself often needs Duke Energy approval and may need other permits. We'll help you figure that out before anything is disturbed.

## Iredell County farmland

North and west of Mooresville, toward Troutman and Mount Mourne, there's still plenty of pasture and hay ground. We handle pasture mowing, fence lines, farm roads and ponds there too.

## Where we work

Mooresville, Davidson, Cornelius, Huntersville, Troutman, Mount Mourne, Sherrills Ford, Denver and the rest of the Lake Norman area.

## FAQ

**Can you fix shoreline erosion on a Lake Norman commercial property?**
Yes. We regrade, stabilize and plant the bank, and control the runoff above it. Shoreline work usually needs Duke Energy approval, and we'll help you through it.

**Do you maintain corporate campuses in Mooresville?**
Yes. We run zone-based grounds contracts covering the frontage, slopes, buffers, ponds and trees.

**Do you work on residential lakefront lots?**
No. We work on commercial, municipal, institutional and farm property only.

**Do you work in Iredell County outside Mooresville?**
Yes. Troutman, Mount Mourne and the rural land north and west of the lake.

**Links (Nearby):** "Cornelius" → `/service-areas/cornelius-nc` · "Huntersville" → `/service-areas/huntersville-nc` · "Concord" → `/service-areas/concord-nc` · "Kannapolis" → `/service-areas/kannapolis-nc`
**Links (Services here):** "Pond and waterway work" → `/services/pond-waterway-management` · "Grading and slopes" → `/services/grading-site-preparation` · "Commercial grounds maintenance" → `/services/commercial-landscaping`

**CTA:** CTA-MAINT

---

### 7.19 Gastonia, NC: `/service-areas/gastonia-nc`

**Title:** Industrial Land & Grounds Work in Gastonia, NC | P1
**Meta description:** Industrial grounds care, old mill-site cleanup, clearing, grading, drainage and farm work across Gastonia and Gaston County, from I-85 to Cherryville and Crowders Mountain.
**H1:** Industrial land and grounds work in Gastonia and Gaston County
**Hero subhead:** Industrial parks along I-85, old mill property getting a second life, and rolling farmland west toward Cherryville and Crowders Mountain.
**Qualifier:** Gaston County industrial, commercial, farm and public properties of an acre and up.

## Mill towns with a lot of ground

Gaston County was built on textile mills, and much of that land is still here: old mill sites, mill-village edges, and industrial property that sat idle for years before being redeveloped. Newer industrial parks along I-85 and US 321 have added distribution and manufacturing on large graded pads.

Both come with the same challenges: overgrown perimeters, ditches no one has cleaned in decades, and slopes that erode every time it storms.

## Old sites, new uses

Redeveloping an older industrial property usually means clearing years of volunteer growth, sorting out drainage that was built for a different building, and regrading to the new plan. On sites with any history of contamination, the owner's environmental consultant sets the rules for what can be disturbed and how. We work to their plan.

## Industrial parks along I-85

- Perimeter and fence line vegetation control
- Retention and detention pond upkeep
- Slope mowing and erosion repair
- Rough mowing of outparcels and expansion land
- Clearing and grading for new pads

## Farmland west of Gastonia

Out toward Dallas, Bessemer City and Cherryville, Gaston County turns to pasture, hay and timber on rolling ground. We mow and reclaim pasture, clear fence lines, grade farm roads and work on ponds there.

## Gaston County ground

Red clay and rolling hills make drainage the first question on almost every job here. Clearing leaves slopes exposed, and new turf fails if the grade holds water. We plan grading and stabilization together so there's no gap between them.

## Where we work

Gastonia, Belmont, Mount Holly, Cramerton, McAdenville, Lowell, Dallas, Stanley, Bessemer City, Cherryville and Kings Mountain on the Gaston County side.

## FAQ

**Can you clear and regrade an old mill or industrial site?**
Yes. We clear the growth, rework drainage and regrade to plan. On sites with environmental history, we follow the consultant's plan for what can be disturbed.

**Do you maintain industrial parks along I-85?**
Yes. Perimeter vegetation, basins, slopes and outparcels on one scheduled contract.

**Do you work on farms in western Gaston County?**
Yes. Pasture, fence lines, farm roads and ponds around Dallas, Bessemer City and Cherryville.

**Can you fix drainage on a Gastonia industrial property?**
Yes. We find where the water comes from and where it can go, then regrade, add swales or pipe, and clean out the ditches.

**Links (Nearby):** "Belmont" → `/service-areas/belmont-nc` · "Mount Holly" → `/service-areas/mount-holly-nc` · "Charlotte" → `/service-areas/charlotte-north-carolina` · "York County, SC" → `/service-areas/york-county-sc`
**Links (Services here):** "Property reconstruction" → `/services/property-reconstruction` · "Commercial site management" → `/commercial` · "Drainage" → `/services/drainage`

**CTA:** CTA-SITE

---

### 7.20 Huntersville, NC: `/service-areas/huntersville-nc`

**Title:** Commercial Grounds & Site Work in Huntersville, NC | P1
**Meta description:** Grounds contracts, retention pond upkeep, clearing, grading and lake-area slope work for business parks, retail and public property in Huntersville, NC.
**H1:** Commercial grounds and site work in Huntersville
**Hero subhead:** Business parks and distribution along I-77, retail around Birkdale Village, and public and institutional land between Lake Norman and Mountain Island Lake.
**Qualifier:** Huntersville commercial, industrial, municipal and institutional properties of an acre or larger.

## Between two lakes

Huntersville sits between Lake Norman and Mountain Island Lake, and that shapes a lot of its land. Much of the western side drains toward Mountain Island Lake, which supplies drinking water to Charlotte, so buffers and erosion control matter more here than in most places. The I-77 side is business parks, distribution, medical and retail, all built fast over the last 20 years.

## Business parks and distribution along I-77

- Zone-based grounds contracts
- Detention and retention pond upkeep
- Slope mowing and erosion repair
- Perimeter vegetation and fence line control
- Clearing and grading for new pads and expansions

## Retail and mixed-use

Retail and mixed-use property around Birkdale Village and along NC 73 has busy frontage and hidden problem areas: basins behind the buildings, slopes along the parking decks and edges, and turf that takes a beating. We keep the frontage sharp and the back working.

## Public, institutional and park land

Schools, churches and public grounds in Huntersville often come with athletic fields, wooded edges and stormwater features. We maintain those on schedules built around school calendars and events.

## Watershed care

On sites that drain toward Mountain Island Lake or Lake Norman, we keep disturbed ground covered, put silt control in before we start, and seed as soon as grading allows. Stream and lake buffers apply in much of the area, and we plan around them.

## Keeping new business parks looking finished

A lot of Huntersville's commercial property is less than 20 years old, and its landscapes are still maturing. Trees planted in narrow islands are starting to lift curbs and crowd lights, turf on thin fill is wearing through, and basin plantings have either filled in or died out. We take stock of all that on the first walk and put it into a plan: what to prune, what to replace, which turf to renovate in the fall, and which basin needs a cleanout before summer storms.

## FAQ

**Do you maintain business parks along I-77 in Huntersville?**
Yes. Grounds, ponds, slopes and perimeters on one contract.

**Can you do site work in the Mountain Island Lake watershed?**
Yes. We plan erosion control and buffers into the job from the start and stabilize ground quickly.

**Do you maintain school and church grounds?**
Yes. We schedule around the school day, services and events.

**Do you work on residential lots near the lake?**
No. We work on commercial, industrial, municipal and institutional property.

**Links (Nearby):** "Cornelius" → `/service-areas/cornelius-nc` · "Mooresville" → `/service-areas/mooresville-lake-norman-nc` · "Charlotte" → `/service-areas/charlotte-north-carolina` · "Concord" → `/service-areas/concord-nc`
**Links (Services here):** "Commercial grounds maintenance" → `/services/commercial-landscaping` · "Pond and basin upkeep" → `/services/pond-waterway-management` · "Grading" → `/services/grading-site-preparation`

**CTA:** CTA-MAINT

---

### 7.21 Matthews, NC: `/service-areas/matthews-nc`

**Title:** Office & Medical Campus Grounds Care in Matthews, NC | P1
**Meta description:** Grounds contracts, detention pond upkeep, creek-side drainage and erosion repair for office, medical and retail properties along I-485 and US 74 in Matthews, NC.
**H1:** Grounds and drainage work for Matthews office and medical campuses
**Hero subhead:** Medical and office campuses, retail centers and business properties along I-485 and US 74, with creeks running through the middle of town.
**Qualifier:** Matthews commercial, municipal and institutional properties of one acre and up.

## Creeks through the middle of town

Four Mile Creek, Irvins Creek and their tributaries run through Matthews, and many commercial properties sit close to them. When those sites were built, stormwater ponds and swales went in to control runoff. Twenty years later, a lot of those ponds are full of sediment, the swales have filled in, and the creek banks behind the parking lots are cutting back toward the pavement.

## Medical and office campuses

Hospitals and medical offices need grounds that are clean, accessible and safe every day, including walkways, ADA routes, entrances, parking islands and lawns. They also usually have stormwater features and wooded buffers that get less attention than they should. We handle both on a zone-based contract, with work timed around patient traffic.

## Drainage and erosion near creeks

- Cleaning out and reshaping stormwater ponds and swales
- Stabilizing eroding banks behind parking lots and buildings
- Repairing outlet pipes and energy dissipators
- Regrading lawns and islands that hold water

Work inside stream buffers can need permits and has to follow local rules. We'll help sort that out before we start.

## Retail along US 74

Retail centers along US 74 get the same zone approach: weekly work on the frontage and entrances, and scheduled work on basins, slopes and back lots.

## A typical medical campus schedule

For a medical or office campus in Matthews, a typical growing-season program looks like this: weekly mowing, edging and blowing at entrances, walks and lawns; bed care every two weeks; monthly passes on slopes, buffers and basin banks; and seasonal work like leaf removal, fall overseeding of fescue, and a basin outlet cleanout after the heaviest storms. Crews work early and stay clear of patient drop-off zones during peak hours. You'll know when we're coming and what we did.

## FAQ

**Do you maintain medical office and hospital grounds?**
Yes. We keep walkways, ADA routes, entrances, islands and lawns on a steady schedule, plus ponds and buffers, and we time the work around patient traffic.

**Can you fix an eroding creek bank behind our building?**
Often, yes. We regrade and stabilize the bank and control the runoff above it. Work in stream buffers may need permits, and we'll help you check.

**Can you clean out a silted stormwater pond?**
Yes. We remove sediment, clear the outlet and woody growth, and repair the banks.

**Do you work in Mint Hill and Stallings too?**
Yes.

**Links (Nearby):** "Charlotte" → `/service-areas/charlotte-north-carolina` · "Indian Trail" → `/service-areas/indian-trail-nc` · "Union County" → `/service-areas/union-county-nc` · "Monroe" → `/service-areas/monroe-nc`
**Links (Services here):** "Drainage" → `/services/drainage` · "Pond and basin upkeep" → `/services/pond-waterway-management` · "Commercial grounds maintenance" → `/services/commercial-landscaping`

**CTA:** CTA-MAINT

---

### 7.22 Kannapolis, NC: `/service-areas/kannapolis-nc`

**Title:** Campus, Public & Industrial Grounds in Kannapolis, NC | P1
**Meta description:** Grounds contracts, turf, drainage and site work for research campuses, downtown public spaces and industrial property along I-85 in Kannapolis, NC.
**H1:** Campus, public and industrial grounds in Kannapolis
**Hero subhead:** The research campus downtown, a rebuilt city center, and industrial property along I-85 on the Cabarrus and Rowan county line.
**Qualifier:** Kannapolis institutional, commercial, industrial and municipal properties over an acre.

## A city that rebuilt its center

Kannapolis turned its old mill-town core into a research campus and a new downtown with a ballpark and public spaces. That means big, highly visible grounds that have to look good every day, and newer landscapes still settling in.

## Research and institutional campuses

Campus grounds carry a lot of expectations: lawns that are always cut, beds that are always clean, and walkways that are always clear. Behind that, there's usually stormwater infrastructure, slopes and buffer land. We maintain the whole campus on one schedule and time the visible work around the people using it.

## Public spaces and downtown

Parks, plazas, ballfields and downtown streetscapes get heavy foot traffic and events. We handle turf repair after events, aeration and overseeding on worn areas, and drainage fixes where lawns stay wet.

## Industrial property along I-85

- Perimeter vegetation and fence lines
- Detention basin upkeep
- Slope mowing and erosion repair
- Clearing and grading for pad expansions

## Newer landscapes

Landscapes installed in the last few years are still establishing. Turf goes thin where the soil was compacted during construction, trees struggle where the root zone was cut, and water sits where the finish grade missed. We fix those early before they turn into replacement jobs.

## Mill-town ground, new use

Much of the land in central Kannapolis was mill and mill-village property for most of the last century. Soil under newer landscapes can be compacted fill, old foundation material or subsoil brought in during construction. When a lawn won't take or trees keep struggling, we dig and look before recommending more fertilizer or another round of plants. Often the answer is loosening and amending the soil, or regrading so water moves off instead of pooling.

## FAQ

**Can you maintain grounds for a research or institutional campus?**
Yes. We handle lawns, beds, walkways, stormwater features, slopes and buffers on one contract.

**Do you repair turf after events?**
Yes. We aerate, amend, overseed or resod, and fix drainage where fields and lawns stay wet.

**Do you maintain industrial sites along I-85?**
Yes. Perimeters, basins, slopes and expansion land.

**Do you work in Rowan County too?**
Yes, in the Kannapolis and China Grove area on the Rowan side.

**Links (Nearby):** "Concord" → `/service-areas/concord-nc` · "Mooresville" → `/service-areas/mooresville-lake-norman-nc` · "Huntersville" → `/service-areas/huntersville-nc` · "Charlotte" → `/service-areas/charlotte-north-carolina`
**Links (Services here):** "Commercial grounds maintenance" → `/services/commercial-landscaping` · "Turf installation" → `/services/turf-installation-seeding` · "Drainage" → `/services/drainage`

**CTA:** CTA-MAINT

---

### 7.23 Waxhaw, NC: `/service-areas/waxhaw-nc`

**Title:** Equestrian, Farm & Land Work in Waxhaw, NC | P1
**Meta description:** Pasture and paddock care, fence lines, farm roads, ponds, clearing and grounds for equestrian farms, large acreage, schools and churches around Waxhaw and western Union County.
**H1:** Horse farm, pasture and large-acreage work around Waxhaw
**Hero subhead:** Equestrian farms, pasture and wooded acreage in southwestern Union County, plus the schools, churches and commercial property along Providence Road.
**Qualifier:** Farms, equestrian properties and commercial or institutional grounds of an acre and up around Waxhaw.

## Horse country south of Charlotte

Waxhaw and the land around it have long been home to horse farms and large-acreage properties. Horse properties are hard on land. Paddocks get churned into mud, gates become low spots, riding areas hold water, and pasture turns into weeds when it's overgrazed.

## Equestrian and pasture work

- **Pasture renovation:** mowing and clipping for weed control, liming and reseeding in the right window
- **Mud and drainage fixes** at gates, water troughs and sacrifice areas, using regrading, geotextile and stone
- **Fence line clearing** before new fence goes in
- **Farm lanes and drives** regraded with crown, ditches and stone
- **Pond work:** dam clearing, outlet repair, sediment removal
- **Arena and ring approaches** regraded so water drains away from them
- **Brush and tree line clearing** to take back lost pasture

We work around horses. Tell us which fields are occupied and when, and we'll plan around it.

## Schools, churches and commercial property

Along Providence Road and NC 16 there are schools, churches and commercial properties sitting on large lots. We maintain those grounds on a schedule built around school hours and services, and we handle drainage and field turf.

## Our take on muddy gates

Gravel alone doesn't fix a muddy gate. It sinks. The ground has to be graded so water leaves, then geotextile goes down and the stone goes on top of it. Done that way, it lasts for years.

## Where we work

Waxhaw, Marvin, Weddington, Mineral Springs, Wesley Chapel and the rural land toward the South Carolina line.

## FAQ

**Can you fix mud problems in paddocks and around gates?**
Yes. We regrade so water drains away, then put down geotextile and stone at gates, troughs and high-traffic areas.

**Do you do pasture renovation on horse farms?**
Yes. Mowing, weed control, liming and reseeding, scheduled around your horses.

**Do you maintain school and church grounds in Waxhaw?**
Yes. We schedule around the school day, services and events.

**Do you work on residential lots in Waxhaw?**
No. We work on farms, equestrian properties and commercial or institutional property of one acre or more.

**Links (Nearby):** "Union County" → `/service-areas/union-county-nc` · "Monroe" → `/service-areas/monroe-nc` · "Indian Trail" → `/service-areas/indian-trail-nc` · "Indian Land, SC" → `/service-areas/indian-land-sc` · "Matthews" → `/service-areas/matthews-nc`
**Links (Services here):** "Farm and industrial land" → `/services/industrial-agricultural` · "Drainage" → `/services/drainage` · "Pasture seeding" → `/services/turf-installation-seeding`

**CTA:** CTA-FARM

---

### 7.24 Fort Mill, SC: `/service-areas/fort-mill-sc`

**Title:** Corporate Campus Grounds & Site Work in Fort Mill, SC | P1
**Meta description:** Grounds contracts, slopes, ponds, clearing and grading for corporate headquarters, office parks and new development along I-77 and Kingsley in Fort Mill, SC.
**H1:** Corporate campus grounds and site work in Fort Mill
**Hero subhead:** Corporate headquarters and office parks along I-77, and a steady run of land being cleared and graded for what comes next.
**Qualifier:** Fort Mill commercial, industrial, municipal and institutional properties of one acre or more.

## Headquarters country

Fort Mill has drawn a long list of corporate headquarters and regional offices, many of them around Kingsley and the I-77 corridor. Those campuses are designed to impress: long entrance drives, big lawns, specimen trees, ponds and wooded buffers. They also have the usual large-site problems behind the scenes, like pond banks that need clearing, slopes that erode and buffers that creep.

## Campus grounds contracts

- Weekly turf, edging and bed care at entrances, lawns and building frontage
- Slope and buffer mowing on a seasonal schedule
- Pond and basin upkeep: banks, outlets and woody growth
- Tree limbing along drives and walks
- Leaf and storm cleanup
- A written visit schedule, zone map and single contact

## New development

A lot of land around Fort Mill is still being cleared and graded. We handle clearing, grading, drainage and erosion control for commercial and institutional projects, and we establish turf before handoff. If you want us to stay on for maintenance afterward, you'll get a contractor who already knows where every pipe and swale is.

## Snow and ice

Fort Mill is inside our snow and ice service area. We pre-treat and clear lots, entrances and walks on a seasonal plan.

## Protecting a campus's trees

Headquarters campuses in Fort Mill often keep mature trees from the original woods, and those trees are part of what the company paid for. They're also sensitive to what happens around them. Mowers scrape roots, soil gets compacted under parked equipment, and grade changes bury the root flare. We keep heavy equipment out of the root zones, mulch rings to protect trunks, and flag declining trees early so you can bring in an arborist before a limb comes down over the parking lot.

## FAQ

**Do you maintain corporate campuses in Fort Mill?**
Yes. We run zone-based grounds contracts with weekly frontage care and scheduled work on slopes, buffers and ponds.

**Can you clear and grade land for new development?**
Yes. Clearing, grading, drainage, erosion control and turf establishment.

**Do you offer snow and ice service in Fort Mill?**
Yes, on a seasonal contract with a pre-season site walk.

**Do you work in Tega Cay and Lake Wylie too?**
Yes, on non-residential property.

**Links (Nearby):** "Rock Hill" → `/service-areas/rock-hill-sc` · "Indian Land" → `/service-areas/indian-land-sc` · "York County" → `/service-areas/york-county-sc` · "Charlotte" → `/service-areas/charlotte-north-carolina`
**Links (Services here):** "Commercial grounds maintenance" → `/services/commercial-landscaping` · "Commercial site management" → `/commercial` · "Snow and ice" → `/services/commercial-snow-ice-management`

**CTA:** CTA-MAINT

---

### 7.25 Rock Hill, SC: `/service-areas/rock-hill-sc`

**Title:** Industrial, Campus & Public Grounds in Rock Hill, SC | P1
**Meta description:** Grounds contracts, athletic and public field turf, industrial perimeters, clearing and grading for Rock Hill business parks, campuses and public property along I-77.
**H1:** Industrial, campus and public grounds work in Rock Hill
**Hero subhead:** Business and industrial parks along I-77, a college campus, a revived downtown and a lot of public land along the Catawba.
**Qualifier:** Rock Hill commercial, industrial, municipal and institutional properties larger than an acre.

## A city with a lot of public ground

Rock Hill has invested heavily in parks, athletic complexes, trails and public spaces. It also has business and industrial parks along I-77, a university campus, and redevelopment around downtown and Knowledge Park. Much of our Rock Hill work falls into two groups: public and institutional grounds that take heavy use, and industrial sites that need their perimeters kept under control.

## Public and institutional grounds

- Athletic and event field turf: aeration, overseeding, bermuda renovation and drainage
- Park and trail corridor mowing and edge control
- Campus lawns, beds and walkways
- Tree limbing and removals near paths and parking

## Industrial and business parks

- Perimeter and fence line vegetation
- Detention basin and pond upkeep
- Slope mowing and erosion repair
- Clearing and grading for new pads

## Near the Catawba

Property along the Catawba River and its creeks needs extra care with runoff and buffers. We plan clearing and grading there with the river in mind, and sort out permits before work starts.

## Snow and ice

Rock Hill is inside our snow and ice service area along I-77.

## Industrial parks with room to grow

Rock Hill's industrial and business parks along I-77 and around the Riverwalk area include a lot of land held for future phases. That ground is often mowed once a year, if at all, and becomes brush, sweetgum and pine in a few seasons. Keeping it on a twice-yearly bush-hog cycle is far cheaper than clearing it later. When a phase is ready to build, we clear and grade it and set up erosion control before the ground is exposed.

## Game-day fields

Athletic complexes and school fields in Rock Hill see tournaments and heavy weekend use. We schedule aeration and overseeding between seasons, fix low spots that hold water, and keep turf recovering so fields are ready for the next event.

## FAQ

**Do you maintain athletic fields and public grounds?**
Yes. We handle turf renovation, aeration, overseeding, drainage and routine mowing on fields and parks.

**Do you maintain industrial sites along I-77 in Rock Hill?**
Yes. Perimeters, basins, slopes and expansion land.

**Can you do site work near the Catawba River?**
Yes. We plan around buffers and runoff and help sort out permits first.

**Do you offer snow and ice service in Rock Hill?**
Yes.

**Links (Nearby):** "Fort Mill" → `/service-areas/fort-mill-sc` · "York County" → `/service-areas/york-county-sc` · "Lancaster County" → `/service-areas/lancaster-county-sc` · "Indian Land" → `/service-areas/indian-land-sc`
**Links (Services here):** "Commercial grounds maintenance" → `/services/commercial-landscaping` · "Turf installation" → `/services/turf-installation-seeding` · "Land clearing" → `/services/land-clearing`

**CTA:** CTA-MAINT

---

### 7.26 Indian Land, SC: `/service-areas/indian-land-sc`

**Title:** Site Clearing, Grading & New-Build Turf in Indian Land, SC | P1
**Meta description:** Clearing, grading, drainage, erosion control, new-site turf and grounds contracts for commercial, medical and institutional projects along US 521 and SC 160 in Indian Land.
**H1:** Clearing, grading and new-site turf in Indian Land
**Hero subhead:** One of the fastest-changing places in the region. New retail, medical, office and school sites along US 521 and SC 160, many of them on land that was woods a year ago.
**Qualifier:** Indian Land commercial, medical, municipal and institutional properties of an acre or more.

## Land that was woods last year

Indian Land has been clearing and building at a pace few places match. That means a lot of fresh-graded ground, a lot of stormwater basins, and a lot of turf trying to establish in subsoil because the topsoil got stripped or buried.

## Site work for new projects

- Clearing and grubbing pad sites
- Rough and fine grading to plan
- Drainage installation and basin shaping
- Erosion control through construction
- Turf establishment before handoff

## New-site turf that actually takes

Most new commercial turf in Indian Land fails for the same reasons. It went down on compacted subsoil with no topsoil, at the wrong pH, in the wrong season. We fix the soil first by loosening it, liming it and amending where needed, then plant the right grass for the season. If it's the wrong month for permanent turf, we put down temporary cover and come back at the right time.

## After the building opens

New properties need grounds contracts that account for young turf, new trees and fresh basins. We set up schedules that cover establishment the first year and then settle into routine maintenance.

## Near the Catawba

The western edge of Indian Land drains to the Catawba. We plan runoff control around creeks and buffers on those sites.

## Temporary cover between seasons

A lot of Indian Land sites finish grading at the wrong time of year for permanent grass. The answer isn't to seed fescue in June or bermuda in November and hope. We put down a temporary cover, usually annual rye in the cool months and millet or a similar warm-season annual in summer, to hold the soil and keep the site compliant. Then we come back in the right window for permanent turf. It costs a little more up front and a lot less than reseeding a failed lawn twice.

## FAQ

**Do you handle site work for new commercial projects in Indian Land?**
Yes. Clearing, grading, drainage, erosion control and turf, with maintenance afterward if you want it.

**Why does turf fail on new sites here?**
Usually compacted subsoil with no topsoil, low pH and bad timing. We fix the soil before planting.

**Do you maintain new medical and office properties?**
Yes. We set up first-year establishment care, then routine grounds contracts.

**Is Indian Land in your snow and ice service area?**
Yes.

**Links (Nearby):** "Lancaster County" → `/service-areas/lancaster-county-sc` · "Fort Mill" → `/service-areas/fort-mill-sc` · "Waxhaw" → `/service-areas/waxhaw-nc` · "Charlotte" → `/service-areas/charlotte-north-carolina`
**Links (Services here):** "Grading and site prep" → `/services/grading-site-preparation` · "Turf installation" → `/services/turf-installation-seeding` · "Land clearing" → `/services/land-clearing`

**CTA:** CTA-SITE

---

### 7.27 Indian Trail, NC: `/service-areas/indian-trail-nc`

**Title:** Industrial Park & Commercial Grounds in Indian Trail, NC | P1
**Meta description:** Grounds contracts, detention basin upkeep, drainage fixes, clearing and grading for industrial parks, retail and business property along US 74 and Old Monroe Road.
**H1:** Industrial and commercial grounds work in Indian Trail
**Hero subhead:** Industrial and business parks along US 74 and Old Monroe Road, retail around Sun Valley, and the stormwater basins behind all of them.
**Qualifier:** Indian Trail industrial, commercial, municipal and institutional properties of one acre and up.

## Older sites, newer sites, same basins

Indian Trail has a mix of older commercial and industrial property along US 74 and newer business parks off Old Monroe Road and Unionville-Indian Trail Road. The older sites often have stormwater basins that have never been properly cleaned. The newer ones have fresh slopes that haven't finished establishing.

## What we do in Indian Trail

- **Detention basin restoration:** sediment removal, bank repair, outlet work and woody growth removal on neglected basins
- **Grounds contracts** for industrial, business-park and retail property
- **Drainage fixes** on lots and lawns that stay wet
- **Slope stabilization** on newer graded sites
- **Clearing and grading** for pad expansions and new buildings

## Union County clay and rock

Indian Trail sits on heavy clay with rock close to the surface in places. Drainage and grading jobs here need to account for both. We check before we price.

## Home ground

Indian Trail is close to home for P1, so we can get crews there quickly for routine work and repairs.

## Cleaning out a basin that's been ignored

When a detention basin hasn't been touched in years, we tackle it in order. First we clear trees and brush off the embankment and cut back the growth around the outlet so we can see what we're dealing with. Then we open the outlet and trash rack and check that the pipe flows. Next we dig out the sediment from the forebay and inflow points and haul or spread it where it won't wash back in. Finally we repair bare or slumped banks and reseed. After that, it goes on a maintenance schedule so it doesn't get that bad again.

## FAQ

**Can you restore a neglected detention basin?**
Yes. We clear woody growth, remove sediment, repair banks and restore the outlet.

**Do you maintain industrial parks along US 74?**
Yes. Perimeters, basins, slopes and frontage on one contract.

**Can you fix standing water on a commercial lot or lawn?**
Yes. We find the cause first, then regrade, add drainage or clean out ditches.

**Do you work in Stallings and Hemby Bridge?**
Yes.

**Links (Nearby):** "Monroe" → `/service-areas/monroe-nc` · "Matthews" → `/service-areas/matthews-nc` · "Union County" → `/service-areas/union-county-nc` · "Waxhaw" → `/service-areas/waxhaw-nc`
**Links (Services here):** "Pond and basin upkeep" → `/services/pond-waterway-management` · "Drainage" → `/services/drainage` · "Commercial grounds maintenance" → `/services/commercial-landscaping`

**CTA:** CTA-MAINT

---

### 7.28 Monroe, NC: `/service-areas/monroe-nc`

**Title:** Industrial, Airport-Area & Farm Land Work in Monroe, NC | P1
**Meta description:** Clearing, grading, grounds contracts and farm work around Monroe, NC, including the airport industrial area, the Monroe Expressway corridor and Union County farms.
**H1:** Land clearing, grounds and farm work in Monroe
**Hero subhead:** Close to home for P1. Aerospace and industrial plants around the airport, new development along the Monroe Expressway, and farms in every direction outside town.
**Qualifier:** Monroe-area industrial, commercial, farm, municipal and institutional properties of an acre or larger.

## Close to home

Monroe is close to where our crews are based. The county seat has a strong manufacturing base, including aerospace, around Charlotte-Monroe Executive Airport. It's surrounded by some of the most active farmland in the region, and the Monroe Expressway has opened up a lot of land for development.

## Around the airport

Plants and industrial property near the airport have large perimeters, basins and open ground. Areas near the airfield can come with specific rules about vegetation height, equipment and access. Tell us what your site requires and we'll build the schedule around it.

## Development along the Expressway

New commercial and industrial sites along the Monroe Expressway and US 74 need clearing, grading, drainage and erosion control, then turf and grounds maintenance once they open. We handle all of it.

## Farms around Monroe

- Pasture mowing and reclamation
- Poultry house pads, ditches and surrounding ground
- Fence lines and field edges
- Farm roads and culverts
- Ponds: dams, outlets and sediment

## Public and institutional grounds

We also maintain school, church and public grounds around Monroe, including fields, lawns, basins and wooded edges.

## A Monroe farm job, start to finish

A common call around Monroe goes like this: a family has pasture that hasn't been grazed or cut in years, a pond with trees on the dam, and a farm lane that washes out every winter. We'd start by mulching the brush and small trees in the pasture and clearing the dam. Next we'd regrade the lane with a crown, ditch and culvert, then clean the pond outlet and dig out sediment if needed. Lime and seed go down in the next planting window. Within a year the land is usable again, and a twice-a-year mowing schedule keeps it that way.

## FAQ

**Do you work on industrial sites near the Monroe airport?**
Yes. Perimeters, basins, slopes and expansion land, with schedules built around any airfield-area rules your site has.

**Do you clear and grade land along the Monroe Expressway?**
Yes. Clearing, grading, drainage, erosion control and turf.

**Do you work on poultry and cattle farms around Monroe?**
Yes. Ditches, pads, pasture, fence lines, farm roads and ponds.

**How quickly can you get to a Monroe job?**
Our crews are based nearby, so Monroe jobs are usually easy to schedule quickly.

**Links (Nearby):** "Union County" → `/service-areas/union-county-nc` · "Indian Trail" → `/service-areas/indian-trail-nc` · "Waxhaw" → `/service-areas/waxhaw-nc` · "Matthews" → `/service-areas/matthews-nc`
**Links (Services here):** "Farm and industrial land" → `/services/industrial-agricultural` · "Land clearing" → `/services/land-clearing` · "Commercial site management" → `/commercial`

**CTA:** CTA-SITE

---

### 7.29 Belmont, NC: `/service-areas/belmont-nc`

**Title:** Campus, Riverfront & Commercial Grounds in Belmont, NC | P1
**Meta description:** Grounds contracts, riverfront slope and erosion work, clearing and grading for campuses, public property and commercial sites in Belmont, NC along the Catawba and I-85.
**H1:** Campus, riverfront and commercial grounds in Belmont
**Hero subhead:** A college campus, public land and commercial property on a peninsula between the Catawba and South Fork rivers, with I-85 and Wilkinson Boulevard running through.
**Qualifier:** Belmont commercial, industrial, municipal and institutional properties of one acre and up.

## Water on three sides

Belmont sits between the Catawba and the South Fork, so a lot of its land slopes toward water. That affects runoff, erosion and what can be cleared near the banks.

## Campus and institutional grounds

College and school campuses need grounds that look good year-round and can handle foot traffic, events and athletics. We maintain lawns, beds, walkways and fields, and deal with the drainage and slope problems that come with hilly campuses.

## Riverfront and slopes

On commercial, public and institutional property near the rivers:

- Slope stabilization and erosion repair
- Runoff control above the bank
- Vegetation management within buffer rules
- Turf and ground cover on slopes too steep to mow

## Commercial and industrial property

Along Wilkinson Boulevard and I-85, we maintain grounds, basins and perimeters for commercial and industrial sites, and clear and grade for new projects.

## Hilly campuses and walkways

Campus and institutional property in Belmont often sits on sloping ground with walkways cut across it. When rain runs across the slope, it carries soil onto the paths, undermines the edges, and leaves bare strips along every walk. We regrade the slopes above the paths to send water to planned outlets, add small swales or drains where needed, and establish cover that holds. The walkways stay clean and the edges stop crumbling.

## Stormwater on commercial sites

Commercial sites along Wilkinson Boulevard and near I-85 usually have detention basins or swales tied to their site plans. We keep them mowed, clear the outlets and woody growth, and repair erosion before it spreads. If a basin has silted in, we dig it out.

## FAQ

**Do you maintain college and school campuses?**
Yes. Lawns, beds, walkways, fields, drainage and slopes on one contract.

**Can you fix erosion on riverfront property?**
Yes, on commercial, public and institutional land. We regrade, stabilize and control runoff, and help sort out buffer rules first.

**Do you work on commercial sites along Wilkinson Boulevard?**
Yes. Grounds, basins, perimeters and site work.

**Do you work in Cramerton and McAdenville too?**
Yes.

**Links (Nearby):** "Mount Holly" → `/service-areas/mount-holly-nc` · "Gastonia" → `/service-areas/gastonia-nc` · "Charlotte" → `/service-areas/charlotte-north-carolina`
**Links (Services here):** "Commercial grounds maintenance" → `/services/commercial-landscaping` · "Pond and waterway work" → `/services/pond-waterway-management` · "Grading and slopes" → `/services/grading-site-preparation`

**CTA:** CTA-MAINT

---

### 7.30 Mount Holly, NC: `/service-areas/mount-holly-nc`

**Title:** Parks, Greenway & Redevelopment Land Work in Mount Holly | P1
**Meta description:** Park and greenway grounds, riverfront erosion control, redevelopment clearing and grading, and industrial grounds care in Mount Holly, NC on the Catawba River.
**H1:** Parks, riverfront and redevelopment land work in Mount Holly
**Hero subhead:** Greenways and parks along the Catawba, older industrial land being put to new use, and business property near NC 27 and I-485.
**Qualifier:** Mount Holly municipal, institutional, commercial and industrial properties over an acre.

## A river town with a lot of public land

Mount Holly has invested in its riverfront, with greenways, parks and public access along the Catawba. Those grounds see a lot of use and sit on slopes that drain straight to the river. The town also has older industrial property being cleaned up and redeveloped.

## Parks and greenways

- Trail corridor mowing and edge control
- Park lawns, fields and open space
- Tree limbing and removals along paths
- Erosion repair where trails and slopes meet the river

## Redevelopment sites

Older industrial sites often need years of growth cleared, drainage reworked and ground regraded before anything new can go in. On sites with environmental history, we work to the environmental consultant's plan.

## Industrial and business property

Near NC 27 and I-485, we maintain grounds, basins and perimeters, and clear and grade for expansions.

## Where trails meet slopes

Greenway and trail corridors along the river have steady foot traffic and ground that slopes toward the water. Paths become channels in heavy rain, and slopes lose cover where people cut across them. We add water breaks and turnouts on sloping trail sections, rebuild and reseed eroded edges, and use matting or rock where the grade is too steep for grass alone. It's routine work that keeps a greenway from wearing out.

## Keeping public grounds on schedule

Parks and public grounds get judged every weekend. We set mowing and trimming schedules around peak use, keep sightlines clear along paths and parking areas, and handle tree limbing so trail users aren't ducking branches.

## FAQ

**Do you maintain park and greenway grounds?**
Yes. Trail corridors, lawns, fields, trees and erosion repair.

**Can you clear and regrade a redevelopment site?**
Yes. We clear, rework drainage and regrade, following any environmental plan for the site.

**Do you work on riverfront slopes?**
Yes, on public, institutional and commercial land, within buffer rules.

**Do you work in Stanley and Lucia?**
Yes.

**Links (Nearby):** "Belmont" → `/service-areas/belmont-nc` · "Gastonia" → `/service-areas/gastonia-nc` · "Huntersville" → `/service-areas/huntersville-nc` · "Charlotte" → `/service-areas/charlotte-north-carolina`
**Links (Services here):** "Property reconstruction" → `/services/property-reconstruction` · "Tree and brush management" → `/services/tree-services` · "Drainage" → `/services/drainage`

**CTA:** CTA-SITE

---

### 7.31 Cornelius, NC: `/service-areas/cornelius-nc`

**Title:** Waterfront & Commercial Grounds Care in Cornelius, NC | P1
**Meta description:** Grounds contracts, lakefront slope stabilization, drainage and turf for marinas, commercial waterfront and public property on Lake Norman in Cornelius, NC.
**H1:** Waterfront and commercial grounds on Lake Norman in Cornelius
**Hero subhead:** Marinas, lakeside commercial property and public ground along West Catawba Avenue and Jetton Road, where nearly everything slopes toward the water.
**Qualifier:** Cornelius commercial, municipal and institutional properties of an acre or more. No residential lakefront.

## Lakefront commercial property

Cornelius has more commercial waterfront than most lake towns: marinas, restaurants, shopping and public parks on the water. Those sites combine busy frontage with steep ground running down to the lake.

## What we do in Cornelius

- **Grounds contracts** for commercial and public waterfront, with the frontage kept sharp and the slopes kept stable
- **Slope stabilization** with regrading, matting, riprap and deep-rooted cover
- **Runoff control** above the shoreline
- **Turf and ground cover** on slopes too steep to mow safely
- **Drainage repair** on lots and walkways that flood

## Working at the lake

Work at or near the shoreline usually needs Duke Energy approval, and buffer rules apply. We'll help sort that out before any work starts.

## Why lakeside slopes fail

Most failing slopes on Lake Norman commercial property fail for the same reasons. Turf was planted on a slope too steep to hold it, water from the parking lot or roof runs straight down the face, and the waterline itself erodes as the lake level moves. Fixing only one of those doesn't last. We redirect runoff at the top of the slope, rebuild and stabilize the face with matting and deep-rooted cover, and protect the toe at the waterline where it's allowed. Then the slope goes on a maintenance schedule.

## Marinas and waterfront businesses

Marinas and waterfront restaurants have busy seasons that run hard from spring through fall. We schedule grounds work around peak traffic, keep entrances and parking edges sharp, and plan heavier repairs for the off-season when the lot is quiet.

## FAQ

**Can you stabilize an eroding slope at a marina or waterfront business?**
Yes. We regrade, stabilize and plant the slope, and control the runoff above it.

**Do you maintain commercial waterfront property in Cornelius?**
Yes. Frontage, slopes, drainage and turf on one contract.

**Do you work on residential lakefront lots?**
No. We work on commercial, municipal and institutional property only.

**Do you work in Davidson too?**
Yes.

**Links (Nearby):** "Huntersville" → `/service-areas/huntersville-nc` · "Mooresville" → `/service-areas/mooresville-lake-norman-nc` · "Charlotte" → `/service-areas/charlotte-north-carolina`
**Links (Services here):** "Pond and waterway work" → `/services/pond-waterway-management` · "Grading and slopes" → `/services/grading-site-preparation` · "Commercial grounds maintenance" → `/services/commercial-landscaping`

**CTA:** CTA-MAINT

---

## 8. Blog

### 8.0 Rules for all posts

- Add a visible byline and date under each H1: "By {{OWNER_NAME}} · Published {date} · Updated {date}". If `OWNER_NAME` is empty, use "By the P1 crew".
- Set the real `datePublished` and `dateModified` values (Section 3.2).
- Replace each post's closing line ("Planning work on your land? Review P1's …") with the CTA named in the post block below.
- Apply the banned-pattern rules from Section 1.3 to every post. Posts are the most likely place for "Whether you're…" and em-dash chains to survive, so lint them carefully.
- Keep every existing outbound citation (Clemson, NC State, NCDA&CS). They help.

---

### 8.1 `/blog/land-clearing-cost-per-acre-south-carolina`

**Title:** Land Clearing Cost per Acre in South Carolina | P1
**Meta description:** What drives land clearing cost per acre in South Carolina and around Charlotte: vegetation, method, debris, access and what comes after. Plus how to compare bids.
**H1:** How much does land clearing cost per acre in South Carolina?

**Replace the intro with:**

> The honest answer is that the price per acre can vary several times over depending on what's growing on the land and what you plan to do with it afterward. Clearing an acre of briars and small pines for pasture is a different job from clearing and grubbing an acre of mature hardwoods for a building pad.
>
> Here's what actually moves the number, so you can read a bid and know what you're paying for.

[[OPTIONAL: **Insert directly after the intro, as its own section "## Typical ranges we see":**
{{PRICE_TABLE_CLEARING}}
*Ranges are for Upstate SC and the Charlotte region as of {{PRICE_TABLE_DATE}}. Your site may fall outside them.*]]

**Keep the existing five factor sections** (Vegetation, Acreage & Access, Method, Debris, Post-Clearing). Edit each so it:
- opens with one concrete comparison (e.g., "Light brush and saplings clear several times faster than a stand of mature oak and hickory."),
- removes "help you plan," "specialist," and hedge phrases,
- stays under 180 words.

**Add a new section before the CTA:**

## How to compare two clearing bids

1. **Is the method the same?** A mulching bid and a clear-and-grub bid aren't comparable.
2. **What happens to the debris?** Left as mulch, hauled, or burned? Hauling is often the biggest line item.
3. **Are stumps included?** Ground below grade, pulled, or left?
4. **Is erosion control included?** On commercial sites and disturbances over an acre it's usually required, and it isn't cheap.
5. **What's the site left like?** Rough-cleared, or ready for grading?

If one bid is much lower, it's almost always missing one of those five.

**CTA:** CTA-SITE

---

### 8.2 `/blog/how-to-manage-retention-pond-south-carolina`

**Title:** Retention Pond Maintenance in SC & NC: What to Check | P1
**Meta description:** What to check on a retention or detention pond in the Carolinas, including banks, dams, outlets, sediment and vegetation, and when to bring in a contractor or engineer.
**H1:** How to manage a retention pond in South Carolina and North Carolina

**Replace the first two paragraphs with:**

> Most retention ponds fail slowly. Trees take root in the dam, the outlet collects debris, sediment fills the shallow end, and one day the pond overflows somewhere it isn't supposed to. Almost all of it can be caught with a walk around the pond a few times a year.
>
> Here's what to look for on that walk, and when it's time to call someone.

**Add a short checklist section after the intro:**

## A 15-minute pond walk

- Trees or woody shrubs growing on the dam or embankment
- Trash, limbs or vegetation blocking the outlet, riser or trash rack
- Bare, slumping or cracked banks
- Animal burrows in the dam
- Water flowing around the outlet instead of through it
- A delta of sediment where pipes or ditches enter
- Algae or weeds covering most of the surface in summer

Keep the rest of the post. In "Aquatic Weed and Algae Control," add: "Treating weeds or algae with herbicide in the water requires an aquatic pesticide license in both states."

**CTA:** CTA-SITE

---

### 8.3 `/blog/signs-property-drainage-problem`

**Title:** 5 Signs Your Property Has a Drainage Problem | P1
**Meta description:** Standing water, eroding slopes, dead turf, silted ditches and water near buildings: five drainage warning signs on large Carolina properties and what to do about each.
**H1:** 5 signs your property has a drainage problem, and what to do about it

**Replace the opening paragraph with:**

> Drainage problems rarely announce themselves. They show up as a corner of the field that's always soft, a gravel lane that washes out every spring, or a strip of turf behind the building that dies every August. By the time someone calls it a drainage problem, it's usually been one for years.

**Edits:**
- In "Sign 5: Water Intrusion Near Structures," remove any wording about homes or basements. Use "buildings, loading docks, equipment pads and barns."
- Add one line to each sign under a bold "**What we'd do:**" label, giving a specific first step (e.g., for silted ditches: "Clean it out, then find out what's washing into it, or you'll be cleaning it again next year.").
- Add one outbound citation: link "clay soils" to the relevant Clemson HGIC or NC State Extension soil drainage page.

**CTA:** CTA-SITE

---

### 8.4 `/blog/best-grass-large-acreage-carolinas`

**Title:** Best Grass for Large Acreage in the Carolinas | P1
**Meta description:** Bermuda, tall fescue, zoysia, centipede and bahia compared for large Carolina properties, including sun, traffic, soil, maintenance and planting windows.
**H1:** Best grass types for large-acreage properties in the Carolinas

**Edits:**
- Add a "## When to plant" section after "The Transition Zone Challenge" using the same timing guidance as the Turf service page (Section 5.7), reworded. Do not copy it verbatim.
- Add a comparison table (Grass · Best for · Sun · Traffic · Planting window).
- Replace "The Bottom Line" heading with "Our recommendation by property type" and give one line each for: commercial frontage, campus lawns, athletic fields, slopes, pasture and hay.

**CTA:** CTA-SITE

---

### 8.5 `/blog/preparing-land-agricultural-use-carolinas`

**Title:** Preparing Raw Land for Agricultural Use in the Carolinas | P1
**Meta description:** The order of work for turning raw or overgrown Carolina land into pasture or crop ground: soil tests, clearing, grading, drainage, lime and seeding.
**H1:** How to prepare raw land for agricultural use in the Carolinas

**Edits:**
- Rename "Work with a Contractor Who Handles All of It" to "Why the order matters".
- In that section, add: "The most common mistake we see is clearing in spring and seeding in fall with nothing in between. A summer of thunderstorms on bare clay can take off a lot of topsoil. If you can't seed permanent pasture right away, put down a temporary cover crop."
- Keep all existing extension citations.

**CTA:** CTA-FARM

---

## 9. QA checks (run before opening the PR)

### 9.1 Banned-pattern lint

Run against the rendered text of every page, including alt text and FAQ JSON-LD. Any hit outside the allowed limits fails the build.

```bash
# from the repo root, after building the static output to ./dist
PAGES=$(find dist -name "*.html")

# Hard bans: zero allowed anywhere
grep -il -E "not just|more than just|isn't just|whether you're|whether you need|help you plan|help you decide|needs attention|property partner|seamless|tailored|comprehensive|cutting-edge|top-notch|peace of mind|look no further|second to none|premier|trusted partner|pride ourselves|dedicated to|elevate|unlock|robust|illustration:|illustrative" $PAGES && echo "FAIL: banned phrase" || echo "PASS"

# Per-page caps
for f in $PAGES; do
  t=$(sed -e 's/<[^>]*>//g' "$f")
  s=$(echo "$t" | grep -oi "specialist" | wc -l)
  c=$(echo "$t" | grep -oiE "\bconfirm(ed)?\b" | wc -l)
  d=$(echo "$t" | grep -o "—" | wc -l)
  l=$(echo "$t" | grep -oiE "commercial, industrial, agricultural, municipal,? and institutional" | wc -l)
  [ "$s" -gt 1 ] && echo "FAIL $f specialist=$s"
  [ "$c" -gt 1 ] && echo "FAIL $f confirm=$c"
  [ "$d" -gt 2 ] && echo "FAIL $f emdash=$d"
  [ "$l" -gt 1 ] && echo "FAIL $f property-list=$l"
done
```

Footer, header and nav text count toward these limits, so the sitewide components must pass too.

### 9.2 Duplicate-content check on service-area pages

For every pair of `/service-areas/*` pages, compute 5-word shingle overlap on the **main content only** (exclude header, footer, link modules, CTA band and credentials strip). Target: **no pair above 20%.** Any pair above 25% fails.

```python
# scripts/shingle_check.py
import itertools, re, sys, pathlib
from bs4 import BeautifulSoup

def main_text(path):
    soup = BeautifulSoup(pathlib.Path(path).read_text(), "html.parser")
    main = soup.find("main") or soup.body
    for sel in ["header", "footer", "nav", "[data-component=link-module]",
                "[data-component=cta-band]", "[data-component=credentials-strip]"]:
        for el in main.select(sel): el.decompose()
    return re.sub(r"\s+", " ", main.get_text(" ")).lower()

def shingles(t, n=5):
    w = re.sub(r"[^a-z0-9 ]", "", t).split()
    return {" ".join(w[i:i+n]) for i in range(len(w)-n+1)}

pages = sorted(pathlib.Path("dist/service-areas").rglob("*.html"))
S = {p: shingles(main_text(p)) for p in pages}
bad = 0
for a, b in itertools.combinations(pages, 2):
    j = len(S[a] & S[b]) / max(1, min(len(S[a]), len(S[b])))
    if j > 0.20:
        print(f"{j:.0%}  {a.parent.name}  vs  {b.parent.name}")
        bad += j > 0.25
sys.exit(1 if bad else 0)
```

Add `data-component` attributes to the link module, CTA band and credentials strip if they don't already have them.

### 9.3 Placeholder check

```bash
grep -rn "{{\|}}\|\[\[OPTIONAL" dist && echo "FAIL: unrendered placeholder" || echo "PASS"
```

### 9.4 Structural checks

- Exactly one `<h1>` per page.
- Every FAQ on the page has a matching entry in that page's `FAQPage` JSON-LD, with identical text.
- Every title is 60 characters or fewer; every meta description is 140–158 characters. (Sections 4–8 give exact strings. If a string is outside range after rendering entities, trim the last clause of the meta and report it in the PR.)
- No page contains the word "residential" except in a negation ("We don't …", "No residential …").
- All internal links in the Links blocks resolve with a 200.
- `sitemap.xml` `lastmod` values differ by page and match the last content change.

---

## 10. Claims P1 must approve before launch

These statements appear in the new copy. Digital Alchemy should get a yes from P1 on each before the PR merges. If P1 says no, remove the sentence.

| Claim | Where it appears |
|---|---|
| "Close to 30 years" of Carolina land work by P1's crew leads | Home, About, pre-footer, credentials strip |
| Licensed and insured in both NC and SC | Home FAQ, Contact FAQ, credentials strip, commercial pages |
| "We'll call you back within one business day" | Contact page, form success message |
| Free site visit and written estimate | Home, Contact, /commercial, CTA-GENERAL |
| COI naming the client as additional insured, on request | Home FAQ, Snow FAQ, commercial pages |
| Equipment named generically: forestry mulchers, rotary cutters, slope and boom mowers, compact track loaders, excavators, stump grinders, truck-mounted plows | Service pages |
| Snow service area: Charlotte region and the SC I-77 corridor | Snow page, Charlotte, York County, Fort Mill, Rock Hill and Indian Land pages |
| Crews based near Monroe / Indian Trail | Monroe and Indian Trail pages |
| Hydroseeding, drill seeding and subsurface field drainage are offered | Turf and Drainage pages |
| Work on poultry farms (ditches, pads, surrounding ground) | Union County and Monroe pages |
| Ball field and athletic turf renovation | Boiling Springs, Rock Hill and Kannapolis pages |

---

## 11. What's next, after this content ships

1. **Real photos:** swap in project photos using the filename and alt patterns in 2.6, and rename `/gallery` to "Our Work."
2. **Case studies:** one per service, each linked from its service page and the town page where the work happened.
3. **Local offices:** fill `site-facts.offices[]` as each office opens. The `LocalOffice` component, schema `department` entries and hub listings update automatically.
4. **The 14-town expansion** (project doc `location-pages-build-14-towns.md`): rewrite those drafts to the same standard before publishing. Their current drafts use the retired shared template and would fail the 9.2 duplicate check. Release them in waves once the existing 30 pages are indexed.
