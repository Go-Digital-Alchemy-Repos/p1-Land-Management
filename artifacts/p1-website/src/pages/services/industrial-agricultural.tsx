import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import heroImg from "@/assets/service-industrial.png";
import maintenanceImg from "@/assets/features/industrial-maintenance.png";

const FAQS = [
  {
    question: "What agricultural property services does P1 provide?",
    answer:
      "P1 provides pasture and field mowing, fence line clearing, farm pond management, drainage ditch clearing, erosion control, hay field and food plot establishment, land clearing for additional acreage, access road grading, and tree management for farms and rural landholdings.",
  },
  {
    question: "Does P1 maintain industrial sites?",
    answer:
      "Yes. P1 handles perimeter vegetation control, drainage system maintenance and stormwater compliance support, land clearing for facility expansion, grading corrections, erosion control, retention pond management, and emergency site cleanup for industrial facilities.",
  },
  {
    question: "Can P1 clear land to add pasture or crop acreage?",
    answer:
      "Yes. P1 clears trees, brush, and stumps to open up additional productive acreage — often using forestry mulching to protect topsoil — and can follow with grading, drainage, lime and fertilization prep, and seeding to get new ground into production.",
  },
  {
    question: "What equipment does P1 operate?",
    answer:
      "P1 runs a fleet of heavy equipment — excavators, bulldozers, skid steers, forestry mulchers, and large-acreage mowing equipment — which lets us handle industrial and agricultural sites of any size across Upstate SC and the Charlotte, NC region.",
  },
];

export default function IndustrialAgricultural() {
  return (
    <Layout>
      <SEO 
        title="Industrial & Agricultural Land Maintenance | P1 Land & Property Management"
        description="Heavy-duty land maintenance for industrial sites, farms, and rural acreage in Upstate SC and Charlotte NC. Land clearing, grading, drainage, turf, and more. Call (704) 221-8928."
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
        subtitle="P1 Land & Property Management maintains industrial facilities, farms, rural acreage, and working land at the scale and standard these properties demand. If your land is making money — or supposed to be — we keep it in condition."
        image={heroImg}
        imageAlt="Tractor on agricultural farm land"
      />

      {/* CONTENT SECTIONS */}
      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          
          <FeatureRow heading="Land That Works Needs Maintenance That Matches" image={maintenanceImg} imageAlt="Heavy equipment maintaining an industrial and agricultural property">
            <p>
              Industrial facilities, working farms, and rural landholdings have maintenance needs that go far beyond what a standard landscaping company can handle. Overgrown fence lines, failing drainage ditches, eroded slopes, silted ponds, and encroaching vegetation don't just look bad — they cost money, create liability, and reduce the productive capacity of your land.
            </p>
            <p>
              P1 brings heavy equipment, experienced operators, and the full range of land services needed to keep industrial and agricultural properties in working order — from routine inspections and cleanup to major earthwork and reconstruction.
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
                "Drainage system maintenance and stormwater compliance support",
                "Land clearing for facility expansion or site development",
                "Grading and regrading for site access and drainage correction",
                "Erosion control installation and monitoring",
                "Retention and detention pond management",
                "Emergency land clearing and site cleanup"
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
              Large-Acreage Capability
            </h2>
            <p className="text-lg text-secondary/80 leading-relaxed">
              P1 is equipped to work at scale. Our fleet of heavy equipment — including excavators, bulldozers, skid steers, and large-acreage mowing equipment — lets us handle industrial and agricultural sites of any size across Upstate South Carolina and the Charlotte, NC region.
            </p>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Industrial & Agricultural Land Maintenance FAQs</h2>
            <div className="space-y-6">
              {FAQS.map((f) => (
                <div key={f.question} className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-2">
                  <h3 className="text-lg font-serif font-bold text-secondary">{f.question}</h3>
                  <p className="text-secondary/80 leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
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
