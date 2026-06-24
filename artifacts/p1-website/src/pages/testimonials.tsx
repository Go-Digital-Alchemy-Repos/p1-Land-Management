import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { SEO } from "@/components/seo";
import { Quote, Star } from "lucide-react";
import heroImg from "@/assets/service-reconstruction.png";

interface Testimonial {
  quote: string;
  name: string;
  detail: string;
  category: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "P1 took over maintenance on our commercial campus after two other contractors let it go downhill. The grounds have never looked better, and we finally have one company we can call for everything — turf, drainage, the retention pond, all of it.",
    name: "Commercial Property Manager",
    detail: "Multi-Building Office Park, Greenville, SC",
    category: "Commercial Property Management",
  },
  {
    quote:
      "We had 40 acres of overgrown pasture that hadn't been touched in years. P1 cleared, graded, and seeded the whole thing on schedule. The crew knew exactly what they were doing with that kind of acreage.",
    name: "Farm Owner",
    detail: "Working Cattle Farm, Spartanburg County, SC",
    category: "Industrial & Agricultural",
  },
  {
    quote:
      "Our property flooded every time it rained hard. P1 designed and installed a full drainage system — French drains and regrading — and we haven't had standing water since. Honest assessment, fair price, real results.",
    name: "Residential Acreage Owner",
    detail: "12-Acre Estate, Charlotte, NC",
    category: "Drainage Solutions",
  },
  {
    quote:
      "The land clearing job was massive and they handled it without drama. Forestry mulching left the site clean and ready to build. They showed up when they said they would and finished when they said they would.",
    name: "Site Developer",
    detail: "Commercial Development, Concord, NC",
    category: "Land Clearing",
  },
  {
    quote:
      "Our pond was choked with algae and the shoreline was eroding badly. P1 restored the water quality and rebuilt the bank. It looks like a brand new pond and it's actually healthy again.",
    name: "HOA Board President",
    detail: "Community Pond, Mooresville, NC",
    category: "Pond & Waterway Management",
  },
  {
    quote:
      "After storm damage tore up our property, P1 handled the complete reconstruction — regrading, drainage, new turf, the works. They were the only contractor willing to take on the full scope instead of just one piece.",
    name: "Industrial Site Manager",
    detail: "Distribution Facility, Gastonia, NC",
    category: "Property Reconstruction",
  },
];

export default function Testimonials() {
  return (
    <Layout>
      <SEO
        title="Client Testimonials | P1 Land & Property Management"
        description="See what commercial, agricultural, and large residential property owners across Upstate South Carolina and the Charlotte, NC region say about working with P1 Land & Property Management."
      />

      {/* PAGE HERO */}
      <section className="relative py-32 px-4 bg-secondary text-white text-center overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20 mix-blend-overlay">
          <img src={heroImg} alt="Completed property reconstruction project" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-secondary/80" />
        </div>
        <div className="container relative z-10 mx-auto max-w-4xl space-y-6">
          <h1 className="text-4xl md:text-6xl font-serif font-extrabold tracking-tight text-white">
            What Our Clients Say
          </h1>
          <p className="text-lg md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed font-medium">
            Commercial, agricultural, and large residential landowners across the Carolinas trust P1 to manage the full life of their property. Here's what they have to say.
          </p>
        </div>
      </section>

      {/* TESTIMONIALS GRID */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="relative bg-card border border-border rounded-2xl p-8 shadow-sm flex flex-col gap-6"
              >
                <Quote className="h-10 w-10 text-primary/30 shrink-0" />
                <p className="text-lg text-secondary/90 leading-relaxed flex-1 italic">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-1 text-primary">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <div className="border-t border-border pt-4">
                  <p className="font-serif font-bold text-secondary">{t.name}</p>
                  <p className="text-sm text-secondary/60">{t.detail}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary mt-2">
                    {t.category}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-secondary/50 max-w-2xl mx-auto mt-12">
            Testimonials shown are representative of the commercial, agricultural, and large
            residential work P1 performs across Upstate SC and the Charlotte region.
          </p>
        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
