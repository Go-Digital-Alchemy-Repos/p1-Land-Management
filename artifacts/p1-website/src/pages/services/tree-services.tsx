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

const FAQS = [
  {
    question: "What tree services does P1 provide?",
    answer:
      "P1 provides tree trimming and canopy management, dead wood removal, hazardous tree removal, stump grinding, selective clearing, windbreak and tree line management, and storm damage cleanup — sized for commercial, agricultural, and large residential properties.",
  },
  {
    question: "Does P1 handle storm damage cleanup?",
    answer:
      "Yes. After storms move through Upstate SC or the Charlotte NC region, P1 provides emergency debris clearing, downed tree removal, and hazard mitigation so your property is safe and accessible again quickly.",
  },
  {
    question: "Can P1 remove some trees while preserving others?",
    answer:
      "Yes. Selective clearing is one of our specialties — removing unwanted or invasive species while preserving mature, valuable trees. It's a common approach for opening up land, clearing fence lines, and managing wooded acreage strategically.",
  },
  {
    question: "How is P1 different from a residential tree company?",
    answer:
      "P1 is built for large acreage. We bring heavy equipment, forestry mulching capability, and crews experienced with commercial sites, farms, and estates — so tree work that would take a residential crew weeks gets done efficiently and safely at scale.",
  },
];

export default function TreeServices() {
  return (
    <Layout>
      <SEO 
        title="Tree Services for Large Properties | P1 Land & Property Management | Upstate SC & Charlotte NC"
        description="Professional tree trimming, removal, stump grinding, and tree management for commercial and large residential properties. Serving Upstate SC and Charlotte NC. Call (704) 221-8928."
        jsonLd={[
          serviceSchema({ name: "Tree Services", description: "Professional tree trimming, removal, stump grinding, and tree management for commercial and large residential properties. Serving Upstate SC and Charlotte NC. Call (704) 221-8928.", path: "/services/tree-services" }),
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
            & Large Residential Properties
          </>
        }
        subtitle="Large properties carry large trees — and large liability when those trees aren't properly managed. P1 provides professional tree services for landowners who need more than a residential tree crew."
        image={heroImg}
        imageAlt="Heavy machinery tree limb removal"
      />

      {/* CONTENT SECTIONS */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl space-y-16">
          
          <FeatureRow heading="Comprehensive Tree Management for Large Acreage" image={treeImg} imageAlt="Arborist trimming mature trees on a large property">
            <p>
              Trees on commercial and agricultural properties serve important functions — shade, windbreaks, aesthetics, wildlife habitat — but they also require active management to remain healthy and safe. Untrimmed canopies, dead wood, crowded stands, and storm-damaged trees create hazards for structures, fences, livestock, and people.
            </p>
            <p>
              P1 provides professional tree services sized for large-acreage properties. We work with commercial property managers, farm owners, rural landowners, and residential estate owners across Upstate South Carolina and the greater Charlotte, NC region.
            </p>
          </FeatureRow>

          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">
              Tree Services
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Tree trimming and canopy management — raise clearance, reduce crown weight, improve shape",
                "Dead wood removal — eliminate storm hazard and disease spread",
                "Tree removal — safe takedown of hazardous, dead, or unwanted trees",
                "Stump grinding — complete removal of stumps below grade",
                "Selective clearing — remove unwanted species while preserving valuable trees",
                "Storm damage cleanup — emergency debris clearing after weather events",
                "Windbreak and tree line management",
                "Tree line clearing for fence installation and access",
                "Orchard and agricultural tree management"
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
            <div className="space-y-6">
              {FAQS.map((f) => (
                <div key={f.question} className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-2">
                  <h3 className="text-lg font-serif font-bold text-secondary">{f.question}</h3>
                  <p className="text-secondary/80 leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
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
