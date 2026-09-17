import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import heroImg from "@/assets/service-tree.png";
import treeImg from "@/assets/features/tree-management.png";

import { FaqAccordion } from "@/components/content/FaqAccordion";

const FAQS = [
  {
    question: "What tree services does P1 provide?",
    answer:
      "We trim and remove trees, manage canopies and tree lines, grind stumps, and clear storm debris on large properties. We'll check the trees, access, and any specialist needs before planning the work.",
  },
  {
    question: "Does P1 handle storm damage cleanup?",
    answer:
      "Contact us about downed trees, debris, or blocked access after a storm. We'll confirm crew availability, timing, and whether conditions allow the work. We are not an emergency-dispatch service.",
  },
  {
    question: "Can P1 remove some trees while preserving others?",
    answer:
      "Yes. We'll identify the trees to keep, mark the clearing limits, and plan equipment access around them. We'll also explain any tree-condition assessment or specialist work needed.",
  },
  {
    question: "What types of properties does P1 serve?",
    answer:
      "Yes. We plan equipment and crews around the acreage, trees, and access. We'll review the work and any specialist or safety needs with you before scheduling.",
  },
];

export default function TreeServices() {
  return (
    <Layout>
      <SEO 
        title="Tree Services for Large Properties in SC & NC | P1"
        description="Tree trimming, removal, stump grinding, and selective clearing for commercial and working properties. Call (704) 221-8928."
        jsonLd={[
          serviceSchema({ name: "Tree Services", description: "Professional tree trimming, removal, stump grinding, and tree management for commercial, industrial, agricultural, municipal, and institutional properties. Serving Upstate SC and Charlotte NC. Call (704) 221-8928.", path: "/services/tree-services" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Services", path: "/services" },
            { name: "Tree Services", path: "/services/tree-services" },
          ]),
          faqSchema(FAQS),
        ]}
      />

      {/* PAGE HERO */}
      <PageHero
        indexOfWork
        eyebrow="Tree Services"
        title={
          <>
            Tree Services for{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Commercial, Agricultural
            </em>{" "}
            & Institutional Properties
          </>
        }
        subtitle="We care for trees across commercial grounds, farms, and other large properties. From trimming and selective clearing to storm cleanup, we&#x27;ll help you plan the work your trees need."
        image={heroImg}
        imageAlt="Heavy machinery tree limb removal"
      />

      {/* CONTENT SECTIONS */}
      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          
          <FeatureRow heading="Comprehensive Tree Management for Large Acreage" image={treeImg} imageAlt="Arborist trimming mature trees on a large property">
            <p>
              Trees on commercial and agricultural properties serve important functions — shade, windbreaks, aesthetics, wildlife habitat — but they also require active management to remain healthy and safe. Untrimmed canopies, dead wood, crowded stands, and storm-damaged trees create hazards for structures, fences, livestock, and people.
            </p>
            <p>
              P1 provides professional tree services sized for large-acreage properties. We work with commercial property managers, industrial facilities, farm operators, municipalities, and institutions across Upstate South Carolina and the greater Charlotte, NC region.
            </p>
          </FeatureRow>

          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">
              Tree Services
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Tree trimming and canopy management — raise clearance, reduce crown weight, improve shape",
                "Dead wood removal to reduce hazards around the property",
                "Tree removal — safe takedown of hazardous, dead, or unwanted trees",
                "Stump grinding — complete removal of stumps below grade",
                "Selective clearing — remove unwanted species while preserving valuable trees",
                "Storm-damage cleanup, subject to confirmed availability and safety conditions",
                "Windbreak and tree line management",
                "Tree line clearing for fence installation and access",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 bg-muted p-4 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <span className="text-secondary/90 font-medium leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6 bg-card border border-border p-8 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <h2 className="text-2xl font-serif font-bold text-secondary">
              Tree Clearing at Scale
            </h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-6 text-lg leading-relaxed">
              <p>
                When a land clearing project calls for removing significant tree stands, P1 handles it efficiently with forestry mulching and heavy clearing equipment. When a client wants strategic preservation of mature trees while opening up surrounding land, we have the experience to execute selective clearing with precision.
              </p>
              <p>
                Either way, the goal is the same: your land configured the way you want it, with the trees that belong there and without the ones that don't.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Tree Services FAQs</h2>
            <FaqAccordion items={FAQS} />
            <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
              Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your trees.
            </p>
          </div>

        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
