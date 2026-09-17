import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { reconstructionHero as heroImg } from "@/lib/service-images";
import reconstructionImg from "@/assets/features/reconstruction-smaller-scale.png";

import { FaqAccordion } from "@/components/content/FaqAccordion";

const FAQS = [
  {
    question: "What is full property reconstruction?",
    answer:
      "Property reconstruction brings several repairs into one plan. It may include clearing, grading, drainage, erosion control, pond repairs, soil preparation, and new turf, depending on what the land needs.",
  },
  {
    question: "How do I know if my property needs reconstruction instead of maintenance?",
    answer:
      "If drainage has failed, erosion has carved up slopes, invasive vegetation has taken over, ponds have silted in, or grade has shifted, maintenance alone won't fix the root causes. Reconstruction addresses those underlying problems and rebuilds the property to perform — then transitions into an ongoing maintenance program.",
  },
  {
    question: "Do I need separate contractors for clearing, grading, drainage, and turf?",
    answer:
      "We can plan and handle clearing, grading, drainage, and turf as one project. You'll have one point of contact, and we'll explain any work that needs a separate specialist before starting.",
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
        title="Property Reconstruction & Land Restoration | P1"
        description="Clearing, grading, drainage repairs, and new turf to restore large properties in Upstate SC and Charlotte. Call (704) 221-8928."
        jsonLd={[
          serviceSchema({ name: "Property Reconstruction", description: "Property restoration including land clearing, regrading, drainage overhaul, and turf establishment. Serving commercial and agricultural landowners in Upstate SC and Charlotte NC. Call (704) 221-8928.", path: "/services/property-reconstruction" }),
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
        subtitle="When routine maintenance isn&#x27;t enough, we help restore the land. Clearing, regrading, drainage repairs, and new turf can be planned together around what your property needs."
        image={heroImg}
        imageAlt="Compact equipment restoring drainage and grade on a smaller rural property"
      />

      {/* CONTENT SECTIONS */}
      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          
          <FeatureRow heading="When Maintenance Isn't Enough" image={reconstructionImg} imageAlt="Compact excavator restoring a smaller property edge with drainage rock and fresh grading">
            <p>
              Overgrowth, washed-out slopes, blocked drainage, and silted ponds can build up over time. If several parts of the property need attention, it helps to look at the underlying problems together.
            </p>
            <p>
              We'll walk the site with you and recommend a sequence for repairs, from restoring access and drainage to preparing soil and planting turf.
            </p>
          </FeatureRow>

          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">
              What Full Property Reconstruction Includes
            </h2>
            <p className="text-lg text-secondary/80 leading-relaxed mb-6">
              The work depends on your property. A reconstruction project may include:
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
                "Owners dealing with persistent drainage or erosion problems"
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
              Clearing, grading, drainage, and planting need to happen in the right order. We plan those stages together so the crew preparing the ground understands what needs to follow.
            </p>
            <p className="text-lg text-secondary/80 leading-relaxed mb-6">
              You'll have one point of contact and a written plan for the work. We'll explain what's included, when each stage can happen, and where specialist help is needed.
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
