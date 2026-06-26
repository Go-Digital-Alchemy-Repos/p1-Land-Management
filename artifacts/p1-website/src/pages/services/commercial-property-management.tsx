import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema } from "@/lib/structured-data";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { CheckCircle2 } from "lucide-react";
import heroImg from "@/assets/service-commercial.png";
import attentionImg from "@/assets/features/commercial-attention.png";
import scheduleImg from "@/assets/features/commercial-schedule.png";

export default function CommercialPropertyManagement() {
  return (
    <Layout>
      <SEO 
        title="Commercial Property Management | P1 Land & Property Management | Upstate SC & Charlotte NC"
        description="Professional commercial property maintenance for 1-acre-plus properties across Upstate SC and Charlotte NC. Turf, drainage, land clearing, ponds, and more. Call (704) 221-8928."
        jsonLd={[
          serviceSchema({ name: "Commercial Property Management", description: "Professional commercial property maintenance for 1-acre-plus properties across Upstate SC and Charlotte NC. Turf, drainage, land clearing, ponds, and more. Call (704) 221-8928.", path: "/services/commercial-property-management" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Services", path: "/services" },
            { name: "Commercial Property Management", path: "/services/commercial-property-management" },
          ]),
        ]}
      />

      {/* PAGE HERO */}
      <PageHero
        eyebrow="Commercial Property Management"
        title={
          <>
            Commercial Property Management for{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Large-Acreage Properties
            </em>
          </>
        }
        subtitle="P1 provides professional, scheduled property maintenance for commercial sites, business campuses, industrial properties, and large commercial landholdings throughout Upstate South Carolina and the Charlotte, NC region. If it's on your land, we manage it."
        image={heroImg}
        imageAlt="Manicured commercial property landscape"
      />

      {/* CONTENT SECTIONS */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl space-y-16">
          
          <FeatureRow heading="Your Commercial Property. Our Full Attention." image={attentionImg} imageAlt="Crew maintaining a large commercial property's grounds">
            <p>
              A well-maintained commercial property doesn't just look professional — it protects your investment, meets code requirements, and signals to clients and tenants that your business takes the details seriously. P1 Land & Property Management delivers the depth of service that large commercial properties actually require.
            </p>
            <p>
              We work with commercial developers, property managers, business campus owners, HOAs managing significant acreage, industrial facility managers, and private landowners who hold commercial-use land across both our markets.
            </p>
          </FeatureRow>

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

          <FeatureRow heading="Maintenance Schedules That Work for Your Operation" image={scheduleImg} imageAlt="Operator on a commercial maintenance schedule" reverse>
            <p>
              We offer weekly, bi-weekly, and monthly commercial maintenance contracts. Every program starts with a free on-site property assessment. We walk your land, document what it needs, and build a scope of work and schedule that fits your property and your budget.
            </p>
            <p>
              No cookie-cutter packages. No upsells you don't need. Just honest maintenance performed by an experienced crew with the right equipment.
            </p>
          </FeatureRow>

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
