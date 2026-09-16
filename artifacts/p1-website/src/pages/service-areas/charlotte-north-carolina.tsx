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
    question: "What areas around Charlotte does P1 serve?",
    answer:
      "P1 serves qualifying properties throughout Charlotte and Mecklenburg County, including commercial and industrial corridors near Uptown, University City, Pineville, Matthews, Huntersville, and the surrounding Charlotte metro.",
  },
  {
    question: "Does P1 handle both one-time projects and ongoing maintenance?",
    answer:
      "Yes. P1 covers the full life of a property — from commercial landscaping and grounds maintenance through land clearing, grading, drainage, and complete property reconstruction.",
  },
  {
    question: "Does P1 provide commercial landscaping in Charlotte?",
    answer:
      "Yes. Commercial landscaping and grounds maintenance are core P1 services for qualifying Charlotte properties. Programs can include turf and vegetation care, tree services, drainage and pond attention, seasonal planning, and corrective exterior work under a defined scope.",
  },
  {
    question: "What size properties does P1 work on in Charlotte?",
    answer:
      "P1 focuses on commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger, which lets us bring the right equipment and expertise to large-scale jobs. P1 does not provide residential services.",
  },
];

export default function CharlotteNorthCarolina() {
  return (
    <Layout>
      <SEO 
        title="Land Management in Charlotte, NC | P1"
        description="Commercial landscaping, grounds maintenance, land clearing, grading and drainage for qualifying Charlotte and Mecklenburg County sites. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Charlotte, North Carolina", areaType: "City", description: "Commercial landscaping, grounds maintenance, land clearing, grading, drainage, turf, tree, pond, and reconstruction services for qualifying Charlotte and Mecklenburg County properties.", path: "/service-areas/charlotte-north-carolina" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "Charlotte, NC", path: "/service-areas/charlotte-north-carolina" },
          ]),
          faqSchema(FAQS),
        ]}
      />

      <PageHero
        eyebrow="Service Area · NC"
        title={
          <>
            Land & Property Management in{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Charlotte, NC
            </em>
          </>
        }
        subtitle="P1 provides commercial landscaping and grounds maintenance for commercial, industrial, municipal, and institutional properties throughout Charlotte and Mecklenburg County. Connected services include land clearing, grading, drainage, turf, tree, pond, and property reconstruction for qualifying sites 1 acre and larger."
        image={heroImg}
        imageAlt="Charlotte, North Carolina skyline and surrounding commercial districts"
      />

      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          
          <FeatureRow heading="Commercial-Scale Property Management for Charlotte" image={charlotteImg} imageAlt="Large-acreage property development in the Charlotte NC region">
            <p>
              Charlotte properties often combine visible landscaping, active operations, stormwater infrastructure, access routes, and undeveloped acreage within one site. P1 helps owners and facility teams coordinate those connected exterior needs under a clearly defined scope.
            </p>
            <p>
              From commercial campuses and industrial facilities to municipal and institutional grounds, P1 brings the crews, equipment, and planning needed for qualifying non-residential properties throughout Charlotte and Mecklenburg County.
            </p>
          </FeatureRow>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-secondary">Services Available in Charlotte</h2>
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
              <h2 className="text-2xl font-serif font-bold text-secondary">Charlotte and Nearby Communities</h2>
              <ul className="space-y-3">
                {[
                  "Charlotte and Mecklenburg County",
                  "Pineville and Matthews",
                  "Huntersville, Cornelius, and Davidson",
                  "Concord and Cabarrus County",
                  "Gastonia and Gaston County",
                  "Mooresville and Lake Norman",
                  "Monroe and Union County",
                  "Surrounding communities in the Charlotte metro"
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
              Connected Care for Active Charlotte Properties
            </h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none">
              <p>
                Charlotte commercial and institutional properties rarely have a single exterior need. Routine grounds care may connect to drainage trouble, aging vegetation, pond maintenance, erosion, access improvements, or a larger site reconstruction project. P1 evaluates those relationships so immediate work and longer-term maintenance can be sequenced without creating avoidable rework.
              </p>
              <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
                Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your property.
              </p>
            </div>
          </div>

          <div className="grid gap-10 border-y border-border py-12 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-secondary">Built around Charlotte operations</h2>
              <p className="leading-relaxed text-secondary/80">Within Charlotte, P1 focuses on qualifying commercial, industrial, municipal, and institutional properties where acreage, operating complexity, or connected exterior needs call for more than a small landscape crew. The scope may involve an active campus, development tract, retention area, access route, or a combination of land preparation and recurring care.</p>
              <p className="leading-relaxed text-secondary/80">One assessment can account for the immediate work area, connected drainage and access conditions, and the recurring care the property may need after corrective work is complete.</p>
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
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Charlotte, NC Land & Property Management FAQs</h2>
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
