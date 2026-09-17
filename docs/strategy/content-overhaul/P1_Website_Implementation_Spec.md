# P1 Land & Property Management — Website Implementation Spec

**Prepared by Digital Alchemy · September 16, 2026 · Single-source spec for implementation (Codex)**

Site: `https://www.p1landmanagement.com` · Phone (site-wide): **(704) 221-8928**

---

## 0. How to use this spec

This is a self-contained build sheet. It contains, in order:

1. **Context & non-negotiables** — the positioning rules every page must honor.
2. **New location pages (§3)** — full ready-to-publish copy for 11 pages (7 Upstate SC + 4 Charlotte NC), each with URL slug, `<title>`, meta description, H1, body, FAQ, and on-page internal links.
3. **Revisions to existing pages (§4)** — edits to pages that are already live. **This is roughly half the work.**
4. **Technical (§5)** — schema, URL normalization/redirects, sitemap, canonicals.
5. **Internal linking plan (§6)** — every internal link to create, both directions, with exact anchor text.
6. **Acceptance checklist (§7)**.

Implement §4 and §5 in tandem with §3 — the new pages need the existing-page edits (especially the inbound links in §6) to rank.

---

## 1. Context & non-negotiables

- **Audience/scope:** P1 serves **commercial, industrial, agricultural, municipal, and institutional** properties **1 acre and larger**. **No residential services.** Every new and revised page must state or reflect this. Do not introduce "residential," "homeowner," or "large residential" language anywhere, including alt text and schema.
  - ⚠️ **Open item:** the service list originally provided for this engagement mentioned "residential land maintenance (1 acre+)," which contradicts the live site's "no residential." This spec is written **no-residential**. If P1 reverses that decision, positioning copy must be revisited before build.
- **Markets:** Upstate South Carolina (Greenville–Spartanburg–Anderson corridor) and the Greater Charlotte, NC region.
- **Priority order of services:** (1) Commercial landscaping / grounds management, then land/earthwork and the remaining services.
- **Category term:** adopt **"commercial grounds management / grounds maintenance"** as a lead term alongside "land & property management" and "commercial landscaping." Use it in titles, H1s, and body where natural (see §4.5).
- **Brand tone:** confident and capability-first. Keep legally necessary qualifiers, but they must not open a section or dominate a page (see §4.3).
- **URL pattern:** all services live under `/services/...`; all locations under `/service-areas/...`. (One existing exception is corrected in §5.)

---

## 2. Scope summary

| Bucket | Items |
|---|---|
| **New pages (11)** | Upstate SC: Greer, Simpsonville, Easley, Gaffney, Duncan, Inman, Boiling Springs · Charlotte NC: Huntersville, Matthews, Kannapolis, Waxhaw |
| **Revised pages** | Homepage, `/commercial`, `/services/commercial-landscaping`, About, plus inbound-link edits to `/service-areas`, Greenville, Spartanburg, Anderson, Charlotte, Concord, Mooresville & Lake Norman, Union County, and key service pages |
| **Technical** | JSON-LD schema audit/scrub, Snow & Ice URL normalization + 301, sitemap additions, canonicals/breadcrumbs for new pages |
| **Linking** | ~120 internal links, outbound and inbound, with prescribed anchor text (§6) |

**Existing location pages (do not recreate; link to/from):** Greenville, Spartanburg, Anderson (SC); Charlotte, Concord, Mooresville & Lake Norman, Gastonia (NC); York County, Lancaster County (SC), Union County (NC).

---

## 3. New location pages

**Shared page template (all 11 pages):**

1. Eyebrow label: `Service Area · SC` or `Service Area · NC`
2. `H1`
3. Intro paragraph
4. `H2` "Your [City] Property Partner" + positioning paragraph(s)
5. `H2` "Land & Property Management Services in [City]" + the shared services list (below)
6. `H2` "[Commercial/Development section]" + paragraph
7. Optional `H2` agricultural/large-acreage section (only where noted)
8. `H2` "Why [City] Property Teams Choose P1" + paragraph
9. `H2` "[City], [ST] Land & Property Management FAQs" + FAQ (also emit as `FAQPage` JSON-LD)
10. CTA line + on-page internal links

**Shared services list (use on every new page):**

- Commercial landscaping and exterior grounds maintenance contracts
- Land clearing and forestry mulching — lot clearing, right-of-way, and rural acreage
- Fine grading and site preparation for commercial, industrial, municipal, and institutional development
- Drainage planning and scoped French-drain, retention, and erosion work
- Turf installation — sod and large-acreage seeding for Piedmont soils
- Tree services — trimming, removal, and selective clearing
- Pond and waterway management — construction, restoration, and water quality
- Agricultural property maintenance — pastures, fields, fence lines, and access roads
- Full property reconstruction

**Shared CTA line (all pages):** *Call (704) 221-8928 or request a free estimate online to discuss your property.*

---

### 3.1 Upstate South Carolina

---

#### Greer, SC

```
slug:   /service-areas/greer-sc
title:  Commercial Landscaping & Land Management in Greer, SC | P1
meta:   Commercial landscaping, grounds management, land clearing, grading & drainage for 1-acre-plus Greer, SC sites. Call (704) 221-8928.
H1:     Commercial Landscaping & Land Management in Greer, SC
market: Upstate South Carolina · Greenville & Spartanburg Counties
```

**Intro:** P1 Land & Property Management provides commercial landscaping and grounds maintenance for commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger throughout Greer, SC — from the logistics parks around GSP International Airport and Inland Port Greer to the manufacturing corridors along I-85. Connected services extend through land clearing, grading, drainage, and complete site reconstruction.

