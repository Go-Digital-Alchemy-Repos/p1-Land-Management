import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { breadcrumbSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import heroImg from "@/assets/hero-service-areas.png";
import unionCountyImg from "@/assets/features/union-county-equestrian.png";
import lancasterCountyImg from "@/assets/features/lancaster-sitework.png";
import { MapPin, Map, ArrowRight } from "lucide-react";

export default function ServiceAreasIndex() {
  return (
    <Layout>
      <SEO 
        title="Service Areas | P1 Land & Property Management"
        description="P1 Land & Property Management serves commercial, agricultural, and large residential properties across Upstate South Carolina and the Charlotte, NC region."
        jsonLd={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Service Areas", path: "/service-areas" },
        ])}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
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
            </div>
          </div>
        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
