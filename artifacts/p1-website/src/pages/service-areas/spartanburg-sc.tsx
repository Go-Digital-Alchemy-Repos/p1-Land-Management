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
    question: "What areas around Spartanburg does P1 serve?",
    answer:
      "P1 serves Spartanburg and all of Spartanburg County — including Duncan, Inman, Boiling Springs, Landrum, and the I-85 industrial corridor — for properties 1 acre and larger.",
  },
  {
    question: "Does P1 handle industrial site work along the I-85 corridor?",
    answer:
      "Yes. Spartanburg County's I-85 corridor is one of the most active industrial markets in the Southeast, and P1 provides land clearing, grading, drainage installation, and ongoing grounds maintenance for manufacturing and distribution facilities throughout the area.",
  },
  {
    question: "Can P1 maintain farms and pasture in Spartanburg County?",
    answer:
      "Yes. P1 works with farm owners across Spartanburg County on pasture management, field reseeding, land clearing, access-road grading, drainage correction, and pond management.",
  },
  {
    question: "What size properties does P1 work on in Spartanburg?",
    answer:
      "P1 focuses on properties 1 acre and larger — industrial, commercial, agricultural, and large residential — with the heavy equipment and crews that large-acreage work demands.",
  },
];

export default function SpartanburgSC() {
  return (
    <Layout>
      <SEO 
        title="Land Clearing & Property Management Spartanburg SC | P1 Land & Property Management"
        description="Full-service land clearing, grading, drainage, and property management in Spartanburg, SC. Properties 1 acre and larger. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Spartanburg, South Carolina", areaType: "City", description: "Full-service land clearing, grading, drainage, and property management in Spartanburg, SC. Properties 1 acre and larger. Call (704) 221-8928.", path: "/service-areas/spartanburg-sc" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "Spartanburg, SC", path: "/service-areas/spartanburg-sc" },
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
              Spartanburg, SC
            </em>
          </>
        }
        subtitle="P1 Land & Property Management serves commercial, industrial, and agricultural properties throughout Spartanburg, SC and Spartanburg County. Our full-service land management programs cover everything from initial land clearing and site preparation through ongoing weekly or monthly maintenance — all with the equipment and crew to handle large-acreage properties that standard contractors can't."
        image={heroImg}
        imageAlt="Land Clearing & Property Management in Spartanburg, SC"
      />

      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">Spartanburg SC Services</h2>
              <ul className="space-y-3">
                {[
                  "Land clearing and forestry mulching",
                  "Grading and site preparation for commercial and industrial sites",
                  "Drainage system installation and correction",
                  "Agricultural land maintenance and pasture management",
                  "Turf installation and large-acreage seeding",
                  "Tree management and clearing",
                  "Pond and waterway management",
                  "Full property reconstruction"
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
                  Spartanburg County's mix of industrial growth and agricultural heritage makes it an ideal market for P1's combined earthwork and maintenance capabilities. We serve industrial property managers, farm owners, and commercial developers throughout the Spartanburg area.
                </p>
                <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
                  Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your property.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Spartanburg, SC Land & Property Management FAQs</h2>
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