**Your Greer Property Partner:** Greer sits at the industrial heart of the Upstate. Anchored by BMW Manufacturing, the Greenville-Spartanburg International Airport, and Inland Port Greer — whose recent $55 million expansion pushed annual rail-lift capacity toward 300,000 — the city has become one of the Southeast's busiest logistics and advanced-manufacturing hubs, straddling both Greenville and Spartanburg counties along the I-85 corridor. That scale of development is exactly what P1 is built for: distribution campuses, industrial parks, and corporate sites that need heavy equipment and a coordinated exterior-work plan, not a small-lawn crew.

**Commercial & Development Site Work in Greer:** The International Logistics Park, the GSP airport district, and the third-party logistics facilities feeding BMW keep Greer's development pipeline among the most active in the state. P1 supports that growth with land clearing, forestry mulching, fine grading, site preparation, stormwater and drainage installation, and turf establishment on large, complex sites — then keeps them presentable and compliant year-round with ongoing grounds maintenance long after construction wraps.

**Why Greer Property Teams Choose P1:** We're built for the Carolinas and for the scale of Greer's industrial market — the red clay Piedmont soils, the drainage demands of large graded sites, and the turf species that hold up on commercial acreage. From one accountable crew, Greer property teams get land preparation, water management, and recurring grounds care across the full life of the property.

**FAQs**
- **What kinds of properties does P1 serve in Greer?** Commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger — distribution and logistics campuses, industrial parks, corporate sites, and large landholdings. P1 does not provide residential services.
- **Does P1 handle site work for new development in Greer?** Yes. P1 provides land clearing, forestry mulching, fine grading, site preparation, and drainage and erosion control to get commercial and industrial sites build-ready along the I-85 and GSP corridors.
- **Can P1 maintain grounds for a logistics or manufacturing campus?** Yes. P1 builds recurring exterior grounds programs — mowing, tree and brush management, drainage upkeep, and pond care — scoped to the operating constraints of large industrial sites.

**On-page links:** commercial landscaping in Greer, SC → `/services/commercial-landscaping` · land clearing in Greer → `/services/land-clearing` · fine grading & site preparation → `/services/grading-site-preparation` · drainage solutions → `/services/drainage` · commercial site management → `/commercial` · Greenville, SC → `/service-areas/greenville-sc` · Spartanburg, SC → `/service-areas/spartanburg-sc` · nearby Duncan, SC → `/service-areas/duncan-sc`

---

#### Simpsonville, SC

```
slug:   /service-areas/simpsonville-sc
title:  Commercial Landscaping & Grounds Management in Simpsonville, SC | P1
meta:   Commercial landscaping, grounds maintenance, land clearing, grading & drainage for 1-acre-plus Simpsonville, SC sites. Call (704) 221-8928.
H1:     Commercial Landscaping & Land Management in Simpsonville, SC
market: Upstate South Carolina · Greenville County
```

**Intro:** P1 Land & Property Management provides commercial landscaping and grounds maintenance for commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger throughout Simpsonville, SC — from the Fairview Road retail corridor and the Five Forks commercial nodes to developing tracts across southern Greenville County. Connected services extend through land clearing, grading, drainage, and complete reconstruction.

**Your Simpsonville Property Partner:** Simpsonville is the commercial and retail hub of southern Greenville County and one of the fastest-growing cities in the Upstate, having climbed to roughly 29,000 residents. As the eastern anchor of the Golden Strip alongside Mauldin and Fountain Inn, it carries active commercial districts along Fairview Road and Harrison Bridge Road, at Five Forks, and out West Georgia Road, at the crossroads of I-385 and I-185. Retail centers, business parks, and institutional grounds at that scale need a maintenance partner equipped for large sites — which is where P1 comes in.

**Commercial & Development Site Work in Simpsonville:** Big-box retail along Fairview Road, mixed-use and medical development on Harrison Bridge Road, and continued commercial push through Five Forks keep Simpsonville building. P1 supports that growth with land clearing, fine grading, site preparation, and stormwater and drainage work on commercial and institutional sites, then maintains them year-round with scheduled grounds programs that keep properties presentable and compliant.

**Why Simpsonville Property Teams Choose P1:** We're not a national chain running a one-size-fits-all program on your property. P1 understands the Piedmont soils, drainage patterns, and turf that perform in southern Greenville County, and brings land preparation, water management, and recurring grounds care together under one accountable crew for the full life of the site.

**FAQs**
- **What kinds of properties does P1 serve in Simpsonville?** Commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger — retail centers, business parks, medical and institutional grounds, and large landholdings. P1 does not provide residential services.
- **Does P1 handle drainage and grading for Simpsonville sites?** Yes. P1 provides fine grading, site preparation, and scoped drainage, retention, and erosion work for commercial and institutional development across the Golden Strip.
- **Can P1 maintain a retail center or business park?** Yes. P1 builds recurring grounds programs — turf care, tree and brush management, drainage upkeep, and seasonal work — scoped to the property and its operating needs.

**On-page links:** commercial landscaping in Simpsonville, SC → `/services/commercial-landscaping` · fine grading & site preparation → `/services/grading-site-preparation` · drainage solutions → `/services/drainage` · tree services → `/services/tree-services` · commercial site management → `/commercial` · Greenville, SC → `/service-areas/greenville-sc` · nearby Greer, SC → `/service-areas/greer-sc`

---

#### Easley, SC

```
slug:   /service-areas/easley-sc
title:  Commercial Landscaping & Land Management in Easley, SC | P1
meta:   Commercial landscaping, grounds maintenance, land clearing, grading & drainage for 1-acre-plus Easley, SC sites. Call (704) 221-8928.
H1:     Commercial Landscaping & Land Management in Easley, SC
market: Upstate South Carolina · Pickens County
```

**Intro:** P1 Land & Property Management provides commercial landscaping and grounds maintenance for commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger throughout Easley, SC — from the new industrial parks along U.S. 123 and Highway 153 to working acreage across Pickens County. Connected services extend through land clearing, grading, drainage, and complete reconstruction.

