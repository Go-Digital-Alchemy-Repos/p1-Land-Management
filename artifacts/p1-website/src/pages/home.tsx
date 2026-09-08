import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { ContourField } from "@/components/layout/ContourField";
import { IndexOfWork } from "@/components/layout/IndexOfWork";
import { ServicesGrid } from "@/components/content/ServicesGrid";
import { SEO } from "@/components/seo";
import { localBusinessSchema, faqSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-bg.png";
import featureImg from "@/assets/features/grading-construction.png";
import testimonialImg from "@/assets/commercial-property.png";
import {
  Phone,
  ArrowUpRight,
  ShieldCheck,
  Check,
  MapPin,
  Mountain,
  Droplets,
  Truck,
  Ruler,
  CalendarCheck,
} from "lucide-react";

const TAN = "hsl(32 42% 62%)";

const values = [
  { n: "01", title: "Heavy Equipment Fleet", desc: "Discuss the equipment and access requirements for your grading, clearing, and property maintenance work.", icon: Truck },
  { n: "02", title: "Large-Acreage Expertise", desc: "Built around properties most crews can't handle — farms, estates, HOAs and commercial sites.", icon: Ruler },
  { n: "03", title: "Drainage Planning", desc: "We assess slope and water movement, then discuss grade-level work and any specialist involvement.", icon: Droplets },
  { n: "04", title: "Dependable Scheduling", desc: "Crews that show up, communicate and finish on the timeline we commit to.", icon: CalendarCheck },
];

import { FaqAccordion } from "@/components/content/FaqAccordion";

const FAQS = [
  {
    question: "What does P1 Land & Property Management do?",
    answer:
      "P1 is a full-service land and property management company. We handle land clearing and forestry mulching, fine grading and site preparation, drainage solutions, turf installation and seeding, tree and brush management, pond and waterway management, commercial landscaping, and complete property reconstruction.",
  },
  {
    question: "Is there a minimum property size for P1's services?",
    answer:
      "Yes. P1 specializes in properties 1 acre and larger — commercial sites, industrial and agricultural land, HOAs, farms, estates, and large residential acreage. That focus lets us bring the heavy equipment and expertise that big properties demand.",
  },
  {
    question: "What areas does P1 Land & Property Management serve?",
    answer:
      "P1 serves Upstate South Carolina — including Greenville, Spartanburg, Anderson, and Lancaster County — and the greater Charlotte, NC region, including Charlotte, Concord, Mooresville and Lake Norman, Gastonia, and Union County.",
  },
  {
    question: "How do I get an estimate from P1?",
    answer:
      "Call (704) 221-8928 or request a free quote through our online contact form. We'll discuss your property and goals, schedule a site visit if needed, and provide a clear, written estimate — free of charge and with no obligation.",
  },
];

const trust = [
  { label: "Land & Property Care", icon: ShieldCheck },
  { label: "Upstate SC + Charlotte NC", icon: MapPin },
  { label: "1-Acre Minimum", icon: Ruler },
  { label: "Large-Acreage Specialists", icon: Mountain },
];

function Kicker({ children, onDark = false }: { children: React.ReactNode; onDark?: boolean }) {
  const color = onDark ? "text-clay" : "text-clay-ink";
  const bar = onDark ? "bg-clay" : "bg-clay-ink";
  return (
    <span
      className={`inline-flex items-center gap-2 font-sans text-[11px] font-bold uppercase ${color}`}
      style={{ letterSpacing: "0.28em" }}
    >
      <span className={`inline-block h-px w-7 ${bar}`} />
      {children}
    </span>
  );
}

export default function Home() {
  return (
    <Layout>
      <SEO
        title="P1 Land & Property Management | Upstate SC & Charlotte NC"
        description="Grading, drainage, clearing, ponds and full property management for large acreage across Upstate South Carolina and the Charlotte, NC region. Call (704) 221-8928."
        jsonLd={[localBusinessSchema(), faqSchema(FAQS)]}
      />

      {/* HERO */}
      <section className="relative overflow-hidden bg-navy-deep">
        <div className="absolute inset-0">
          <img src={heroImg} alt="Heavy equipment shaping large acreage" fetchPriority="high" decoding="async" className="h-full w-full object-cover" style={{ opacity: 0.5 }} />
        </div>
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(105deg, hsl(215 50% 11%) 8%, hsl(215 50% 11% / 0.86) 38%, hsl(215 50% 11% / 0.35) 72%, transparent 100%)" }}
        />
        <div className="absolute inset-0" style={{ mixBlendMode: "soft-light" }}>
          <ContourField stroke={TAN} opacity={0.5} />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-24" style={{ background: "linear-gradient(to bottom, transparent, hsl(40 20% 98%))" }} />

        <div className="site-shell relative grid grid-cols-12 gap-8 pb-28 pt-24 lg:pt-28">
          <div className="col-span-12 lg:col-span-8">
            <div className="mb-7 flex items-center gap-4">
              <Kicker onDark>The Land Specialists</Kicker>
            </div>
            <h1 className="max-w-3xl font-display text-[clamp(2.6rem,6.4vw,5.4rem)] font-light leading-[0.98] tracking-[-0.02em] text-white">
              Your first impression{" "}
              <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
                starts at the curb.
              </em>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed" style={{ color: "hsl(40 20% 92% / 0.82)" }}>
              Grading, drainage, clearing and ponds for big properties across Upstate South Carolina and the Charlotte metro. Heavy-equipment professionals for farms, estates, HOAs and commercial sites.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="group h-12 rounded-[3px] border-0 bg-primary px-7 font-sans text-[15px] font-bold text-primary-foreground hover:bg-primary/90" style={{ boxShadow: "0 18px 40px -14px hsl(206 70% 48%)" }}>
                <Link href="/contact">
                  Get a Free Quote
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </Button>
              <a href="tel:7042218928" className="inline-flex items-center gap-2 rounded-[3px] border px-7 py-2.5 font-sans text-[15px] font-bold text-white transition-colors hover:bg-white/10" style={{ borderColor: "hsl(40 30% 90% / 0.35)" }}>
                <Phone className="h-4 w-4" />
                Call (704) 221-8928
              </a>
            </div>
          </div>

          <div className="col-span-12 hidden lg:col-span-4 lg:flex lg:items-end lg:justify-end">
            <IndexOfWork />
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="relative z-10 bg-background py-12">
        <div className="site-shell">
          <div
            className="grid grid-cols-2 overflow-hidden rounded-[4px] border bg-white md:grid-cols-4"
            style={{ borderColor: "hsl(215 30% 15% / 0.08)", boxShadow: "0 30px 60px -32px hsl(215 45% 15%), 0 8px 18px -12px hsl(215 40% 20% / 0.3)" }}
          >
            {trust.map((t, i) => (
              <div
                key={t.label}
                className="flex items-center gap-3 px-6 py-6"
                style={{ borderRight: i < trust.length - 1 ? "1px solid hsl(215 30% 15% / 0.07)" : "none" }}
              >
                <t.icon className="h-5 w-5 shrink-0 text-primary" />
                <span className="font-sans text-[13px] font-bold leading-tight text-secondary">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="relative bg-background py-24">
        <div className="site-shell">
          <div className="mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <Kicker>What We Do</Kicker>
              <h2 className="mt-4 max-w-2xl font-display text-[clamp(2rem,4.2vw,3.4rem)] font-light leading-[1.02] tracking-[-0.02em] text-secondary">
                A full field of capabilities,
                <br />
                <span className="text-primary">one accountable crew.</span>
              </h2>
            </div>
            <p className="max-w-xs text-[15px] leading-relaxed" style={{ color: "hsl(215 20% 35%)" }}>
              From the first cut to ongoing care, discuss your property’s needs and coordinate the scope with P1.
            </p>
          </div>

          <ServicesGrid />
        </div>
      </section>

      {/* FEATURE ROW */}
      <section className="relative overflow-hidden py-24" style={{ background: "hsl(38 24% 94%)" }}>
        <div className="absolute inset-0 opacity-50">
          <ContourField stroke={TAN} opacity={0.16} />
        </div>
        <div className="site-shell relative grid grid-cols-12 items-center gap-10">
          <div className="col-span-12 lg:col-span-7">
            <div className="relative">
              <div className="absolute -left-4 -top-4 h-full w-full rounded-[4px] bg-primary" style={{ opacity: 0.9 }} />
              <div className="absolute -bottom-5 -right-5 h-28 w-28 rounded-[4px] bg-clay" />
              <div className="relative overflow-hidden rounded-[4px] border-4 border-white" style={{ boxShadow: "0 40px 70px -34px hsl(215 45% 15%)" }}>
                <img src={featureImg} alt="Grading for new construction" loading="lazy" decoding="async" className="h-[420px] w-full object-cover" />
              </div>
              <div className="absolute -bottom-6 left-8 z-10 rounded-[3px] bg-navy px-5 py-4 text-white" style={{ boxShadow: "0 20px 40px -18px hsl(215 45% 15%)" }}>
                <div className="font-sans text-3xl font-black leading-none text-tan">Site Prep</div>
                <div className="mt-1 text-[10px] font-semibold uppercase text-white" style={{ letterSpacing: "0.22em" }}>Built around your plan</div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5 lg:pl-6">
            <Kicker>Feature · Site Prep</Kicker>
            <h2 className="mt-4 font-display text-[clamp(1.9rem,3.6vw,3rem)] font-light leading-[1.05] tracking-[-0.02em] text-secondary">
              Grading for New Construction
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed" style={{ color: "hsl(215 20% 34%)" }}>
              Before construction begins, grading and drainage need a coordinated plan. Discuss building pads, site grades, and sub-grade preparation with P1 alongside the requirements of your project team.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Cut-and-fill planning within the agreed scope",
                "Pad and sub-grade preparation",
                "Drainage considerations coordinated with the project team",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: "hsl(145 40% 35% / 0.14)" }}>
                    <Check className="h-3 w-3 text-supporting" />
                  </span>
                  <span className="text-[14px] font-medium text-secondary">{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="/services/grading-site-preparation" className="inline-flex items-center gap-2 font-sans text-sm font-bold uppercase text-primary" style={{ letterSpacing: "0.1em" }}>
                Explore site prep
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* WHY P1 */}
      <section className="relative overflow-hidden bg-navy py-24">
        <div className="absolute inset-0" style={{ mixBlendMode: "soft-light" }}>
          <ContourField stroke={TAN} opacity={0.4} />
        </div>
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: "hsl(40 30% 90% / 0.1)" }} />
        <div className="site-shell relative">
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-12 lg:col-span-4">
              <Kicker onDark>Why P1</Kicker>
              <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.2rem)] font-light leading-[1.03] tracking-[-0.02em] text-white">
                The difference is in the{" "}
                <span className="text-tan" style={{ fontStyle: "italic" }}>groundwork.</span>
              </h2>
              <p className="mt-5 max-w-sm text-[15px] leading-relaxed" style={{ color: "hsl(40 20% 92% / 0.7)" }}>
                Discuss the equipment, scope, documentation and delivery responsibilities needed for your property before work begins.
              </p>
              <div className="mt-8 inline-flex items-center gap-2 rounded-[3px] px-4 py-2 font-sans text-[12px] font-bold uppercase" style={{ background: "hsl(145 40% 35% / 0.18)", color: "hsl(145 45% 70%)", letterSpacing: "0.16em" }}>
                <ShieldCheck className="h-4 w-4" />
                Discuss Your Project
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8">
              <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[4px] sm:grid-cols-2" style={{ background: "hsl(40 30% 90% / 0.1)" }}>
                {values.map((v) => (
                  <div key={v.n} className="group relative bg-navy-deep p-8">
                    <div className="flex items-start justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-[3px]" style={{ background: "hsl(208 64% 40% / 0.18)" }}>
                        <v.icon className="h-5 w-5" style={{ color: "hsl(206 70% 48%)" }} />
                      </span>
                      <span className="font-sans text-2xl font-black tabular-nums" style={{ color: "hsl(40 30% 90% / 0.16)" }}>{v.n}</span>
                    </div>
                    <h3 className="mt-5 font-serif text-lg font-bold text-white">{v.title}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "hsl(40 20% 92% / 0.66)" }}>{v.desc}</p>
                    <span className="absolute bottom-0 left-0 h-[3px] w-0 bg-clay transition-all duration-300 group-hover:w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="relative bg-background py-24">
        <div className="mx-auto max-w-[1100px] px-6">
          <div className="grid grid-cols-12 items-center gap-10">
            <div className="col-span-12 md:col-span-5">
              <div className="relative">
                <div className="absolute -left-3 -top-3 h-full w-full rounded-[4px] bg-clay" style={{ opacity: 0.9 }} />
                <div className="relative overflow-hidden rounded-[4px] border-4 border-white" style={{ boxShadow: "0 30px 60px -28px hsl(215 45% 15%)" }}>
                  <img src={testimonialImg} alt="Illustrative commercial property" loading="lazy" decoding="async" className="h-[340px] w-full object-cover" />
                </div>
              </div>
            </div>
            <div className="col-span-12 md:col-span-7 md:pl-4">
              <h2 className="font-display text-3xl text-secondary">A coordinated approach to your property</h2>
              <p className="mt-5 text-lg leading-relaxed text-secondary">From clearing and grading to drainage and ongoing maintenance, discuss the services your property needs with one team.</p>
              <Link href="/contact" className="mt-7 inline-block font-bold text-primary underline">Tell us about your project</Link>

            </div>
          </div>
        </div>
      </section>

      {/* SERVICE AREAS */}
      <section className="bg-background pb-24">
        <div className="site-shell">
          <div className="mb-12 text-center">
            <Kicker>Where We Work</Kicker>
            <h2 className="mt-4 font-display text-[clamp(1.9rem,4vw,3rem)] font-light leading-[1.05] tracking-[-0.02em] text-secondary">
              Two of the Carolinas' fastest-growing markets.
            </h2>
          </div>
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 text-left md:grid-cols-2">
            <div className="rounded-[4px] border bg-white p-8" style={{ borderColor: "hsl(215 30% 15% / 0.08)", boxShadow: "0 14px 40px -30px hsl(215 45% 15%)" }}>
              <h3 className="mb-5 border-b pb-4 font-serif text-2xl font-bold text-primary" style={{ borderColor: "hsl(215 30% 15% / 0.08)" }}>Upstate South Carolina</h3>
              <p className="font-medium leading-relaxed" style={{ color: "hsl(215 20% 35%)" }}>
                Greenville • Spartanburg • Anderson • Gaffney • Duncan • Greer • Simpsonville • Easley • Inman • Boiling Springs • Surrounding areas
              </p>
            </div>
            <div className="rounded-[4px] border bg-white p-8" style={{ borderColor: "hsl(215 30% 15% / 0.08)", boxShadow: "0 14px 40px -30px hsl(215 45% 15%)" }}>
              <h3 className="mb-5 border-b pb-4 font-serif text-2xl font-bold text-primary" style={{ borderColor: "hsl(215 30% 15% / 0.08)" }}>Charlotte Region, NC</h3>
              <p className="font-medium leading-relaxed" style={{ color: "hsl(215 20% 35%)" }}>
                Charlotte • Concord • Mooresville • Lake Norman • Gastonia • Matthews • Waxhaw • Kannapolis • Huntersville • Surrounding areas
              </p>
            </div>
          </div>
          <div className="mt-10 text-center">
            <Link href="/service-areas" className="inline-flex items-center gap-2 font-sans text-sm font-bold uppercase text-primary" style={{ letterSpacing: "0.1em" }}>
              View all service areas
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-background pb-24">
        <div className="mx-auto max-w-[900px] px-6">
          <div className="mb-12 text-center">
            <Kicker>Common Questions</Kicker>
            <h2 className="mt-4 font-display text-[clamp(1.9rem,4vw,3rem)] font-light leading-[1.05] tracking-[-0.02em] text-secondary">
              Frequently asked questions.
            </h2>
          </div>
          <FaqAccordion items={FAQS} />
          <p className="mt-10 border-l-4 border-primary pl-4 font-bold text-secondary">
            Still have questions? Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or{" "}
            <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link>.
          </p>
        </div>
      </section>

      <section className="site-shell py-12"><div className="border-l-4 border-primary bg-muted p-7"><h2 className="text-2xl font-bold">Managing a commercial or industrial property?</h2><p className="mt-3 text-muted-foreground">Bring grounds, drainage, land and recurring exterior work into one scope discussion.</p><Link href="/commercial" className="mt-5 inline-block font-bold text-primary underline">Explore Commercial Site Management</Link></div></section>
      <FinalCTA />
    </Layout>
  );
}
