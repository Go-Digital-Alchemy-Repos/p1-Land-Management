import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import heroImg from "@/assets/service-pond.png";
import pondCareImg from "@/assets/features/pond-care.png";
import pondConstructionImg from "@/assets/features/pond-construction.png";

const FAQS = [
  {
    question: "Does P1 build new ponds?",
    answer:
      "Yes. P1 constructs new ponds that are properly sized and graded from the start — handling excavation, dam construction, inlet and outlet installation, and shoreline stabilization — and also restores existing ponds that have silted in or lost embankment integrity.",
  },
  {
    question: "How often should a pond be professionally maintained?",
    answer:
      "Most ponds benefit from monthly or quarterly maintenance visits covering aquatic weed and algae management, water quality checks, shoreline condition, and dam inspection. P1 builds routine maintenance programs around your pond's size, use, and condition.",
  },
  {
    question: "Can P1 restore a pond that has silted in or become overgrown?",
    answer:
      "Yes. P1 restores neglected ponds to full function — sediment and silt management, embankment repair, shoreline restoration, vegetation clearing, and inlet/outlet work — whether it's a farm pond, a decorative water feature, or a stormwater basin.",
  },
  {
    question: "Does P1 maintain stormwater retention ponds for compliance?",
    answer:
      "Yes. Commercial retention ponds are often subject to local and state maintenance requirements. P1 provides documented maintenance programs that keep retention systems functioning within regulatory standards — with the records to prove it.",
  },
];

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
          faqSchema(FAQS),
        ]}
      />

      {/* PAGE HERO */}
      <PageHero
        indexOfWork
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
      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          
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

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Pond & Waterway Management FAQs</h2>
            <div className="space-y-6">
              {FAQS.map((f) => (
                <div key={f.question} className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-2">
                  <h3 className="text-lg font-serif font-bold text-secondary">{f.question}</h3>
                  <p className="text-secondary/80 leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
            <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
              Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your pond or waterway.
            </p>
          </div>

        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
