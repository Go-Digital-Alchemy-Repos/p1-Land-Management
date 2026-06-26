import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema } from "@/lib/structured-data";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { CheckCircle2 } from "lucide-react";
import heroImg from "@/assets/service-pond.png";
import pondCareImg from "@/assets/features/pond-care.png";
import pondConstructionImg from "@/assets/features/pond-construction.png";

export default function PondWaterwayManagement() {
  return (
    <Layout>
      <SEO 
        title="Pond & Waterway Management | P1 Land & Property Management | Upstate SC & Charlotte NC"
        description="Professional pond management, waterway clearing, shoreline restoration, and water quality maintenance for large properties. Serving Upstate SC and Charlotte NC. Call (704) 221-8928."
        jsonLd={[
          serviceSchema({ name: "Pond & Waterway Management", description: "Professional pond management, waterway clearing, shoreline restoration, and water quality maintenance for large properties. Serving Upstate SC and Charlotte NC. Call (704) 221-8928.", path: "/services/pond-waterway-management" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Services", path: "/services" },
            { name: "Pond & Waterway Management", path: "/services/pond-waterway-management" },
          ]),
        ]}
      />

      {/* PAGE HERO */}
      <PageHero
        eyebrow="Pond & Waterway Management"
        title={
          <>
            Pond & Waterway Management for{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Large Properties
            </em>{" "}
            in the Carolinas
          </>
        }
        subtitle="A healthy pond or waterway is an asset. A neglected one is a liability. P1 keeps your water features functioning, clean, and properly maintained — whether it's a farm pond, a stormwater retention basin, or a decorative water feature on a commercial property."
        image={heroImg}
        imageAlt="Pristine retention pond with banks"
      />

      {/* CONTENT SECTIONS */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl space-y-16">
          
          <FeatureRow heading="Professional Pond and Waterway Care at Property Scale" image={pondCareImg} imageAlt="Well-maintained pond on a large property">
            <p>
              Ponds and waterways on large properties do more than look good. They manage stormwater runoff, support agricultural operations, provide wildlife habitat, and contribute significantly to property value. But without active maintenance, they silt up, become overgrown, develop water quality problems, and eventually fail to perform their function.
            </p>
            <p>
              P1 provides ongoing pond management and one-time pond restoration services across Upstate South Carolina and the Charlotte, NC region — including waterway clearing, shoreline management, and drainage integration.
            </p>
          </FeatureRow>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">
                Pond Management Services
              </h2>
              <ul className="space-y-3">
                {[
                  "Routine pond maintenance programs — monthly or quarterly site visits",
                  "Aquatic weed and algae management",
                  "Water quality assessment and treatment recommendations",
                  "Shoreline restoration — stabilization, erosion repair, and vegetation management",
                  "Aeration system installation and maintenance",
                  "Pond dam inspection and minor repairs",
                  "Sediment and silt management planning",
                  "Fish habitat management and stocking coordination",
                  "Stormwater retention pond compliance and maintenance"
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
                Waterway & Drainage Ditch Services
              </h2>
              <ul className="space-y-3">
                {[
                  "Creek and stream bank stabilization",
                  "Drainage ditch clearing, shaping, and regrading",
                  "Waterway vegetation clearing",
                  "Culvert inspection and clearing",
                  "Wetland buffer maintenance",
                  "Flood damage assessment and cleanup"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 bg-muted p-4 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                    <span className="text-secondary/90 font-medium leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <FeatureRow heading="Pond Construction & Restoration" image={pondConstructionImg} imageAlt="Excavator reshaping a pond embankment during construction" reverse>
            <p>
              If your pond has silted in, lost its embankment integrity, or simply never performed well, P1 can restore it to full function or construct a new pond that's properly sized and graded from the start. We handle excavation, dam construction, inlet and outlet installation, and shoreline stabilization.
            </p>
          </FeatureRow>

          <div className="space-y-6 bg-card border border-border p-8 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
            <h2 className="text-2xl font-serif font-bold text-secondary">
              Stormwater Retention Compliance
            </h2>
            <p className="text-lg text-secondary/80 leading-relaxed">
              Commercial properties with stormwater retention ponds are often subject to local and state maintenance requirements. P1 provides documented maintenance programs that keep your retention systems functioning within regulatory standards — and gives you the records to prove it.
            </p>
          </div>

        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
