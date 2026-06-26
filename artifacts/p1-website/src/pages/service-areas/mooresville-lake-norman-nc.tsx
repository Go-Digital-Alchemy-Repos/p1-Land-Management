import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceAreaSchema, breadcrumbSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import heroImg from "@/assets/hero-lake-norman.png";
import { CheckCircle2 } from "lucide-react";

export default function MooresvilleLakeNormanNC() {
  return (
    <Layout>
      <SEO 
        title="Land & Property Management Mooresville & Lake Norman NC | P1 Land & Property Management"
        description="Full-service land clearing, drainage, pond management, and property maintenance for large properties near Mooresville and Lake Norman, NC. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Mooresville & Lake Norman, North Carolina", areaType: "City", description: "Full-service land clearing, drainage, pond management, and property maintenance for large properties near Mooresville and Lake Norman, NC. Call (704) 221-8928.", path: "/service-areas/mooresville-lake-norman-nc" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "Mooresville & Lake Norman, NC", path: "/service-areas/mooresville-lake-norman-nc" },
          ]),
        ]}
      />

      <PageHero
        eyebrow="Service Area · NC"
        title={
          <>
            Land & Property Management Near{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Mooresville & Lake Norman, NC
            </em>
          </>
        }
        subtitle="P1 Land & Property Management serves the large waterfront estates, rural acreage, and commercial properties of the Mooresville and Lake Norman area. This region's concentration of high-value lakefront and rural properties — combined with the drainage and terrain challenges of sloped, lakeside land — makes it an ideal market for P1's specialized services."
        image={heroImg}
        imageAlt="Land & Property Management Near Mooresville & Lake Norman, NC"
      />

      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-4xl space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-serif font-bold text-secondary border-b border-border pb-4">Mooresville & Lake Norman Services</h2>
              <ul className="space-y-3">
                {[
                  "Pond and waterway management — including shoreline restoration and water quality maintenance",
                  "Drainage design and installation for sloped and waterfront terrain",
                  "Land clearing and selective tree management",
                  "Grading and site preparation",
                  "Large-acreage turf installation and seeding",
                  "Commercial property maintenance",
                  "Estate and rural property maintenance programs",
                  "Stormwater and erosion management"
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
                  Lake Norman waterfront properties often face unique land management challenges: erosion on steep slopes, pond and shoreline maintenance, drainage across varied terrain, and turf establishment on challenging soils. P1's combined expertise in earthwork, drainage, and land maintenance makes us the right choice for these demanding sites.
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
