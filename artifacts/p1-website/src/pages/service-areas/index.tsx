import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import heroImg from "@/assets/hero-service-areas.png";
import unionCountyImg from "@/assets/features/union-county-equestrian.png";
import lancasterCountyImg from "@/assets/features/lancaster-sitework.png";
import yorkCountyImg from "@/assets/features/york-county-lakewylie.png";
import { MapPin, Map, ArrowRight } from "lucide-react";

const FAQS = [
  {
    question: "Which regions does P1 Land & Property Management cover?",
    answer:
      "P1 covers two markets in the Carolinas: Upstate South Carolina — including Greenville, Spartanburg, Anderson, Lancaster County, and York County — and the greater Charlotte, NC region, including Charlotte, Concord, Mooresville and Lake Norman, Gastonia, and Union County.",
  },
  {
    question: "Will P1 travel to properties outside the cities listed on this page?",
    answer:
      "Yes. The cities and counties listed are our core markets, but P1 regularly works on rural and unincorporated acreage throughout Upstate South Carolina and the Charlotte metro. If your property is 1 acre or larger and in the general region, call (704) 221-8928 and we'll confirm coverage.",
  },
  {
    question: "Are the same services available in every service area?",
    answer:
      "Yes. Every market gets P1's full service lineup — land clearing and forestry mulching, fine grading and site preparation, drainage solutions, turf installation, tree services, pond and waterway management, commercial property management, and full property reconstruction.",
  },
  {
    question: "How do I find out if P1 serves my property?",
    answer:
      "The fastest way is to call (704) 221-8928 or request a free estimate online. Tell us where the property is located and what you need done, and we'll let you know right away whether it falls within our service area and schedule a site visit.",
  },
];