**Your Easley Property Partner:** Positioned between Greenville and Clemson University, Easley has shed its bedroom-community identity to become one of the Upstate's fastest-growing commercial submarkets. Pickens County has emerged as a focal point for e-mobility and advanced automotive manufacturing — with the Speedway Industrial & Technology Park drawing anchor investments in battery production and large-scale distribution — while infrastructure work like the SC Highway 153 extension opens new commercial ground. That mix of new industrial sites and developing tracts is exactly what P1 is built to prepare and maintain.

**Commercial & Development Site Work in Easley:** New manufacturing and logistics facilities off U.S. 123 (Calhoun Memorial Highway) and around the Speedway park demand land clearing, forestry mulching, fine grading, site preparation, and stormwater and drainage installation on large, complex sites. P1 handles that build-ready site work and then keeps the completed grounds maintained year-round with recurring exterior programs.

**Why Easley Property Teams Choose P1:** P1 is built for the Carolinas — the red clay Pickens County soils, the drainage challenges of the area's rolling terrain, and the turf and pasture species that hold up here. From land clearing and grading through drainage and ongoing grounds care, Easley property teams get one contractor for the full life of the site.

**FAQs**
- **What kinds of properties does P1 serve in Easley?** Commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger — manufacturing and distribution sites, business parks, institutional grounds, and working acreage. P1 does not provide residential services.
- **Does P1 handle site preparation for new industrial development in Easley?** Yes. P1 provides land clearing, forestry mulching, fine grading, site preparation, and drainage and erosion control to get commercial and industrial sites build-ready across Pickens County.
- **Can P1 maintain grounds for a manufacturing or distribution site?** Yes. P1 builds recurring grounds programs scoped to the operating constraints of large industrial and commercial properties.

**On-page links:** commercial landscaping in Easley, SC → `/services/commercial-landscaping` · land clearing in Easley → `/services/land-clearing` · fine grading & site preparation → `/services/grading-site-preparation` · drainage solutions → `/services/drainage` · commercial site management → `/commercial` · Greenville, SC → `/service-areas/greenville-sc` · Anderson, SC → `/service-areas/anderson-sc`

---

#### Gaffney, SC

```
slug:   /service-areas/gaffney-sc
title:  Commercial Landscaping & Land Management in Gaffney, SC | P1
meta:   Commercial landscaping, grounds maintenance, land clearing, grading & drainage for 1-acre-plus Gaffney, SC sites. Call (704) 221-8928.
H1:     Commercial Landscaping & Land Management in Gaffney, SC
market: Upstate South Carolina · Cherokee County
```

**Intro:** P1 Land & Property Management provides commercial landscaping and grounds maintenance for commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger throughout Gaffney and Cherokee County, SC — from the fast-growing I-85 industrial corridor to the working farmland and timber of the Old Iron District. Connected services extend through land clearing, grading, drainage, and complete reconstruction.

**Your Gaffney Property Partner:** Cherokee County has become the Upstate's next industrial frontier. Sitting squarely on I-85 between Spartanburg and Charlotte, Gaffney has drawn projects on a scale the county has never seen — the 3.6-million-square-foot Cherokee Commerce Center 85, a major solar-manufacturing investment, distribution centers, and more — thanks to available land, lower costs, and access to both metros and Inland Port Greer. Alongside that industrial surge, Cherokee County keeps its agricultural character in the peach country and pasture beyond the interstate. P1 is built for both.

**Commercial & Development Site Work in Gaffney:** Million-square-foot distribution and manufacturing buildings off the I-85 exits demand large-scale land clearing, forestry mulching, fine grading, site preparation, and stormwater and drainage installation — the kind of work that requires the scale of equipment most contractors can't bring. P1 delivers that site work and then keeps the finished grounds maintained with recurring exterior programs for property managers, industrial facilities, and municipalities.

**Agricultural Property Management in Cherokee County:** Beyond the interstate, Cherokee County stays defined by working farmland, pasture, and timber. P1 works with farm and agricultural landowners on pasture management and reseeding, land clearing, access-road grading, drainage correction, selective fence-line clearing, and pond construction and maintenance — the earthwork and ongoing care that keep working land productive.

**Why Gaffney Property Teams Choose P1:** P1 is built for the Carolinas and for the scale of Cherokee County's new industrial market — the Piedmont soils, the drainage demands of large graded sites, and the pasture and turf species that perform here. From clearing and grading through drainage and recurring grounds care, Gaffney property teams get one accountable contractor for the full life of the land.

**FAQs**
- **What kinds of properties does P1 serve in Gaffney?** Commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger — distribution and manufacturing sites, industrial parks, working farms, and large acreage. P1 does not provide residential services.
- **Does P1 handle large-scale site work for Gaffney industrial parks?** Yes. P1 provides land clearing, forestry mulching, fine grading, site preparation, and drainage and erosion control for the large commercial and industrial sites developing along the I-85 corridor.
- **Can P1 maintain working farms in Cherokee County?** Yes. P1 offers pasture management, field reseeding, drainage correction, access-road grading, selective clearing, and pond maintenance for agricultural properties.

**On-page links:** commercial landscaping in Gaffney, SC → `/services/commercial-landscaping` · land clearing in Gaffney → `/services/land-clearing` · fine grading & site preparation → `/services/grading-site-preparation` · industrial & agricultural land services → `/services/industrial-agricultural` · pond & waterway management → `/services/pond-waterway-management` · commercial site management → `/commercial` · Spartanburg, SC → `/service-areas/spartanburg-sc`

---

#### Duncan, SC

```
slug:   /service-areas/duncan-sc
title:  Commercial Landscaping & Land Management in Duncan, SC | P1
meta:   Commercial landscaping, grounds maintenance, land clearing, grading & drainage for 1-acre-plus Duncan, SC sites. Call (704) 221-8928.
H1:     Commercial Landscaping & Land Management in Duncan, SC
market: Upstate South Carolina · Spartanburg County
```

