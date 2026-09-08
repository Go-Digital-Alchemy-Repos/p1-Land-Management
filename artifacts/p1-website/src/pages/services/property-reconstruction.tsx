import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import heroImg from "@/assets/service-reconstruction.png";
import reconstructionImg from "@/assets/features/reconstruction.png";

import { FaqAccordion } from "@/components/content/FaqAccordion";

const FAQS = [
  {
    question: "What is full property reconstruction?",
    answer:
      "Property reconstruction is a complete reset for land that has gone too long without the right care — a full-scope project combining land clearing, rough and fine grading, drainage installation, erosion control, pond restoration, soil amendment, and turf establishment, all under one contractor.",
  },
  {
    question: "How do I know if my property needs reconstruction instead of maintenance?",
    answer:
      "If drainage has failed, erosion has carved up slopes, invasive vegetation has taken over, ponds have silted in, or grade has shifted, maintenance alone won't fix the root causes. Reconstruction addresses those underlying problems and rebuilds the property to perform — then transitions into an ongoing maintenance program.",
  },
  {
    question: "Do I need separate contractors for clearing, grading, drainage, and turf?",
    answer:
      "Not with P1. We handle the full project from first cut to final turf — one contract, one schedule, one point of contact, and one team accountable for the finished result. That eliminates the scope gaps and schedule slips that come with juggling multiple contractors.",
  },
  {
    question: "Who typically needs property reconstruction?",
    answer:
      "New landowners who acquired neglected property, agricultural operators reclaiming unmanaged land, developers whose sites need major earthwork, owners recovering from storm or erosion damage, and landowners whose persistent drainage problems have outlasted multiple contractors.",
  },
];

export default function PropertyReconstruction() {
  return (
    <Layout>
      <SEO 
        title="Property Reconstruction & Large-Scale Land Restoration | P1 Land & Property Management"
        description="Full-scope property reconstruction including land clearing, regrading, drainage overhaul, and turf establishment. Serving commercial and agricultural landowners in Upstate SC and Charlotte NC. Call (704) 221-8928."
        jsonLd={[
          serviceSchema({ name: "Property Reconstruction", description: "Full-scope property reconstruction including land clearing, regrading, drainage overhaul, and turf establishment. Serving commercial and agricultural landowners in Upstate SC and Charlotte NC. Call (704) 221-8928.", path: "/services/property-reconstruction" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Services", path: "/services" },
            { name: "Property Reconstruction", path: "/services/property-reconstruction" },
          ]),
          faqSchema(FAQS),
        ]}
      />

      {/* PAGE HERO */}
      <PageHero
        indexOfWork
        eyebrow="Property Reconstruction"
        title={
          <>
            Full Property Reconstruction —{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              From Overgrown to Operational
            </em>
          </>
        }
        subtitle="When a property needs more than maintenance — when it needs to be fundamentally reworked — P1 is the contractor to call. We handle the full scope of land reconstruction, from initial clearing to finished turf, under one roof."
        image={heroImg}
        imageAlt="Massive land reconstruction with equipment"
      />

      {/* CONTENT SECTIONS */}
      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          
          <FeatureRow heading="When Maintenance Isn't Enough" image={reconstructionImg} imageAlt="Heavy machinery rebuilding a neglected, eroded property">
            <p>
              Some properties have gone too long without the right care. Drainage has failed. Erosion has carved up slopes and fields. Invasive vegetation has taken over. Ponds have silted in. Grade has shifted. What was once a functional, productive piece of land is now costing its owner more than it's worth.
            </p>
            <p>
              Property reconstruction is P1's answer for clients who need a complete reset — a full-scope project that addresses the root causes of a property's problems and rebuilds it to perform.
            </p>
          </FeatureRow>

          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">
              What Full Property Reconstruction Includes
            </h2>
            <p className="text-lg text-secondary/80 leading-relaxed mb-6">
              Every reconstruction project is scoped to the specific property and its specific problems. A typical full reconstruction project may include:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Complete land clearing — removal of all unwanted vegetation, trees, stumps, and debris",
                "Rough grading — reshaping the topography to proper drainage slope",
                "Drainage system installation — French drains, swales, ditches, and retention systems",
                "Erosion control — slope stabilization, rip-rap, silt fencing, and matting",
                "Fine grading — precision finish grade for turf, drainage, and structural stability",
                "Pond restoration or reconstruction — dredging, embankment repair, inlet/outlet work",
                "Waterway clearing and bank stabilization",
                "Soil amendment — lime, fertilizer, and soil conditioning for turf establishment",
                "Seeding or sod installation — large-acreage turf establishment appropriate to use",
                "Transition to ongoing maintenance program"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 bg-muted p-4 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <span className="text-secondary/90 font-medium leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">
              Who Needs Property Reconstruction
            </h2>
            <ul className="space-y-4">
              {[
                "New landowners who acquired neglected or overgrown property",
                "Agricultural operators reclaiming land that hasn't been actively managed",
                "Commercial developers preparing a site that requires significant earthwork beyond basic clearing",
                "Property owners recovering from major storm, flood, or erosion damage",
                "Landowners who have had multiple contractors fail to solve persistent drainage or erosion problems"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-lg text-secondary/80 font-medium">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6 bg-card border border-border p-8 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
            <h2 className="text-2xl font-serif font-bold text-secondary">
              One Contractor for the Whole Project
            </h2>
            <p className="text-lg text-secondary/80 leading-relaxed mb-6">
              Property reconstruction is complex. When multiple contractors are involved — a clearing crew here, a grading company there, a separate drainage contractor, then a seeding company — scope gaps appear, schedules slip, and nobody owns the overall outcome.
            </p>
            <p className="text-lg text-secondary/80 leading-relaxed mb-6">
              P1 handles the full project from first cut to final turf. That means one contract, one schedule, one point of contact, and one team that is accountable for the finished result.
            </p>
            <h3 className="text-xl font-serif font-bold text-secondary mt-8 mb-4">
              Service Area
            </h3>
            <p className="text-lg text-secondary/80 leading-relaxed">
              P1 provides property reconstruction services throughout Upstate South Carolina (Greenville, Spartanburg, Anderson, and surrounding counties) and the greater Charlotte, NC region (Charlotte, Concord, Mooresville, Gastonia, Lake Norman, and Mecklenburg County).
            </p>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Property Reconstruction FAQs</h2>
            <FaqAccordion items={FAQS} />
            <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
              Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your reconstruction project.
            </p>
          </div>

        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
