import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import heroImg from "@/assets/service-clearing.png";
import preparesImg from "@/assets/features/clearing-prepares.png";
import mulchingImg from "@/assets/features/clearing-mulching.png";

import { FaqAccordion } from "@/components/content/FaqAccordion";

const FAQS = [
  {
    question: "How much does land clearing cost in Upstate SC and Charlotte NC?",
    answer:
      "Cost depends on acreage, vegetation, terrain, access, and how debris will be handled. Forestry mulching can be a good option when material can stay on site. We provide a free site assessment and written estimate before work begins.",
  },
  {
    question: "What is forestry mulching and when is it the better option?",
    answer:
      "Forestry mulching uses a single machine to grind trees, brush, and stumps into mulch that stays on site — protecting topsoil, reducing erosion, and eliminating hauling costs. It's ideal for pasture expansion, fence lines, perimeter clearing, and vegetation control where construction-grade grubbing isn't required.",
  },
  {
    question: "Does P1 clear land for new construction?",
    answer:
      "Yes. P1 clears commercial, industrial, agricultural, municipal, and institutional construction sites — trees, stumps, brush, and debris — and can continue through rough grading, fine grading, drainage installation, and turf establishment so your site is fully build-ready under one contractor.",
  },
  {
    question: "What size land clearing projects does P1 take on?",
    answer:
      "P1 handles everything from clearing a few overgrown acres to opening up 100+ acres for development. We focus on properties 1 acre and larger across Upstate South Carolina and the greater Charlotte, NC region.",
  },
];

export default function LandClearing() {
  return (
    <Layout>
      <SEO 
        title="Land Clearing in Upstate SC & Charlotte | P1"
        description="Land clearing and forestry mulching for commercial, industrial, agricultural, municipal, and institutional sites. Call (704) 221-8928."
        jsonLd={[
          serviceSchema({ name: "Land Clearing", description: "Professional land clearing for commercial, industrial, agricultural, municipal, and institutional properties. Trees, brush, stumps, and vegetation removed efficiently. Serving Upstate SC and Charlotte NC. Call (704) 221-8928.", path: "/services/land-clearing" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Services", path: "/services" },
            { name: "Land Clearing", path: "/services/land-clearing" },
          ]),
          faqSchema(FAQS),
        ]}
      />

      {/* PAGE HERO */}
      <PageHero
        indexOfWork
        eyebrow="Land Clearing"
        title={
          <>
            Land Clearing for{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Large-Acreage Properties
            </em>{" "}
            in Upstate SC and Charlotte NC
          </>
        }
        subtitle="We clear overgrown acreage and prepare large tracts for their next use. We&#x27;ll choose the equipment and method around your land, access, and plans."
        image={heroImg}
        imageAlt="Excavator clearing brush in woods"
      />

      {/* CONTENT SECTIONS */}
      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          
          <FeatureRow heading="Professional Land Clearing That Prepares Your Property for What's Next" image={preparesImg} imageAlt="Land being cleared and prepared for its next use">
            <p>
              Preparing a construction site, opening pasture, or reclaiming overgrown ground starts with a plan for what stays and what goes. We'll walk the land with you before clearing begins.
            </p>
            <p>
              We handle the full clearing process — trees, stumps, brush, vines, briars, and debris — using the right equipment for each site and each soil type. We serve commercial developers, farmers, industrial facilities, municipalities, institutions, and property managers across Upstate South Carolina and the greater Charlotte, North Carolina area.
            </p>
          </FeatureRow>

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

          <FeatureRow heading="Forestry Mulching: The Efficient Alternative" image={mulchingImg} imageAlt="Forestry mulcher grinding vegetation into mulch on site" reverse>
            <p>
              For many sites, forestry mulching is the most efficient and cost-effective clearing method. A single machine grinds trees, brush, and stumps directly into mulch that stays on site — protecting the soil, reducing erosion, and eliminating the cost and mess of hauling debris. The mulch layer also decomposes naturally, improving soil health over time.
            </p>
            <p>
              Forestry mulching is ideal for acreage where the goal is vegetation control rather than construction grading — pasture expansion, fence line management, and perimeter clearing all benefit from this method.
            </p>
          </FeatureRow>

          <div className="space-y-6 bg-card border border-border p-8 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
            <h2 className="text-2xl font-serif font-bold text-secondary">
              What Comes After Clearing
            </h2>
            <p className="text-lg text-secondary/80 leading-relaxed mb-6">
              Clearing may be the first job, with grading, drainage, and seeding to follow. We can help you plan those stages and look after the grounds once they're established.
            </p>
            <h3 className="text-xl font-serif font-bold text-secondary mt-8 mb-4">
              Service Area
            </h3>
            <p className="text-lg text-secondary/80 leading-relaxed">
              P1 provides land clearing throughout Upstate South Carolina — including Greenville, Spartanburg, Anderson, Gaffney, Greer, and surrounding counties — and the greater Charlotte, NC region, including Concord, Mooresville, Lake Norman, Gastonia, and Mecklenburg County.
            </p>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Land Clearing FAQs</h2>
            <FaqAccordion items={FAQS} />
            <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
              Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your clearing project.
            </p>
          </div>

        </div>
      </section>

      <section className="site-shell py-12"><h2 className="text-2xl font-bold">Controlling perimeter acreage around an active facility?</h2><p className="mt-4 text-muted-foreground">Connect selective clearing and buffer management with drainage, sightlines, service roads, and scheduled exterior care.</p><Link href="/commercial/data-centers-secure-facilities" className="mt-5 inline-block font-bold text-primary underline">Secure campus land and grounds management</Link></section>
      <FinalCTA />
    </Layout>
  );
}
