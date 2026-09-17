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
    question: "What areas around Greenville does P1 serve?",
    answer:
      "P1 serves Greenville and all of Greenville County — including Greer, Taylors, Travelers Rest, Simpsonville, Mauldin, and Fountain Inn — for commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger.",
  },
  {
    question: "Does P1 clear land for development in Greenville?",
    answer:
      "Yes. P1 provides land clearing, forestry mulching, fine grading, drainage installation, and full site preparation for Greenville's commercial, industrial, municipal, and institutional development market.",
  },
  {
    question: "Does P1 offer ongoing maintenance programs in Greenville?",
    answer:
      "Yes. Beyond one-time clearing and grading projects, P1 offers weekly and seasonal grounds maintenance programs for office parks, industrial facilities, municipal grounds, and institutional properties throughout the Greenville area.",
  },
  {
    question: "What size properties does P1 work on in Greenville?",
    answer:
      "We serve commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger. We do not provide residential services.",
  },
];

export default function GreenvilleSC() {
  return (
    <Layout>
      <SEO 
        title="Land Management in Greenville, SC | P1"
        description="Commercial landscaping, grounds maintenance, land clearing, grading & drainage for 1-acre-plus Greenville, SC sites. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Greenville, South Carolina", areaType: "City", description: "Commercial landscaping, grounds maintenance, land clearing, grading, drainage, and turf services for Greenville, SC properties 1 acre and larger.", path: "/service-areas/greenville-sc" }),
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
        subtitle="Commercial landscaping, grounds maintenance, and land care throughout Greenville County. We handle regular upkeep as well as clearing, grading, drainage, and larger property repairs."
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
                  "Commercial landscaping and grounds maintenance",
                  "Land clearing and forestry mulching",
                  "Fine grading and site preparation",
                  "Drainage installation and correction",
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
                  We work with Greenville property managers, developers, farm operators, municipalities, and institutions. Start with the work you need now, and we'll help you plan ongoing care.
                </p>
                <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
                  Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your property.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-10 border-y border-border py-12 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-secondary">A connected plan for Greenville-area sites</h2>
              <p className="leading-relaxed text-secondary/80">An office campus, industrial yard, and working farm have different maintenance needs. We look at access, drainage, slopes, and the way people use your property before suggesting a plan.</p>
              <p className="leading-relaxed text-secondary/80">We'll talk through the land's current condition and what comes next. Clearing and grading may need to happen before erosion control, seeding, or regular mowing can begin.</p>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-secondary">Plan around operations and water movement</h2>
              <p className="leading-relaxed text-secondary/80">On occupied sites, we plan around business hours, vehicles, tenants, and public access. On sloped ground, we check where water moves before disturbing soil or planting turf.</p>
              <p className="leading-relaxed text-secondary/80">Share plans, known utilities, problem areas, and your preferred timing. We'll explain any engineering, permits, surveys, or specialist work needed before the job starts.</p>
              <p className="leading-relaxed text-secondary/80">We'll help you separate immediate repairs from work that can wait. Clearing a blocked drain or restoring access may come first, with finish grading and planting afterward. The written estimate gives you a clear basis for budgeting and scheduling.</p>
              <p className="leading-relaxed text-secondary/80">Marking priority areas on a plan and sharing photos from wet-weather or peak-use conditions can make the assessment more efficient and reveal patterns that are not visible on a dry visit.</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Greenville, SC Land & Property Management FAQs</h2>
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
