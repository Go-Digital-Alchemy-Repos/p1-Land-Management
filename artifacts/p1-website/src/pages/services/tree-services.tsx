import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { SEO } from "@/components/seo";
import { CheckCircle2 } from "lucide-react";
import heroImg from "@/assets/service-tree.png";

export default function TreeServices() {
  return (
    <Layout>
      <SEO 
        title="Tree Services for Large Properties | P1 Land & Property Management | Upstate SC & Charlotte NC"
        description="Professional tree trimming, removal, stump grinding, and tree management for commercial and large residential properties. Serving Upstate SC and Charlotte NC. Call (704) 221-8928."
      />

      {/* PAGE HERO */}
      <section className="relative py-32 px-4 bg-secondary text-white overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30 mix-blend-overlay">
          <img src={heroImg} alt="Heavy machinery tree limb removal" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-secondary/80" />
        </div>
        <div className="container relative z-10 mx-auto max-w-4xl space-y-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-4xl md:text-6xl font-serif font-extrabold tracking-tight text-white">
            Tree Services for Commercial, Agricultural & Large Residential Properties
          </h1>
          <p className="text-lg md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed font-medium">
            Large properties carry large trees — and large liability when those trees aren't properly managed. P1 provides professional tree services for landowners who need more than a residential tree crew.
          </p>
        </div>
      </section>

      {/* CONTENT SECTIONS */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl space-y-16">
          
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-secondary border-b border-border pb-4">
              Comprehensive Tree Management for Large Acreage
            </h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-6 text-lg leading-relaxed">
              <p>
                Trees on commercial and agricultural properties serve important functions — shade, windbreaks, aesthetics, wildlife habitat — but they also require active management to remain healthy and safe. Untrimmed canopies, dead wood, crowded stands, and storm-damaged trees create hazards for structures, fences, livestock, and people.
              </p>
              <p>
                P1 provides professional tree services sized for large-acreage properties. We work with commercial property managers, farm owners, rural landowners, and residential estate owners across Upstate South Carolina and the greater Charlotte, NC region.
              </p>
            </div>
          </div>

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

        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
