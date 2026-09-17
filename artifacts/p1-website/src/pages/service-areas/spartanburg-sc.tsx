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
      "Yes. Spartanburg County's I-85 corridor is one of the most active industrial markets in the Southeast, and P1 provides ongoing grounds maintenance, land clearing, grading, and drainage work for manufacturing and distribution facilities throughout the area.",
  },
  {
    question: "Can P1 maintain farms and pasture in Spartanburg County?",
    answer:
      "Yes. P1 works with farm owners across Spartanburg County on pasture management, field reseeding, land clearing, access-road grading, drainage correction, and pond management.",
  },
  {
    question: "What size properties does P1 work on in Spartanburg?",
    answer:
      "P1 focuses on commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger, with the heavy equipment and crews that large-acreage work demands. P1 does not provide residential services.",
  },
];

export default function SpartanburgSC() {
  return (
    <Layout>
      <SEO 
        title="Land Management in Spartanburg, SC | P1"
        description="Commercial landscaping, grounds maintenance, land clearing, grading & drainage for 1-acre-plus Spartanburg, SC sites. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Spartanburg, South Carolina", areaType: "City", description: "Commercial landscaping, grounds maintenance, land clearing, grading, and drainage services for Spartanburg, SC properties 1 acre and larger.", path: "/service-areas/spartanburg-sc" }),
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
        subtitle="We provide commercial landscaping and grounds maintenance across Spartanburg County. For industrial sites, farms, and other large properties, we also handle clearing, grading, drainage, and restoration."
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
                  "Commercial landscaping and grounds maintenance",
                  "Agricultural land maintenance and pasture management",
                  "Land clearing and forestry mulching",
                  "Grading and site preparation for commercial and industrial sites",
                  "Drainage system installation and correction",
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
                  From industrial grounds near I-85 to pasture outside town, Spartanburg properties need both regular upkeep and occasional earthwork. We help you plan and handle both.
                </p>
                <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
                  Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your property.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-10 border-y border-border py-12 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-secondary">Land management along a working corridor</h2>
              <p className="leading-relaxed text-secondary/80">At a manufacturing or distribution site, work needs to fit around trucks and shifts. On farmland, equipment access, animals, and field conditions guide the schedule. We'll talk through those details with you.</p>
              <p className="leading-relaxed text-secondary/80">We plan clearing, grading, drainage, and ongoing care in the order your property needs them.</p>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-secondary">Know What Your Estimate Includes</h2>
              <p className="leading-relaxed text-secondary/80">Your estimate will explain the work areas, access, debris handling, timing, and what's included. Site plans and notes about utilities or drainage help us get those details right.</p>
              <p className="leading-relaxed text-secondary/80">We'll identify any separate engineering, surveys, permits, or specialist work before scheduling crews and equipment.</p>
              <p className="leading-relaxed text-secondary/80">A large job may work best in stages. We can address washed-out access or drainage first, then move on to clearing, finish grading, and seeding. We'll plan each stage around deliveries, staff, animals, or seasonal use and put the work in writing.</p>
              <p className="leading-relaxed text-secondary/80">Photos, drainage history, and a marked plan of recurring problem areas help the assessment concentrate on site behavior that may not be obvious during one visit.</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Spartanburg, SC Land & Property Management FAQs</h2>
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
