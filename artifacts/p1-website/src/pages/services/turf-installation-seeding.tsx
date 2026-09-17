import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { turfHero as heroImg } from "@/lib/service-images";
import turfPrepImg from "@/assets/features/turf-prep.png";
import turfSpeciesImg from "@/assets/features/turf-species.png";

import { FaqAccordion } from "@/components/content/FaqAccordion";

const FAQS = [
  {
    question: "What grass species grow best in Upstate SC and Charlotte NC?",
    answer:
      "The Carolinas sit in the transition zone between warm- and cool-season grasses, so species selection matters. Bermuda grass suits high-traffic sunny sites, Tall Fescue handles shade and transition-zone lawns, Zoysia grass offers dense low-maintenance turf, Centipede grass fits low-fertility acidic soils, and Bahia grass works for drought-prone pastures.",
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
      "Poor drainage, soil preparation, grass choice, or early care can keep turf from establishing well. We review those conditions before planting and explain the watering and maintenance needed afterward.",
  },
];

export default function TurfInstallationSeeding() {
  return (
    <Layout>
      <SEO 
        title="Large-Acreage Turf Installation in SC & NC | P1"
        description="Sod and seed installation for commercial, industrial, agricultural, municipal, and institutional properties. Call (704) 221-8928."
        jsonLd={[
          serviceSchema({ name: "Turf Installation & Seeding", description: "Large-acreage sod and seed installation for commercial, industrial, agricultural, municipal, and institutional properties. Bermuda, fescue, zoysia, and more. Serving Upstate SC and Charlotte NC. Call (704) 221-8928.", path: "/services/turf-installation-seeding" }),
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
        subtitle="Sod and seeding for commercial grounds, campuses, pastures, and public sites. We prepare the ground and help you choose grass suited to the way you&#x27;ll use it."
        image={heroImg}
        imageAlt="Lush new sod and grass"
      />

      {/* CONTENT SECTIONS */}
      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          
          <FeatureRow heading="Turf Done Right Starts Before the First Seed" image={turfPrepImg} imageAlt="Site being prepared and graded before turf installation">
            <p>
              Good turf starts with the ground underneath it. Grade, drainage, soil, grass choice, and watering all affect how well it takes.
            </p>
            <p>
              We'll review soil testing, grading, and any amendments needed before planting. You'll know what's included and who will handle watering and establishment care afterward.
            </p>
          </FeatureRow>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">
                Sod Installation
              </h2>
              <ul className="space-y-3">
                {[
                  "Large-acreage sod installation for commercial, municipal, and institutional properties",
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
              Grass choice in the Carolinas depends on sun, soil, traffic, and seasonal conditions. We'll help you choose a variety that fits the site and the maintenance you can provide:
            </p>
          </FeatureRow>

          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <div className="grid grid-cols-1 gap-4">
              {[
                { title: "Bermuda Grass", desc: "Best for high-traffic commercial turf, sports fields, and sunny pastures" },
                { title: "Tall Fescue", desc: "Ideal for transition zone lawns, commercial grounds, and shaded areas" },
                { title: "Zoysia Grass", desc: "Dense, low-maintenance warm-season option for commercial and institutional sites" },
                { title: "Centipede Grass", desc: "Low-input warm-season grass for lower-fertility acidic soils" },
                { title: "Bahia Grass", desc: "Drought-tolerant pasture and erosion control option for coarser soils" }
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
              We can carry the work from clearing and grading through drainage and planting. That lets us prepare the ground with the finished turf in mind, and gives you one team to call about the job.
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
