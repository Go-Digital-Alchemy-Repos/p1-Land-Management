import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { localBusinessSchema } from "@/lib/structured-data";
import heroImg from "@/assets/commercial-property.png";
import whoImg from "@/assets/features/about-who.png";
import { CheckCircle2 } from "lucide-react";

export default function About() {
  return (
    <Layout>
      <SEO 
        title="About P1 Land Management | Carolinas"
        description="Meet P1, a land and property contractor for 1-acre-plus commercial, industrial, agricultural, municipal, and institutional sites in the Carolinas."
        jsonLd={localBusinessSchema()}
      />

      {/* PAGE HERO */}
      <PageHero
        eyebrow="About P1"
        title={
          <>
            Land and grounds care with{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Nearly 30 Years of Experience
            </em>
          </>
        }
        subtitle="We help owners and managers look after large, working properties. From the first clearing job to regular grounds care, you have one team to call when something needs attention."
        image={heroImg}
        imageAlt="Commercial property"
      />

      {/* OUR STORY */}
      <section className="py-24 bg-background">
        <div className="site-shell">
          <FeatureRow heading="Who We Are" image={whoImg} imageAlt="Experienced P1 land management crew with heavy equipment">
            <p>
              P1 Land &amp; Property Management brings land preparation and ongoing care together. We clear and grade land, repair drainage, establish turf, and maintain the grounds as your property changes.
            </p>
            <p>
              Our name is new, but our experience spans nearly 30 years. We work across Upstate South Carolina and the greater Charlotte area, on everything from busy commercial grounds to open farmland.
            </p>
            <p>
              We work with property managers, farm operators, industrial facilities, municipalities, and institutions. We take time to understand how you use the land before recommending the work.
            </p>
            <p className="font-bold text-secondary text-xl border-l-4 border-primary pl-6 py-2 mt-8">
              We serve properties 1 acre and larger and do not provide residential services. Our equipment and crews are set up for large-acreage work.
            </p>
          </FeatureRow>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section className="py-24 bg-muted border-y border-border">
        <div className="site-shell">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-secondary">
              Help With What Comes Next
            </h2>
            <p className="text-lg text-secondary/80">
              Whether you're clearing land, fixing drainage, or keeping the grounds in shape, we can help. Start with the work you need now, and we'll help you plan what comes next.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {[
              "Weekly and seasonal property maintenance contracts",
              "Land clearing and forestry mulching",
              "Fine grading and site preparation",
              "Drainage planning, installation, and repairs",
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
              P1 serves commercial, industrial, agricultural, municipal, and institutional properties throughout Upstate South Carolina — including Greenville, Spartanburg, Anderson, Gaffney, Greer, Simpsonville, and surrounding counties — and the greater Charlotte, North Carolina region, including Concord, Mooresville, Lake Norman, Gastonia, Huntersville, Matthews, Waxhaw, Kannapolis, Indian Trail, Monroe, Belmont, Mount Holly, Cornelius, and the Mecklenburg County area. Our South Carolina border coverage includes Fort Mill, Rock Hill, and Indian Land, with large-acreage service throughout York County, Lancaster County, and Union County.
            </p>
          </div>
          <div className="space-y-6">
            <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">
              What to Expect From P1
            </h2>
            <ul className="space-y-4">
              {[
                "A written plan and clear pricing before work begins",
                "Commercial and agricultural property experience",
                "Equipped for large-scale earthwork and fine maintenance",
                "Serving both Upstate SC and Charlotte NC markets",
                "A site visit scheduled around your needs and our availability"
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
