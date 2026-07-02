import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema } from "@/lib/structured-data";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { CheckCircle2 } from "lucide-react";
import heroImg from "@/assets/service-drainage.png";
import drainageFixImg from "@/assets/features/drainage-fix.png";

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
        subtitle="Standing water, soggy fields, erosion, and drainage failures cost landowners time, money, and turf. P1 designs and installs drainage systems that solve problems at the source — not just mask them."
        image={heroImg}
        imageAlt="Drainage swale in grassy field"
      />

      {/* CONTENT SECTIONS */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl space-y-16">
          
          <FeatureRow heading="Drainage Problems Get Worse. Fix Them Right the First Time." image={drainageFixImg} imageAlt="Drainage system being installed to move water off a property">
            <p>
              Poor drainage is one of the most common — and most costly — problems facing large property owners in the Carolinas. Heavy clay soils, compacted ground, improper grading, and flat topography create conditions where water sits, roots suffocate, structures erode, and maintenance costs multiply.
            </p>
            <p>
              P1 approaches drainage the way engineers do: we assess the whole system, identify where water enters and where it needs to go, design a solution that moves it efficiently, and install it with the right materials for your soil type and site conditions.
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
                "Retention and detention pond design and construction",
                "Catch basin and inlet installation",
                "Underground drainage pipe installation",
                "Agricultural drainage — tile drainage for fields and pastures",
                "Ditch clearing, shaping, and lining",
                "Regrading for drainage correction",
                "Erosion control and slope stabilization in drainage zones",
                "Stormwater compliance support for commercial properties"
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

        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
