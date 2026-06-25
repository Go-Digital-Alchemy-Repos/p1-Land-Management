import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { SEO } from "@/components/seo";
import { serviceAreaSchema, breadcrumbSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import { FeatureRow } from "@/components/layout/FeatureRow";
import heroImg from "@/assets/hero-upstate-sc.png";
import upstateImg from "@/assets/features/upstate-partner.png";
import { CheckCircle2 } from "lucide-react";

export default function UpstateSC() {
  return (
    <Layout>
      <SEO 
        title="Land & Property Management Upstate South Carolina | P1 | Greenville, Spartanburg & Surrounding Areas"
        description="P1 Land & Property Management serves commercial, agricultural, and large residential properties throughout Upstate South Carolina. Land clearing, grading, drainage, turf, ponds, and more. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Upstate South Carolina", areaType: "AdministrativeArea", description: "P1 Land & Property Management serves commercial, agricultural, and large residential properties throughout Upstate South Carolina. Land clearing, grading, drainage, turf, ponds, and more. Call (704) 221-8928.", path: "/service-areas/upstate-south-carolina" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "Upstate South Carolina", path: "/service-areas/upstate-south-carolina" },
          ]),
        ]}
      />

      <section className="relative py-32 px-4 bg-secondary text-white text-center overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-100">
          <img src={heroImg} alt="Land & Property Management in Upstate South Carolina" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-secondary/55" />
        </div>
        <div className="container relative z-10 mx-auto max-w-5xl space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-4xl md:text-6xl font-serif font-extrabold tracking-tight text-white drop-shadow-md">
            Land & Property Management in Upstate South Carolina
          </h1>
          <p className="text-lg md:text-2xl text-white/90 max-w-4xl mx-auto leading-relaxed font-medium drop-shadow">
            P1 serves commercial, agricultural, and large residential properties 1 acre and larger throughout the Greenville-Spartanburg corridor and surrounding Upstate South Carolina counties. Full-service land management — from weekly maintenance to complete property reconstruction.
          </p>
        </div>
      </section>

      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl space-y-16">
          
          <FeatureRow heading="Your Upstate SC Property Partner" image={upstateImg} imageAlt="Rolling Upstate South Carolina countryside with large properties">
            <p>
              Upstate South Carolina is one of the fastest-growing regions in the Southeast — and with that growth comes increasing demand for professional land and property management at commercial, industrial, and agricultural scale. P1 Land & Property Management has built its operations around serving this market with the full range of services that large properties actually need.
            </p>
            <p>
              Whether you manage a commercial campus in Greenville, farm acreage in Anderson County, an industrial facility near Spartanburg, or a rural estate in the foothills, P1 delivers the expertise, equipment, and reliability your property demands.
            </p>
          </FeatureRow>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-secondary">Services Available Throughout Upstate SC</h2>
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
              <h2 className="text-2xl font-serif font-bold text-secondary">Communities We Serve in Upstate SC</h2>
              <p className="text-secondary/80">P1 provides land and property management services throughout Upstate South Carolina, including:</p>
              <ul className="space-y-3">
                {[
                  "Greenville and Greenville County",
                  "Spartanburg and Spartanburg County",
                  "Anderson and Anderson County",
                  "Gaffney and Cherokee County",
                  "Greer, Taylors, and Travelers Rest",
                  "Simpsonville, Fountain Inn, and Mauldin",
                  "Duncan, Inman, and Boiling Springs",
                  "Easley, Piedmont, and Pelzer",
                  "Laurens and Laurens County",
                  "Union and surrounding areas"
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
              Why Upstate SC Landowners Choose P1
            </h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none">
              <p>
                We're not a regional franchise or a national chain applying a one-size-fits-all approach to your property. P1 is built for the Carolinas — we understand the red clay soils of the Piedmont, the drainage challenges of the region's rolling terrain, the grass species that thrive here, and the seasonal patterns that drive maintenance needs throughout the year.
              </p>
              <p>
                We work with local commercial developers, regional farm operators, rural estate owners, industrial facility managers, and HOAs managing significant acreage. If your property is 1 acre or larger and needs professional management, P1 is the call to make.
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
