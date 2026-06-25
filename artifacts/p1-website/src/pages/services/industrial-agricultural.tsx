import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { SEO } from "@/components/seo";
import { serviceSchema, breadcrumbSchema } from "@/lib/structured-data";
import { CheckCircle2 } from "lucide-react";
import heroImg from "@/assets/service-industrial.png";

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
        ]}
      />

      {/* PAGE HERO */}
      <section className="relative py-32 px-4 bg-secondary text-white overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-100">
          <img src={heroImg} alt="Tractor on agricultural farm land" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-secondary/55" />
        </div>
        <div className="container relative z-10 mx-auto max-w-4xl space-y-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-4xl md:text-6xl font-serif font-extrabold tracking-tight text-white">
            Industrial & Agricultural Land Maintenance — Built for Working Properties
          </h1>
          <p className="text-lg md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed font-medium">
            P1 Land & Property Management maintains industrial facilities, farms, rural acreage, and working land at the scale and standard these properties demand. If your land is making money — or supposed to be — we keep it in condition.
          </p>
        </div>
      </section>

      {/* CONTENT SECTIONS */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl space-y-16">
          
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-secondary border-b border-border pb-4">
              Land That Works Needs Maintenance That Matches
            </h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-6 text-lg leading-relaxed">
              <p>
                Industrial facilities, working farms, and rural landholdings have maintenance needs that go far beyond what a standard landscaping company can handle. Overgrown fence lines, failing drainage ditches, eroded slopes, silted ponds, and encroaching vegetation don't just look bad — they cost money, create liability, and reduce the productive capacity of your land.
              </p>
              <p>
                P1 brings heavy equipment, experienced operators, and the full range of land services needed to keep industrial and agricultural properties in working order — from routine inspections and cleanup to major earthwork and reconstruction.
              </p>
            </div>
          </div>

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

        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
