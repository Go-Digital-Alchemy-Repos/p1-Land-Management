import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { SEO } from "@/components/seo";
import { localBusinessSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-bg.png";
import commercialImg from "@/assets/commercial-property.png";
import pondImg from "@/assets/pond-management.png";
import gradingImg from "@/assets/fine-grading.png";
import { 
  Building2, Tractor, Trees, Map, Droplets, 
  Leaf, Shrub, Waves, Wrench 
} from "lucide-react";

export default function Home() {
  return (
    <Layout>
      <SEO 
        title="P1 Land & Property Management | Upstate SC & Charlotte NC"
        description="Full-service land and property management for commercial, agricultural, and large residential properties 1 acre and larger. Serving Upstate South Carolina and the Charlotte, NC region. Call (704) 221-8928."
        jsonLd={localBusinessSchema()}
      />
      
      {/* HERO SECTION */}
      <section className="relative w-full overflow-hidden bg-secondary text-secondary-foreground pt-32 pb-48 px-4 flex items-center justify-center">
        <div className="absolute inset-0 z-0 opacity-100">
          <img src={heroImg} alt="Heavy equipment clearing land" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 via-secondary/40 to-transparent" />
        </div>
        
        <div className="container relative z-10 mx-auto max-w-5xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">
          <h1 className="text-5xl md:text-7xl font-serif font-extrabold tracking-tight leading-tight text-white drop-shadow-md">
            Your Property. Fully Managed.<br className="hidden md:block"/> From the Ground Up.
          </h1>
          <p className="text-lg md:text-2xl text-white/90 max-w-3xl mx-auto font-medium leading-relaxed drop-shadow">
            P1 Land & Property Management handles everything your large property demands — from weekly turf care to complete land reconstruction. Commercial, industrial, agricultural, and large residential properties, 1 acre and up.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button asChild size="lg" className="text-lg px-8 h-14 w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xl">
              <Link href="/contact">Get a Free Estimate</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 h-14 w-full sm:w-auto border-white/30 text-white hover:bg-white/10 font-bold backdrop-blur-sm">
              <a href="tel:7042218928">Call (704) 221-8928</a>
            </Button>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <div className="bg-primary text-primary-foreground py-4 border-b border-primary-foreground/10 relative z-20 shadow-md">
        <div className="container mx-auto px-4 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm md:text-base font-bold uppercase tracking-wider">
          <span className="flex items-center gap-2">✓ Commercial & Agricultural Specialists</span>
          <span className="flex items-center gap-2">✓ 1-Acre Minimum</span>
          <span className="flex items-center gap-2">✓ Upstate SC & Charlotte NC</span>
          <span className="flex items-center gap-2">✓ Free Estimates</span>
        </div>
      </div>

      {/* SERVICES OVERVIEW SECTION */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center max-w-3xl mx-auto space-y-6 mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-secondary">
              Everything Your Property Needs — One Contractor
            </h2>
            <p className="text-xl text-secondary/80 leading-relaxed">
              We don't do small lawns. P1 specializes in large-acreage property work for commercial, industrial, and agricultural landowners who need a contractor they can count on — for routine maintenance and major projects alike.
            </p>
          </div>

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
                <p className="text-secondary/70 leading-relaxed">{s.desc}</p>
              </Link>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-lg font-bold text-secondary mb-6">
              Not sure which service you need? Call us and we'll assess your property for free.
            </p>
            <Button asChild variant="link" className="text-primary hover:text-primary/80 font-bold text-xl px-0 h-auto">
              <a href="tel:7042218928">→ (704) 221-8928</a>
            </Button>
          </div>
        </div>
      </section>

      {/* WHY P1 SECTION */}
      <section className="py-24 px-4 bg-muted border-y border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-12">
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-secondary leading-tight">
                Why Property Owners Choose P1
              </h2>
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-secondary mb-2 flex items-center gap-3">
                    <div className="h-2 w-2 bg-primary rounded-full"></div>
                    Full Property Lifecycle
                  </h3>
                  <p className="text-secondary/80 leading-relaxed">Most contractors do one thing. We do everything. P1 manages your property from initial clearing and grading through ongoing weekly maintenance — and every major project in between. One call. One contractor. No gaps.</p>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-secondary mb-2 flex items-center gap-3">
                    <div className="h-2 w-2 bg-primary rounded-full"></div>
                    Large-Acreage Specialists
                  </h3>
                  <p className="text-secondary/80 leading-relaxed">We built our business around properties that most lawn services can't handle. If you own 1 acre or more — commercial, farm, industrial, or residential — P1 has the equipment, crew, and experience to manage it right.</p>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-secondary mb-2 flex items-center gap-3">
                    <div className="h-2 w-2 bg-primary rounded-full"></div>
                    Two Markets, One Team
                  </h3>
                  <p className="text-secondary/80 leading-relaxed">With deep roots in both Upstate South Carolina and the Charlotte, North Carolina region, P1 brings regional expertise to every project. We know the terrain, the climate, and what it takes to maintain property in the Carolinas.</p>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-secondary mb-2 flex items-center gap-3">
                    <div className="h-2 w-2 bg-primary rounded-full"></div>
                    No Project Too Big
                  </h3>
                  <p className="text-secondary/80 leading-relaxed">From routine pond management to complete property reconstruction — drainage, grading, clearing, seeding, and everything after — P1 handles the full scope without subcontracting the hard parts out.</p>
                </div>
              </div>
            </div>
            
            <div className="relative h-full min-h-[500px] rounded-xl overflow-hidden shadow-2xl">
              <img src={gradingImg} alt="Fine grading" className="absolute inset-0 w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* SERVICE AREAS SECTION */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-secondary mb-16">
            Serving Two of the Carolinas' Fastest-Growing Markets
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto text-left">
            <div className="bg-card border border-card-border p-8 rounded-xl shadow-md">
              <h3 className="text-2xl font-serif font-bold text-primary mb-6 border-b border-border pb-4">Upstate South Carolina</h3>
              <p className="text-secondary/80 leading-relaxed font-medium">
                Greenville • Spartanburg • Anderson • Gaffney • Duncan • Greer • Simpsonville • Easley • Inman • Boiling Springs • Surrounding areas
              </p>
            </div>
            <div className="bg-card border border-card-border p-8 rounded-xl shadow-md">
              <h3 className="text-2xl font-serif font-bold text-primary mb-6 border-b border-border pb-4">Charlotte Region, NC</h3>
              <p className="text-secondary/80 leading-relaxed font-medium">
                Charlotte • Concord • Mooresville • Lake Norman • Gastonia • Matthews • Waxhaw • Kannapolis • Huntersville • Surrounding areas
              </p>
            </div>
          </div>

          <div className="mt-12">
            <Button asChild variant="link" className="text-secondary hover:text-primary font-bold text-lg">
              <Link href="/service-areas">Serving properties 1 acre and larger across both markets. → View Service Areas</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 px-4 bg-secondary text-secondary-foreground text-center relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-10 mix-blend-overlay">
          <img src={commercialImg} alt="Background pattern" className="w-full h-full object-cover" />
        </div>
        <div className="container relative z-10 mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-16">
            What Our Clients Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { q: "P1 took over our 40-acre commercial park and immediately fixed drainage issues we'd been fighting for years. Their weekly crew is completely self-sufficient.", name: "Marcus T.", role: "Property Manager", city: "Spartanburg, SC" },
              { q: "We had 15 acres of dense brush that needed clearing for new pasture. P1 brought in the heavy iron and had it perfectly graded and seeded ahead of schedule.", name: "David R.", role: "Farm Owner", city: "Concord, NC" },
              { q: "Finding a contractor who can handle retention ponds, major tree work, and fine turf maintenance on a 100-acre HOA is rare. P1 is the real deal.", name: "Sarah L.", role: "HOA President", city: "Greenville, SC" }
            ].map((t, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm border border-white/20 p-8 rounded-xl text-left hover:bg-white/15 transition-colors">
                <div className="text-primary text-4xl mb-4 opacity-50 font-serif">"</div>
                <p className="text-white/90 text-lg leading-relaxed mb-8 italic">{t.q}</p>
                <div>
                  <p className="font-bold text-white">{t.name}</p>
                  <p className="text-white/60 text-sm">{t.role}, {t.city}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
