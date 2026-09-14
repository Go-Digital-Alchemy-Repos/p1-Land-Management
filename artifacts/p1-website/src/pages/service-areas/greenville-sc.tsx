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
      "P1 serves Greenville and all of Greenville County — including Greer, Taylors, Travelers Rest, Simpsonville, Mauldin, and Fountain Inn — for commercial, industrial, agricultural, equestrian, municipal, and institutional properties 1 acre and larger.",
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
      "P1 focuses on commercial, industrial, agricultural, equestrian, municipal, and institutional properties 1 acre and larger, bringing the equipment and expertise that small-scale landscaping companies can't provide. P1 does not provide residential services.",
  },
];

export default function GreenvilleSC() {
  return (
    <Layout>
      <SEO 
        title="Land Management in Greenville, SC | P1"
        description="Land clearing, grading, drainage, turf, and property management for qualifying 1-acre-plus Greenville, SC sites. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Greenville, South Carolina", areaType: "City", description: "Professional land clearing, grading, drainage, turf, and property management in Greenville, SC. Serving commercial, industrial, agricultural, equestrian, municipal, and institutional properties 1 acre+. Call (704) 221-8928.", path: "/service-areas/greenville-sc" }),
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
        subtitle="P1 Land & Property Management provides full-service land and property care for commercial, industrial, agricultural, equestrian, municipal, and institutional properties throughout Greenville, SC and Greenville County. From one-time land clearing and grading projects to ongoing weekly maintenance programs, P1 has the equipment and experience to manage Greenville properties at any scale."
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
                  Greenville's growth has created strong demand for professional land management contractors who can handle large-acreage commercial, industrial, agricultural, municipal, and institutional properties. P1 serves developers, property managers, farm and equestrian operators, municipalities, and institutions throughout the Greenville area.
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
              <p className="leading-relaxed text-secondary/80">Greenville-area properties range from active commercial and industrial campuses to institutional grounds and working acreage beyond the urban core. Clearing, grades, drainage paths, access, turf, and ongoing maintenance interact differently in each setting, so the sequence matters as much as the individual service.</p>
              <p className="leading-relaxed text-secondary/80">P1 reviews the property’s current condition and next use before defining work. That review can connect initial land preparation with stabilization and recurring care, while keeping approved responsibilities and exclusions explicit.</p>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-secondary">Plan around operations and water movement</h2>
              <p className="leading-relaxed text-secondary/80">On occupied sites, access routes, business hours, tenants, public use, and protected areas influence mobilization. On sloped or clay-heavy ground, drainage history and erosion signs should be reviewed before grading or turf work begins.</p>
              <p className="leading-relaxed text-secondary/80">Provide available plans, known utility information, problem locations, access constraints, and schedule needs when requesting an estimate. If the proposed outcome requires engineering, permits, surveys, or specialist work, those responsibilities can be identified during qualification rather than left ambiguous.</p>
              <p className="leading-relaxed text-secondary/80">The assessment can then separate immediate concerns—such as unstable access, active erosion, blocked drainage, or unmanaged vegetation—from later finish work and recurring care. On an occupied Greenville property, those phases can be coordinated around vehicles, employees, tenants, and public areas. The written estimate defines the property-specific work, timing assumptions, and exclusions, giving the owner or facility team a practical document for budgeting and internal coordination.</p>
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
        <p><Link href="/services" className="text-primary underline">Compare land management services</Link> or <Link href="/contact" className="text-primary underline">tell us about your property</Link> to discuss scope and availability.</p>
      </aside>
      <FinalCTA />
    </Layout>
  );
}
