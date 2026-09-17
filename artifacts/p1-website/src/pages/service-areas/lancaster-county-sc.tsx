import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceAreaSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import { FeatureRow } from "@/components/layout/FeatureRow";
import heroImg from "@/assets/hero-lancaster-county.png";
import featureImg from "@/assets/features/lancaster-sitework.png";
import { CheckCircle2 } from "lucide-react";

import { FaqAccordion } from "@/components/content/FaqAccordion";

const FAQS = [
  {
    question: "What areas of Lancaster County does P1 serve?",
    answer:
      "P1 serves the entire county — Indian Land, Van Wyck, Lancaster, Kershaw, Heath Springs, and the surrounding rural areas — for properties 1 acre and larger.",
  },
  {
    question: "Does P1 handle land clearing for new construction in Lancaster County?",
    answer:
      "Yes. P1 provides land clearing, forestry mulching, fine grading, and site preparation for commercial, industrial, municipal, and institutional development throughout Lancaster County, including drainage and erosion control to get sites build-ready — which matters especially in the fast-developing Indian Land panhandle.",
  },
  {
    question: "Can P1 maintain working farms and agricultural properties?",
    answer:
      "Yes. P1 offers pasture management, field reseeding, drainage correction, access-road grading, selective clearing, and pond maintenance for working farms and agricultural properties across Lancaster County.",
  },
  {
    question: "What size properties does P1 work on?",
    answer:
      "P1 focuses on commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger, which lets us bring the right equipment and expertise to large-scale jobs. P1 does not provide residential services.",
  },
];

