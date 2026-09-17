import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceAreaSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import heroImg from "@/assets/hero-upstate-cities.png";
import { CheckCircle2 } from "lucide-react";

import { FaqAccordion } from "@/components/content/FaqAccordion";

const FAQS = [
  {
    question: "What areas around Anderson does P1 serve?",
    answer:
      "P1 serves Anderson and all of Anderson County — including Belton, Williamston, Pendleton, Powdersville, and the surrounding rural communities — for properties 1 acre and larger.",
  },
  {
    question: "Does P1 maintain farms and pasture in Anderson County?",
    answer:
      "Yes. Anderson County's strong agricultural heritage is a natural fit for P1's services — pasture maintenance and reseeding, land clearing, access-road grading, drainage correction, and pond construction and management for working farms and cattle operations.",
  },
  {
    question: "Can P1 work on properties near Lake Hartwell?",
    answer:
      "Yes. P1 handles land clearing, selective tree management, drainage on sloped terrain, and shoreline and pond maintenance for the large rural and waterfront properties around Lake Hartwell and the western side of Anderson County.",
  },
  {
    question: "What size properties does P1 work on in Anderson?",
    answer:
      "We serve commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger. We do not provide residential services.",
  },
];

export default function AndersonSC() {
  return (
    <Layout>
      <SEO 
        title="Land Management in Anderson, SC | P1"
        description="Commercial landscaping, grounds maintenance, land clearing, grading & drainage for 1-acre-plus Anderson, SC sites. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Anderson, South Carolina", areaType: "City", description: "Commercial landscaping, grounds maintenance, agricultural land care, land clearing, grading, drainage, and pond services for Anderson, SC properties.", path: "/service-areas/anderson-sc" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "Anderson, SC", path: "/service-areas/anderson-sc" },
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
              Anderson, SC
            </em>
          </>
        }
        subtitle="Commercial landscaping, grounds maintenance, and land care throughout Anderson County. We help you look after established grounds, prepare new sites, and keep farm roads, drainage, and ponds in working order."
        image={heroImg}
        imageAlt="Land Clearing & Property Management in Anderson, SC"
      />

      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">Anderson SC Services</h2>
              <ul className="space-y-3">
                {[
                  "Commercial landscaping and grounds maintenance",
                  "Agricultural land and pasture maintenance",
                  "Land clearing and forestry mulching",
                  "Grading for fields, access roads, and construction pads",
                  "Drainage and waterway management",
                  "Turf and pasture establishment",
                  "Pond management and pond construction",
                  "Property reconstruction"
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
              <h2 className="text-2xl font-serif font-bold text-secondary">Planning work around Anderson County terrain</h2>
              <p className="leading-relaxed text-secondary/80">A busy property near I-85 needs a different plan from a farm near Belton, Pendleton, or Lake Hartwell. We'll look at truck access, slopes, utilities, and where water goes before planning the work.</p>
              <p className="leading-relaxed text-secondary/80">We'll walk the site and talk through what you want to change. Your estimate will explain the work, access needs, and anything that needs separate engineering, permits, or specialist help.</p>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-secondary">From working land to managed sites</h2>
              <p className="leading-relaxed text-secondary/80">On farms, we plan around animals, field work, and equipment routes. On commercial and public grounds, we consider visitors, deliveries, mowing times, and the way you want the property to look.</p>
              <p className="leading-relaxed text-secondary/80">Photos, site plans, and notes about drainage or access problems help us prepare for the visit. Tell us how you use the property and what you'd like to do next.</p>
              <p className="leading-relaxed text-secondary/80">We'll help you decide what to tackle first. A washed-out access road or blocked ditch may need attention before seeding or regular mowing begins. Breaking the work into sensible stages gives you a clearer picture of costs and timing.</p>
              <p className="leading-relaxed text-secondary/80">Photos of problem areas and notes about when water, access, or vegetation issues appear can make the first conversation more useful and help the site visit focus on the right locations.</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Anderson, SC Land & Property Management FAQs</h2>
            <FaqAccordion items={FAQS} />
          </div>
        </div>
      </section>

      <aside className="site-shell pb-12 text-lg">
        <p><Link href="/services" className="text-primary underline">Compare land management services</Link> or <Link href="/contact" className="text-primary underline">tell us about your property</Link> to talk through the work and available dates.</p>
      </aside>
      <FinalCTA />
    </Layout>
  );
}
