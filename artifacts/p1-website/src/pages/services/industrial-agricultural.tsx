import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import heroImg from "@/assets/equestrian-estate-hero.png";
import maintenanceImg from "@/assets/features/farm-industrial-maintenance.png";

import { FaqAccordion } from "@/components/content/FaqAccordion";

const FAQS = [
  {
    question: "What agricultural property services does P1 provide?",
    answer:
      "We mow pastures and fields, clear fence lines, maintain ponds and ditches, repair farm roads, and manage trees and overgrowth. We'll walk the land with you and plan the work around your farm.",
  },
  {
    question: "Does P1 maintain industrial sites?",
    answer:
      "Yes. We maintain industrial grounds, clear overgrowth, and look after drainage and ponds. We plan the work around site access and operating hours. We'll confirm any specialist work and response arrangements before scheduling.",
  },
  {
    question: "Can P1 clear land to add pasture or crop acreage?",
    answer:
      "Yes. We use selective clearing and brush and stump removal to open more usable land. We'll review the ground, access, approvals, and the grading or seeding needed for its next use.",
  },
  {
    question: "What equipment does P1 operate?",
    answer:
      "We use Kubota equipment and match the machines to the job. We'll check access, ground conditions, and the work you need before arranging equipment and operators.",
  },
];

export default function IndustrialAgricultural() {
  return (
    <Layout>
      <SEO 
        title="Industrial & Agricultural Land Maintenance | P1"
        image={heroImg}
        description="Land maintenance for industrial sites, farms, and working acreage in Upstate SC and Charlotte, including clearing, grading, drainage, and turf."
        jsonLd={[
          serviceSchema({ name: "Industrial & Agricultural Land Management", description: "Heavy-duty land maintenance for industrial sites, farms, and rural acreage in Upstate SC and Charlotte NC. Land clearing, grading, drainage, turf, and more. Call (704) 221-8928.", path: "/services/industrial-agricultural" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Services", path: "/services" },
            { name: "Industrial & Agricultural Land Management", path: "/services/industrial-agricultural" },
          ]),
          faqSchema(FAQS),
        ]}
      />

      {/* PAGE HERO */}
      <PageHero
        indexOfWork
        eyebrow="Industrial & Agricultural"
        title={
          <>
            Industrial & Agricultural Land Maintenance —{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Built for Working Properties
            </em>
          </>
        }
        subtitle="From open pasture and equestrian estates to busy industrial grounds, we help keep large properties maintained and ready for use."
        image={heroImg}
        imageAlt="Expansive rural equestrian estate with fenced pastures, a pond, and a winding gravel lane"
      />

      {/* CONTENT SECTIONS */}
      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          
          <FeatureRow heading="Land That Works Needs Maintenance That Matches" image={maintenanceImg} imageAlt="Land-clearing equipment working beside a farm pond, drainage ditch, and fenced pasture">
            <p>
              Pastures, fence lines, ponds, and access roads all need attention. We help with regular mowing, overgrown edges, washed-out roads, and drainage that isn't doing its job.
            </p>
            <p>
              We'll walk the property with you, talk through what needs doing, and plan routine care alongside any larger repairs or earthwork.
            </p>
          </FeatureRow>

          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">
              Agricultural Property Services
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Pasture and field mowing for large acreage",
                "Fence line clearing and brush removal",
                "Farm pond management, dredging prep, and water quality maintenance",
                "Waterway and drainage ditch clearing",
                "Soil erosion control and slope stabilization",
                "Hay field and food plot establishment — seeding, grading, lime, and fertilization prep",
                "Land clearing for additional pasture or crop acreage",
                "Road and access path grading and maintenance",
                "Tree management — clearing, trimming, and strategic removal"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 bg-muted p-4 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <span className="text-secondary/90 font-medium leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">
              Industrial Site Services
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Perimeter vegetation control and mowing",
                "Drainage-system and stormwater maintenance",
                "Land clearing for facility expansion or site development",
                "Grading and regrading for site access and drainage correction",
                "Erosion control installation and monitoring",
                "Retention and detention pond management",
                "Storm-related clearing and site cleanup, subject to confirmed availability"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 bg-muted p-4 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <span className="text-secondary/90 font-medium leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6 bg-card border border-border p-8 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
            <h2 className="text-2xl font-serif font-bold text-secondary">
              Planning Work Across Your Acreage
            </h2>
            <p className="text-lg text-secondary/80 leading-relaxed">
              We plan equipment, crew size, and access around your acreage and the job at hand. Before scheduling, we'll explain the work, available dates, and any specialist help needed.
            </p>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Industrial & Agricultural Land Maintenance FAQs</h2>
            <FaqAccordion items={FAQS} />
            <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
              Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your working property.
            </p>
          </div>

        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
