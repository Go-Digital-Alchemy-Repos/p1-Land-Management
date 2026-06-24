import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema } from "@/lib/structured-data";
import { CheckCircle2 } from "lucide-react";
import heroImg from "@/assets/service-clearing.png";

export default function LandClearing() {
  return (
    <Layout>
      <SEO 
        title="Land Clearing Upstate SC & Charlotte NC | P1 Land & Property Management"
        description="Professional land clearing for commercial, agricultural, and large residential properties. Trees, brush, stumps, and vegetation removed efficiently. Serving Upstate SC and Charlotte NC. Call (704) 221-8928."
        jsonLd={[
          serviceSchema({ name: "Land Clearing", description: "Professional land clearing for commercial, agricultural, and large residential properties. Trees, brush, stumps, and vegetation removed efficiently. Serving Upstate SC and Charlotte NC. Call (704) 221-8928.", path: "/services/land-clearing" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Services", path: "/services" },
            { name: "Land Clearing", path: "/services/land-clearing" },
          ]),
        ]}
      />

      {/* PAGE HERO */}
      <section className="relative py-32 px-4 bg-secondary text-white overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30 mix-blend-overlay">
          <img src={heroImg} alt="Excavator clearing brush in woods" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-secondary/80" />
        </div>
        <div className="container relative z-10 mx-auto max-w-4xl space-y-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-4xl md:text-6xl font-serif font-extrabold tracking-tight text-white">
            Land Clearing for Large-Acreage Properties in Upstate SC and Charlotte NC
          </h1>
          <p className="text-lg md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed font-medium">
            From clearing a few overgrown acres to opening up 100+ acres for development, P1 Land & Property Management has the equipment and experience to do it efficiently, cleanly, and on schedule.
          </p>
        </div>
      </section>

      {/* CONTENT SECTIONS */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl space-y-16">
          
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-secondary border-b border-border pb-4">
              Professional Land Clearing That Prepares Your Property for What's Next
            </h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-6 text-lg leading-relaxed">
              <p>
                Whether you're preparing land for construction, expanding agricultural acreage, eliminating invasive vegetation, or simply reclaiming overgrown land you've let go, P1 delivers professional clearing that leaves your property ready for its next use.
              </p>
              <p>
                We handle the full clearing process — trees, stumps, brush, vines, briars, and debris — using the right equipment for each site and each soil type. We serve commercial developers, farmers, rural landowners, and property managers across Upstate South Carolina and the greater Charlotte, North Carolina area.
              </p>
            </div>
          </div>

          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">
              Land Clearing Services
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Full tree clearing and removal — from single trees to dense stands",
                "Brush and undergrowth clearing",
                "Stump grinding and removal",
                "Forestry mulching — grinds vegetation in place, protects topsoil, speeds regrowth",
                "Selective clearing — preserve mature trees while removing unwanted vegetation",
                "Fence line and right-of-way clearing",
                "Pond and waterway access clearing",
                "Post-clearing debris removal and site cleanup"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 bg-muted p-4 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <span className="text-secondary/90 font-medium leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">
              Forestry Mulching: The Efficient Alternative
            </h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-6 text-lg leading-relaxed">
              <p>
                For many sites, forestry mulching is the most efficient and cost-effective clearing method. A single machine grinds trees, brush, and stumps directly into mulch that stays on site — protecting the soil, reducing erosion, and eliminating the cost and mess of hauling debris. The mulch layer also decomposes naturally, improving soil health over time.
              </p>
              <p>
                Forestry mulching is ideal for acreage where the goal is vegetation control rather than construction grading — pasture expansion, fence line management, and perimeter clearing all benefit from this method.
              </p>
            </div>
          </div>

          <div className="space-y-6 bg-card border border-border p-8 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
            <h2 className="text-2xl font-serif font-bold text-secondary">
              What Comes After Clearing
            </h2>
            <p className="text-lg text-secondary/80 leading-relaxed mb-6">
              Land clearing is often just the first step. P1 can take your newly cleared property through every subsequent stage: fine grading, drainage installation, seeding, turf establishment, and ongoing maintenance. Starting a project with P1 means you have a partner for the full lifecycle of your land, not just the first cut.
            </p>
            <h3 className="text-xl font-serif font-bold text-secondary mt-8 mb-4">
              Service Area
            </h3>
            <p className="text-lg text-secondary/80 leading-relaxed">
              P1 provides land clearing throughout Upstate South Carolina — including Greenville, Spartanburg, Anderson, Gaffney, Greer, and surrounding counties — and the greater Charlotte, NC region, including Concord, Mooresville, Lake Norman, Gastonia, and Mecklenburg County.
            </p>
          </div>

        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