**Intro:** P1 Land & Property Management provides commercial landscaping and grounds maintenance for commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger throughout Duncan, SC and the southwestern Spartanburg County I-85 corridor. Connected services extend through land clearing, grading, drainage, and complete reconstruction.

**Your Duncan Property Partner:** Duncan anchors one of the most concentrated industrial and distribution corridors in the state. Together with neighboring Greer, the submarket holds tens of millions of square feet of industrial space along I-85, feeding BMW and a deep base of distribution and logistics operations near the Tyger River. Large campuses at that density need a maintenance partner equipped for scale — and site work that keeps pace with continued development.

**Commercial & Development Site Work in Duncan:** Distribution centers and manufacturing sites along I-85 and the Tyger River corridor keep Duncan's development pipeline full. P1 supports it with land clearing, forestry mulching, fine grading, site preparation, and stormwater and drainage installation, then maintains the finished grounds with recurring exterior programs scoped to the operating constraints of large industrial properties.

**Why Duncan Property Teams Choose P1:** P1 is built for the Carolinas and for the scale of the Duncan–Greer industrial market — the Piedmont soils, the drainage demands of large graded sites, and the turf that holds up on commercial acreage. From one accountable crew, Duncan property teams get land preparation, water management, and recurring grounds care across the full life of the property.

**FAQs**
- **What kinds of properties does P1 serve in Duncan?** Commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger — distribution and logistics campuses, industrial parks, and large landholdings. P1 does not provide residential services.
- **Does P1 handle site work for new development in Duncan?** Yes. P1 provides land clearing, forestry mulching, fine grading, site preparation, and drainage and erosion control to get commercial and industrial sites build-ready along the I-85 corridor.
- **Can P1 maintain grounds for a distribution campus?** Yes. P1 builds recurring exterior grounds programs scoped to the operating constraints of large industrial sites.

**On-page links:** commercial landscaping in Duncan, SC → `/services/commercial-landscaping` · land clearing in Duncan → `/services/land-clearing` · fine grading & site preparation → `/services/grading-site-preparation` · drainage solutions → `/services/drainage` · commercial site management → `/commercial` · neighboring Greer, SC → `/service-areas/greer-sc` · Spartanburg, SC → `/service-areas/spartanburg-sc`

---

#### Inman, SC

```
slug:   /service-areas/inman-sc
title:  Commercial Landscaping & Land Management in Inman, SC | P1
meta:   Commercial landscaping, grounds maintenance, land clearing, grading, drainage & pasture care for 1-acre-plus Inman, SC sites. Call (704) 221-8928.
H1:     Commercial Landscaping & Land Management in Inman, SC
market: Upstate South Carolina · Spartanburg County
```

**Intro:** P1 Land & Property Management provides commercial landscaping and grounds maintenance for commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger throughout Inman, SC and northern Spartanburg County — from commercial sites along the U.S. 176 and I-26 corridors to the peach orchards, pasture, and timber of the Lake Bowen area. Connected services extend through land clearing, grading, drainage, and complete reconstruction.

**Your Inman Property Partner:** Inman sits in the agricultural north of Spartanburg County, in peach and farm country near Lake Bowen, with steady residential and commercial growth spreading up from Spartanburg along the I-26 and Highway 9 corridors. It's a market that mixes working land with new development — and P1 is built for both, bringing heavy earthwork and recurring grounds care to properties most crews can't handle.

**Commercial & Development Site Work in Inman:** As development pushes north from Spartanburg, commercial and institutional sites around Inman need land clearing, fine grading, site preparation, and stormwater and drainage work to get build-ready, then ongoing grounds maintenance to stay presentable and compliant. P1 handles both ends of that lifecycle with one accountable crew.

**Agricultural Property Management in Inman:** Inman's peach orchards, hay ground, pasture, and timber are a genuine part of northern Spartanburg County. P1 works with farm and agricultural landowners on pasture management and reseeding, land clearing, access-road grading, drainage correction, selective fence-line clearing, and pond construction and maintenance for livestock and irrigation — the earthwork and ongoing care that keep working land productive.

**Why Inman Property Teams Choose P1:** P1 is built for the Carolinas — the red clay Piedmont soils, the drainage of the area's rolling terrain, and the pasture and turf species that thrive here. From clearing and grading through drainage and recurring grounds care, Inman landowners and property teams get one contractor for the full life of their land.

**FAQs**
- **What kinds of properties does P1 serve in Inman?** Commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger — working farms, large acreage, commercial sites, and institutional grounds. P1 does not provide residential services.
- **Can P1 maintain working farms and pasture near Inman?** Yes. P1 offers pasture management, field reseeding, drainage correction, access-road grading, selective clearing, and pond construction and maintenance for agricultural properties.
- **Does P1 handle drainage and grading on large tracts?** Yes. P1 provides fine grading, site preparation, and scoped drainage, retention, and erosion work across large commercial and agricultural tracts.

**On-page links:** commercial landscaping in Inman, SC → `/services/commercial-landscaping` · agricultural property management → `/services/industrial-agricultural` · pond & waterway management → `/services/pond-waterway-management` · land clearing in Inman → `/services/land-clearing` · Spartanburg, SC → `/service-areas/spartanburg-sc` · nearby Boiling Springs, SC → `/service-areas/boiling-springs-sc`

---

#### Boiling Springs, SC

```
slug:   /service-areas/boiling-springs-sc
title:  Commercial Landscaping & Land Management in Boiling Springs, SC | P1
meta:   Commercial landscaping, grounds maintenance, land clearing, grading & drainage for 1-acre-plus Boiling Springs, SC sites. Call (704) 221-8928.
H1:     Commercial Landscaping & Land Management in Boiling Springs, SC
market: Upstate South Carolina · Spartanburg County
```

