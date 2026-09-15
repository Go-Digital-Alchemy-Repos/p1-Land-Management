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
      "P1 focuses on commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger, bringing the equipment and expertise that small-scale landscaping companies can't provide. P1 does not provide residential services.",
  },
];

export default function AndersonSC() {
  return (
    <Layout>
      <SEO 
        title="Land Management in Anderson, SC | P1"
        description="Commercial landscaping, grounds maintenance, land clearing, grading & drainage for qualifying 1-acre-plus Anderson, SC sites. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Anderson, South Carolina", areaType: "City", description: "Commercial landscaping, grounds maintenance, agricultural land care, land clearing, grading, drainage, and pond services for qualifying Anderson, SC properties.", path: "/service-areas/anderson-sc" }),
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
        subtitle="P1 Land & Property Management provides commercial landscaping and grounds maintenance, plus complete land and property services for commercial, industrial, agricultural, municipal, and institutional sites throughout Anderson and Anderson County. Our full-service model extends from ongoing grounds care to land clearing, grading, drainage, and pond management."
        image={heroImg}
        imageAlt="Land Clearing & Property Management in Anderson, SC"
      />

      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">Anderson SC Services</h2>
              <ul className="space-y-3">
                {[
                  "Commercial landscaping and grounds maintenance",
                  "Agricultural land and pasture maintenance",
                  "Land clearing and forestry mulching",
                  "Grading for fields, access roads, and construction pads",
                  "Drainage and waterway management",
                  "Turf and pasture establishment",
                  "Pond management and pond construction",
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

          <div className="grid gap-10 border-y border-border py-12 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-secondary">Planning work around Anderson County terrain</h2>
              <p className="leading-relaxed text-secondary/80">A property near the I-85 corridor can have very different operating constraints from agricultural acreage toward Belton, Pendleton, or Lake Hartwell. Commercial access, active operations, slopes, water movement, existing utilities, and the intended next use all affect how clearing, grading, or maintenance should be sequenced.</p>
              <p className="leading-relaxed text-secondary/80">P1 starts by reviewing the visible site conditions and the requested outcome. The resulting estimate identifies the proposed work, access assumptions, exclusions, and any engineering, permitting, utility-location, or specialist responsibilities that must be handled separately.</p>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-secondary">From working land to managed sites</h2>
              <p className="leading-relaxed text-secondary/80">Agricultural properties may need pasture access, brush control, pond edges, drainage routes, or reseeding coordinated around animals and ongoing operations. Commercial, municipal, and institutional sites often place more emphasis on traffic flow, public access, appearance, and documented maintenance intervals.</p>
              <p className="leading-relaxed text-secondary/80">For either setting, defining the problem before equipment arrives reduces rework. Share current plans, known drainage history, access limitations, and the property’s next use when requesting an assessment.</p>
              <p className="leading-relaxed text-secondary/80">A practical first visit also separates immediate corrective work from longer-term maintenance. Standing water, unstable access, overgrowth, eroding banks, or failed turf may be related, but they do not always belong in one phase. P1 can organize the proposed work into a sequence that reflects site priorities and current availability, giving the owner or facility team a clearer basis for budgeting and scheduling. The written estimate—not a generic city-page promise—controls the services, timing, and responsibilities for a specific Anderson County property.</p>
              <p className="leading-relaxed text-secondary/80">Photos of problem areas and notes about when water, access, or vegetation issues appear can make the first conversation more useful and help the site visit focus on the right locations.</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Anderson, SC Land & Property Management FAQs</h2>
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
