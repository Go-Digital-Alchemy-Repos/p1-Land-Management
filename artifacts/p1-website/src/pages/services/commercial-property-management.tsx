import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { SEO } from "@/components/seo";
import { CheckCircle2 } from "lucide-react";
import heroImg from "@/assets/service-commercial.png";

export default function CommercialPropertyManagement() {
  return (
    <Layout>
      <SEO 
        title="Commercial Property Management | P1 Land & Property Management | Upstate SC & Charlotte NC"
        description="Professional commercial property maintenance for 1-acre-plus properties across Upstate SC and Charlotte NC. Turf, drainage, land clearing, ponds, and more. Call (704) 221-8928."
      />

      {/* PAGE HERO */}
      <section className="relative py-32 px-4 bg-secondary text-white overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30 mix-blend-overlay">
          <img src={heroImg} alt="Manicured commercial property landscape" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-secondary/80" />
        </div>
        <div className="container relative z-10 mx-auto max-w-4xl space-y-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-4xl md:text-6xl font-serif font-extrabold tracking-tight text-white">
            Commercial Property Management for Large-Acreage Properties
          </h1>
          <p className="text-lg md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed font-medium">
            P1 provides professional, scheduled property maintenance for commercial sites, business campuses, industrial properties, and large commercial landholdings throughout Upstate South Carolina and the Charlotte, NC region. If it's on your land, we manage it.
          </p>
        </div>
      </section>

      {/* CONTENT SECTIONS */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl space-y-16">
          
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-secondary border-b border-border pb-4">
              Your Commercial Property. Our Full Attention.
            </h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-6 text-lg leading-relaxed">
              <p>
                A well-maintained commercial property doesn't just look professional — it protects your investment, meets code requirements, and signals to clients and tenants that your business takes the details seriously. P1 Land & Property Management delivers the depth of service that large commercial properties actually require.
              </p>
              <p>
                We work with commercial developers, property managers, business campus owners, HOAs managing significant acreage, industrial facility managers, and private landowners who hold commercial-use land across both our markets.
              </p>
            </div>
          </div>

          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">
              What's Included in Our Commercial Programs
            </h2>
            <p className="text-lg text-secondary/80 leading-relaxed mb-6">
              P1 commercial property programs are customized to your site — but typically include:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Regular turf mowing, edging, and cleanup for large-acreage grounds",
                "Tree trimming, selective removal, and canopy management",
                "Pond, lake, and stormwater retention management",
                "Drainage maintenance and inspection",
                "Erosion control monitoring and repair",
                "Seasonal seeding, fertilization, and turf health programs",
                "Land clearing and brush management for undeveloped portions of your property",
                "Site grading corrections and drainage improvements as needed",
                "Waterway and ditch clearing and maintenance"
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
              Maintenance Schedules That Work for Your Operation
            </h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-6 text-lg leading-relaxed">
              <p>
                We offer weekly, bi-weekly, and monthly commercial maintenance contracts. Every program starts with a free on-site property assessment. We walk your land, document what it needs, and build a scope of work and schedule that fits your property and your budget.
              </p>
              <p>
                No cookie-cutter packages. No upsells you don't need. Just honest maintenance performed by an experienced crew with the right equipment.
              </p>
            </div>
          </div>

          <div className="space-y-8 bg-card border border-border p-8 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
            <h2 className="text-2xl font-serif font-bold text-secondary">
              Why Commercial Clients Choose P1
            </h2>
            <ul className="space-y-4">
              {[
                "1-acre minimum — we're built for large properties, not small lawns",
                "Single-vendor capability — turf, trees, drainage, ponds, clearing, and reconstruction",
                "Serving Upstate SC and Charlotte NC — two markets, one reliable team",
                "Licensed and insured for commercial work",
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