**Intro:** P1 Land & Property Management provides commercial landscaping and grounds maintenance for commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger throughout Boiling Springs, SC — from the growing Highway 9 commercial corridor to developing tracts across northern Spartanburg County. Connected services extend through land clearing, grading, drainage, and complete reconstruction.

**Your Boiling Springs Property Partner:** Boiling Springs is one of the fastest-growing communities in Spartanburg County, having roughly doubled in population over the past decade and a half to more than 10,000 residents. That growth has driven steady commercial and institutional development along the Highway 9 corridor north of Spartanburg — retail, schools, medical, and business sites that need a maintenance partner built for larger properties, plus site work to keep pace with new construction.

**Commercial & Development Site Work in Boiling Springs:** New retail centers, school and institutional campuses, and commercial development along Highway 9 keep Boiling Springs building. P1 supports that growth with land clearing, fine grading, site preparation, and stormwater and drainage installation, then maintains the finished grounds with recurring exterior programs that keep properties presentable and compliant year-round.

**Why Boiling Springs Property Teams Choose P1:** P1 is built for the Carolinas — the Piedmont soils, the drainage of the area's rolling terrain, and the turf species that perform in northern Spartanburg County. From land preparation and water management through recurring grounds care, Boiling Springs property teams get one accountable contractor for the full life of the site.

**FAQs**
- **What kinds of properties does P1 serve in Boiling Springs?** Commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger — retail centers, school and institutional grounds, business sites, and large acreage. P1 does not provide residential services.
- **Does P1 handle site work for new development in Boiling Springs?** Yes. P1 provides land clearing, fine grading, site preparation, and drainage and erosion control to get commercial and institutional sites build-ready along the Highway 9 corridor.
- **Can P1 maintain a school or institutional campus?** Yes. P1 builds recurring grounds programs — turf care, tree and brush management, drainage upkeep, and seasonal work — scoped to the property and its operating needs.

**On-page links:** commercial landscaping in Boiling Springs, SC → `/services/commercial-landscaping` · fine grading & site preparation → `/services/grading-site-preparation` · drainage solutions → `/services/drainage` · tree services → `/services/tree-services` · commercial site management → `/commercial` · Spartanburg, SC → `/service-areas/spartanburg-sc` · nearby Inman, SC → `/service-areas/inman-sc`

---

### 3.2 Charlotte Region, NC

---

#### Huntersville, NC

```
slug:   /service-areas/huntersville-nc
title:  Commercial Landscaping & Land Management in Huntersville, NC | P1
meta:   Commercial landscaping, grounds management, land clearing, grading & drainage for 1-acre-plus Huntersville, NC sites. Call (704) 221-8928.
H1:     Commercial Landscaping & Land Management in Huntersville, NC
market: Greater Charlotte, NC · Mecklenburg County / Lake Norman
```

**Intro:** P1 Land & Property Management provides commercial landscaping and grounds maintenance for commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger throughout Huntersville, NC — from the North Charlotte logistics corridor along I-77 to the commercial and waterfront properties around Lake Norman. Connected services extend through land clearing, grading, drainage, and complete reconstruction.

**Your Huntersville Property Partner:** Huntersville anchors the fast-growing North Charlotte submarket, roughly 15 miles north of Uptown along the I-77 corridor. The area has become one of the region's most active logistics and mixed-use markets — recent projects include the 465,000-square-foot AXIAL Commerce Station industrial development, alongside continued retail and mixed-use growth around Birkdale Village and the Lake Norman waterfront. Corporate campuses, distribution sites, retail centers, and lakeside commercial properties at that scale need a maintenance partner equipped for large sites, plus site work that keeps pace with development.

**Commercial & Development Site Work in Huntersville:** New industrial and mixed-use development along I-77 keeps Huntersville building. P1 supports it with land clearing, forestry mulching, fine grading, site preparation, and stormwater and drainage installation on large, complex sites, then maintains the finished grounds year-round with recurring exterior programs for property managers, industrial facilities, and institutions.

**Lake Norman & Waterfront Properties:** The Lake Norman shoreline along Huntersville's western edge includes commercial waterfront sites, institutional grounds, and managed acreage that demand specialized care — shoreline maintenance, pond and waterway management, drainage on sloped lakeside terrain, and turf establishment on challenging sites. P1's pond and waterway and drainage programs make it a natural fit for these demanding non-residential waterfront properties.

**Why Huntersville Property Teams Choose P1:** We're not a national chain applying a one-size-fits-all program to your property. P1 understands the red clay Piedmont soils, the drainage demands of large graded sites, and the turf that performs around Lake Norman. From land preparation and water management through recurring grounds care, Huntersville property teams get one accountable contractor for the full life of the site.

**FAQs**
- **What kinds of properties does P1 serve in Huntersville?** Commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger — logistics and industrial campuses, retail and mixed-use centers, institutional grounds, and commercial waterfront sites. P1 does not provide residential services.
- **Does P1 handle site work for new development along I-77?** Yes. P1 provides land clearing, forestry mulching, fine grading, site preparation, and drainage and erosion control to get commercial and industrial sites build-ready in the North Charlotte corridor.
- **Does P1 work on Lake Norman commercial waterfront properties?** Yes. P1 handles shoreline maintenance, pond and waterway care, drainage on sloped lakeside terrain, and turf establishment for qualifying commercial, municipal, and institutional waterfront properties.

**On-page links:** commercial landscaping in Huntersville, NC → `/services/commercial-landscaping` · land clearing in Huntersville → `/services/land-clearing` · fine grading & site preparation → `/services/grading-site-preparation` · pond & waterway management → `/services/pond-waterway-management` · commercial site management → `/commercial` · Mooresville & Lake Norman → `/service-areas/mooresville-lake-norman-nc` · Charlotte, NC → `/service-areas/charlotte-north-carolina`

---

#### Matthews, NC

