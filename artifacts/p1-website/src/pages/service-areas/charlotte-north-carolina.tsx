import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { SEO } from "@/components/seo";
import { serviceAreaSchema, breadcrumbSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import heroImg from "@/assets/hero-charlotte-region.png";
import { CheckCircle2 } from "lucide-react";

export default function CharlotteRegionNC() {
  return (
    <Layout>
      <SEO 
        title="Land & Property Management Charlotte NC | P1 | Concord, Mooresville, Lake Norman & Surrounding Areas"
        description="P1 Land & Property Management serves commercial, agricultural, and large residential properties in the Charlotte, NC region. Land clearing, grading, drainage, turf, and pond management. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Charlotte Region, North Carolina", areaType: "AdministrativeArea", description: "P1 Land & Property Management serves commercial, agricultural, and large residential properties in the Charlotte, NC region. Land clearing, grading, drainage, turf, and pond management. Call (704) 221-8928.", path: "/service-areas/charlotte-north-carolina" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "Charlotte, NC Region", path: "/service-areas/charlotte-north-carolina" },
          ]),
        ]}
      />

      <section className="relative py-32 px-4 bg-secondary text-white text-center overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30 mix-blend-overlay">
          <img src={heroImg} alt="Land & Property Management in the Charlotte, NC Region" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-secondary/80" />
        </div>
        <div className="container relative z-10 mx-auto max-w-5xl space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-4xl md:text-6xl font-serif font-extrabold tracking-tight text-white drop-shadow-md">
            Land & Property Management in the Charlotte, NC Region
          </h1>
          <p className="text-lg md:text-2xl text-white/90 max-w-4xl mx-auto leading-relaxed font-medium drop-shadow">
            P1 provides professional land and property management for commercial, agricultural, and large residential properties throughout the Charlotte metro and surrounding areas — from land clearing and grading to weekly maintenance and full property reconstruction.
          </p>
        </div>
      </section>

      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl space-y-16">
          
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-secondary border-b border-border pb-4">
              Serving the Charlotte Region's Growing Demand for Large-Acreage Property Management
            </h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none">
              <p>
                The Charlotte, NC region is one of the most rapidly developing markets in the country — and that growth is pushing commercial, agricultural, and large residential property owners to find contractors who can manage land at the scale and standard these properties require. P1 Land & Property Management is that contractor.
              </p>
              <p>
                From the Mecklenburg County commercial core to the waterfront estates of Lake Norman, the working farms of Cabarrus County, and the rural acreage of Union and Gaston Counties, P1 brings full-service land management to properties that are too large and too complex for standard landscaping companies.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-secondary">Services Available Throughout the Charlotte Region</h2>
              <ul className="space-y-3">
                {[
                  "Commercial property management and maintenance contracts",
                  "Industrial and agricultural land maintenance",
                  "Land clearing and forestry mulching",
                  "Fine grading and site preparation",
                  "Drainage design and installation",
                  "Turf installation — sod and large-acreage seeding",
                  "Tree services — trimming, removal, and selective clearing",
                  "Pond and waterway management",
                  "Full property reconstruction"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-secondary/80 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-secondary">Communities We Serve in the Charlotte Region</h2>
              <ul className="space-y-3">
                {[
                  "Charlotte and Mecklenburg County",
                  "Concord and Cabarrus County",
                  "Mooresville and Lake Norman",
                  "Gastonia and Gaston County",
                  "Huntersville, Cornelius, and Davidson",
                  "Matthews and Waxhaw",
                  "Kannapolis and Harrisburg",
                  "Monroe and Union County",
                  "Belmont and Mount Holly",
                  "Surrounding communities in the greater Charlotte area"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-secondary/80 font-medium">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-muted p-8 rounded-xl border border-border shadow-sm space-y-4">
            <h2 className="text-2xl font-serif font-bold text-secondary">
              Lake Norman and Waterfront Properties
            </h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none">
              <p>
                Lake Norman and the surrounding area have a high concentration of large-acreage waterfront and rural properties that require specialized management — shoreline maintenance, pond and waterway care, drainage management on sloped terrain, and turf establishment on challenging sites. P1's pond and waterway management program, combined with our drainage and grading expertise, makes us a natural fit for this market.
              </p>
              <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
                Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your property.
              </p>
            </div>
          </div>

        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
