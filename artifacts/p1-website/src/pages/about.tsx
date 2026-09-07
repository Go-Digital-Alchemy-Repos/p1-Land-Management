import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import heroImg from "@/assets/commercial-property.png";
import whoImg from "@/assets/features/about-who.png";
import { CheckCircle2 } from "lucide-react";

export default function About() {
  return (
    <Layout>
      <SEO 
        title="About P1 Land & Property Management | Upstate SC & Charlotte NC"
        description="P1 Land & Property Management is a full-service land and property contractor serving commercial, industrial, and agricultural landowners across Upstate South Carolina and the Charlotte, NC region."
      />

      {/* PAGE HERO */}
      <PageHero
        eyebrow="About P1"
        title={
          <>
            Built for the property owner who needs{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              more than a lawn crew
            </em>
          </>
        }
        subtitle="P1 Land & Property Management was built from the ground up to serve one kind of client: the owner or manager of a large, working property who can't afford downtime, half measures, or contractors who disappear after the first job."
        image={heroImg}
        imageAlt="Commercial property"
      />

      {/* OUR STORY */}
      <section className="py-24 bg-background">
        <div className="site-shell">
          <FeatureRow heading="Who We Are" image={whoImg} imageAlt="Experienced P1 land management crew with heavy equipment">
            <p>
              P1 Land & Property Management was founded on a simple idea: that commercial, agricultural, and large residential landowners in the Carolinas deserve a single, capable contractor who can manage the full life of their property — from rough clearing to fine turf, from drainage repair to complete reconstruction.
            </p>
            <p>
              We operate across two of the region's fastest-growing markets: the Greenville-Spartanburg corridor in Upstate South Carolina, and the greater Charlotte, North Carolina area. Our services span land preparation and ongoing property maintenance.
            </p>
            <p>
              Our services are intended for commercial property developers, farm owners, industrial site managers, HOAs managing large common areas, equestrian property owners, and rural landowners who simply want their land working for them, not against them.
            </p>
            <p className="font-bold text-secondary text-xl border-l-4 border-primary pl-6 py-2 mt-8">
              We don't take small residential lawn jobs. Our minimum is 1 acre, and our specialty is the kind of work that takes real equipment, real experience, and a real commitment to getting it done right.
            </p>
          </FeatureRow>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section className="py-24 bg-muted border-y border-border">
        <div className="site-shell">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-secondary">
              Full-Service. Full Commitment.
            </h2>
            <p className="text-lg text-secondary/80">
              P1 offers the complete range of land and property services — which means you can start a relationship with us at any stage of your property's life and never need to call anyone else.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {[
              "Weekly and seasonal property maintenance contracts",
              "Land clearing and forestry mulching",
              "Fine grading and site preparation",
              "Drainage design and installation",
              "Sod and seed installation for large acreage",
              "Tree management, trimming, and removal",
              "Pond and waterway care and management",
              "Full property reconstruction — from drainage overhaul to complete regrading and reseeding"
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 bg-card p-6 rounded-lg border border-border shadow-sm">
                <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                <span className="text-secondary font-medium leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICE AREAS & CREDENTIALS */}
      <section className="py-24 bg-background">
        <div className="site-shell grid grid-cols-1 md:grid-cols-2 gap-16">
          <div className="space-y-6">
            <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">
              Where We Work
            </h2>
            <p className="text-lg text-secondary/80 leading-relaxed">
              P1 serves commercial, agricultural, and large residential property owners throughout Upstate South Carolina — including Greenville, Spartanburg, Anderson, Gaffney, Greer, Simpsonville, and surrounding counties — and the greater Charlotte, North Carolina region, including Concord, Mooresville, Lake Norman, Gastonia, Huntersville, and the Mecklenburg County area.
            </p>
          </div>
          <div className="space-y-6">
            <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">
              Discuss Your Property With P1
            </h2>
            <ul className="space-y-4">
              {[
                "Discuss project requirements and documentation with our team",
                "Commercial and agricultural property experience",
                "Equipped for large-scale earthwork and fine maintenance",
                "Serving both Upstate SC and Charlotte NC markets",
                "Free on-site property assessments"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-lg text-secondary/80 font-medium">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
