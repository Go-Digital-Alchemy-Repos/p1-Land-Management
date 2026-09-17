import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceAreaSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import heroImg from "@/assets/hero-lake-norman.png";
import { CheckCircle2 } from "lucide-react";

import { FaqAccordion } from "@/components/content/FaqAccordion";

const FAQS = [
  {
    question: "What areas around Lake Norman does P1 serve?",
    answer:
      "P1 serves the entire Lake Norman region — Mooresville, Davidson, Cornelius, Huntersville, Troutman, Sherrills Ford, and Denver — for commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger.",
  },
  {
    question: "Can P1 help with shoreline erosion on Lake Norman properties?",
    answer:
      "Yes. P1 provides shoreline restoration, erosion control on steep lakeside slopes, drainage design for sloped terrain, and pond and waterway maintenance — the specialized work that waterfront properties around Lake Norman regularly need.",
  },
  {
    question: "Does P1 provide year-round commercial maintenance near Mooresville?",
    answer:
      "Yes. P1 offers ongoing maintenance programs covering turf, tree care, drainage, and pond management for commercial, industrial, municipal, and institutional properties around Lake Norman.",
  },
  {
    question: "What size properties does P1 work on near Lake Norman?",
    answer:
      "P1 focuses on commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger, bringing the equipment and expertise that sloped, lakeside land demands. P1 does not provide residential services.",
  },
];

export default function MooresvilleLakeNormanNC() {
  return (
    <Layout>
      <SEO 
        title="Land Management in Mooresville & Lake Norman | P1"
        description="Commercial landscaping, grounds maintenance, land clearing, drainage & pond care for large sites near Mooresville and Lake Norman. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Mooresville & Lake Norman, North Carolina", areaType: "City", description: "Commercial landscaping, grounds maintenance, land clearing, grading, drainage, turf, and pond services for Mooresville and Lake Norman properties.", path: "/service-areas/mooresville-lake-norman-nc" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "Mooresville & Lake Norman, NC", path: "/service-areas/mooresville-lake-norman-nc" },
          ]),
          faqSchema(FAQS),
        ]}
      />

      <PageHero
        eyebrow="Service Area · NC"
        title={
          <>
            Land & Property Management Near{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Mooresville & Lake Norman, NC
            </em>
          </>
        }
        subtitle="Commercial landscaping and grounds care around Mooresville and Lake Norman. We help maintain large properties, including clearing, grading, drainage, turf, trees, ponds, and shoreline work."
        image={heroImg}
        imageAlt="Land & Property Management Near Mooresville & Lake Norman, NC"
      />

      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">Mooresville & Lake Norman Services</h2>
              <ul className="space-y-3">
                {[
                  "Commercial landscaping and grounds maintenance",
                  "Commercial and institutional property maintenance programs",
                  "Land clearing and selective tree management",
                  "Grading and site preparation",
                  "Drainage planning and installation for sloped and waterfront ground",
                  "Large-acreage turf installation and seeding",
                  "Pond and waterway management — including shoreline restoration and water quality maintenance",
                  "Stormwater and erosion management"
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
                <p>
                  Waterfront grounds often need attention to slopes, shorelines, and runoff as well as turf. We look at the ground and water together when planning the work.
                </p>
                <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
                  Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your property.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-10 border-y border-border py-12 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-secondary">Plan for slopes, water, and occupied sites</h2>
              <p className="leading-relaxed text-secondary/80">Around Lake Norman, runoff can travel from a slope into a cove, pond, or neighboring area. Before clearing or grading, we check where that water goes and how the work may affect it.</p>
              <p className="leading-relaxed text-secondary/80">We'll walk access routes, look at grades and vegetation, and review the pond or shoreline areas you want to improve.</p>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-secondary">Clear boundaries for waterfront work</h2>
              <p className="leading-relaxed text-secondary/80">Shoreline and stormwater-adjacent work may involve property-specific restrictions, protected areas, engineered plans, permits, or other specialist responsibilities. Those requirements should be confirmed before vegetation removal, earthwork, stabilization, or access changes begin.</p>
              <p className="leading-relaxed text-secondary/80">Share available plans, known utilities, drainage history, and work-hour limits. We'll explain what's included in the estimate and schedule around your property's use.</p>
              <p className="leading-relaxed text-secondary/80">Some sites need drainage or bank repairs before finish grading and planting. We'll explain the order of work and identify outside approvals, so you can plan the budget and timing before the crew arrives.</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Mooresville & Lake Norman Land & Property Management FAQs</h2>
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
