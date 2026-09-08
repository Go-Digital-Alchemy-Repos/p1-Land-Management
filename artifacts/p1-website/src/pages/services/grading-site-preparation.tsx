import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import heroImg from "@/assets/service-grading.png";
import levelImg from "@/assets/features/grading-level.png";
import drainageImg from "@/assets/features/grading-drainage.png";
import turfImg from "@/assets/features/grading-turf.png";
import constructionImg from "@/assets/features/grading-construction.png";

const FAQS = [
  {
    question: "What's the difference between rough grading and fine grading?",
    answer:
      "Rough grading is the initial shaping and leveling of a site after clearing. Fine grading is the finish work that prepares the site for its approved drainage, turf or construction plan. Discuss the required tolerances, equipment and delivery scope with P1 before work begins.",
  },
  {
    question: "Can regrading fix drainage problems on my property?",
    answer:
      "Improper grade can contribute to drainage problems. P1 can review slopes, swales and transitions with you and discuss regrading or a coordinated drainage scope, subject to the property conditions, approved plans and any specialist review.",
  },
  {
    question: "Does P1 grade sites for new construction?",
    answer:
      "P1 discusses building pads, roads, and site preparation for new homes, neighborhoods, and commercial developments across Upstate SC and Charlotte NC. Confirm approved plans, tolerances, equipment and any licensed specialist involvement before work begins.",
  },
  {
    question: "Why does grading matter before installing turf?",
    answer:
      "Turf performance depends on grade, drainage, soil preparation, species selection and establishment practices. Confirm the approved preparation, responsibilities and expected outcomes for grading and turf work before scheduling.",
  },
];

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
          faqSchema(FAQS),
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
        subtitle="Grading affects drainage, foundations, turf and long-term land performance. P1 reviews the requested scope, approved plans and site conditions for commercial, agricultural and large-acreage properties in Upstate SC and Charlotte NC."
        image={heroImg}
        imageAlt="Bulldozer grading a dirt site"
      />

      {/* CONTENT SECTIONS */}
      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          
          <FeatureRow heading="Get Your Land Level — and Keep It That Way" image={levelImg} imageAlt="Motor grader leveling a large dirt site">
            <p>
              Poorly graded land can contribute to standing water, erosion, foundation pressure, turf problems and drainage issues. Whether you are preparing a construction site, reviewing drainage concerns or establishing grade for turf, discuss the approved plans, site conditions, equipment and delivery scope with P1 before work begins.
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
              Turf installation on improperly graded ground can struggle. Before grading and turf work begin, confirm the approved grade, drainage approach, establishment practices and delivery responsibilities for the property. A coordinated scope helps keep those decisions with the same project team.
            </p>
          </FeatureRow>

          <FeatureRow heading="Grading for New Construction" image={constructionImg} imageAlt="New residential neighborhood under construction on freshly graded land" reverse>
            <p>
              Every building starts with the ground beneath it. Before foundations are poured, roads are paved, or utilities go in, grading must be coordinated with the approved plans and project team. P1 discusses building pads, slopes, drainage and sub-grade preparation for new homes, neighborhoods and commercial developments across Upstate South Carolina and the Charlotte, NC region.
            </p>
          </FeatureRow>

          <div className="space-y-6 bg-card border border-border p-8 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
            <h2 className="text-2xl font-serif font-bold text-secondary">
              Equipment & Precision
            </h2>
            <p className="text-lg text-secondary/80 leading-relaxed">
              Discuss the equipment, operators and accuracy targets needed for your grading scope before work begins. P1 reviews rough shaping, finish work and access requirements for commercial and agricultural properties during qualification.
            </p>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Grading & Site Preparation FAQs</h2>
            <div className="space-y-6">
              {FAQS.map((f) => (
                <div key={f.question} className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-2">
                  <h3 className="text-lg font-serif font-bold text-secondary">{f.question}</h3>
                  <p className="text-secondary/80 leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
            <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
              Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your grading project.
            </p>
          </div>

        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
