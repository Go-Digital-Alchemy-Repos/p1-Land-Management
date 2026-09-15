import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceAreaSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import { FeatureRow } from "@/components/layout/FeatureRow";
import heroImg from "@/assets/hero-charlotte-region.png";
import charlotteImg from "@/assets/features/charlotte-region.png";
import unionCountyImg from "@/assets/features/union-county-agriculture.png";
import { CheckCircle2, ArrowRight } from "lucide-react";

import { FaqAccordion } from "@/components/content/FaqAccordion";

const FAQS = [
  {
    question: "Which communities in the Charlotte region does P1 serve?",
    answer:
      "P1 serves the entire Charlotte metro — Charlotte and Mecklenburg County, Concord and Cabarrus County, Mooresville and Lake Norman, Gastonia and Gaston County, Monroe and Union County, plus Huntersville, Cornelius, Davidson, Matthews, Waxhaw, Kannapolis, and the surrounding communities.",
  },
  {
    question: "Does P1 handle both one-time projects and ongoing maintenance?",
    answer:
      "Yes. P1 covers the full life of a property — from commercial landscaping and grounds maintenance through land clearing, grading, drainage, and complete property reconstruction.",
  },
  {
    question: "Can P1 manage waterfront properties on Lake Norman?",
    answer:
      "Yes. P1 provides shoreline maintenance, pond and waterway care, drainage management on sloped terrain, and turf establishment for the large waterfront and rural properties concentrated around Lake Norman.",
  },
  {
    question: "What size properties does P1 work on in the Charlotte region?",
    answer:
      "P1 focuses on commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger, which lets us bring the right equipment and expertise to large-scale jobs. P1 does not provide residential services.",
  },
];

