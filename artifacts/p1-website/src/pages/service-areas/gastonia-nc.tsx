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
    question: "What areas around Gastonia does P1 serve?",
    answer:
      "P1 serves Gastonia and all of Gaston County — including Belmont, Mount Holly, Cramerton, Dallas, Bessemer City, Stanley, and Cherryville — for properties 1 acre and larger.",
  },
  {
    question: "Does P1 handle industrial site vegetation management in Gaston County?",
    answer:
      "Yes. We mow, manage vegetation, and clear overgrown land around industrial and manufacturing facilities throughout Gaston County. We plan the work around access and daily operations.",
  },
  {
    question: "Can P1 fix drainage problems on Gastonia properties?",
    answer:
      "Yes. We'll look at where water collects and how the land slopes before recommending drains, swales, or grading changes. If engineering, permits, or specialist review is needed, we'll confirm that separately.",
  },
  {
    question: "What size properties does P1 work on in Gastonia?",
    answer:
      "We serve commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger. We do not provide residential services.",
  },
];

export default function GastoniaNC() {
  return (
    <Layout>
      <SEO 
        title="Land Management in Gastonia, NC | P1"
        description="Commercial landscaping, grounds maintenance, land clearing, grading & drainage for 1-acre-plus Gastonia and Gaston County sites. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Gastonia, North Carolina", areaType: "City", description: "Commercial landscaping, grounds maintenance, industrial land care, land clearing, grading, drainage, and turf services for Gastonia properties.", path: "/service-areas/gastonia-nc" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "Gastonia, NC", path: "/service-areas/gastonia-nc" },
          ]),
          faqSchema(FAQS),
        ]}
      />

      <PageHero
        eyebrow="Service Area · NC"
        title={
          <>
            Land Clearing & Property Management in{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Gastonia, NC
            </em>
          </>
        }
        subtitle="P1 Land & Property Management provides commercial landscaping and grounds maintenance for commercial, industrial, and agricultural properties throughout Gastonia and Gaston County. Our large-acreage services also include industrial and agricultural land care, land clearing, grading, drainage, turf, tree, and pond management."
        image={heroImg}
        imageAlt="Land Clearing & Property Management in Gastonia, NC"
      />

      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">Gastonia NC Services</h2>
              <ul className="space-y-3">
                {[
                  "Commercial landscaping and grounds maintenance programs",
                  "Agricultural and rural land maintenance",
                  "Industrial site land clearing and vegetation management",
                  "Land clearing, grading, and drainage installation",
                  "Turf installation and seeding",
                  "Tree services",
                  "Pond and waterway management"
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
              <h2 className="text-2xl font-serif font-bold text-secondary">Property work shaped by Gaston County ground</h2>
              <p className="leading-relaxed text-secondary/80">Gastonia's clay soils and rolling ground make drainage worth checking before other work starts. Clearing may leave slopes that need protection, and new turf needs a grade that lets water drain.</p>
              <p className="leading-relaxed text-secondary/80">We look at those details together and plan the work around what you want to do with the land.</p>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-secondary">Commercial corridors and working acreage</h2>
              <p className="leading-relaxed text-secondary/80">At industrial sites, we work around trucks, employees, and operating hours. On farms and public grounds, the priorities may be access roads, overgrowth, pond banks, or a regular mowing schedule.</p>
              <p className="leading-relaxed text-secondary/80">Tell us about known utilities, drainage trouble, work-hour limits, and the result you're after. We'll explain any permits, engineering, or specialist help needed before scheduling.</p>
              <p className="leading-relaxed text-secondary/80">We may recommend fixing drainage or access before finish grading and seeding. Your estimate will describe each stage, so you can plan the budget and keep the property in use while work is underway.</p>
              <p className="leading-relaxed text-secondary/80">Recent photos after rainfall, notes about recurring washouts, and a map of priority work areas can help P1 focus the assessment and distinguish isolated maintenance from a broader site issue.</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Gastonia, NC Land & Property Management FAQs</h2>
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
