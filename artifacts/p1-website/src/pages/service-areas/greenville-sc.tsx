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
    question: "What areas around Greenville does P1 serve?",
    answer:
      "P1 serves Greenville and all of Greenville County — including Greer, Taylors, Travelers Rest, Simpsonville, Mauldin, and Fountain Inn — for commercial, agricultural, and large residential properties 1 acre and larger.",
  },
  {
    question: "Does P1 clear land for development in Greenville?",
    answer:
      "Yes. P1 provides land clearing, forestry mulching, fine grading, drainage installation, and full site preparation for Greenville's fast-growing commercial and residential development market.",
  },
  {
    question: "Does P1 offer ongoing maintenance programs in Greenville?",
    answer:
      "Yes. Beyond one-time clearing and grading projects, P1 offers weekly and seasonal commercial grounds maintenance programs for office parks, industrial facilities, HOAs, and large properties throughout the Greenville area.",
  },
  {
    question: "What size properties does P1 work on in Greenville?",
    answer:
      "P1 focuses on properties 1 acre and larger — commercial, agricultural, and large residential — bringing the equipment and expertise that standard landscaping companies can't provide.",
  },
];

export default function GreenvilleSC() {
  return (
    <Layout>
      <SEO 
        title="Land Clearing & Property Management Greenville SC | P1 Land & Property Management"
        description="Professional land clearing, grading, drainage, turf, and property management in Greenville, SC. Serving commercial, agricultural, and large residential properties 1 acre+. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Greenville, South Carolina", areaType: "City", description: "Professional land clearing, grading, drainage, turf, and property management in Greenville, SC. Serving commercial, agricultural, and large residential properties 1 acre+. Call (704) 221-8928.", path: "/service-areas/greenville-sc" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "Greenville, SC", path: "/service-areas/greenville-sc" },
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
              Greenville, SC
            </em>
          </>
        }
        subtitle="P1 Land & Property Management provides full-service land and property care for commercial, agricultural, and large residential properties throughout Greenville, SC and Greenville County. From one-time land clearing and grading projects to ongoing weekly maintenance programs, P1 has the equipment and experience to manage Greenville properties at any scale."
        image={heroImg}
        imageAlt="Land Clearing & Property Management in Greenville, SC"
      />

      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">Greenville SC Services</h2>
              <ul className="space-y-3">
                {[
                  "Land clearing and forestry mulching",
                  "Fine grading and site preparation",
                  "Drainage installation and correction",
                  "Commercial grounds maintenance",
                  "Turf installation — sod and seeding",
                  "Tree services",
                  "Pond and waterway management",
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
                <p>
                  Greenville's growth has created strong demand for professional land management contractors who can handle large-acreage commercial, industrial, and agricultural properties. P1 serves developers, property managers, farm owners, and rural landowners throughout the Greenville area.
                </p>
                <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
                  Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your property.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Greenville, SC Land & Property Management FAQs</h2>
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
