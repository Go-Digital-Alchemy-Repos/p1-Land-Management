import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { SEO } from "@/components/seo";
import { Link } from "wouter";
import heroImg from "@/assets/hero-service-areas.png";
import { MapPin, Map } from "lucide-react";

export default function ServiceAreasIndex() {
  return (
    <Layout>
      <SEO 
        title="Service Areas | P1 Land & Property Management"
        description="P1 Land & Property Management serves commercial, agricultural, and large residential properties across Upstate South Carolina and the Charlotte, NC region."
      />
      
      {/* PAGE HERO */}
      <section className="relative py-32 px-4 bg-secondary text-white text-center overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30 mix-blend-overlay">
          <img src={heroImg} alt="Heavy equipment clearing land in the Carolinas" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-secondary/80" />
        </div>
        <div className="container relative z-10 mx-auto max-w-4xl space-y-6">
          <h1 className="text-4xl md:text-6xl font-serif font-extrabold tracking-tight text-white">
            Serving Two of the Carolinas' Fastest-Growing Markets
          </h1>
          <p className="text-lg md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed font-medium">
            From the Greenville-Spartanburg corridor to the greater Charlotte metro area, we provide full-service land and property management for properties 1 acre and larger.
          </p>
        </div>
      </section>

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
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
