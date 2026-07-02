import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema } from "@/lib/structured-data";
import { CheckCircle2 } from "lucide-react";
import heroImg from "@/assets/service-grading.png";
import levelImg from "@/assets/features/grading-level.png";
import drainageImg from "@/assets/features/grading-drainage.png";
import turfImg from "@/assets/features/grading-turf.png";
import constructionImg from "@/assets/features/grading-construction.png";

export default function GradingSitePreparation() {
  return (
    <Layout>
      <SEO 
        title="Fine Grading & Site Preparation Upstate SC & Charlotte NC | P1 Land & Property Management"
        description="Precision grading and site preparation for commercial, agricultural, and large residential properties. Serving Greenville, Spartanburg, and Charlotte NC. Call (704) 221-8928."
        jsonLd={[
          serviceSchema({ name: "Fine Grading & Site Preparation", description: "Precision grading and site preparation for commercial, agricultural, and large residential properties. Serving Greenville, Spartanburg, and Charlotte NC. Call (704) 221-8928.", path: "/services/grading-site-preparation" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Services", path: "/services" },
            { name: "Fine Grading & Site Preparation", path: "/services/grading-site-preparation" },
          ]),
        ]}
      />

      {/* PAGE HERO */}
      <PageHero
        indexOfWork
        eyebrow="Grading & Site Preparation"
        title={
          <>
            Fine Grading & Site Preparation for{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Large Properties
            </em>{" "}
            in the Carolinas
          </>
        }
        subtitle="Precise grading makes everything else possible — proper drainage, stable foundations, healthy turf, and long-term land performance. P1 delivers accurate, professional grading for sites of any size across Upstate SC and Charlotte NC."
        image={heroImg}
        imageAlt="Bulldozer grading a dirt site"
      />

      {/* CONTENT SECTIONS */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl space-y-16">
          
          <FeatureRow heading="Get Your Land Level — and Keep It That Way" image={levelImg} imageAlt="Motor grader leveling a large dirt site">
            <p>
              Poorly graded land causes problems that compound over time: standing water, erosion, foundation pressure, failed turf, and drainage failure. Whether you're preparing a site for construction, correcting existing drainage issues, or establishing grade for new turf, P1 brings the equipment and expertise to get it right the first time.
            </p>
          </FeatureRow>

          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">
              Grading Services
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Rough grading — initial leveling and shaping after land clearing",
                "Fine grading — precision finish grade for drainage, turf, or construction",
                "Regrading — correcting improper or failed grade on existing properties",
                "Slope grading — creating or correcting slopes for water flow management",
                "Pad preparation — building pads for structures, equipment storage, or hardscapes",
                "Access road grading — shaping and grading roads, paths, and driveways on large properties",
                "Agricultural field leveling — improving drainage and accessibility for farm use"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 bg-muted p-4 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <span className="text-secondary/90 font-medium leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <FeatureRow heading="Grading for Drainage" image={drainageImg} imageAlt="Graded swale channeling water across a property" reverse>
            <p>
              More than 80% of land drainage problems have their root in improper grade. Water follows the slope of the land — when that slope is wrong, water pools where it shouldn't, runs where it causes damage, and saturates soil that should stay dry. P1 grades with drainage as the primary outcome: every slope, every swale, every transition is designed to move water where it belongs.
            </p>
          </FeatureRow>

          <FeatureRow heading="Grading for Turf Establishment" image={turfImg} imageAlt="Freshly graded soil transitioning into new sod">
            <p>
              Turf installation on improperly graded ground fails. Before P1 lays sod or seeds an acre, we verify the grade is correct for drainage and root establishment. When we handle both grading and turf, you get a result that lasts — and a single point of accountability if it doesn't.
            </p>
          </FeatureRow>

          <FeatureRow heading="Grading for New Construction" image={constructionImg} imageAlt="New residential neighborhood under construction on freshly graded land" reverse>
            <p>
              Every building starts with the ground beneath it. Before foundations are poured, roads are paved, or utilities go in, the site has to be graded to spec — level pads, correct slopes for drainage, and a stable, compacted surface that holds up under construction traffic. P1 prepares sites for new homes, neighborhoods, and commercial developments across Upstate SC and Charlotte NC, delivering grade that meets engineered plans and keeps your project on schedule.
            </p>
          </FeatureRow>

          <div className="space-y-6 bg-card border border-border p-8 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
            <h2 className="text-2xl font-serif font-bold text-secondary">
              Equipment & Precision
            </h2>
            <p className="text-lg text-secondary/80 leading-relaxed">
              P1 uses GPS-guided grading equipment where precision tolerances demand it, and experienced operators for the full range of work from rough shaping to fine finish. We work on properties from a few acres to several hundred, across both commercial and agricultural applications.
            </p>
          </div>

        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
