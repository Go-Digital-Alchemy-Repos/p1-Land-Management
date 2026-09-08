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

const FAQS = [
  {
    question: "Why does my property have standing water after rain?",
    answer:
      "In the Carolinas, standing water can result from clay soils, compacted ground, flat topography or improper grading. A site review should identify where water enters, where it collects and which work belongs in the agreed scope; engineering or specialist analysis may also be needed.",
  },
  {
    question: "What drainage systems does P1 install?",
    answer:
      "Discuss French drains, surface swales, catch basins, underground pipe, pond work, agricultural drainage, erosion work and regrading with P1. The proposed work, approvals and any engineering or specialist responsibilities are confirmed for each property.",
  },
  {
    question: "Can P1 fix drainage on farm fields and pastures?",
    answer:
      "Saturated fields can be difficult to work and vulnerable to runoff. P1 can discuss field drainage, perimeter ditching and related grading work; confirm the site conditions, approvals and expected outcomes before work begins.",
  },
  {
    question: "Does P1 handle stormwater compliance for commercial properties?",
    answer:
      "P1 can discuss maintenance and exterior work around retention and detention ponds, ditches and drainage features. Regulatory compliance, inspections, documentation and any specialist responsibilities must be confirmed with the owner and appropriate professionals.",
  },
];

export default function Drainage() {
  return (
    <Layout>
      <SEO 
        title="Drainage Solutions for Large Properties | P1 Land & Property Management | Upstate SC & Charlotte NC"
        description="Custom drainage solutions for commercial, agricultural, and large residential properties. French drains, retention systems, swales, and more. Serving Upstate SC and Charlotte NC. Call (704) 221-8928."
        jsonLd={[
          serviceSchema({ name: "Drainage Solutions", description: "Custom drainage solutions for commercial, agricultural, and large residential properties. French drains, retention systems, swales, and more. Serving Upstate SC and Charlotte NC. Call (704) 221-8928.", path: "/services/drainage" }),
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
        subtitle="Standing water, soggy fields, erosion, and drainage failures cost landowners time, money, and turf. P1 reviews site conditions and discusses a drainage scope that addresses the source of the problem."
        image={heroImg}
        imageAlt="Drainage swale in grassy field"
      />

      {/* CONTENT SECTIONS */}
      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          
          <FeatureRow heading="Drainage Problems Get Worse. Fix Them Right the First Time." image={drainageFixImg} imageAlt="Drainage system being installed to move water off a property">
            <p>
              Poor drainage is one of the most common — and most costly — problems facing large property owners in the Carolinas. Heavy clay soils, compacted ground, improper grading, and flat topography create conditions where water sits, roots suffocate, structures erode, and maintenance costs multiply.
            </p>
            <p>
              P1 starts drainage work by reviewing the visible site conditions, where water enters and where it needs to go. The agreed scope identifies the work P1 will perform and any civil, engineering, permitting or specialist responsibilities that require separate confirmation.
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
                "Retention and detention pond planning and construction scope",
                "Catch basin and inlet installation",
                "Underground drainage pipe installation",
                "Agricultural drainage — tile drainage for fields and pastures",
                "Ditch clearing, shaping, and lining",
                "Regrading for drainage correction",
                "Erosion control and slope stabilization in drainage zones",
                "Stormwater-related maintenance and documentation coordination"
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
                "Standing water in fields, yards, or near structures after rain",
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
            <div className="space-y-6">
              {FAQS.map((f) => (
                <div key={f.question} className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-2">
                  <h3 className="text-lg font-serif font-bold text-secondary">{f.question}</h3>
                  <p className="text-secondary/80 leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
            <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
              Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your drainage problem.
            </p>
          </div>

        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
