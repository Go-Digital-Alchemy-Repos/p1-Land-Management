import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import heroImg from "@/assets/service-drainage.png";
import drainageFixImg from "@/assets/features/drainage-fix.png";

import { FaqAccordion } from "@/components/content/FaqAccordion";

const FAQS = [
  {
    question: "Why does my property have standing water after rain?",
    answer:
      "Water can collect because of clay soils, compacted ground, blocked drains, or the way the land slopes. We start by looking at where it enters, where it pools, and where it can go. Some sites also need an engineer's assessment.",
  },
  {
    question: "What drainage systems does P1 install?",
    answer:
      "We install and maintain French drains, swales, catch basins, drainage pipe, and farm drainage systems. We also handle grading and pond-related work. We'll explain any permits, engineering, or specialist help needed for your property.",
  },
  {
    question: "Can P1 fix drainage on farm fields and pastures?",
    answer:
      "Yes. We handle field drainage, perimeter ditches, and grading to help move water off working ground. We'll review the land, available outlets, and any approvals needed before recommending the work.",
  },
  {
    question: "Does P1 handle stormwater compliance for commercial properties?",
    answer:
      "We maintain and repair ponds, ditches, and other drainage features. Your property team and the appropriate professionals remain responsible for regulatory compliance and required inspections. We'll confirm the records and specialist work needed before starting.",
  },
];

export default function Drainage() {
  return (
    <Layout>
      <SEO 
        title="Large-Property Drainage Solutions in SC & NC | P1"
        description="Drainage assessments, French drains, swales, grading, and pond work for large properties in Upstate SC and Charlotte. Call (704) 221-8928."
        jsonLd={[
          serviceSchema({ name: "Drainage Solutions", description: "Custom drainage solutions for commercial, industrial, agricultural, municipal, and institutional properties. French drains, retention systems, swales, and more. Serving Upstate SC and Charlotte NC. Call (704) 221-8928.", path: "/services/drainage" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Services", path: "/services" },
            { name: "Drainage Solutions", path: "/services/drainage" },
          ]),
          faqSchema(FAQS),
        ]}
      />

      {/* PAGE HERO */}
      <PageHero
        indexOfWork
        eyebrow="Drainage Solutions"
        title={
          <>
            Drainage Solutions for{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Large Properties
            </em>{" "}
            — Greenville, Spartanburg & Charlotte
          </>
        }
        subtitle="Standing water, soggy fields, and washouts make property care harder. We look for the cause and plan drainage work around the way your land is used."
        image={heroImg}
        imageAlt="Drainage swale in grassy field"
      />

      {/* CONTENT SECTIONS */}
      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          
          <FeatureRow heading="Start With Where the Water Goes" image={drainageFixImg} imageAlt="Drainage system being installed to move water off a property">
            <p>
              Poor drainage is one of the most common — and most costly — problems facing large property owners in the Carolinas. Heavy clay soils, compacted ground, improper grading, and flat topography create conditions where water sits, roots suffocate, structures erode, and maintenance costs multiply.
            </p>
            <p>
              We'll trace where water enters, where it collects, and where it needs to drain. Then we'll explain the work we recommend and any engineering, permits, or specialist help needed before installation.
            </p>
          </FeatureRow>

          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">
              Drainage Services
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "French drain installation — perforated pipe and gravel systems to intercept and redirect subsurface water",
                "Surface drainage swales — graded channels to carry surface runoff away from structures and fields",
                "Retention and detention pond planning and construction",
                "Catch basin and inlet installation",
                "Underground drainage pipe installation",
                "Agricultural drainage — tile drainage for fields and pastures",
                "Ditch clearing, shaping, and lining",
                "Regrading for drainage correction",
                "Erosion control and slope stabilization in drainage zones",
                "Stormwater maintenance and service records"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 bg-muted p-4 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <span className="text-secondary/90 font-medium leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">
              Common Drainage Problems We Solve
            </h2>
            <ul className="space-y-4">
              {[
                "Standing water in fields, commercial grounds, or near structures after rain",
                "Soggy, compacted soil that won't grow healthy turf",
                "Erosion on slopes, embankments, or around ponds",
                "Flooded access roads or driveways",
                "Drainage ditches that are silted, blocked, or undersized",
                "Retention ponds overflowing or failing to drain properly",
                "Wet basements or foundations on large rural properties"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-lg text-secondary/80 font-medium">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6 bg-card border border-border p-8 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
            <h2 className="text-2xl font-serif font-bold text-secondary">
              Agricultural Drainage
            </h2>
            <p className="text-lg text-secondary/80 leading-relaxed">
              For farm and agricultural properties, drainage is directly tied to productivity. Saturated fields can't be worked, can't support healthy root systems, and lose topsoil to runoff. P1 installs agricultural drainage systems — including field tile drainage and perimeter ditching — that improve field trafficability and long-term productivity.
            </p>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Drainage FAQs</h2>
            <FaqAccordion items={FAQS} />
            <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
              Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your drainage problem.
            </p>
          </div>

        </div>
      </section>

      <section className="site-shell py-12"><h2 className="text-2xl font-bold">Drainage is one part of the campus exterior.</h2><p className="mt-4 text-muted-foreground">Plan drainage repairs alongside pond care, vegetation, and access around your facility.</p><Link href="/commercial/data-centers-secure-facilities" className="mt-5 inline-block font-bold text-primary underline">Explore secure facility exterior management</Link></section>
      <FinalCTA />
    </Layout>
  );
}
