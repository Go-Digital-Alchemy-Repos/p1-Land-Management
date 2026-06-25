import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { SEO } from "@/components/seo";
import { serviceAreaSchema, breadcrumbSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import heroImg from "@/assets/hero-charlotte-metro.png";
import { CheckCircle2 } from "lucide-react";

export default function CharlotteNC() {
  return (
    <Layout>
      <SEO 
        title="Land Clearing & Commercial Property Management Charlotte NC | P1 Land & Property Management"
        description="Professional land clearing, grading, drainage, and commercial property management in Charlotte, NC. Properties 1 acre and larger. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Charlotte, North Carolina", areaType: "City", description: "Professional land clearing, grading, drainage, and commercial property management in Charlotte, NC. Properties 1 acre and larger. Call (704) 221-8928.", path: "/service-areas/charlotte-nc" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "Charlotte, NC", path: "/service-areas/charlotte-nc" },
          ]),
        ]}
      />

      <section className="relative py-32 px-4 bg-secondary text-white text-center overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-100">
          <img src={heroImg} alt="Land Clearing & Commercial Property Management in Charlotte, NC" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-secondary/55" />
        </div>
        <div className="container relative z-10 mx-auto max-w-5xl space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-4xl md:text-6xl font-serif font-extrabold tracking-tight text-white drop-shadow-md">
            Land Clearing & Commercial Property Management in Charlotte, NC
          </h1>
          <p className="text-lg md:text-2xl text-white/90 max-w-4xl mx-auto leading-relaxed font-medium drop-shadow">
            P1 Land & Property Management delivers full-service land and property management for commercial, industrial, and large residential properties throughout Charlotte, NC and Mecklenburg County. As Charlotte continues its rapid growth, demand for professional large-acreage property contractors has never been higher — and P1 fills that gap with a complete range of services from initial land clearing through ongoing maintenance.
          </p>
        </div>
      </section>

      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">Charlotte NC Services</h2>
              <ul className="space-y-3">
                {[
                  "Commercial property management and maintenance contracts",
                  "Land clearing and forestry mulching",
                  "Fine grading and site preparation for development",
                  "Stormwater and drainage system installation",
                  "Turf installation for commercial and large residential sites",
                  "Tree services and canopy management",
                  "Pond and retention basin management",
                  "Full site reconstruction and restoration"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-secondary/80 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6 flex flex-col justify-center">
              <div className="prose prose-lg prose-p:text-secondary/80 max-w-none">
                <p>
                  Charlotte's commercial and industrial property market requires contractors with the scale, equipment, and experience to manage complex, large-acreage sites. P1 serves commercial developers, property management companies, industrial facility managers, and large residential landowners throughout the Charlotte metro.
                </p>
                <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
                  Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your property.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
