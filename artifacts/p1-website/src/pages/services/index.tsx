import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { SEO } from "@/components/seo";
import { breadcrumbSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import heroImg from "@/assets/services-hero.png";
import { 
  Building2, Tractor, Trees, Map, Droplets, 
  Leaf, Shrub, Waves, Wrench 
} from "lucide-react";

export default function ServicesIndex() {
  return (
    <Layout>
      <SEO 
        title="Services | P1 Land & Property Management | Upstate SC & Charlotte NC"
        description="Comprehensive land and property management services for large-acreage properties. Commercial maintenance, land clearing, grading, drainage, turf, and more."
        jsonLd={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
        ])}
      />

      {/* PAGE HERO */}
      <section className="relative py-32 px-4 bg-secondary text-white text-center overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30 mix-blend-overlay">
          <img src={heroImg} alt="Heavy equipment on a large property" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-secondary/70" />
        </div>
        <div className="container relative z-10 mx-auto max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-4xl md:text-6xl font-serif font-extrabold tracking-tight text-white">
            Everything Your Property Needs
          </h1>
          <p className="text-lg md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed font-medium">
            From the first cut of land clearing to the ongoing maintenance of fine turf, P1 handles the full lifecycle of your large-acreage property in the Carolinas. One contractor. No gaps.
          </p>
        </div>
      </section>

      {/* SERVICES GRID */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Commercial Property Management", desc: "Scheduled maintenance programs for commercial and business properties", icon: Building2, slug: "commercial-property-management" },
              { title: "Industrial & Agricultural Land", desc: "Heavy-duty care for farms, industrial sites, and rural acreage", icon: Tractor, slug: "industrial-agricultural" },
              { title: "Land Clearing", desc: "Full clearing and grubbing of trees, brush, and vegetation", icon: Trees, slug: "land-clearing" },
              { title: "Fine Grading & Site Preparation", desc: "Precision grading to prepare land for construction, drainage, or turf", icon: Map, slug: "grading-site-preparation" },
              { title: "Drainage Solutions", desc: "French drains, retention systems, and custom drainage design", icon: Droplets, slug: "drainage" },
              { title: "Turf Installation & Seeding", desc: "Sod and seed installation for large-scale acreage", icon: Leaf, slug: "turf-installation-seeding" },
              { title: "Tree Services", desc: "Tree management, trimming, removal, and stump grinding", icon: Shrub, slug: "tree-services" },
              { title: "Pond & Waterway Management", desc: "Ongoing pond care, water quality, and waterway clearing", icon: Waves, slug: "pond-waterway-management" },
              { title: "Property Reconstruction", desc: "Full-scale property rebuilds from drainage overhaul to complete regrading", icon: Wrench, slug: "property-reconstruction" },
            ].map((s, i) => (
              <Link key={i} href={`/services/${s.slug}`} className="group block bg-card border border-card-border p-8 rounded-lg shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 transform hover:-translate-y-1">
                <div className="h-12 w-12 bg-primary/10 text-primary rounded-md flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-serif font-bold text-secondary mb-3">{s.title}</h3>
                <p className="text-secondary/70 leading-relaxed font-medium">{s.desc}</p>
                <div className="mt-6 text-primary font-bold text-sm uppercase tracking-wider group-hover:underline">
                  Learn More →
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
