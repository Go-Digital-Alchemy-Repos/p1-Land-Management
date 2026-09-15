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
    question: "What areas around Gastonia does P1 serve?",
    answer:
      "P1 serves Gastonia and all of Gaston County — including Belmont, Mount Holly, Cramerton, Dallas, Bessemer City, Stanley, and Cherryville — for properties 1 acre and larger.",
  },
  {
    question: "Does P1 handle industrial site vegetation management in Gaston County?",
    answer:
      "Yes. P1 provides land clearing, vegetation management, and ongoing grounds maintenance for industrial facilities and manufacturing sites throughout Gaston County, keeping large properties safe, accessible, and compliant.",
  },
  {
    question: "Can P1 fix drainage problems on Gastonia properties?",
    answer:
      "Gaston County's red clay soils and rolling terrain can create drainage and erosion challenges. P1 reviews visible site conditions and discusses a scope for French drains, stormwater-related work or erosion control, with engineering, permitting and specialist responsibilities confirmed separately where needed.",
  },
  {
    question: "What size properties does P1 work on in Gastonia?",
    answer:
      "P1 focuses on commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger, bringing heavy equipment and experienced crews that small-scale landscapers can't provide. P1 does not provide residential services.",
  },
];

export default function GastoniaNC() {
  return (
    <Layout>
      <SEO 
        title="Land Management in Gastonia, NC | P1"
        description="Land clearing, grading, drainage, turf, and property management for qualifying 1-acre-plus sites in Gastonia and Gaston County. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Gastonia, North Carolina", areaType: "City", description: "Professional land clearing, grading, drainage, and property management in Gastonia, NC. Properties 1 acre and larger. Call (704) 221-8928.", path: "/service-areas/gastonia-nc" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "Gastonia, NC", path: "/service-areas/gastonia-nc" },
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
              Gastonia, NC
            </em>
          </>
        }
        subtitle="P1 Land & Property Management provides comprehensive land and property services for commercial, industrial, and agricultural properties throughout Gastonia, NC and Gaston County. Gaston County's mix of industrial properties, agricultural land, and growing commercial development creates consistent demand for professional large-acreage property management — and P1 delivers the full range of services to meet it."
        image={heroImg}
        imageAlt="Land Clearing & Property Management in Gastonia, NC"
      />

      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">Gastonia NC Services</h2>
              <ul className="space-y-3">
                {[
                  "Industrial site land clearing and vegetation management",
                  "Commercial property maintenance programs",
                  "Agricultural and rural land maintenance",
                  "Land clearing, grading, and drainage installation",
                  "Turf installation and seeding",
                  "Tree services",
                  "Pond and waterway management"
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
              <h2 className="text-2xl font-serif font-bold text-secondary">Property work shaped by Gaston County ground</h2>
              <p className="leading-relaxed text-secondary/80">Rolling terrain and clay-heavy soils make water movement and access central to many Gastonia-area scopes. A clearing project can expose grades that need stabilization; a turf project can fail if surface drainage and soil preparation are not addressed first; recurring maintenance must account for the way the site is actually used.</p>
              <p className="leading-relaxed text-secondary/80">P1 reviews these connected conditions before defining the work. The goal is a clear sequence built around the property’s intended use, not a menu of isolated services.</p>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-secondary">Commercial corridors and working acreage</h2>
              <p className="leading-relaxed text-secondary/80">Industrial and commercial sites near Gastonia’s primary transportation corridors often need work phased around vehicles, employees, tenants, and operating hours. Agricultural, municipal, and institutional properties elsewhere in Gaston County may instead prioritize durable access, vegetation control, pond edges, field drainage, or manageable maintenance cycles.</p>
              <p className="leading-relaxed text-secondary/80">Share site plans, known utilities, problem areas, access windows, and the desired result during qualification. P1 can then identify scope boundaries and flag any permitting, engineering, or specialist coordination needed before mobilization.</p>
              <p className="leading-relaxed text-secondary/80">A site review can separate stabilization or access work that should happen first from finish work and recurring care that follows. That sequencing is especially useful where runoff, exposed soil, vehicle movement, and vegetation management affect the same area. For each Gaston County property, the written estimate records the proposed work and assumptions rather than relying on generic service-page language. Owners and facility teams can use that document to compare options, coordinate internal responsibilities, and plan around active operations.</p>
              <p className="leading-relaxed text-secondary/80">Recent photos after rainfall, notes about recurring washouts, and a map of priority work areas can help P1 focus the assessment and distinguish isolated maintenance from a broader site issue.</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Gastonia, NC Land & Property Management FAQs</h2>
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
