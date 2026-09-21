import { Layout } from "@/components/layout/Layout";
import { FinalCTABand } from "@/components/layout/FinalCTABand";
import { ContourField } from "@/components/layout/ContourField";
import { IndexOfWork } from "@/components/layout/IndexOfWork";
import { ServicesGrid } from "@/components/content/ServicesGrid";
import { GoogleReviewShowcase } from "@/components/content/GoogleReviewShowcase";
import { SEO } from "@/components/seo";
import { localBusinessSchema, faqSchema } from "@/lib/structured-data";
import { responsiveImageProps } from "@/lib/responsive-images";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-bg.png";
import featureImg from "@/assets/features/grading-construction.png";
import propertyPlanningImg from "@/assets/commercial-property.png";
import {
  Phone,
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
  Check,
  Droplets,
  Truck,
  Ruler,
  CalendarCheck,
} from "lucide-react";

const TAN = "hsl(32 42% 62%)";

const values = [
  { n: "01", title: "Equipment Matched to the Work", desc: "We check access and bring the equipment suited to your clearing, grading, or maintenance job.", icon: Truck },
  { n: "02", title: "Large-Acreage Expertise", desc: "Crews and equipment for farms, industrial grounds, public sites, and commercial campuses.", icon: Ruler },
  { n: "03", title: "Drainage Planning", desc: "We look at where water collects and how it moves before recommending drainage work. We'll explain when an engineer or other specialist is needed.", icon: Droplets },
  { n: "04", title: "A Clear Plan Before We Start", desc: "Before work starts, you'll know what we're doing, who to contact, and when to expect the crew.", icon: CalendarCheck },
];

import { FaqAccordion } from "@/components/content/FaqAccordion";

