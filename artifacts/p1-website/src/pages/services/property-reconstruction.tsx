import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema } from "@/lib/structured-data";
import { CheckCircle2 } from "lucide-react";
import heroImg from "@/assets/service-reconstruction.png";

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
        ]}
      />

      {/* PAGE HERO */}
      <section className="relative py-32 px-4 bg-secondary text-white overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30 mix-blend-overlay">
          <img src={heroImg} alt="Massive land reconstruction with equipment" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-secondary/80" />
        </div>
        <div className="container relative z-10 mx-auto max-w-4xl space-y-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-4xl md:text-6xl font-serif font-extrabold tracking-tight text-white">
            Full Property Reconstruction — From Overgrown to Operational
          </h1>
          <p className="text-lg md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed font-medium">
            When a property needs more than maintenance — when it needs to be fundamentally reworked — P1 is the contractor to call. We handle the full scope of land reconstruction, from initial clearing to finished turf, under one roof.
          </p>
        </div>
      </section>

      {/* CONTENT SECTIONS */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl space-y-16">
          
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-secondary border-b border-border pb-4">
              When Maintenance Isn't Enough
            </h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-6 text-lg leading-relaxed">
              <p>
                Some properties have gone too long without the right care. Drainage has failed. Erosion has carved up slopes and fields. Invasive vegetation has taken over. Ponds have silted in. Grade has shifted. What was once a functional, productive piece of land is now costing its owner more than it's worth.
              </p>
              <p>
                Property reconstruction is P1's answer for clients who need a complete reset — a full-scope project that addresses the root causes of a property's problems and rebuilds it to perform.
              </p>
            </div>
          </div>

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

        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
