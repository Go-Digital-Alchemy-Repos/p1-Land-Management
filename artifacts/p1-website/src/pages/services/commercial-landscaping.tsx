import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import heroImg from "@/assets/service-commercial.png";
import attentionImg from "@/assets/features/commercial-attention.png";
import scheduleImg from "@/assets/features/commercial-schedule.png";

import { FaqAccordion } from "@/components/content/FaqAccordion";

const FAQS = [
  {
    question: "What's included in a P1 commercial landscaping program?",
    answer:
      "Programs are customized to each site, but typically include turf mowing and edging, tree trimming and canopy management, pond and stormwater retention care, drainage inspection and maintenance, erosion control, seasonal seeding and fertilization, and brush management for undeveloped acreage.",
  },
  {
    question: "How is a commercial maintenance schedule established?",
    answer:
      "P1 reviews the property, the requested work and operating constraints before proposing an agreed scope and service schedule. Site-assessment availability, access requirements and any fee are confirmed during qualification.",
  },
  {
    question: "Is there a minimum property size for commercial programs?",
    answer:
      "Yes — P1 focuses on properties 1 acre and larger. We're built for business campuses, industrial sites, HOA common areas, and large commercial landholdings, not small lawns.",
  },
  {
    question: "How are insurance, licensing and procurement documents handled?",
    answer:
      "Ask P1 to provide the current documentation relevant to your project's agreed scope before work is scheduled. Documentation, vendor onboarding requirements and any specialist involvement are confirmed during qualification.",
  },
];

export default function CommercialLandscaping() {
  return (
    <Layout>
      <SEO 
        title="Commercial Landscaping | P1 Land & Property Management | Upstate SC & Charlotte NC"
        description="Commercial landscaping and exterior grounds maintenance for 1-acre-plus properties across Upstate SC and Charlotte NC. Turf, drainage, land clearing, ponds, and more. Call (704) 221-8928."
        jsonLd={[
          serviceSchema({ name: "Commercial Landscaping", description: "Commercial landscaping and exterior grounds maintenance for 1-acre-plus properties across Upstate SC and Charlotte NC. Turf, drainage, land clearing, ponds, and more. Call (704) 221-8928.", path: "/services/commercial-landscaping" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Services", path: "/services" },
            { name: "Commercial Landscaping", path: "/services/commercial-landscaping" },
          ]),
          faqSchema(FAQS),
        ]}
      />

      {/* PAGE HERO */}
      <PageHero
        indexOfWork
        eyebrow="Commercial Landscaping"
        title={
          <>
            Commercial Landscaping for{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Large-Acreage Properties
            </em>
          </>
        }
        subtitle="P1 provides commercial landscaping and scheduled exterior grounds maintenance for commercial sites, business campuses, industrial properties, and large commercial landholdings throughout Upstate South Carolina and the Charlotte, NC region."
        image={heroImg}
        imageAlt="Manicured commercial property landscape"
      />

      {/* CONTENT SECTIONS */}
      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          
          <FeatureRow heading="Your Commercial Property. Our Full Attention." image={attentionImg} imageAlt="Crew maintaining a large commercial property's grounds">
            <p>
              A well-maintained commercial property supports a professional presentation, protects the work already invested in the site and helps your team identify exterior needs early. P1 Land & Property Management helps large properties define and maintain an agreed exterior-work scope.
            </p>
            <p>
              We work with commercial developers, property managers, business campus owners, HOAs managing significant acreage, industrial facility managers, and private landowners who hold commercial-use land across both our markets.
            </p>
          </FeatureRow>

          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">
              What's Included in Our Commercial Programs
            </h2>
            <p className="text-lg text-secondary/80 leading-relaxed mb-6">
              P1 commercial landscaping programs are customized to your site — but typically include:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Regular turf mowing, edging, and cleanup for large-acreage grounds",
                "Tree trimming, selective removal, and canopy management",
                "Pond, lake, and stormwater retention management",
                "Drainage maintenance and inspection",
                "Erosion control monitoring and repair",
                "Seasonal seeding, fertilization, and turf health programs",
                "Land clearing and brush management for undeveloped portions of your property",
                "Site grading corrections and drainage improvements as needed",
                "Waterway and ditch clearing and maintenance"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 bg-muted p-4 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <span className="text-secondary/90 font-medium leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <FeatureRow heading="Maintenance Schedules That Work for Your Operation" image={scheduleImg} imageAlt="Operator on a commercial maintenance schedule" reverse>
            <p>
              We review the property, requested work and operating constraints before proposing an agreed scope and service schedule. Site-assessment availability, access requirements and any fee are confirmed during qualification.
            </p>
            <p>
              The work plan identifies priorities, delivery responsibilities and the next review. Confirm the scope, equipment needs and any specialist involvement before work begins.
            </p>
          </FeatureRow>

          <div className="space-y-8 bg-card border border-border p-8 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
            <h2 className="text-2xl font-serif font-bold text-secondary">
              Why Commercial Clients Choose P1
            </h2>
            <ul className="space-y-4">
              {[
                "1-acre minimum — we're built for large properties, not small lawns",
                "A coordinated exterior-work scope, defined for your property",
                "Upstate SC and Charlotte NC serviceability reviewed during qualification",
                "Project-relevant insurance, licensing and procurement documentation reviewed on request",
                "Site-assessment availability and terms confirmed during qualification"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-lg text-secondary/80 font-medium">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Commercial Landscaping FAQs</h2>
            <FaqAccordion items={FAQS} />
            <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
              Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your commercial property.
            </p>
          </div>

        </div>
      </section>

      <section className="site-shell py-12"><h2 className="text-2xl font-bold">Looking for a connected exterior site plan?</h2><p className="mt-4 text-muted-foreground">Explore how commercial landscaping, drainage, land and corrective work can fit an agreed exterior-work scope.</p><a href="/commercial" className="mt-5 inline-block font-bold text-primary underline">Commercial Site Management & Site Assessment</a></section>
      <FinalCTA />
    </Layout>
  );
}
