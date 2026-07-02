import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceAreaSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import heroImg from "@/assets/hero-upstate-cities.png";
import { CheckCircle2 } from "lucide-react";

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
      "P1 focuses on properties 1 acre and larger — agricultural, commercial, and large residential — bringing the equipment and expertise that standard landscaping companies can't provide.",
  },
];

export default function AndersonSC() {
  return (
    <Layout>
      <SEO 
        title="Land Clearing & Property Management Anderson SC | P1 Land & Property Management"
        description="Professional land clearing, grading, drainage, and agricultural property management in Anderson, SC. Properties 1 acre and larger. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Anderson, South Carolina", areaType: "City", description: "Professional land clearing, grading, drainage, and agricultural property management in Anderson, SC. Properties 1 acre and larger. Call (704) 221-8928.", path: "/service-areas/anderson-sc" }),
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
        subtitle="P1 Land & Property Management provides comprehensive land and property services for commercial, agricultural, and large residential properties throughout Anderson, SC and Anderson County. Anderson's growing commercial base and strong agricultural heritage make it a natural fit for P1's full-service model — from land clearing and drainage to ongoing agricultural land maintenance and pond management."
        image={heroImg}
        imageAlt="Land Clearing & Property Management in Anderson, SC"
      />

      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">Anderson SC Services</h2>
              <ul className="space-y-3">
                {[
                  "Agricultural land and pasture maintenance",
                  "Land clearing and forestry mulching",
                  "Drainage and waterway management",
                  "Grading for fields, access roads, and construction pads",
                  "Pond management and pond construction",
                  "Turf and pasture establishment",
                  "Commercial grounds management",
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

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Anderson, SC Land & Property Management FAQs</h2>
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

      <FinalCTA />
    </Layout>
  );
}
