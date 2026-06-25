import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema } from "@/lib/structured-data";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { CheckCircle2 } from "lucide-react";
import heroImg from "@/assets/service-turf.png";
import turfPrepImg from "@/assets/features/turf-prep.png";
import turfSpeciesImg from "@/assets/features/turf-species.png";

export default function TurfInstallationSeeding() {
  return (
    <Layout>
      <SEO 
        title="Turf Installation & Seeding for Large Acreage | P1 Land & Property Management | Upstate SC & Charlotte NC"
        description="Large-acreage sod and seed installation for commercial, agricultural, and residential properties. Bermuda, fescue, zoysia, and more. Serving Upstate SC and Charlotte NC. Call (704) 221-8928."
        jsonLd={[
          serviceSchema({ name: "Turf Installation & Seeding", description: "Large-acreage sod and seed installation for commercial, agricultural, and residential properties. Bermuda, fescue, zoysia, and more. Serving Upstate SC and Charlotte NC. Call (704) 221-8928.", path: "/services/turf-installation-seeding" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Services", path: "/services" },
            { name: "Turf Installation & Seeding", path: "/services/turf-installation-seeding" },
          ]),
        ]}
      />

      {/* PAGE HERO */}
      <section className="relative py-32 px-4 bg-secondary text-white overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-100">
          <img src={heroImg} alt="Lush new sod and grass" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-secondary/55" />
        </div>
        <div className="container relative z-10 mx-auto max-w-4xl space-y-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-4xl md:text-6xl font-serif font-extrabold tracking-tight text-white">
            Turf Installation & Seed Planting for Large-Acreage Properties in the Carolinas
          </h1>
          <p className="text-lg md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed font-medium">
            From commercial grounds to farm pastures to rural residential acreage, P1 installs turf that establishes strong, lasts long, and performs in the Carolinas' climate — at any scale.
          </p>
        </div>
      </section>

      {/* CONTENT SECTIONS */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl space-y-16">
          
          <FeatureRow heading="Turf Done Right Starts Before the First Seed" image={turfPrepImg} imageAlt="Site being prepared and graded before turf installation">
            <p>
              A healthy stand of turf — whether it's a commercial property lawn, a farm pasture, a sports field, or a residential estate — begins with proper site preparation. Bad grade, poor soil, improper species selection, and inadequate establishment practices are the reasons most large-acreage turf jobs fail within two to three years.
            </p>
            <p>
              P1 handles the full process: soil testing, site grading, soil amendment, species selection appropriate to your use and location, and professional seeding or sod installation. When we're responsible for everything, we can stand behind the result.
            </p>
          </FeatureRow>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">
                Sod Installation
              </h2>
              <ul className="space-y-3">
                {[
                  "Large-acreage sod installation for commercial and residential properties",
                  "Bermuda, Zoysia, Centipede, and Fescue sod options",
                  "Grade verification and correction before installation",
                  "Soil preparation and amendment",
                  "Post-installation watering guidance and establishment plan"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 bg-muted p-4 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                    <span className="text-secondary/90 font-medium leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">
                Seed Planting & Establishment
              </h2>
              <ul className="space-y-3">
                {[
                  "Broadcast and drill seeding for large acreage",
                  "Pasture and hay field establishment — Bermuda, Fescue, Bahia, and mixed species",
                  "Commercial turf seeding for grounds and common areas",
                  "Erosion control seeding on slopes and disturbed ground",
                  "Dormant seeding programs for cool-season species",
                  "Hydroseed applications for slopes and large-acreage establishment"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 bg-muted p-4 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                    <span className="text-secondary/90 font-medium leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <FeatureRow heading="Grass Species for the Carolinas" image={turfSpeciesImg} imageAlt="Close-up of lush, healthy established turf grass" reverse>
            <p>
              Upstate South Carolina and the Charlotte NC region span the transition zone between warm- and cool-season grasses, which means species selection matters more here than almost anywhere. P1 recommends the right species for your specific use, sun exposure, soil type, and maintenance commitment:
            </p>
          </FeatureRow>

          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <div className="grid grid-cols-1 gap-4">
              {[
                { title: "Bermudagrass", desc: "Best for high-traffic commercial turf, sports fields, and sunny pastures" },
                { title: "Tall Fescue", desc: "Ideal for transition zone lawns, commercial grounds, and shaded areas" },
                { title: "Zoysiagrass", desc: "Dense, low-maintenance warm-season option for commercial and residential sites" },
                { title: "Centipedegrass", desc: "Low-input warm-season grass for lower-fertility acidic soils" },
                { title: "Bahiagrass", desc: "Drought-tolerant pasture and erosion control option for coarser soils" }
              ].map((item, i) => (
                <div key={i} className="bg-card border border-border p-6 rounded-lg">
                  <h3 className="text-xl font-bold text-secondary mb-2">{item.title}</h3>
                  <p className="text-secondary/80">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6 bg-card border border-border p-8 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
            <h2 className="text-2xl font-serif font-bold text-secondary">
              From Cleared Ground to Established Turf
            </h2>
            <p className="text-lg text-secondary/80 leading-relaxed">
              If P1 cleared your land, graded it, and installed drainage — we can take you all the way to a thriving stand of turf. That continuity eliminates finger-pointing between contractors, ensures grade is correct for both drainage and turf health, and gives you a single team responsible for the outcome.
            </p>
          </div>

        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