```
slug:   /service-areas/matthews-nc
title:  Commercial Landscaping & Land Management in Matthews, NC | P1
meta:   Commercial landscaping, grounds management, land clearing, grading & drainage for 1-acre-plus Matthews, NC sites. Call (704) 221-8928.
H1:     Commercial Landscaping & Land Management in Matthews, NC
market: Greater Charlotte, NC · Mecklenburg / Union County line
```

**Intro:** P1 Land & Property Management provides commercial landscaping and grounds maintenance for commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger throughout Matthews, NC — from the business and office parks along I-485 and U.S. 74 to developing commercial tracts on the Mecklenburg–Union county line. Connected services extend through land clearing, grading, drainage, and complete reconstruction.

**Your Matthews Property Partner:** Matthews sits in a prime southeast-Charlotte position on the Mecklenburg–Union county line, with direct access to I-485 and U.S. 74 (Independence Boulevard) and a deep base of national and international businesses, office space, and medical facilities. Continued commercial and mixed-use investment keeps the town growing. Business parks, office and medical campuses, retail centers, and institutional grounds at that scale need a maintenance partner equipped for large sites — plus site work to keep pace with development.

**Commercial & Development Site Work in Matthews:** Office and business-park development along I-485, retail and mixed-use projects on the U.S. 74 corridor, and medical-campus growth keep Matthews building. P1 supports it with land clearing, fine grading, site preparation, and stormwater and drainage work on commercial and institutional sites, then maintains the finished grounds year-round with recurring exterior programs.

**Why Matthews Property Teams Choose P1:** We're built for the Carolinas and for the scale of Matthews' commercial market — the red clay Piedmont soils, the drainage demands of graded sites, and the turf that performs here. From land preparation and water management through recurring grounds care, Matthews property teams get one accountable contractor for the full life of the site.

**FAQs**
- **What kinds of properties does P1 serve in Matthews?** Commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger — business and office parks, medical and institutional campuses, retail centers, and large landholdings. P1 does not provide residential services.
- **Does P1 handle drainage and grading for Matthews commercial sites?** Yes. P1 provides fine grading, site preparation, and scoped drainage, retention, and erosion work for commercial and institutional development along the I-485 and U.S. 74 corridors.
- **Can P1 maintain an office or medical campus?** Yes. P1 builds recurring grounds programs — turf care, tree and brush management, drainage upkeep, and seasonal work — scoped to the property and its operating needs.

**On-page links:** commercial landscaping in Matthews, NC → `/services/commercial-landscaping` · fine grading & site preparation → `/services/grading-site-preparation` · drainage solutions → `/services/drainage` · tree services → `/services/tree-services` · commercial site management → `/commercial` · Charlotte, NC → `/service-areas/charlotte-north-carolina` · Union County, NC → `/service-areas/union-county-nc`

---

#### Kannapolis, NC

```
slug:   /service-areas/kannapolis-nc
title:  Commercial Landscaping & Land Management in Kannapolis, NC | P1
meta:   Commercial landscaping, grounds management, land clearing, grading & drainage for 1-acre-plus Kannapolis, NC sites. Call (704) 221-8928.
H1:     Commercial Landscaping & Land Management in Kannapolis, NC
market: Greater Charlotte, NC · Cabarrus & Rowan Counties
```

**Intro:** P1 Land & Property Management provides commercial landscaping and grounds maintenance for commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger throughout Kannapolis, NC — from the North Carolina Research Campus and the redeveloping downtown to the I-85 industrial and distribution corridor. Connected services extend through land clearing, grading, drainage, and complete reconstruction.

**Your Kannapolis Property Partner:** Kannapolis has transformed from a textile town into one of the Charlotte region's most ambitious redevelopment stories. The former Cannon Mills site is now the 350-acre North Carolina Research Campus, a biotech and health-research hub, and a $500 million downtown redevelopment is bringing new research, medical, office, and commercial space around it — anchored by landmarks like Atrium Health Ballpark. Along I-85, major distribution and industrial operators have located here on the strength of utility investments and available land. Research grounds, redevelopment sites, and large industrial campuses at that scale are exactly what P1 is built to prepare and maintain.

**Commercial & Development Site Work in Kannapolis:** Downtown redevelopment, research-campus expansion, and I-85 industrial and distribution projects keep Kannapolis building. P1 supports that growth with land clearing, forestry mulching, fine grading, site preparation, and stormwater and drainage installation on large, complex sites, then maintains the finished grounds with recurring exterior programs for property managers, industrial facilities, institutions, and municipalities.

**Why Kannapolis Property Teams Choose P1:** P1 is built for the Carolinas and for the scale of the Kannapolis market — the red clay Piedmont soils, the drainage demands of large graded sites, and the turf that holds up on commercial and institutional acreage. From clearing and grading through drainage and recurring grounds care, Kannapolis property teams get one accountable contractor for the full life of the site.

**FAQs**
- **What kinds of properties does P1 serve in Kannapolis?** Commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger — research and office campuses, distribution and industrial sites, institutional grounds, and large landholdings. P1 does not provide residential services.
- **Does P1 handle site work for I-85 industrial development in Kannapolis?** Yes. P1 provides land clearing, forestry mulching, fine grading, site preparation, and drainage and erosion control to get commercial and industrial sites build-ready.
- **Can P1 maintain grounds for a research or institutional campus?** Yes. P1 builds recurring grounds programs scoped to the operating and presentation standards of large institutional and commercial properties.

**On-page links:** commercial landscaping in Kannapolis, NC → `/services/commercial-landscaping` · land clearing in Kannapolis → `/services/land-clearing` · fine grading & site preparation → `/services/grading-site-preparation` · drainage solutions → `/services/drainage` · commercial site management → `/commercial` · Concord, NC → `/service-areas/concord-nc` · Charlotte, NC → `/service-areas/charlotte-north-carolina`

---

#### Waxhaw, NC

