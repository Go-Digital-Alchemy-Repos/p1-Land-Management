import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceAreaSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import heroImg from "@/assets/hero-charlotte-metro.png";
import { CheckCircle2 } from "lucide-react";

import { FaqAccordion } from "@/components/content/FaqAccordion";

const FAQS = [
  {
    question: "What areas around Concord does P1 serve?",
    answer:
      "P1 serves Concord and all of Cabarrus County — including Kannapolis, Harrisburg, Mount Pleasant, and Midland — as well as the surrounding rural acreage, for properties 1 acre and larger.",
  },
  {
    question: "Does P1 handle site preparation for commercial development in Concord?",
    answer:
      "Yes. P1 provides land clearing, fine grading, drainage installation, and full site preparation for Concord's growing commercial corridors, including the areas around Concord Mills and the I-85 corridor.",
  },
  {
    question: "Can P1 maintain agricultural and rural land in Cabarrus County?",
    answer:
      "Yes. P1 works with farm operators across Cabarrus County on pasture maintenance, land clearing, access-road grading, drainage correction, and pond management — the earthwork and upkeep that keep working land productive.",
  },
  {
    question: "What size properties does P1 work on in Concord?",
    answer:
      "P1 focuses on commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger, bringing equipment and expertise that small-scale landscaping companies can't match. P1 does not provide residential services.",
  },
];

export default function ConcordNC() {
  return (
    <Layout>
      <SEO 
        title="Land Management in Concord, NC | P1"
        description="Commercial landscaping, grounds maintenance, land clearing, grading & drainage for 1-acre-plus Concord and Cabarrus County sites. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Concord, North Carolina", areaType: "City", description: "Commercial landscaping, grounds maintenance, land clearing, grading, drainage, and turf services for qualifying Concord and Cabarrus County properties.", path: "/service-areas/concord-nc" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "Concord, NC", path: "/service-areas/concord-nc" },
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
              Concord, NC
            </em>
          </>
        }
        subtitle="P1 Land & Property Management leads with commercial landscaping and grounds maintenance for commercial, industrial, agricultural, municipal, and institutional properties throughout Concord and Cabarrus County. P1 also coordinates land clearing, grading, drainage, turf, tree, and pond services for qualifying sites at scale."
        image={heroImg}
        imageAlt="Land Clearing & Property Management in Concord, NC"
      />

      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">Concord NC Services</h2>
              <ul className="space-y-3">
                {[
                  "Commercial landscaping and grounds maintenance programs",
                  "Agricultural and rural land maintenance",
                  "Land clearing and site preparation for commercial development",
                  "Fine grading and drainage installation",
                  "Turf installation and seeding",
                  "Tree services",
                  "Pond and waterway management",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-secondary/80 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6 flex flex-col justify-center">
              <div className="prose prose-lg prose-p:text-secondary/80 max-w-none">
                <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
                  Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your property.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-10 border-y border-border py-12 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-secondary">Large-site work in Concord and Cabarrus County</h2>
              <p className="leading-relaxed text-secondary/80">Concord combines active commercial and industrial corridors with institutional grounds and working acreage outside the urban core. Each setting changes the practical sequence: busy sites may require phased access and careful coordination, while agricultural land may prioritize drainage, equipment routes, soil protection, and the next productive use.</p>
              <p className="leading-relaxed text-secondary/80">P1 evaluates the requested work in that site context. Clearing, grading, drainage, turf, tree, and recurring grounds needs can be considered together so one improvement does not create a problem for the next.</p>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-secondary">What to prepare for an assessment</h2>
              <p className="leading-relaxed text-secondary/80">Bring any available site plans, known utility information, drainage history, access restrictions, and target use for the property. P1 uses those details and the visible conditions to define the proposed scope, assumptions, exclusions, and schedule.</p>
              <p className="leading-relaxed text-secondary/80">Work that requires engineering, permitting, surveys, utility coordination, or another licensed specialty is identified during qualification rather than silently folded into a broad promise. That gives property teams a clearer basis for comparing estimates and planning mobilization.</p>
              <p className="leading-relaxed text-secondary/80">The assessment can also distinguish urgent corrective work from improvements that can be phased. A washed access route, active erosion, or blocked drainage path may need attention before finish grading, seeding, or recurring maintenance begins. For occupied Concord properties, that sequence can be coordinated around traffic, staff, tenants, or public access. The final written scope establishes what P1 will perform, how work areas will be accessed, and what the property team must complete before mobilization.</p>
              <p className="leading-relaxed text-secondary/80">Before the visit, mark priority areas and collect photos showing how conditions change after rain or during normal operations. That context helps connect a visible symptom to the surrounding site.</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Concord, NC Land & Property Management FAQs</h2>
            <FaqAccordion items={FAQS} />
          </div>
        </div>
      </section>

      <aside className="site-shell pb-12 text-lg">
        <p><Link href="/services" className="text-primary underline">Compare land management services</Link> or <Link href="/contact" className="text-primary underline">tell us about your property</Link> to discuss scope and availability.</p>
      </aside>
      <FinalCTA />
    </Layout>
  );
}
