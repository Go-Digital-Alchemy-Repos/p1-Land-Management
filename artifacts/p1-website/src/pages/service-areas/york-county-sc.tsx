import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceAreaSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import { FeatureRow } from "@/components/layout/FeatureRow";
import heroImg from "@/assets/hero-york-county.png";
import featureImg from "@/assets/features/york-county-lakewylie.png";
import { CheckCircle2 } from "lucide-react";

const FAQS = [
  {
    question: "What areas of York County does P1 serve?",
    answer:
      "P1 serves the entire county — Rock Hill, Fort Mill, Tega Cay, Lake Wylie, York, Clover, Sharon, Hickory Grove, McConnells, Smyrna, and the surrounding rural areas — for properties 1 acre and larger.",
  },
  {
    question: "Does P1 handle land clearing for new construction in York County?",
    answer:
      "Yes. P1 provides land clearing, forestry mulching, fine grading, and site preparation for commercial and residential development throughout York County, including drainage and erosion control to get sites build-ready — which matters especially along the fast-developing I-77 corridor through Fort Mill and Rock Hill.",
  },
  {
    question: "Can P1 maintain horse farms and equestrian properties?",
    answer:
      "Yes. P1 offers pasture management, field reseeding, drainage, ring and paddock grading, selective clearing, and pond maintenance for the horse farms and equestrian estates concentrated in western York County around York, Sharon, Hickory Grove, and McConnells.",
  },
  {
    question: "Does P1 work on Lake Wylie waterfront properties?",
    answer:
      "Yes. P1 handles shoreline maintenance, pond and waterway care, drainage on sloped lakeside terrain, and turf establishment for the large-acreage waterfront and rural estates around Lake Wylie, Tega Cay, and River Hills.",
  },
  {
    question: "What size properties does P1 work on?",
    answer:
      "P1 focuses on properties 1 acre and larger — commercial, industrial, agricultural, equestrian, and large residential — which lets us bring the right equipment and expertise to jobs that standard landscaping companies can't handle.",
  },
];

