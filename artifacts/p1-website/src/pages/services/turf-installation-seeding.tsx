import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import heroImg from "@/assets/service-turf.png";
import turfPrepImg from "@/assets/features/turf-prep.png";
import turfSpeciesImg from "@/assets/features/turf-species.png";

import { FaqAccordion } from "@/components/content/FaqAccordion";

const FAQS = [
  {
    question: "What grass species grow best in Upstate SC and Charlotte NC?",
    answer:
      "The Carolinas sit in the transition zone between warm- and cool-season grasses, so species selection matters. Bermudagrass suits high-traffic sunny sites, Tall Fescue handles shade and transition-zone lawns, Zoysia offers dense low-maintenance turf, Centipede fits low-fertility acidic soils, and Bahia works for drought-prone pastures.",
  },
  {
    question: "Should I choose sod or seed for my property?",
    answer:
      "Sod gives instant coverage and is best for commercial grounds and high-visibility areas; seeding — including broadcast, drill, and hydroseed — is more economical at large acreage and the standard choice for pastures, hay fields, and erosion control. P1 recommends the right method for your use, budget, and timeline.",
  },
  {
    question: "How large an area can P1 seed or sod?",
    answer:
      "P1 is built for large-acreage work — from commercial lawns to pastures and hay fields spanning dozens of acres. We use broadcast and drill seeding, hydroseed applications for slopes, and large-scale sod installation across Upstate SC and the Charlotte NC region.",
  },
  {
    question: "Why do large turf installations fail within a few years?",
    answer:
      "Most failures trace back to bad grade, poor soil preparation, wrong species selection, or inadequate establishment practices. P1 handles the full process — soil testing, grading, amendment, species selection, and installation — so the result establishes strong and lasts.",
  },
];

export default function TurfInstallationSeeding() {
  return (
    <Layout>
      <SEO 
        title="Turf Installation & Seeding for Large Acreage | P1 Land & Property Management | Upstate SC & Charlotte NC"
        description="Large-acreage sod and seed installation for commercial, agricultural, and residential properties. Bermuda, fescue, zoysia, and more. Serving Upstate SC and Charlotte NC. Call (704) 221-8928."
        jsonLd={[
          serviceSchema({ name: "Turf Installation & Seeding", description: "Large-acreage sod and seed installation for commercial, agricultural, and residential properties. Bermuda, fescue, zoysia, and more. Serving Upstate SC and Charlotte NC. Call (704) 221-8928.", path: "/services/turf-installation-seeding" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Services", path: "/services" },
            { name: "Turf Installation & Seeding", path: "/services/turf-installation-seeding" },
          ]),
          faqSchema(FAQS),
        ]}
      />

      {/* PAGE HERO */}
      <PageHero
        indexOfWork
        eyebrow="Turf Installation & Seeding"
        title={
          <>
            Turf Installation & Seed Planting for{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Large-Acreage Properties
            </em>{" "}
            in the Carolinas
          </>
        }
        subtitle="From commercial grounds to farm pastures to rural residential acreage, P1 installs turf that establishes strong, lasts long, and performs in the Carolinas' climate — at any scale."
        image={heroImg}
        imageAlt="Lush new sod and grass"
      />

      {/* CONTENT SECTIONS */}
      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          
          <FeatureRow heading="Turf Done Right Starts Before the First Seed" image={turfPrepImg} imageAlt="Site being prepared and graded before turf installation">
            <p>
              A healthy stand of turf — whether it's a commercial property lawn, a farm pasture, a sports field, or a residential estate — begins with proper site preparation. Bad grade, poor soil, improper species selection, and inadequate establishment practices are the reasons most large-acreage turf jobs fail within two to three years.
            </p>
            <p>
              Discuss soil testing, site grading, amendment, species selection and seeding or sod installation with P1 as part of the agreed scope. Establishment practices, responsibilities and any result commitments should be confirmed in writing before work begins.
            </p>
          </FeatureRow>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">
                Sod Installation
              </h2>
              <ul className="space-y-3">
                {[
                  "Large-acreage sod installation for commercial and residential properties",
                  "Bermuda, Zoysia, Centipede, and Fescue sod options",
                  "Grade verification and correction before installation",
                  "Soil preparation and amendment",
                  "Post-installation watering guidance and establishment plan"
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
                Seed Planting & Establishment
              </h2>
              <ul className="space-y-3">
                {[
                  "Broadcast and drill seeding for large acreage",
                  "Pasture and hay field establishment — Bermuda, Fescue, Bahia, and mixed species",
                  "Commercial turf seeding for grounds and common areas",
                  "Erosion control seeding on slopes and disturbed ground",
                  "Dormant seeding programs for cool-season species",
                  "Hydroseed applications for slopes and large-acreage establishment"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 bg-muted p-4 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                    <span className="text-secondary/90 font-medium leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <FeatureRow heading="Grass Species for the Carolinas" image={turfSpeciesImg} imageAlt="Close-up of lush, healthy established turf grass" reverse>
            <p>
              Upstate South Carolina and the Charlotte NC region span the transition zone between warm- and cool-season grasses, which means species selection matters more here than almost anywhere. P1 recommends the right species for your specific use, sun exposure, soil type, and maintenance commitment:
            </p>
          </FeatureRow>

          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <div className="grid grid-cols-1 gap-4">
              {[
                { title: "Bermudagrass", desc: "Best for high-traffic commercial turf, sports fields, and sunny pastures" },
                { title: "Tall Fescue", desc: "Ideal for transition zone lawns, commercial grounds, and shaded areas" },
                { title: "Zoysiagrass", desc: "Dense, low-maintenance warm-season option for commercial and residential sites" },
                { title: "Centipedegrass", desc: "Low-input warm-season grass for lower-fertility acidic soils" },
                { title: "Bahiagrass", desc: "Drought-tolerant pasture and erosion control option for coarser soils" }
              ].map((item, i) => (
                <div key={i} className="bg-card border border-border p-6 rounded-lg">
                  <h3 className="text-xl font-bold text-secondary mb-2">{item.title}</h3>
                  <p className="text-secondary/80">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6 bg-card border border-border p-8 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
            <h2 className="text-2xl font-serif font-bold text-secondary">
              From Cleared Ground to Established Turf
            </h2>
            <p className="text-lg text-secondary/80 leading-relaxed">
              If P1 cleared your land, graded it, and installed drainage — we can take you all the way to a thriving stand of turf. That continuity eliminates finger-pointing between contractors, ensures grade is correct for both drainage and turf health, and gives you a single team responsible for the outcome.
            </p>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Turf Installation & Seeding FAQs</h2>
            <FaqAccordion items={FAQS} />
            <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
              Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your turf project.
            </p>
          </div>

        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
