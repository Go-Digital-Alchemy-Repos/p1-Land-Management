import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { commercialHero as heroImg } from "@/lib/service-images";
import attentionImg from "@/assets/features/commercial-attention.png";
import scheduleImg from "@/assets/features/commercial-schedule.png";

import { FaqAccordion } from "@/components/content/FaqAccordion";

const FAQS = [
  {
    question: "What's included in a P1 commercial landscaping program?",
    answer:
      "Your plan can include mowing and edging, tree care, ponds, drainage checks, erosion repairs, seasonal seeding, and brush control. We'll walk the site with you and put the regular tasks and visit schedule in writing.",
  },
  {
    question: "How is a commercial maintenance schedule established?",
    answer:
      "We start with a free site assessment. Then we plan visits around seasonal growth, deliveries, opening hours, and the areas that need the most attention. You'll know how often we're coming and what's included.",
  },
  {
    question: "Is there a minimum property size for commercial programs?",
    answer:
      "Yes — P1 focuses on properties 1 acre and larger. We're built for business campuses, industrial sites, municipal grounds, institutional properties, and large commercial landholdings. We do not provide residential services.",
  },
  {
    question: "How are insurance, licensing and procurement documents handled?",
    answer:
      "Share your vendor requirements with us before scheduling. We'll review current insurance and license documents for the work, complete the necessary paperwork, and explain where a specialist may be needed.",
  },
];

export default function CommercialLandscaping() {
  return (
    <Layout>
      <SEO 
        title="Commercial Landscaping & Grounds Management | P1"
        description="Commercial landscaping and exterior grounds maintenance for 1-acre-plus properties across Upstate SC and Charlotte. Call (704) 221-8928."
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
            Commercial Landscaping &amp; Grounds Management for{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Large-Acreage Properties
            </em>
          </>
        }
        subtitle="We look after the grounds around offices, industrial sites, and other large properties across Upstate South Carolina and greater Charlotte. Regular mowing, seasonal care, and repairs planned around your site."
        image={heroImg}
        imageAlt="Manicured commercial property landscape"
      />

      {/* CONTENT SECTIONS */}
      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          
          <FeatureRow heading="Your Commercial Property. Our Full Attention." image={attentionImg} imageAlt="Crew maintaining a large commercial property's grounds">
            <p>
              Your grounds need to look good and work well for the people using them. We handle mowing, tree and brush care, ponds, drainage, and more with a schedule built around your property.
            </p>
            <p>
              We'll talk through regular upkeep, seasonal work, and any repairs that need separate attention, so you know what's included.
            </p>
          </FeatureRow>

          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">
              What's Included in Our Commercial Programs
            </h2>
            <p className="text-lg text-secondary/80 leading-relaxed mb-6">
              We'll build the plan around your site. Services can include:
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
              We plan visits around deliveries, employees, visitors, and seasonal growth. Entrances, turf, planting beds, and perimeter vegetation each get the attention they need.
            </p>
            <p>
              You'll know which jobs are part of regular upkeep and which are seasonal. Larger repairs get a separate price and your approval before we start.
            </p>
          </FeatureRow>

          <div className="space-y-8 bg-card border border-border p-8 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
            <h2 className="text-2xl font-serif font-bold text-secondary">
              Why Commercial Clients Choose P1
            </h2>
            <ul className="space-y-4">
              {[
                "Crews and equipment for properties 1 acre and larger",
                "Nearly 30 years of experience in land and property care",
                "Commercial grounds management across Upstate SC and greater Charlotte",
                "Regular visits planned around your operating hours",
                "A free site assessment and a maintenance plan in writing"
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

      <FinalCTA />
    </Layout>
  );
}