export default function LancasterCountySC() {
  return (
    <Layout>
      <SEO
        title="Land Management in Lancaster County, SC | P1"
        description="Commercial landscaping, grounds maintenance, land clearing, grading & drainage for qualifying Lancaster County, SC sites. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({
            areaName: "Lancaster County, South Carolina",
            areaType: "AdministrativeArea",
            description:
              "Commercial landscaping, grounds maintenance, agricultural land care, land clearing, grading, drainage, turf, and pond services for qualifying properties across Lancaster County, SC.",
            path: "/service-areas/lancaster-county-sc",
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "Lancaster County, SC", path: "/service-areas/lancaster-county-sc" },
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
              Lancaster County, SC
            </em>
          </>
        }
        subtitle="P1 Land & Property Management provides commercial landscaping and grounds maintenance for commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger throughout Lancaster County, from Indian Land and Van Wyck to Lancaster, Kershaw, and Heath Springs. Connected services extend through agricultural land care, clearing, grading, drainage, and complete reconstruction."
        image={heroImg}
        imageAlt="Land Clearing & Property Management in Lancaster County, SC"
      />

      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">

          <FeatureRow heading="Your Lancaster County Property Partner" image={featureImg} imageAlt="Large-acreage property management in Lancaster County, SC">
            <p>
              Lancaster County is one of the fastest-growing counties in the Charlotte region. Its northern panhandle around Indian Land and Van Wyck has seen major commercial, industrial, and institutional development — while the central and southern reaches around Lancaster, Kershaw, and Heath Springs remain defined by working farmland, pasture, and timber.
            </p>
            <p>
              That combination is exactly what P1 Land & Property Management is built for. Whether you manage a commercial site in Indian Land, a developing tract along the U.S. 521 corridor, or working agricultural acreage outside Kershaw, P1 delivers the equipment, expertise, and reliability that large Lancaster County properties demand.
            </p>
          </FeatureRow>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-secondary">Land & Property Management Services Throughout Lancaster County</h2>
              <ul className="space-y-3">
                {[
                  "Commercial landscaping and exterior grounds maintenance contracts",
                  "Agricultural property maintenance — pastures, fields, fence lines, and access roads",
                  "Land clearing and forestry mulching — lot clearing, right-of-way, and rural acreage",
                  "Fine grading and site preparation for commercial, industrial, municipal, and institutional development",
                  "Drainage planning and scoped French-drain, retention and erosion work",
                  "Turf installation — sod and large-acreage seeding for Piedmont soils",
                  "Tree services — trimming, removal, and selective clearing",
                  "Pond and waterway management — construction, restoration, and water quality",
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
              <h2 className="text-2xl font-serif font-bold text-secondary">Communities We Serve in Lancaster County</h2>
              <p className="text-secondary/80">
                P1 provides commercial landscaping, grounds maintenance, land clearing, grading, drainage, turf, and property management services throughout Lancaster County, SC, including:
              </p>
              <ul className="space-y-3">
                {[
                  "Indian Land — the county's fastest-growing community",
                  "Van Wyck and the panhandle",
                  "Lancaster — the county seat",
                  "Kershaw and Heath Springs",
                  "Pleasant Hill and Elgin",
                  "Rich Hill and Taxahaw",
                  "The U.S. 521 and Catawba River corridors",
                  "Surrounding rural and unincorporated areas of Lancaster County",
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
            <h2 className="text-2xl font-serif font-bold text-secondary">Agricultural Property Management in Lancaster County</h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-4">
              <p>
                Agriculture remains a genuine part of Lancaster County's identity, from Van Wyck and the northern panhandle south toward Kershaw and Heath Springs. Working farms and large agricultural properties need commercial-scale care, including pasture management and reseeding, drainage across large tracts, access-road grading, selective clearing along fence lines, and pond maintenance for livestock and irrigation.
              </p>
              <p>
                From row crops and hay ground to cattle and poultry operations, P1 works with Lancaster County farm and ranch owners on pasture renovation, land clearing, access-road grading, drainage correction, and pond construction — the earthwork and ongoing maintenance that keep working land productive. Our combined expertise in earthmoving and land maintenance makes us a natural fit for the county's agricultural landowners.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-serif font-bold text-secondary">Commercial & Development Site Work in Lancaster County</h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-4">
              <p>
                Few markets in the Carolinas are developing faster than Lancaster County's panhandle, where builders and commercial developers are racing to keep pace along the U.S. 521 corridor through Indian Land and Van Wyck. That growth demands land clearing, forestry mulching, fine grading, site preparation, stormwater and drainage installation, and turf establishment — handling large, complex sites that require the scale of equipment and crew most contractors can't bring. As the county tightens its development standards and infrastructure requirements, getting sites properly cleared, graded, and drained the first time matters more than ever.
              </p>
              <p>
                For commercial property managers, developers, industrial facilities, municipalities, and institutions, P1 also offers ongoing grounds maintenance programs that keep sites presentable and compliant year-round, long after the initial site work is complete.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-serif font-bold text-secondary">Why Lancaster County Property Teams Choose P1</h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-4">
              <p>
                We're not a regional franchise or a national chain applying a one-size-fits-all approach to your property. P1 is built for the Carolinas — we understand the red clay soils of the Lancaster County Piedmont, the drainage challenges of the area's rolling terrain and the creek- and river-fed bottomland along the Catawba, the grass and pasture species that thrive here, and the seasonal patterns that drive maintenance needs throughout the year.
              </p>
              <p>
                From commercial landscaping and grounds maintenance contracts to land clearing, grading, drainage, and full reconstruction, P1 gives Lancaster County property teams one contractor for the full life of their land.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Lancaster County, SC Land & Property Management FAQs</h2>
            <FaqAccordion items={FAQS} />
            <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
              Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your property.
            </p>
          </div>

        </div>
      </section>

      <aside className="site-shell pb-12 text-lg">
        <p>Explore <Link href="/services/commercial-landscaping" className="text-primary underline">commercial landscaping</Link>, review <Link href="/commercial-snow-ice-management" className="text-primary underline">commercial snow and ice management</Link>, compare <Link href="/services" className="text-primary underline">all land management services</Link>, or <Link href="/contact" className="text-primary underline">tell us about your property</Link>.</p>
      </aside>
      <FinalCTA />
    </Layout>
  );
}
