import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { SEO } from "@/components/seo";
import { serviceAreaSchema, breadcrumbSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import heroImg from "@/assets/hero-upstate-cities.png";
import { CheckCircle2 } from "lucide-react";

export default function AndersonSC() {
  return (
    <Layout>
      <SEO 
        title="Land Clearing & Property Management Anderson SC | P1 Land & Property Management"
        description="Professional land clearing, grading, drainage, and agricultural property management in Anderson, SC. Properties 1 acre and larger. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Anderson, South Carolina", areaType: "City", description: "Professional land clearing, grading, drainage, and agricultural property management in Anderson, SC. Properties 1 acre and larger. Call (704) 221-8928.", path: "/service-areas/anderson-sc" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "Anderson, SC", path: "/service-areas/anderson-sc" },
          ]),
        ]}
      />

      <section className="relative py-32 px-4 bg-secondary text-white text-center overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30 mix-blend-overlay">
          <img src={heroImg} alt="Land Clearing & Property Management in Anderson, SC" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-secondary/80" />
        </div>
        <div className="container relative z-10 mx-auto max-w-5xl space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-4xl md:text-6xl font-serif font-extrabold tracking-tight text-white drop-shadow-md">
            Land Clearing & Property Management in Anderson, SC
          </h1>
          <p className="text-lg md:text-2xl text-white/90 max-w-4xl mx-auto leading-relaxed font-medium drop-shadow">
            P1 Land & Property Management provides comprehensive land and property services for commercial, agricultural, and large residential properties throughout Anderson, SC and Anderson County. Anderson's growing commercial base and strong agricultural heritage make it a natural fit for P1's full-service model — from land clearing and drainage to ongoing agricultural land maintenance and pond management.
          </p>
        </div>
      </section>

      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">Anderson SC Services</h2>
              <ul className="space-y-3">
                {[
                  "Agricultural land and pasture maintenance",
                  "Land clearing and forestry mulching",
                  "Drainage and waterway management",
                  "Grading for fields, access roads, and construction pads",
                  "Pond management and pond construction",
                  "Turf and pasture establishment",
                  "Commercial grounds management",
                  "Property reconstruction"
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