export default function CharlotteRegionNC() {
  return (
    <Layout>
      <SEO 
        title="Land Management in the Charlotte, NC Region | P1"
        description="Commercial landscaping, grounds maintenance, land clearing, grading & drainage for qualifying sites in greater Charlotte. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Charlotte Region, North Carolina", areaType: "AdministrativeArea", description: "Commercial landscaping, grounds maintenance, land clearing, grading, drainage, turf, tree, pond, and reconstruction services for qualifying properties in greater Charlotte.", path: "/service-areas/charlotte-north-carolina" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "Charlotte, NC Region", path: "/service-areas/charlotte-north-carolina" },
          ]),
          faqSchema(FAQS),
        ]}
      />

      <PageHero
        eyebrow="Service Area · NC"
        title={
          <>
            Land & Property Management in the{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Charlotte, NC Region
            </em>
          </>
        }
        subtitle="P1 provides commercial landscaping and grounds maintenance for commercial, industrial, agricultural, municipal, and institutional properties throughout the Charlotte metro. Connected services include land clearing, grading, drainage, turf, tree, pond, and complete property reconstruction for qualifying sites."
        image={heroImg}
        imageAlt="Land & Property Management in the Charlotte, NC Region"
      />

      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          
          <FeatureRow heading="Serving the Charlotte Region's Growing Demand for Large-Acreage Property Management" image={charlotteImg} imageAlt="Large-acreage property development in the Charlotte NC region">
            <p>
              The Charlotte, NC region is one of the most rapidly developing markets in the country — and that growth is pushing commercial developers, industrial facilities, agricultural operations, municipalities, and institutions to find contractors who can manage land at the scale and standard these properties require. P1 Land & Property Management is that contractor.
            </p>
            <p>
              From the Mecklenburg County commercial core and Lake Norman business campuses to the working farms of Cabarrus County and the agricultural acreage of Union and Gaston Counties, P1 brings full-service land management to qualifying non-residential properties that require commercial-scale crews and equipment.
            </p>
          </FeatureRow>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-secondary">Services Available Throughout the Charlotte Region</h2>
              <ul className="space-y-3">
                {[
                  "Commercial landscaping and exterior grounds maintenance contracts",
                  "Industrial and agricultural land maintenance",
                  "Land clearing and forestry mulching",
                  "Fine grading and site preparation",
                  "Drainage planning and scoped installation work",
                  "Turf installation — sod and large-acreage seeding",
                  "Tree services — trimming, removal, and selective clearing",
                  "Pond and waterway management",
                  "Full property reconstruction"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-secondary/80 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-secondary">Communities We Serve in the Charlotte Region</h2>
              <ul className="space-y-3">
                {[
                  "Charlotte and Mecklenburg County",
                  "Concord and Cabarrus County",
                  "Mooresville and Lake Norman",
                  "Gastonia and Gaston County",
                  "Huntersville, Cornelius, and Davidson",
                  "Matthews and Waxhaw",
                  "Kannapolis and Harrisburg",
                  "Monroe and Union County",
                  "Belmont and Mount Holly",
                  "Surrounding communities in the greater Charlotte area"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-secondary/80 font-medium">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-muted p-8 rounded-xl border border-border shadow-sm space-y-4">
            <h2 className="text-2xl font-serif font-bold text-secondary">
              Lake Norman and Waterfront Properties
            </h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none">
              <p>
                Lake Norman and the surrounding area have a high concentration of large-acreage waterfront and rural properties that require specialized management — shoreline maintenance, pond and waterway care, drainage management on sloped terrain, and turf establishment on challenging sites. P1's pond and waterway management program, combined with our drainage and grading expertise, makes us a natural fit for this market.
              </p>
              <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
                Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your property.
              </p>
            </div>
          </div>

          <div className="grid gap-10 border-y border-border py-12 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-secondary">Charlotte and Mecklenburg County</h2>
              <p className="leading-relaxed text-secondary/80">Within Charlotte, P1 focuses on qualifying commercial, industrial, municipal, and institutional properties where acreage, operating complexity, or connected exterior needs call for more than a small landscape crew. The scope may involve an active campus, development tract, retention area, access route, or a combination of land preparation and recurring care.</p>
              <p className="leading-relaxed text-secondary/80">Charlotte operators can use this regional overview to compare available services and follow the more specific county and community links below. One assessment can account for both the immediate work area and connected site needs.</p>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-secondary">A regional scope with local constraints</h2>
              <p className="leading-relaxed text-secondary/80">Across the metro, project planning changes with site access, active operations, visible water movement, surrounding uses, and the property’s next purpose. P1 reviews those conditions before proposing work and flags engineering, permitting, utility, survey, or specialist responsibilities where they may apply.</p>
              <p className="leading-relaxed text-secondary/80">Share plans, known utilities, drainage history, access windows, and target timing when requesting an assessment. The more complete the operating context, the more clearly the estimate can define work areas, assumptions, exclusions, and coordination.</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">County Spotlight</h2>
            <Link
              href="/service-areas/union-county-nc"
              className="bg-card border border-card-border rounded-xl shadow-lg overflow-hidden flex flex-col md:flex-row group hover-elevate"
              data-testid="link-union-county-card"
            >
              <div className="md:w-2/5 aspect-[16/9] md:aspect-auto overflow-hidden">
                <img
                  src={unionCountyImg}
                  alt="Working pasture and fencing on agricultural land in Union County, NC"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-8 flex-1 flex flex-col">
                <p className="text-primary font-bold uppercase tracking-wider text-xs mb-2">Charlotte Region · NC</p>
                <h3 className="text-2xl font-serif font-bold text-secondary mb-3">Union County, NC</h3>
                <p className="text-secondary/80 leading-relaxed mb-6 flex-1">
                  Working farms, agricultural land, and fast-growing development from Monroe and Indian Trail to Waxhaw, Marvin, and Weddington — see how P1 serves Union County's large properties.
                </p>
                <span className="flex items-center gap-2 text-primary font-bold">
                  Explore Union County <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Charlotte, NC Region Land & Property Management FAQs</h2>
            <FaqAccordion items={FAQS} />
          </div>

        </div>
      </section>

      <aside className="site-shell pb-12 text-lg">
        <p><Link href="/services" className="text-primary underline">Compare land management services</Link>, review <Link href="/commercial-snow-ice-management" className="text-primary underline">commercial snow and ice management</Link>, or <Link href="/contact" className="text-primary underline">tell us about your property</Link>.</p>
      </aside>
      <FinalCTA />
    </Layout>
  );
}
