import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceAreaSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import heroImg from "@/assets/hero-lake-norman.png";
import { CheckCircle2 } from "lucide-react";

const FAQS = [
  {
    question: "What areas around Lake Norman does P1 serve?",
    answer:
      "P1 serves the entire Lake Norman region — Mooresville, Davidson, Cornelius, Huntersville, Troutman, Sherrills Ford, and Denver — including waterfront estates, rural acreage, and commercial properties 1 acre and larger.",
  },
  {
    question: "Can P1 help with shoreline erosion on Lake Norman properties?",
    answer:
      "Yes. P1 provides shoreline restoration, erosion control on steep lakeside slopes, drainage design for sloped terrain, and pond and waterway maintenance — the specialized work that waterfront properties around Lake Norman regularly need.",
  },
  {
    question: "Does P1 maintain large estates near Mooresville year-round?",
    answer:
      "Yes. P1 offers ongoing estate and rural property maintenance programs covering turf, tree care, drainage, and pond management, so large Lake Norman properties stay in top condition through every season.",
  },
  {
    question: "What size properties does P1 work on near Lake Norman?",
    answer:
      "P1 focuses on properties 1 acre and larger — waterfront estates, rural acreage, and commercial sites — bringing the equipment and expertise that sloped, lakeside land demands.",
  },
];

export default function MooresvilleLakeNormanNC() {
  return (
    <Layout>
      <SEO 
        title="Land & Property Management Mooresville & Lake Norman NC | P1 Land & Property Management"
        description="Full-service land clearing, drainage, pond management, and property maintenance for large properties near Mooresville and Lake Norman, NC. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Mooresville & Lake Norman, North Carolina", areaType: "City", description: "Full-service land clearing, drainage, pond management, and property maintenance for large properties near Mooresville and Lake Norman, NC. Call (704) 221-8928.", path: "/service-areas/mooresville-lake-norman-nc" }),
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
        subtitle="P1 Land & Property Management serves the large waterfront estates, rural acreage, and commercial properties of the Mooresville and Lake Norman area. This region's concentration of high-value lakefront and rural properties — combined with the drainage and terrain challenges of sloped, lakeside land — makes it an ideal market for P1's specialized services."
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
                  "Pond and waterway management — including shoreline restoration and water quality maintenance",
                  "Drainage design and installation for sloped and waterfront terrain",
                  "Land clearing and selective tree management",
                  "Grading and site preparation",
                  "Large-acreage turf installation and seeding",
                  "Commercial property maintenance",
                  "Estate and rural property maintenance programs",
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
                  Lake Norman waterfront properties often face unique land management challenges: erosion on steep slopes, pond and shoreline maintenance, drainage across varied terrain, and turf establishment on challenging soils. P1's combined expertise in earthwork, drainage, and land maintenance makes us the right choice for these demanding sites.
                </p>
                <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
                  Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your property.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Mooresville & Lake Norman Land & Property Management FAQs</h2>
            <div className="space-y-6">
              {FAQS.map((f) => (
                <div key={f.question} className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-2">
                  <h3 className="text-lg font-serif font-bold text-secondary">{f.question}</h3>
                  <p className="text-secondary/80 leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
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
