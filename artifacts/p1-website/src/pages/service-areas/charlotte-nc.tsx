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
    question: "What parts of Charlotte does P1 serve?",
    answer:
      "P1 serves all of Charlotte and Mecklenburg County — from uptown commercial and industrial corridors to the large residential properties of south Charlotte, Steele Creek, and the surrounding metro — for properties 1 acre and larger.",
  },
  {
    question: "Does P1 offer commercial property maintenance contracts in Charlotte?",
    answer:
      "Yes. P1 provides year-round commercial grounds maintenance programs for office parks, industrial facilities, HOAs, and property management companies throughout Charlotte, keeping large sites presentable and compliant long after initial site work is complete.",
  },
  {
    question: "Can P1 clear and grade land for development in Charlotte?",
    answer:
      "Yes. P1 handles land clearing, forestry mulching, fine grading, site preparation, and stormwater drainage installation for commercial and residential development across the Charlotte metro — including large, complex sites that require heavy equipment and experienced crews.",
  },
  {
    question: "What size properties does P1 work on in Charlotte?",
    answer:
      "P1 focuses on properties 1 acre and larger — commercial, industrial, and large residential — which lets us bring the right equipment and expertise to jobs that standard landscaping companies can't handle.",
  },
];

export default function CharlotteNC() {
  return (
    <Layout>
      <SEO 
        title="Land Clearing & Commercial Property Management Charlotte NC | P1 Land & Property Management"
        description="Professional land clearing, grading, drainage, and commercial property management in Charlotte, NC. Properties 1 acre and larger. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Charlotte, North Carolina", areaType: "City", description: "Professional land clearing, grading, drainage, and commercial property management in Charlotte, NC. Properties 1 acre and larger. Call (704) 221-8928.", path: "/service-areas/charlotte-nc" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "Charlotte, NC", path: "/service-areas/charlotte-nc" },
          ]),
          faqSchema(FAQS),
        ]}
      />

      <PageHero
        eyebrow="Service Area · NC"
        title={
          <>
            Land Clearing & Commercial Property Management in{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Charlotte, NC
            </em>
          </>
        }
        subtitle="P1 Land & Property Management delivers full-service land and property management for commercial, industrial, and large residential properties throughout Charlotte, NC and Mecklenburg County. As Charlotte continues its rapid growth, demand for professional large-acreage property contractors has never been higher — and P1 fills that gap with a complete range of services from initial land clearing through ongoing maintenance."
        image={heroImg}
        imageAlt="Land Clearing & Commercial Property Management in Charlotte, NC"
      />

      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">Charlotte NC Services</h2>
              <ul className="space-y-3">
                {[
                  "Commercial property management and maintenance contracts",
                  "Land clearing and forestry mulching",
                  "Fine grading and site preparation for development",
                  "Stormwater and drainage system installation",
                  "Turf installation for commercial and large residential sites",
                  "Tree services and canopy management",
                  "Pond and retention basin management",
                  "Full site reconstruction and restoration"
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
                  Charlotte's commercial and industrial property market requires contractors with the scale, equipment, and experience to manage complex, large-acreage sites. P1 serves commercial developers, property management companies, industrial facility managers, and large residential landowners throughout the Charlotte metro.
                </p>
                <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
                  Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your property.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Charlotte, NC Land & Property Management FAQs</h2>
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