```
slug:   /service-areas/waxhaw-nc
title:  Commercial Landscaping & Land Management in Waxhaw, NC | P1
meta:   Commercial landscaping, grounds management, land clearing, grading, drainage & pasture care for 1-acre-plus Waxhaw, NC sites. Call (704) 221-8928.
H1:     Commercial Landscaping & Land Management in Waxhaw, NC
market: Greater Charlotte, NC · Union County
```

**Intro:** P1 Land & Property Management provides commercial landscaping and grounds maintenance for commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger throughout Waxhaw, NC — from the commercial corridors and institutional campuses of northern Union County to the large-acreage and equestrian tracts of the rural south. Connected services extend through land clearing, grading, drainage, and complete reconstruction.

**Your Waxhaw Property Partner:** Waxhaw is one of the fastest-growing towns in Union County, on the southern edge of the Charlotte metro. Commercial development along the NC-16 (Providence Road) corridor and the historic downtown district sits alongside large institutional campuses — churches, private schools, and community facilities — while southern Union County keeps its rural, large-acreage, and equestrian character. That mix of commercial, institutional, and large-tract work is exactly what P1 is built for.

**Commercial & Development Site Work in Waxhaw:** Commercial growth along Providence Road, expanding institutional campuses, and continued development across northern Union County call for land clearing, fine grading, site preparation, and stormwater and drainage work on commercial and institutional sites, then ongoing grounds maintenance to keep properties presentable and compliant. P1 handles both ends of that lifecycle with one accountable crew.

**Agricultural & Equestrian Property Management around Waxhaw:** Southern Union County retains extensive pasture, equestrian acreage, and working land. P1 works with agricultural and equestrian landowners on pasture management and reseeding, land clearing, access-road grading, drainage correction, selective fence-line clearing, and pond construction and maintenance — the earthwork and ongoing care that keep large tracts productive and presentable.

**Why Waxhaw Property Teams Choose P1:** P1 is built for the Carolinas — the red clay Piedmont soils, the drainage of the area's rolling terrain, and the pasture and turf species that thrive in Union County. From clearing and grading through drainage and recurring grounds care, Waxhaw property teams and landowners get one contractor for the full life of the land.

**FAQs**
- **What kinds of properties does P1 serve in Waxhaw?** Commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger — commercial corridors, institutional and school campuses, large acreage, and equestrian tracts. P1 does not provide residential services.
- **Can P1 maintain equestrian and large-acreage properties near Waxhaw?** Yes. P1 offers pasture management, field reseeding, drainage correction, access-road grading, selective clearing, and pond construction and maintenance for agricultural and equestrian properties.
- **Does P1 handle site work for commercial and institutional development in Waxhaw?** Yes. P1 provides land clearing, fine grading, site preparation, and drainage and erosion control to get commercial and institutional sites build-ready.

**On-page links:** commercial landscaping in Waxhaw, NC → `/services/commercial-landscaping` · industrial & agricultural land services → `/services/industrial-agricultural` · fine grading & site preparation → `/services/grading-site-preparation` · tree services → `/services/tree-services` · commercial site management → `/commercial` · Union County, NC → `/service-areas/union-county-nc` · Matthews, NC → `/service-areas/matthews-nc`

---

## 4. Revisions to existing pages

### 4.1 Homepage (`/`)

1. **Fix the empty proof block.** The "What do our customers think about us?" section renders a blank rating ("— Rating on Google") and no testimonials. Either (a) populate a live Google rating + 2–3 real testimonials, or (b) remove the module until content exists. **Do not ship an empty rating.**
2. **Link the "Where We Work" city names.** Both market cards currently list cities as **plain text**. Make **every** city name a link to its `/service-areas/...` page — existing and new:
   - Upstate: Greenville, Spartanburg, Anderson, **Greer, Simpsonville, Easley, Gaffney, Duncan, Inman, Boiling Springs**.
   - Charlotte: Charlotte, Concord, Mooresville, Lake Norman, Gastonia, **Matthews, Waxhaw, Kannapolis, Huntersville**.
   - "Mooresville" and "Lake Norman" both point to `/service-areas/mooresville-lake-norman-nc`.
3. **Add proof numbers** near the hero or capabilities block (acreage/properties managed, equipment, years in operation) — see §4.5 rationale.
4. **Work in the category term** — add "commercial grounds management" to the services/positioning copy (§4.5).

### 4.2 `/commercial` vs `/services/commercial-landscaping` — resolve keyword overlap

Both pages currently target commercial buyers in both markets and compete for the same term. Split them cleanly:

- **`/commercial`** = the **"manage my whole site" lifecycle hub** (site assessment, multi-service coordination). Keep the assessment funnel. Title/H1 should center **commercial & industrial site management / exterior facilities management**, not "commercial landscaping."
- **`/services/commercial-landscaping`** = the **recurring grounds-maintenance service page**. Title/H1 center **commercial landscaping & grounds management**.
- **Cross-link one direction:** hub (`/commercial`) → service (`/services/commercial-landscaping`) as "recurring grounds care." Avoid making the service page compete back up for the hub's term.
- Ensure the two pages do not share the same primary `<title>` keyword.

### 4.3 Priority commercial pages — dial back hedge language

On `/commercial` and `/services/commercial-landscaping`, qualification/disclaimer language currently dominates (e.g., "confirmed during qualification," "not a blanket promise," "your inquiry does not reserve a time," "no … guarantee … is implied"). Keep what's legally necessary, but:

- **Lead each section with capability and proof**, not caveats.
- Move disclaimers lower on the page and tighten them.
- Net effect: a qualified buyer should read confidence first, fine print last.

### 4.4 About page (`/about`)

Align the **"Where We Work"** list with the full footer/coverage: add the SC border counties and NC county — **York County, Lancaster County, Union County** — plus reference the new city markets where natural. (About currently lists only a subset of cities.)

### 4.5 Category-term adoption (site-wide, light touch)

