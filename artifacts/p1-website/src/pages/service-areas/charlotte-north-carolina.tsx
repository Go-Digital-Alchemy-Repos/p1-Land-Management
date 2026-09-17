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
      "P1 serves large properties throughout Charlotte and Mecklenburg County, including commercial and industrial corridors near Uptown, University City, Pineville, Matthews, Huntersville, and the surrounding Charlotte metro.",
  },
  {
    question: "Does P1 handle both one-time projects and ongoing maintenance?",
    answer:
      "Yes. P1 covers the full life of a property — from commercial landscaping and grounds maintenance through land clearing, grading, drainage, and complete property reconstruction.",
  },
  {
    question: "Does P1 provide commercial landscaping in Charlotte?",
    answer:
      "Yes. We handle mowing, vegetation and tree care, drainage, and pond maintenance for large Charlotte properties. We'll agree a regular schedule and price larger repairs separately.",
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
        description="Commercial landscaping, grounds maintenance, land clearing, grading and drainage for Charlotte and Mecklenburg County sites. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Charlotte, North Carolina", areaType: "City", description: "Commercial landscaping, grounds maintenance, land clearing, grading, drainage, turf, tree, pond, and reconstruction services for Charlotte and Mecklenburg County properties.", path: "/service-areas/charlotte-north-carolina" }),
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
        subtitle="Commercial landscaping and grounds maintenance for large properties throughout Charlotte and Mecklenburg County. We also handle clearing, grading, drainage, turf, trees, ponds, and property restoration."
        image={heroImg}
        imageAlt="Charlotte, North Carolina skyline and surrounding commercial districts"
      />

      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          
          <FeatureRow heading="Commercial-Scale Property Management for Charlotte" image={charlotteImg} imageAlt="Large-acreage property development in the Charlotte NC region">
            <p>
              A Charlotte property can include landscaped entrances, loading areas, stormwater ponds, and undeveloped ground. We help you look after each area without losing sight of how the whole site works.
            </p>
            <p>
              We serve commercial, industrial, municipal, and institutional properties 1 acre and larger, with crews and equipment suited to the work.
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
                  "Drainage planning, installation, and repairs",
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
                A wet lawn may point to a blocked drain. An eroding slope may affect a pond below it. We look at those connections before recommending repairs, so today's work supports the property's longer-term care.
              </p>
              <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
                Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your property.
              </p>
            </div>
          </div>

          <div className="grid gap-10 border-y border-border py-12 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-secondary">Built around Charlotte operations</h2>
              <p className="leading-relaxed text-secondary/80">We work on active campuses, development tracts, retention areas, and access roads across Charlotte. Tell us which areas need attention and how the crew will need to work around your operations.</p>
              <p className="leading-relaxed text-secondary/80">A site visit gives us a chance to review the immediate problem, nearby drainage and access, and the maintenance you'll need afterward.</p>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-secondary">Plan Around Your Property</h2>
              <p className="leading-relaxed text-secondary/80">We'll check access, visible water movement, and the surrounding land before proposing work. If engineering, permits, surveys, or other specialist help is needed, we'll explain that before scheduling.</p>
              <p className="leading-relaxed text-secondary/80">Share any site plans, known utilities, drainage history, and preferred work hours. Those details help us put together a useful estimate.</p>
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
        <p><Link href="/services" className="text-primary underline">Compare land management services</Link>, review <Link href="/services/commercial-snow-ice-management" className="text-primary underline">commercial snow and ice management</Link>, or <Link href="/contact" className="text-primary underline">tell us about your property</Link>.</p>
      </aside>
      <FinalCTA />
    </Layout>
  );
}
