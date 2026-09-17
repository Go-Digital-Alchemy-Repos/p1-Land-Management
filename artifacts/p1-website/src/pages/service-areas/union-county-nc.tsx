import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceAreaSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import { FeatureRow } from "@/components/layout/FeatureRow";
import heroImg from "@/assets/hero-union-county.png";
import featureImg from "@/assets/features/union-county-agriculture.png";
import { CheckCircle2 } from "lucide-react";

import { FaqAccordion } from "@/components/content/FaqAccordion";

const FAQS = [
  {
    question: "What areas of Union County does P1 serve?",
    answer:
      "P1 serves the entire county — Monroe, Indian Trail, Stallings, Waxhaw, Marvin, Weddington, Wesley Chapel, Mineral Springs, Wingate, Unionville, Fairview, Marshville, and the surrounding rural areas — for properties 1 acre and larger.",
  },
  {
    question: "Does P1 handle land clearing for new construction in Union County?",
    answer:
      "Yes. P1 provides land clearing, forestry mulching, fine grading, and site preparation for commercial, industrial, municipal, and institutional development throughout Union County, including drainage and erosion control to get sites build-ready.",
  },
  {
    question: "Can P1 maintain working farms and agricultural properties?",
    answer:
      "Yes. P1 offers pasture management, field reseeding, drainage correction, access-road grading, selective clearing, and pond maintenance for working farms and agricultural properties across Union County.",
  },
  {
    question: "What size properties does P1 work on?",
    answer:
      "P1 focuses on commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger, which lets us bring the right equipment and expertise to large-scale jobs. P1 does not provide residential services.",
  },
];

export default function UnionCountyNC() {
  return (
    <Layout>
      <SEO
        title="Land Management in Union County, NC | P1"
        description="Commercial landscaping, grounds maintenance, land clearing, grading & drainage for qualifying Union County, NC sites. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({
            areaName: "Union County, North Carolina",
            areaType: "AdministrativeArea",
            description:
              "Commercial landscaping, grounds maintenance, agricultural land care, land clearing, grading, drainage, turf, and pond services for qualifying properties across Union County, NC.",
            path: "/service-areas/union-county-nc",
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "Union County, NC", path: "/service-areas/union-county-nc" },
          ]),
          faqSchema(FAQS),
        ]}
      />

      <PageHero
        eyebrow="Service Area · NC"
        title={
          <>
            Land Clearing & Property Management in{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Union County, NC
            </em>
          </>
        }
        subtitle="P1 Land & Property Management provides commercial landscaping and grounds maintenance for commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger throughout Union County, from Monroe and Indian Trail to Waxhaw and Weddington. Connected services extend through agricultural land care, clearing, grading, drainage, and complete reconstruction."
        image={heroImg}
        imageAlt="Land Clearing & Property Management in Union County, NC"
      />

      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">

          <FeatureRow heading="Your Union County Property Partner" image={featureImg} imageAlt="Large-acreage property management in Union County, NC">
            <p>
              Union County is one of the fastest-growing counties in North Carolina. Growth is reshaping the land through new commercial corridors, industrial sites, public facilities, and institutional campuses around Indian Trail, Stallings, and Monroe, while the county's western and southern reaches remain defined by working farms, pasture, and rural acreage.
            </p>
            <p>
              That combination is exactly what P1 Land & Property Management is built for. Whether you manage a commercial site in Monroe, a developing tract in Indian Trail, or working agricultural acreage in Unionville, P1 delivers the equipment, expertise, and reliability that large Union County properties demand.
            </p>
          </FeatureRow>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-secondary">Land & Property Management Services Throughout Union County</h2>
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
              <h2 className="text-2xl font-serif font-bold text-secondary">Communities We Serve in Union County</h2>
              <p className="text-secondary/80">
                P1 provides commercial landscaping, grounds maintenance, land clearing, grading, drainage, turf, and property management services throughout Union County, NC, including:
              </p>
              <ul className="space-y-3">
                {[
                  <span key="Monroe"><Link className="underline hover:text-primary" href="/service-areas/monroe-nc">Monroe</Link> — the county seat and commercial hub</span>,
                  <span key="Indian Trail"><Link className="underline hover:text-primary" href="/service-areas/indian-trail-nc">Indian Trail</Link> and Stallings</span>,
                  <span key="Waxhaw"><Link className="underline hover:text-primary" href="/service-areas/waxhaw-nc">Waxhaw</Link> and Marvin</span>,
                  "Weddington and Wesley Chapel",
                  "Mineral Springs and Wingate",
                  "Unionville, Fairview, and Hemby Bridge",
                  "Marshville, Lake Park, and New Salem",
                  "Surrounding rural and unincorporated areas of Union County",
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
            <h2 className="text-2xl font-serif font-bold text-secondary">Agricultural Property Management in Union County</h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-4">
              <p>
                Agriculture remains an important part of Union County's economy, especially around Waxhaw, Marvin, Weddington, Mineral Springs, and the county's rural communities. Working farms and large agricultural properties need commercial-scale care, including pasture management and reseeding, drainage across large tracts, access-road grading, selective clearing along fence lines, and pond maintenance for livestock and irrigation.
              </p>
              <p>
                Agriculture also remains a genuine part of Union County's economy, from row crops like soybeans, grains, and cotton to poultry, cattle, and hay operations. P1 works with farm and ranch owners on pasture renovation, land clearing, access-road grading, drainage correction, and pond construction — the earthwork and ongoing maintenance that keep working land productive. Our combined expertise in earthmoving and land maintenance makes us a natural fit for Union County's agricultural landowners.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-serif font-bold text-secondary">Commercial & Development Site Work in Union County</h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-4">
              <p>
                The growth spreading south and east out of Charlotte has made Union County one of the most active development markets in the region, with Indian Trail, Monroe, and Waxhaw each managing significant new commercial, industrial, municipal, and institutional construction. P1 supports that growth with land clearing, forestry mulching, fine grading, site preparation, stormwater and drainage installation, and turf establishment — handling large, complex sites that require the scale of equipment and crew most contractors can't bring.
              </p>
              <p>
                For commercial property managers, developers, industrial facilities, municipalities, and institutions, P1 also offers ongoing grounds maintenance programs that keep sites presentable and compliant year-round, long after the initial site work is complete.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-serif font-bold text-secondary">Why Union County Property Teams Choose P1</h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-4">
              <p>
                We're not a regional franchise or a national chain applying a one-size-fits-all approach to your property. P1 is built for the Carolinas — we understand the red clay soils of the Union County Piedmont, the drainage challenges of the area's rolling terrain and creek-fed bottomland, the grass and pasture species that thrive here, and the seasonal patterns that drive maintenance needs throughout the year.
              </p>
              <p>
                From commercial landscaping and grounds maintenance contracts to land clearing, grading, drainage, and full reconstruction, P1 gives Union County property teams one contractor for the full life of their land.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Union County, NC Land & Property Management FAQs</h2>
            <FaqAccordion items={FAQS} />
            <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
              Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your property.
            </p>
          </div>

        </div>
      </section>

      <aside className="site-shell pb-12 text-lg">
        <p>Explore <Link href="/services/commercial-landscaping" className="text-primary underline">commercial landscaping</Link>, review <Link href="/services/commercial-snow-ice-management" className="text-primary underline">commercial snow and ice management</Link>, compare <Link href="/services" className="text-primary underline">all land management services</Link>, or <Link href="/contact" className="text-primary underline">tell us about your property</Link>.</p>
      </aside>
      <FinalCTA />
    </Layout>
  );
}
