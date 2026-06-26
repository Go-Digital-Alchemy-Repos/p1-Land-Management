import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceAreaSchema, breadcrumbSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import heroImg from "@/assets/hero-charlotte-metro.png";
import { CheckCircle2 } from "lucide-react";

export default function GastoniaNC() {
  return (
    <Layout>
      <SEO 
        title="Land Clearing & Property Management Gastonia NC | P1 Land & Property Management"
        description="Professional land clearing, grading, drainage, and property management in Gastonia, NC. Properties 1 acre and larger. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Gastonia, North Carolina", areaType: "City", description: "Professional land clearing, grading, drainage, and property management in Gastonia, NC. Properties 1 acre and larger. Call (704) 221-8928.", path: "/service-areas/gastonia-nc" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "Gastonia, NC", path: "/service-areas/gastonia-nc" },
          ]),
        ]}
      />

      <PageHero
        eyebrow="Service Area · NC"
        title={
          <>
            Land Clearing & Property Management in{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Gastonia, NC
            </em>
          </>
        }
        subtitle="P1 Land & Property Management provides comprehensive land and property services for commercial, industrial, and agricultural properties throughout Gastonia, NC and Gaston County. Gaston County's mix of industrial properties, agricultural land, and growing commercial development creates consistent demand for professional large-acreage property management — and P1 delivers the full range of services to meet it."
        image={heroImg}
        imageAlt="Land Clearing & Property Management in Gastonia, NC"
      />

      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">Gastonia NC Services</h2>
              <ul className="space-y-3">
                {[
                  "Industrial site land clearing and vegetation management",
                  "Commercial property maintenance programs",
                  "Agricultural and rural land maintenance",
                  "Land clearing, grading, and drainage installation",
                  "Turf installation and seeding",
                  "Tree services",
                  "Pond and waterway management"
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
