import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { SEO } from "@/components/seo";
import heroImg from "@/assets/commercial-property.png";
import { CheckCircle2 } from "lucide-react";

export default function About() {
  return (
    <Layout>
      <SEO 
        title="About P1 Land & Property Management | Upstate SC & Charlotte NC"
        description="P1 Land & Property Management is a full-service land and property contractor serving commercial, industrial, and agricultural landowners across Upstate South Carolina and the Charlotte, NC region."
      />

      {/* PAGE HERO */}
      <section className="relative py-32 px-4 bg-secondary text-white text-center overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20 mix-blend-overlay">
          <img src={heroImg} alt="Commercial property" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-secondary/80" />
        </div>
        <div className="container relative z-10 mx-auto max-w-4xl space-y-6">
          <h1 className="text-4xl md:text-6xl font-serif font-extrabold tracking-tight text-white">
            Built for the Property Owner Who Needs More Than a Lawn Crew
          </h1>
          <p className="text-lg md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed font-medium">
            P1 Land & Property Management was built from the ground up to serve one kind of client: the owner or manager of a large, working property who can't afford downtime, half measures, or contractors who disappear after the first job.
          </p>
        </div>
      </section>

      {/* OUR STORY */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl space-y-8">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-secondary border-b border-border pb-4">
            Who We Are
          </h2>
          <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-6 text-lg leading-relaxed">
            <p>
              P1 Land & Property Management was founded on a simple idea: that commercial, agricultural, and large residential landowners in the Carolinas deserve a single, capable contractor who can manage the full life of their property — from rough clearing to fine turf, from drainage repair to complete reconstruction.
            </p>
            <p>
              We operate across two of the region's fastest-growing markets: the Greenville-Spartanburg corridor in Upstate South Carolina, and the greater Charlotte, North Carolina area. Our crews are equipped for heavy earthwork and trained for precision maintenance — the same team that clears 50 acres can turn around and seed it perfectly.
            </p>
            <p>
              Our clients include commercial property developers, farm owners, industrial site managers, HOAs managing large common areas, equestrian property owners, and rural landowners who simply want their land working for them, not against them.
            </p>
            <p className="font-bold text-secondary text-xl border-l-4 border-primary pl-6 py-2 mt-8">
              We don't take small residential lawn jobs. Our minimum is 1 acre, and our specialty is the kind of work that takes real equipment, real experience, and a real commitment to getting it done right.
            </p>
          </div>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section className="py-24 px-4 bg-muted border-y border-border">
        <div className="container mx-auto max-w-5xl">
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
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-16">
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
              Licensed, Insured, and Ready
            </h2>
            <ul className="space-y-4">
              {[
                "Fully licensed and insured",
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