export default function ServiceAreasIndex() {
  return (
    <Layout>
      <SEO 
        title="Service Areas | P1 Land & Property Management"
        description="P1 Land & Property Management serves commercial, agricultural, and large residential properties across Upstate South Carolina and the Charlotte, NC region."
        jsonLd={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
          ]),
          faqSchema(FAQS),
        ]}
      />
      
      {/* PAGE HERO */}
      <PageHero
        eyebrow="Where We Work"
        title={
          <>
            Serving Two of the Carolinas'{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Fastest-Growing Markets
            </em>
          </>
        }
        subtitle="From the Greenville-Spartanburg corridor to the greater Charlotte metro area, we provide full-service land and property management for properties 1 acre and larger."
        image={heroImg}
        imageAlt="Heavy equipment clearing land in the Carolinas"
      />

      {/* MARKETS */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-6xl space-y-16">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Upstate SC Market */}
            <div className="bg-card border border-card-border rounded-xl shadow-lg overflow-hidden flex flex-col group">
              <div className="p-8 flex-1">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  <Map className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-serif font-bold text-secondary mb-4">Upstate South Carolina</h2>
                <p className="text-secondary/80 leading-relaxed mb-8">
                  Serving commercial, industrial, and agricultural properties throughout the Greenville-Spartanburg corridor and surrounding counties.
                </p>
                
                <div className="space-y-3 mb-8">
                  <Link href="/service-areas/upstate-south-carolina" className="flex items-center gap-2 text-primary font-bold hover:underline">
                    → Upstate SC Regional Overview
                  </Link>
                  <Link href="/service-areas/greenville-sc" className="flex items-center gap-2 text-secondary hover:text-primary font-medium">
                    <MapPin className="w-4 h-4 text-primary" /> Greenville, SC
                  </Link>
                  <Link href="/service-areas/spartanburg-sc" className="flex items-center gap-2 text-secondary hover:text-primary font-medium">
                    <MapPin className="w-4 h-4 text-primary" /> Spartanburg, SC
                  </Link>
                  <Link href="/service-areas/anderson-sc" className="flex items-center gap-2 text-secondary hover:text-primary font-medium">
                    <MapPin className="w-4 h-4 text-primary" /> Anderson, SC
                  </Link>
                  <Link href="/service-areas/lancaster-county-sc" className="flex items-center gap-2 text-secondary hover:text-primary font-medium">
                    <MapPin className="w-4 h-4 text-primary" /> Lancaster County, SC
                  </Link>
                  <Link href="/service-areas/york-county-sc" className="flex items-center gap-2 text-secondary hover:text-primary font-medium">
                    <MapPin className="w-4 h-4 text-primary" /> York County, SC
                  </Link>
                </div>
              </div>
            </div>

            {/* Charlotte NC Market */}
            <div className="bg-card border border-card-border rounded-xl shadow-lg overflow-hidden flex flex-col group">
              <div className="p-8 flex-1">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  <Map className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-serif font-bold text-secondary mb-4">Charlotte Region, NC</h2>
                <p className="text-secondary/80 leading-relaxed mb-8">
                  Serving commercial developments, working farms, and large residential estates throughout the greater Charlotte metropolitan area.
                </p>
                
                <div className="space-y-3 mb-8">
                  <Link href="/service-areas/charlotte-north-carolina" className="flex items-center gap-2 text-primary font-bold hover:underline">
                    → Charlotte NC Regional Overview
                  </Link>
                  <Link href="/service-areas/charlotte-nc" className="flex items-center gap-2 text-secondary hover:text-primary font-medium">
                    <MapPin className="w-4 h-4 text-primary" /> Charlotte, NC
                  </Link>
                  <Link href="/service-areas/concord-nc" className="flex items-center gap-2 text-secondary hover:text-primary font-medium">
                    <MapPin className="w-4 h-4 text-primary" /> Concord, NC
                  </Link>
                  <Link href="/service-areas/mooresville-lake-norman-nc" className="flex items-center gap-2 text-secondary hover:text-primary font-medium">
                    <MapPin className="w-4 h-4 text-primary" /> Mooresville & Lake Norman, NC
                  </Link>
                  <Link href="/service-areas/gastonia-nc" className="flex items-center gap-2 text-secondary hover:text-primary font-medium">
                    <MapPin className="w-4 h-4 text-primary" /> Gastonia, NC
                  </Link>
                  <Link href="/service-areas/union-county-nc" className="flex items-center gap-2 text-secondary hover:text-primary font-medium">
                    <MapPin className="w-4 h-4 text-primary" /> Union County, NC
                  </Link>
                </div>
              </div>
            </div>

          </div>

          {/* FEATURED COUNTY PAGES */}
          <div>
            <div className="text-center mb-10">
              <p className="text-primary font-bold uppercase tracking-wider text-sm mb-2">County Spotlights</p>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-secondary">Newest Service Areas</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              <Link
                href="/service-areas/union-county-nc"
                className="bg-card border border-card-border rounded-xl shadow-lg overflow-hidden flex flex-col group hover-elevate"
                data-testid="link-union-county-card"
              >
                <div className="aspect-[16/9] overflow-hidden">
                  <img
                    src={unionCountyImg}
                    alt="Equestrian pasture and fencing on a horse farm in Union County, NC"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <p className="text-primary font-bold uppercase tracking-wider text-xs mb-2">Charlotte Region · NC</p>
                  <h3 className="text-2xl font-serif font-bold text-secondary mb-3">Union County, NC</h3>
                  <p className="text-secondary/80 leading-relaxed mb-6 flex-1">
                    Horse farms, working land, and fast-growing development from Monroe and Indian Trail to Waxhaw, Marvin, and Weddington.
                  </p>
                  <span className="flex items-center gap-2 text-primary font-bold">
                    Explore Union County <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </Link>

              <Link
                href="/service-areas/lancaster-county-sc"
                className="bg-card border border-card-border rounded-xl shadow-lg overflow-hidden flex flex-col group hover-elevate"
                data-testid="link-lancaster-county-card"
              >
                <div className="aspect-[16/9] overflow-hidden">
                  <img
                    src={lancasterCountyImg}
                    alt="Heavy equipment performing sitework on a development site in Lancaster County, SC"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <p className="text-primary font-bold uppercase tracking-wider text-xs mb-2">Upstate & Midlands · SC</p>
                  <h3 className="text-2xl font-serif font-bold text-secondary mb-3">Lancaster County, SC</h3>
                  <p className="text-secondary/80 leading-relaxed mb-6 flex-1">
                    From the booming Indian Land panhandle to rural acreage around Kershaw and Heath Springs — clearing, grading, and full property management.
                  </p>
                  <span className="flex items-center gap-2 text-primary font-bold">
                    Explore Lancaster County <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </Link>

              <Link
                href="/service-areas/york-county-sc"
                className="bg-card border border-card-border rounded-xl shadow-lg overflow-hidden flex flex-col group hover-elevate"
                data-testid="link-york-county-card"
              >
                <div className="aspect-[16/9] overflow-hidden">
                  <img
                    src={yorkCountyImg}
                    alt="Lakeside lawn maintenance on a Lake Wylie waterfront estate in York County, SC"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <p className="text-primary font-bold uppercase tracking-wider text-xs mb-2">Charlotte Metro · SC</p>
                  <h3 className="text-2xl font-serif font-bold text-secondary mb-3">York County, SC</h3>
                  <p className="text-secondary/80 leading-relaxed mb-6 flex-1">
                    Lake Wylie waterfront estates, I-77 corridor development, and western-county horse farms from Rock Hill and Fort Mill to Clover and York.
                  </p>
                  <span className="flex items-center gap-2 text-primary font-bold">
                    Explore York County <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </Link>
            </div>
          </div>

          <div className="mx-auto max-w-4xl space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Service Area FAQs</h2>
            <div className="space-y-6">
              {FAQS.map((f) => (
                <div key={f.question} className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-2">
                  <h3 className="text-lg font-serif font-bold text-secondary">{f.question}</h3>
                  <p className="text-secondary/80 leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
            <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
              Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to confirm coverage for your property.
            </p>
          </div>
        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