const FAQS = [
  {
    question: "What does P1 Land & Property Management do?",
    answer:
      "We handle commercial landscaping and grounds maintenance, along with clearing, grading, drainage, turf, trees, and ponds. Whether you're preparing land or looking after an established property, we can help you plan the work.",
  },
  {
    question: "Is there a minimum property size for P1's services?",
    answer:
      "Yes. We serve commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger. We do not provide residential services.",
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
  "Nearly 30 Years of Experience",
  "Upstate SC + Charlotte NC",
  "1-Acre Minimum",
  "Large-Acreage Specialists",
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
        description="Commercial landscaping & grounds maintenance, plus grading, drainage, clearing & ponds for large commercial & industrial sites in Upstate SC & Charlotte NC."
        jsonLd={[localBusinessSchema(), faqSchema(FAQS)]}
      />

      {/* HERO */}
      <section className="relative overflow-hidden bg-navy-deep">
        <div className="absolute inset-0">
          <img src={heroImg} alt="Heavy equipment shaping large acreage" fetchPriority="high" decoding="async" {...responsiveImageProps(heroImg, "100vw")} className="h-full w-full object-cover" style={{ opacity: 0.5 }} />
        </div>
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(105deg, hsl(215 50% 11%) 8%, hsl(215 50% 11% / 0.86) 38%, hsl(215 50% 11% / 0.35) 72%, transparent 100%)" }}
        />
        <div className="absolute inset-0" style={{ mixBlendMode: "soft-light" }}>
          <ContourField stroke={TAN} opacity={0.5} />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-24" style={{ background: "linear-gradient(to bottom, transparent, hsl(40 20% 98%))" }} />

        <div className="site-shell relative grid grid-cols-1 gap-8 lg:grid-cols-12 pb-28 pt-24 lg:pt-28">
          <div className="min-w-0 lg:col-span-8">
            <div className="mb-7 flex items-center gap-4">
              <Kicker onDark>The Land Specialists</Kicker>
            </div>
            <h1 style={{ color: "hsl(var(--public-text-h1, var(--public-text-inverse, 0 0% 100%)))" }} className="max-w-3xl font-display text-[clamp(2.6rem,6.4vw,5.4rem)] font-light leading-[0.98] tracking-[-0.02em] text-white">
              First impressions{" "}
              <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
                start at the curb.
              </em>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed" style={{ color: "hsl(var(--public-text-heading-subtext, 40 20% 92%) / 0.82)" }}>
              Commercial landscaping and exterior grounds maintenance that keep your property looking professional, welcoming, and well cared for.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="group h-12 rounded-[3px] border-0 bg-primary px-4 sm:px-7 font-sans text-[15px] font-bold text-primary-foreground hover:bg-primary/90" style={{ boxShadow: "0 18px 40px -14px hsl(206 70% 48%)" }}>
                <Link href="/contact">
                  Get a Free Site Assessment
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </Button>
              <a href="tel:7042218928" className="inline-flex items-center gap-2 rounded-[3px] border px-7 py-2.5 font-sans text-[15px] font-bold text-white transition-colors hover:bg-white/10" style={{ borderColor: "hsl(40 30% 90% / 0.35)" }}>
                <Phone className="h-4 w-4" />
                Call (704) 221-8928
              </a>
            </div>
          </div>

          <div className="min-w-0 hidden lg:col-span-4 lg:flex lg:items-end lg:justify-end">
            <IndexOfWork />
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-b border-border bg-white py-7" aria-label="Why choose P1">
        <div className="site-shell grid gap-4 text-sm font-bold text-secondary sm:grid-cols-2 lg:grid-cols-4">
          {trust.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <GoogleReviewShowcase />

      {/* SERVICES */}
      <section className="relative bg-background py-24">
        <div className="site-shell">
          <div className="mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <Kicker>What We Do</Kicker>
              <h2 className="mt-4 max-w-2xl font-display text-[clamp(2rem,4.2vw,3.4rem)] font-light leading-[1.02] tracking-[-0.02em] text-secondary">
                A full field of capabilities,
                <br />
                <span className="text-primary">one team to call.</span>
              </h2>
            </div>
            <p className="max-w-xs text-[15px] leading-relaxed" style={{ color: "hsl(215 20% 35%)" }}>
              From regular mowing to drainage repairs and site preparation, we help you take care of the whole property.
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
        <div className="site-shell relative grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-7">
            <div className="relative">
              <div className="absolute -left-4 -top-4 h-full w-full rounded-[4px] bg-primary" style={{ opacity: 0.9 }} />
              <div className="absolute -bottom-5 -right-5 h-28 w-28 rounded-[4px] bg-clay" />
              <div className="relative overflow-hidden rounded-[4px] border-4 border-white" style={{ boxShadow: "0 40px 70px -34px hsl(215 45% 15%)" }}>
                <img src={featureImg} alt="Grading for new construction" loading="lazy" decoding="async" {...responsiveImageProps(featureImg)} className="h-[420px] w-full object-cover" />
              </div>
              <div className="absolute -bottom-6 left-8 z-10 rounded-[3px] bg-navy px-5 py-4 text-white" style={{ boxShadow: "0 20px 40px -18px hsl(215 45% 15%)" }}>
                <div className="font-sans text-3xl font-black leading-none text-tan">Site Prep</div>
                <div className="mt-1 text-[10px] font-semibold uppercase text-white" style={{ letterSpacing: "0.22em" }}>Built around your plan</div>
              </div>
            </div>
          </div>

          <div className="min-w-0 lg:col-span-5 lg:pl-6">
            <Kicker>Feature · Site Prep</Kicker>
            <h2 className="mt-4 font-display text-[clamp(1.9rem,3.6vw,3rem)] font-light leading-[1.05] tracking-[-0.02em] text-secondary">
              Grading for New Construction
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed" style={{ color: "hsl(215 20% 34%)" }}>
              A good building site starts with the ground underneath it. We prepare pads and grades and plan drainage with your project team before construction begins.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Cut-and-fill planning for your site",
                "Pad and sub-grade preparation",
                "Drainage planned with your project team",
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
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-4">
              <Kicker onDark>Why P1</Kicker>
              <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.2rem)] font-light leading-[1.03] tracking-[-0.02em] text-white">
                The difference is in the{" "}
                <span className="text-tan" style={{ fontStyle: "italic" }}>groundwork.</span>
              </h2>
              <p className="mt-5 max-w-sm text-[15px] leading-relaxed" style={{ color: "hsl(40 20% 92% / 0.7)" }}>
                We look at how your land, water, trees, and turf work together, then plan the care each needs.
              </p>
              <div className="mt-8 inline-flex items-center gap-2 rounded-[3px] px-4 py-2 font-sans text-[12px] font-bold uppercase" style={{ background: "hsl(145 40% 35% / 0.18)", color: "hsl(145 45% 70%)", letterSpacing: "0.16em" }}>
                <ShieldCheck className="h-4 w-4" />
                Plan Your Project
              </div>
            </div>

            <div className="min-w-0 lg:col-span-8">
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

      {/* PROPERTY PLANNING */}
      <section className="relative bg-background py-24">
        <div className="mx-auto max-w-[1100px] px-6">
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-12">
            <div className="min-w-0 md:col-span-5">
              <div className="relative">
                <div className="absolute -left-3 -top-3 h-full w-full rounded-[4px] bg-clay" style={{ opacity: 0.9 }} />
                <div className="relative overflow-hidden rounded-[4px] border-4 border-white" style={{ boxShadow: "0 30px 60px -28px hsl(215 45% 15%)" }}>
                  <img src={propertyPlanningImg} alt="Illustrative commercial property" loading="lazy" decoding="async" {...responsiveImageProps(propertyPlanningImg)} className="h-[340px] w-full object-cover" />
                </div>
              </div>
            </div>
            <div className="min-w-0 md:col-span-7 md:pl-4">
              <h2 className="font-display text-3xl text-secondary">Care for the Whole Property</h2>
              <p className="mt-5 text-lg leading-relaxed text-secondary">Start with what needs attention now. We'll help you plan clearing, grading, drainage, and regular upkeep as your property needs change.</p>
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
              Serving Upstate SC and Greater Charlotte
            </h2>
          </div>
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 text-left md:grid-cols-2">
            <div className="rounded-[4px] border bg-white p-8" style={{ borderColor: "hsl(215 30% 15% / 0.08)", boxShadow: "0 14px 40px -30px hsl(215 45% 15%)" }}>
              <h3 className="mb-5 border-b pb-4 font-serif text-2xl font-bold text-primary" style={{ borderColor: "hsl(215 30% 15% / 0.08)" }}>Upstate South Carolina</h3>
              <p className="font-medium leading-relaxed" style={{ color: "hsl(215 20% 35%)" }}>
                <Link className="underline hover:text-primary" href="/service-areas/greenville-sc">Greenville</Link> · <Link className="underline hover:text-primary" href="/service-areas/spartanburg-sc">Spartanburg</Link> · <Link className="underline hover:text-primary" href="/service-areas/anderson-sc">Anderson</Link> · <Link className="underline hover:text-primary" href="/service-areas/greer-sc">Greer</Link> · <Link className="underline hover:text-primary" href="/service-areas/simpsonville-sc">Simpsonville</Link> · <Link className="underline hover:text-primary" href="/service-areas/easley-sc">Easley</Link> · <Link className="underline hover:text-primary" href="/service-areas/gaffney-sc">Gaffney</Link> · <Link className="underline hover:text-primary" href="/service-areas/duncan-sc">Duncan</Link> · <Link className="underline hover:text-primary" href="/service-areas/inman-sc">Inman</Link> · <Link className="underline hover:text-primary" href="/service-areas/boiling-springs-sc">Boiling Springs</Link>
              </p>
            </div>
            <div className="rounded-[4px] border bg-white p-8" style={{ borderColor: "hsl(215 30% 15% / 0.08)", boxShadow: "0 14px 40px -30px hsl(215 45% 15%)" }}>
              <h3 className="mb-5 border-b pb-4 font-serif text-2xl font-bold text-primary" style={{ borderColor: "hsl(215 30% 15% / 0.08)" }}>Greater Charlotte &amp; SC Border</h3>
              <p className="font-medium leading-relaxed" style={{ color: "hsl(215 20% 35%)" }}>
                <Link className="underline hover:text-primary" href="/service-areas/charlotte-north-carolina">Charlotte</Link> · <Link className="underline hover:text-primary" href="/service-areas/concord-nc">Concord</Link> · <Link className="underline hover:text-primary" href="/service-areas/mooresville-lake-norman-nc">Mooresville</Link> · <Link className="underline hover:text-primary" href="/service-areas/mooresville-lake-norman-nc">Lake Norman</Link> · <Link className="underline hover:text-primary" href="/service-areas/gastonia-nc">Gastonia</Link> · <Link className="underline hover:text-primary" href="/service-areas/matthews-nc">Matthews</Link> · <Link className="underline hover:text-primary" href="/service-areas/waxhaw-nc">Waxhaw</Link> · <Link className="underline hover:text-primary" href="/service-areas/kannapolis-nc">Kannapolis</Link> · <Link className="underline hover:text-primary" href="/service-areas/huntersville-nc">Huntersville</Link> · <Link className="underline hover:text-primary" href="/service-areas/indian-trail-nc">Indian Trail</Link> · <Link className="underline hover:text-primary" href="/service-areas/monroe-nc">Monroe</Link> · <Link className="underline hover:text-primary" href="/service-areas/fort-mill-sc">Fort Mill</Link> · <Link className="underline hover:text-primary" href="/service-areas/rock-hill-sc">Rock Hill</Link> · <Link className="underline hover:text-primary" href="/service-areas/indian-land-sc">Indian Land</Link>
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

      <section className="site-shell py-12"><div className="border-l-4 border-primary bg-muted p-7"><h2 className="text-2xl font-bold">Managing a commercial or industrial property?</h2><p className="mt-3 text-muted-foreground">Talk through grounds care, drainage, clearing, and repairs with one team.</p><div className="mt-5 flex flex-wrap gap-x-6 gap-y-3"><Link href="/commercial" className="font-bold text-primary underline">Explore Commercial Site Management</Link><Link href="/commercial/data-centers-secure-facilities" className="font-bold text-primary underline">Data center & secure facility grounds</Link></div></div></section>
      <FinalCTABand />
    </Layout>
  );
}
