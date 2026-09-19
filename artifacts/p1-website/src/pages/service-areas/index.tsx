import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { SEO } from "@/components/seo";
import { breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import unionCountyImg from "@/assets/features/union-county-agriculture.png";
import lancasterCountyImg from "@/assets/features/lancaster-sitework.png";
import yorkCountyImg from "@/assets/features/york-county-lakewylie.png";
import { MapPin, Map, ArrowRight } from "lucide-react";

import { ServiceAreaMap } from "@/components/content/ServiceAreaMap";
import { FaqAccordion } from "@/components/content/FaqAccordion";

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
      "Yes. Every market gets P1's full service lineup — land clearing and forestry mulching, fine grading and site preparation, drainage solutions, turf installation, tree services, pond and waterway management, commercial landscaping, and full property reconstruction.",
  },
  {
    question: "How do I find out if P1 serves my property?",
    answer:
      "Call (704) 221-8928 or use our contact form. Tell us where the property is and what needs attention. We'll confirm coverage and talk through available times for a visit.",
  },
];

export default function ServiceAreasIndex() {
  return (
    <Layout>
      <SEO 
        title="Service Areas | P1 Land & Property Management"
        description="Commercial landscaping, grounds maintenance, land clearing, grading & drainage for 1-acre-plus sites across Upstate SC and greater Charlotte."
        jsonLd={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
          ]),
          faqSchema(FAQS),
        ]}
      />
      
      <ServiceAreaMap />

      {/* MARKETS */}
      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
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
                  Serving commercial and industrial developments, working farms and agricultural operations, municipalities, and institutions throughout the greater Charlotte metropolitan area.
                </p>
                
                <div className="space-y-3 mb-8">
                  <Link href="/service-areas/charlotte-north-carolina" className="flex items-center gap-2 text-primary font-bold hover:underline">
                    → Charlotte, NC
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
                    alt="Working pasture and fencing on agricultural land in Union County, NC"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <p className="text-primary font-bold uppercase tracking-wider text-xs mb-2">Charlotte Region · NC</p>
                  <h3 className="text-2xl font-serif font-bold text-secondary mb-3">Union County, NC</h3>
                  <p className="text-secondary/80 leading-relaxed mb-6 flex-1">
                    Working farms, agricultural land, and fast-growing development from Monroe and Indian Trail to Waxhaw, Marvin, and Weddington.
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
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <p className="text-primary font-bold uppercase tracking-wider text-xs mb-2">Upstate & Midlands · SC</p>
                  <h3 className="text-2xl font-serif font-bold text-secondary mb-3">Lancaster County, SC</h3>
                  <p className="text-secondary/80 leading-relaxed mb-6 flex-1">
                    Commercial landscaping and grounds care, plus clearing, grading, and full property management from the Indian Land panhandle to Kershaw and Heath Springs.
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
                    alt="Illustrative commercial marina grounds with an orange Kubota zero-turn mower beside the lake"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <p className="text-primary font-bold uppercase tracking-wider text-xs mb-2">Charlotte Metro · SC</p>
                  <h3 className="text-2xl font-serif font-bold text-secondary mb-3">York County, SC</h3>
                  <p className="text-secondary/80 leading-relaxed mb-6 flex-1">
                    Lake Wylie commercial waterfront sites, I-77 corridor development, and western-county working farms from Rock Hill and Fort Mill to Clover and York.
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
            <FaqAccordion items={FAQS} />
            <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
              Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to confirm coverage for your property.
            </p>
          </div>
        </div>
      </section>

      <aside className="site-shell pb-12 text-lg">
        <p><Link href="/services" className="text-primary underline">Compare land management services</Link> or <Link href="/contact" className="text-primary underline">tell us about your property</Link> to talk through the work and available dates.</p>
      </aside>
      <section className="site-shell pb-16"><h2 className="font-display text-3xl">Local grounds management and land services</h2><h3 className="mt-8 font-display text-2xl">Upstate South Carolina</h3><ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><li><Link className="underline hover:text-primary" href="/service-areas/greer-sc">Greer, SC</Link></li><li><Link className="underline hover:text-primary" href="/service-areas/simpsonville-sc">Simpsonville, SC</Link></li><li><Link className="underline hover:text-primary" href="/service-areas/easley-sc">Easley, SC</Link></li><li><Link className="underline hover:text-primary" href="/service-areas/gaffney-sc">Gaffney, SC</Link></li><li><Link className="underline hover:text-primary" href="/service-areas/duncan-sc">Duncan, SC</Link></li><li><Link className="underline hover:text-primary" href="/service-areas/inman-sc">Inman, SC</Link></li><li><Link className="underline hover:text-primary" href="/service-areas/boiling-springs-sc">Boiling Springs, SC</Link></li></ul><h3 className="mt-8 font-display text-2xl">Greater Charlotte and the South Carolina border</h3><ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><li><Link className="underline hover:text-primary" href="/service-areas/huntersville-nc">Huntersville, NC</Link></li><li><Link className="underline hover:text-primary" href="/service-areas/matthews-nc">Matthews, NC</Link></li><li><Link className="underline hover:text-primary" href="/service-areas/kannapolis-nc">Kannapolis, NC</Link></li><li><Link className="underline hover:text-primary" href="/service-areas/waxhaw-nc">Waxhaw, NC</Link></li><li><Link className="underline hover:text-primary" href="/service-areas/fort-mill-sc">Fort Mill, SC</Link></li><li><Link className="underline hover:text-primary" href="/service-areas/rock-hill-sc">Rock Hill, SC</Link></li><li><Link className="underline hover:text-primary" href="/service-areas/indian-land-sc">Indian Land, SC</Link></li><li><Link className="underline hover:text-primary" href="/service-areas/indian-trail-nc">Indian Trail, NC</Link></li><li><Link className="underline hover:text-primary" href="/service-areas/monroe-nc">Monroe, NC</Link></li><li><Link className="underline hover:text-primary" href="/service-areas/belmont-nc">Belmont, NC</Link></li><li><Link className="underline hover:text-primary" href="/service-areas/mount-holly-nc">Mount Holly, NC</Link></li><li><Link className="underline hover:text-primary" href="/service-areas/cornelius-nc">Cornelius, NC</Link></li></ul></section>
      <FinalCTA />
    </Layout>
  );
}