Introduce **"commercial grounds management / grounds maintenance"** as a recurring term. It fits P1's non-residential, contract, large-site positioning better than "commercial landscaping" alone and is only lightly defended regionally. Apply to: the `/services/commercial-landscaping` title/H1, the homepage services block, and the `/commercial` hub copy. Vary phrasing; don't keyword-stuff.

> **Note for the implementer:** §4 copy edits are directional instructions, not full rewrites. Where a full rewrite is wanted (e.g., the two commercial pages), flag it back for copy before building.

---

## 5. Technical

1. **JSON-LD schema audit + scrub.** Verify the `LocalBusiness` / `LandscapingBusiness` structured data on all templates. Remove any residual **"residential" / "large residential"** language and stale service lists; ensure `areaServed`, service list, and `telephone` (+1-704-221-8928) reflect current scope. (This was flagged previously and could not be verified from rendered HTML — check the source.)
2. **Add `FAQPage` JSON-LD** to each new location page, mirroring its FAQ block.
3. **Normalize the Snow & Ice URL.** `/commercial-snow-ice-management` is the only service outside `/services/`. Move to **`/services/commercial-snow-ice-management`** and add a **301** from the old path. Update all internal references (nav, footer, hub, homepage service grid).
4. **Sitemap:** add all 11 new location URLs; confirm they're crawlable and in the XML sitemap; resubmit.
5. **Canonicals + breadcrumbs:** each new page self-canonical; breadcrumb `Home › Service Areas › [City]`.
6. **Footer caution:** do **not** add all new cities to the site-wide footer. Rely on the `/service-areas` hub + contextual links (§6). Site-wide boilerplate links are low-value and dilute the signal.

---

## 6. Internal linking plan

**Principles.** (1) Build **both** directions — the outbound links are already embedded in the new-page copy (§3); the **inbound** links below require editing existing pages and are what get the new pages crawled and ranked. (2) Hub-and-spoke, not everything-to-everything. (3) Descriptive, **varied** anchor text — never "click here"/"learn more"; plain "City, ST" is fine in nav/related blocks.

### 6.1 Outbound (from each new page)

Already specified per page in §3 under "On-page links." Implement those exactly.

### 6.2 Inbound (edit these existing pages to link INTO the new pages)

| From page | Add link → To page | Suggested anchor | Priority |
|---|---|---|---|
| `/service-areas` (hub) | Greer, Simpsonville, Easley, Gaffney, Duncan, Inman, Boiling Springs, Huntersville, Matthews, Kannapolis, Waxhaw | "[City], [ST]" | High |
| `/` (Where We Work) | all 11 new cities (see §4.1) | "[City]" | High |
| `/service-areas/greenville-sc` | Greer / Simpsonville / Easley | "Greer, SC" / "Simpsonville, SC" / "Easley, SC" | High |
| `/service-areas/spartanburg-sc` | Greer / Duncan / Inman / Boiling Springs / Gaffney | "[City], SC" | High |
| `/service-areas/anderson-sc` | Easley | "Easley, SC" | High |
| `/service-areas/charlotte-north-carolina` | Huntersville / Matthews | "Huntersville, NC" / "Matthews, NC" | High |
| `/service-areas/concord-nc` | Kannapolis | "Kannapolis, NC" | High |
| `/service-areas/mooresville-lake-norman-nc` | Huntersville | "Huntersville, NC" | High |
| `/service-areas/union-county-nc` | Waxhaw / Matthews | "Waxhaw, NC" / "Matthews, NC" | High |
| `/services/commercial-landscaping` | Greer / Simpsonville / Huntersville | "commercial landscaping in [City]" | Med |
| `/services/land-clearing` | Gaffney / Greer / Kannapolis | "land clearing in [City]" | Med |
| `/services/grading-site-preparation` | Greer / Easley / Huntersville | "site prep in [City]" | Med |
| `/services/industrial-agricultural` | Gaffney / Inman / Waxhaw | "[City]" | Med |
| `/services/drainage` | Duncan / Boiling Springs / Matthews | "[City]" | Med |
| `/services/pond-waterway-management` | Inman / Huntersville | "[City]" | Med |

### 6.3 Neighbor cross-links (city ↔ city)

Already embedded in §3 on-page links. Key pairs: Greer↔Duncan, Inman↔Boiling Springs, Simpsonville→Greer, Matthews↔Waxhaw, Huntersville→Mooresville/Lake Norman, Kannapolis→Concord.

> A companion spreadsheet version of this plan (filterable, with a Done column) exists: **P1_Internal_Linking_Matrix.xlsx** (covers the SC pages; extend it with the NC rows above if you prefer to track in the sheet).

---

## 7. Acceptance checklist

- [ ] 11 new location pages published at the exact slugs in §3, each with title, meta description, H1, body sections, FAQ, and on-page links.
- [ ] Each new page has no "residential/homeowner" language anywhere (copy, alt text, schema).
- [ ] `FAQPage` JSON-LD present on each new page.
- [ ] Homepage: proof block fixed (populated or removed); every "Where We Work" city is a link (existing + new).
- [ ] `/commercial` vs `/services/commercial-landscaping` retitled and de-duplicated; one-directional cross-link in place.
- [ ] Hedge language reduced on the two priority commercial pages; capability-first.
- [ ] About "Where We Work" updated (York, Lancaster, Union added).
- [ ] "Commercial grounds management" term present on the homepage, `/commercial`, and `/services/commercial-landscaping`.
- [ ] `LocalBusiness`/`LandscapingBusiness` schema verified and scrubbed of residential/stale data.
- [ ] Snow & Ice moved to `/services/commercial-snow-ice-management` with a 301; all references updated.
- [ ] All 11 new URLs in the XML sitemap; canonicals + breadcrumbs correct.
- [ ] All §6.2 inbound links implemented with the specified anchors; footer NOT bloated with new cities.

---

*Prepared by Digital Alchemy · godigitalalchemy.com*