export default function YorkCountySC() {
  return (
    <Layout>
      <SEO
        title="Land Clearing & Property Management York County SC | P1 | Rock Hill, Fort Mill, Tega Cay, Clover & York"
        description="P1 Land & Property Management serves commercial, agricultural, equestrian, and large residential properties across York County, SC. Land clearing, grading, drainage, pasture, turf, and pond management in Rock Hill, Fort Mill, Tega Cay, Lake Wylie, Clover, York & more. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({
            areaName: "York County, South Carolina",
            areaType: "AdministrativeArea",
            description:
              "P1 Land & Property Management serves commercial, agricultural, equestrian, and large residential properties across York County, SC. Land clearing, grading, drainage, pasture, turf, and pond management in Rock Hill, Fort Mill, Tega Cay, Lake Wylie, Clover, York & more. Call (704) 221-8928.",
            path: "/service-areas/york-county-sc",
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "York County, SC", path: "/service-areas/york-county-sc" },
          ]),
          faqSchema(FAQS),
        ]}
      />

      <PageHero
        eyebrow="Service Area · SC"
        title={
          <>
            Land Clearing & Property Management in{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              York County, SC
            </em>
          </>
        }
        subtitle="P1 Land & Property Management serves commercial, agricultural, equestrian, and large residential properties 1 acre and larger throughout York County, SC — from Rock Hill, Fort Mill, and Tega Cay to Lake Wylie, Clover, York, and the rural western county. Full-service land management, from land clearing and grading to weekly maintenance and complete property reconstruction."
        image={heroImg}
        imageAlt="Land Clearing & Property Management in York County, SC"
      />

      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl space-y-16">

          <FeatureRow heading="Your York County Property Partner" image={featureImg} imageAlt="Lakeside property maintenance on a Lake Wylie waterfront estate in York County, SC">
            <p>
              York County is one of South Carolina's fastest-growing counties and the seventh-most populous in the state. As part of the Charlotte metro, its eastern side along the I-77 corridor — Fort Mill, Tega Cay, Rock Hill, and Lake Wylie — has become one of the region's most active commercial and residential markets, drawing corporate relocations and new subdivisions across the state line from Charlotte. Meanwhile, the western half of the county around York, Clover, Sharon, Hickory Grove, and McConnells retains its rural character, with working farmland, pasture, timber, and horse country stretching between the Catawba and Broad Rivers.
            </p>
            <p>
              That combination is exactly what P1 Land & Property Management is built for. Whether you own a commercial site in Rock Hill, a developing tract near Fort Mill, a waterfront estate on Lake Wylie, or working agricultural acreage outside York, P1 delivers the equipment, expertise, and reliability that large York County properties demand — the kind of full-scope land and property management that standard residential landscaping companies simply aren't equipped to provide.
            </p>
          </FeatureRow>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-secondary">Land & Property Management Services Throughout York County</h2>
              <ul className="space-y-3">
                {[
                  "Land clearing and forestry mulching — lot clearing, right-of-way, and rural acreage",
                  "Fine grading and site preparation for commercial and residential development",
                  "Drainage design and installation — French drains, retention, and erosion control",
                  "Pasture and equestrian property maintenance — fields, paddocks, and riding areas",
                  "Turf installation — sod and large-acreage seeding for Piedmont soils",
                  "Tree services — trimming, removal, and selective clearing",
                  "Pond and waterway management — construction, restoration, and water quality",
                  "Commercial property management and maintenance contracts",
                  "Full property reconstruction",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-secondary/80 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-secondary">Communities We Serve in York County</h2>
              <p className="text-secondary/80">
                P1 provides land clearing, grading, drainage, turf, and property management services throughout York County, SC, including:
              </p>
              <ul className="space-y-3">
                {[
                  "Rock Hill — the county's largest city",
                  "Fort Mill and Tega Cay",
                  "Lake Wylie and River Hills",
                  "York — the county seat",
                  "Clover and Bethany",
                  "Sharon, Hickory Grove, and Smyrna",
                  "McConnells and the western county",
                  "The I-77 and Catawba River corridors",
                  "Surrounding rural and unincorporated areas of York County",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-secondary/80 font-medium">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-muted p-8 rounded-xl border border-border shadow-sm space-y-4">
            <h2 className="text-2xl font-serif font-bold text-secondary">Equestrian & Agricultural Property Management in York County</h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-4">
              <p>
                Western York County — around York, Sharon, Hickory Grove, McConnells, and Smyrna — has a strong concentration of horse farms, fenced pasture, and equestrian estates, along with working cattle, poultry, and hay operations across its rolling Piedmont hills. These properties need a different kind of care than a suburban lawn: pasture management and reseeding, drainage across large fenced tracts, footing and grading for rings and paddocks, selective clearing along fence lines, and pond maintenance for livestock and irrigation.
              </p>
              <p>
                From row crops and hay ground to cattle, poultry, and boarding operations, P1 works with York County farm and ranch owners on pasture renovation, land clearing, access-road grading, drainage correction, and pond construction — the earthwork and ongoing maintenance that keep working land productive. Our combined expertise in earthmoving and land maintenance makes us a natural fit for the county's agricultural and equestrian landowners.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-serif font-bold text-secondary">Commercial & Development Site Work in York County</h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-4">
              <p>
                The growth spreading south across the state line from Charlotte has made eastern York County one of the most active development markets in the region, with Fort Mill, Tega Cay, and Rock Hill managing significant new commercial campuses, industrial sites, and residential construction along I-77. P1 supports that growth with land clearing, forestry mulching, fine grading, site preparation, stormwater and drainage installation, and turf establishment — handling large, complex sites that require the scale of equipment and crew most contractors can't bring.
              </p>
              <p>
                For property managers, developers, HOAs, and facility owners, P1 also offers ongoing commercial grounds maintenance programs that keep sites presentable and compliant year-round, long after the initial site work is complete.
              </p>
            </div>
          </div>

          <div className="bg-muted p-8 rounded-xl border border-border shadow-sm space-y-4">
            <h2 className="text-2xl font-serif font-bold text-secondary">Lake Wylie & Waterfront Properties</h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-4">
              <p>
                Lake Wylie and the Catawba River corridor along York County's eastern edge — including Tega Cay, River Hills, and the Lake Wylie community — hold a high concentration of large-acreage waterfront and rural estates that require specialized management: shoreline maintenance, pond and waterway care, drainage on sloped lakeside terrain, and turf establishment on challenging sites. P1's pond and waterway management program, combined with our drainage and grading expertise, makes us a natural fit for these demanding waterfront properties.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-serif font-bold text-secondary">Why York County Landowners Choose P1</h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-4">
              <p>
                We're not a regional franchise or a national chain applying a one-size-fits-all approach to your property. P1 is built for the Carolinas — we understand the red clay soils of the York County Piedmont, the drainage challenges of the area's rolling terrain and the creek- and river-fed bottomland along the Catawba, the grass and pasture species that thrive here, and the seasonal patterns that drive maintenance needs throughout the year.
              </p>
              <p>
                From single land-clearing and grading projects to full-service maintenance contracts, P1 gives York County property owners one contractor for the entire life of their land — from initial clearing and reconstruction through ongoing weekly and seasonal care. If your property is 1 acre or larger and needs professional management, P1 is the call to make.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">York County, SC Land & Property Management FAQs</h2>
            <div className="space-y-6">
              {FAQS.map((f) => (
                <div key={f.question} className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-2">
                  <h3 className="text-lg font-serif font-bold text-secondary">{f.question}</h3>
                  <p className="text-secondary/80 leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
            <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
              Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your property.
            </p>
          </div>

        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
