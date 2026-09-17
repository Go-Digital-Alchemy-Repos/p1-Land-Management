import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { gradingHero as heroImg } from "@/lib/service-images";
import levelImg from "@/assets/features/grading-level.png";
import drainageImg from "@/assets/features/grading-drainage.png";
import turfImg from "@/assets/features/grading-turf.png";
import constructionImg from "@/assets/features/grading-construction.png";

import { FaqAccordion } from "@/components/content/FaqAccordion";

const FAQS = [
  {
    question: "What's the difference between rough grading and fine grading?",
    answer:
      "Rough grading shapes the land after clearing. Fine grading prepares the finished surface for drainage, turf, or construction. We'll work to the approved plans and confirm the required grades before starting.",
  },
  {
    question: "Can regrading fix drainage problems on my property?",
    answer:
      "Yes, when the slope is part of the problem. We'll look at the ground, drains, and outlets to see whether regrading will help. Some properties also need drainage installation or an engineer's review.",
  },
  {
    question: "Does P1 grade sites for new construction?",
    answer:
      "We prepare building pads, roads, and sites for development across Upstate SC and greater Charlotte. Before starting, we'll review the approved plans, required grades, access, and any specialist work with your project team.",
  },
  {
    question: "Why does grading matter before installing turf?",
    answer:
      "Water needs a way off the ground before new grass goes in. We check grade and drainage alongside soil preparation, grass choice, and the care needed while turf takes root.",
  },
];

export default function GradingSitePreparation() {
  return (
    <Layout>
      <SEO 
        title="Fine Grading & Site Preparation in SC & NC | P1"
        description="Fine grading and site preparation for commercial, industrial, agricultural, municipal, and institutional properties. Call (704) 221-8928."
        jsonLd={[
          serviceSchema({ name: "Fine Grading & Site Preparation", description: "Precision grading and site preparation for commercial, industrial, agricultural, municipal, and institutional properties. Serving Greenville, Spartanburg, and Charlotte NC. Call (704) 221-8928.", path: "/services/grading-site-preparation" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Services", path: "/services" },
            { name: "Fine Grading & Site Preparation", path: "/services/grading-site-preparation" },
          ]),
          faqSchema(FAQS),
        ]}
      />

      {/* PAGE HERO */}
      <PageHero
        indexOfWork
        eyebrow="Grading & Site Preparation"
        title={
          <>
            Fine Grading & Site Preparation{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              In the Carolinas
            </em>
          </>
        }
        subtitle="Prepare your ground for construction, improve access, or correct an uneven grade. We handle grading and site preparation for large properties across Upstate SC and greater Charlotte."
        image={heroImg}
        imageAlt="Bulldozer grading a dirt site"
      />

      {/* CONTENT SECTIONS */}
      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          
          <FeatureRow heading="Get Your Land Level — and Keep It That Way" image={levelImg} imageAlt="Illustrative image of a compact track loader grading soil at a commercial construction site">
            <p>
              An uneven grade can leave water standing, wash soil away, or make turf harder to establish. We'll look at the problem with you and review the plans before shaping the ground.
            </p>
          </FeatureRow>

          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">
              Grading Services
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Rough grading — initial leveling and shaping after land clearing",
                "Fine grading — precision finish grade for drainage, turf, or construction",
                "Regrading — correcting improper or failed grade on existing properties",
                "Slope grading — creating or correcting slopes for water flow management",
                "Pad preparation — building pads for structures, equipment storage, or hardscapes",
                "Access road grading — shaping and grading roads, paths, and driveways on large properties",
                "Agricultural field leveling — improving drainage and accessibility for farm use"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 bg-muted p-4 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <span className="text-secondary/90 font-medium leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <FeatureRow heading="Grading for Drainage" image={drainageImg} imageAlt="Graded swale channeling water across a property" reverse>
            <p>
              Water follows the slope of the land. When that slope sends runoff toward a building or low spot, regrading may be part of the repair. We consider water movement when shaping slopes, swales, and transitions.
            </p>
          </FeatureRow>

          <FeatureRow heading="Grading for Turf Establishment" image={turfImg} imageAlt="Freshly graded soil transitioning into new sod">
            <p>
              Good turf starts with well-prepared ground. We check the grade, drainage, and soil before planting, then explain the watering and care needed while the grass takes root.
            </p>
          </FeatureRow>

          <FeatureRow heading="Grading for New Construction" image={constructionImg} imageAlt="Large commercial construction site on freshly graded land" reverse>
            <p>
              Before foundations, pavement, or utilities go in, the ground needs to match the approved plans. We prepare pads, slopes, drainage routes, and sub-grade with your project team.
            </p>
          </FeatureRow>

          <div className="space-y-6 bg-card border border-border p-8 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
            <h2 className="text-2xl font-serif font-bold text-secondary">
              Equipment & Precision
            </h2>
            <p className="text-lg text-secondary/80 leading-relaxed">
              We'll confirm equipment access, crew timing, and the required finish before starting the grading work.
            </p>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Grading & Site Preparation FAQs</h2>
            <FaqAccordion items={FAQS} />
            <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
              Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your grading project.
            </p>
          </div>

        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
