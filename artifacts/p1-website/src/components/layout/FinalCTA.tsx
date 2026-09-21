import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ContourField } from "@/components/layout/ContourField";
import { Phone, ArrowUpRight } from "lucide-react";
import ctaImg from "@/assets/fine-grading.png";
import { responsiveImageProps } from "@/lib/responsive-images";
import { ContextualLinks } from "@/components/content/ContextualLinks";

const TAN = "hsl(32 42% 62%)";

export type CtaVariant = "maint" | "site" | "farm" | "snow" | "general";

const variants: Record<CtaVariant, { heading: string; body: string; primary: string; href: string }> = {
  maint: { heading: "Put your grounds on a schedule", body: "Send us the address and a rough idea of what's there. We'll walk it, write up a visit schedule and a price per visit, and you'll have it in writing before you commit to anything.", primary: "Request a Maintenance Bid", href: "/contact?type=maintenance" },
  site: { heading: "Send us the site", body: "Plans help, but an address and a few photos are enough to start. We'll walk the ground, tell you what order the work should go in, and send a written price.", primary: "Get a Site-Work Quote", href: "/contact?type=sitework" },
  farm: { heading: "Tell us about the land", body: "How many acres, what's on it, and what you want it to be. A few phone photos go a long way. We'll come look and give you a straight number.", primary: "Get a Price on Your Acreage", href: "/contact?type=farm" },
  snow: { heading: "Get your site walked before the first freeze", body: "We map the lots, docks and walkways that have to open first, agree on the triggers, and put the plan in writing before winter.", primary: "Schedule a Pre-Season Walk", href: "/contact?type=snow" },
  general: { heading: "Let's walk your property", body: "Tell us where it is and what's going on. The site visit and written estimate are free.", primary: "Request a Site Visit", href: "/contact" },
};

function currentVariant(variant: CtaVariant) {
  if (variant !== "snow") return variant;
  const month = new Date().getMonth() + 1;
  return month >= 8 || month <= 2 ? "snow" : "maint";
}

export function FinalCTA({ variant = "general" }: { variant?: CtaVariant }) {
  const copy = variants[currentVariant(variant)];
  return (
    <>
      <ContextualLinks />
      <section data-component="cta-band" className="relative overflow-hidden bg-navy-deep">
      <div className="absolute inset-0">
        <img src={ctaImg} alt="" aria-hidden loading="lazy" decoding="async" {...responsiveImageProps(ctaImg, "100vw")} className="h-full w-full object-cover" style={{ opacity: 0.22 }} />
      </div>
      <div className="absolute inset-0" style={{ background: "linear-gradient(100deg, hsl(215 50% 11%) 30%, hsl(208 64% 40% / 0.4))" }} />
      <div className="absolute inset-0" style={{ mixBlendMode: "soft-light" }}>
        <ContourField stroke={TAN} opacity={0.45} />
      </div>
      <div className="site-shell relative flex flex-col items-center gap-8 py-20 text-center">
        <span className="inline-flex items-center gap-2 font-sans text-[11px] font-bold uppercase text-clay" style={{ letterSpacing: "0.28em" }}>
          <span className="inline-block h-px w-7 bg-clay" />
          P1 Land &amp; Property Management
        </span>
        <h2 className="max-w-3xl font-display text-[clamp(2.2rem,4.6vw,3.8rem)] font-light leading-[1.02] tracking-[-0.02em] text-white">
          {copy.heading}
        </h2>
        <p className="max-w-xl text-lg" style={{ color: "hsl(40 20% 92% / 0.78)" }}>
          {copy.body}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg" className="group h-12 rounded-[3px] border-0 bg-white px-8 font-sans text-[15px] font-bold text-secondary hover:bg-white/90" style={{ boxShadow: "0 18px 40px -16px hsl(0 0% 0% / 0.5)" }}>
            <Link href={copy.href}>
              {copy.primary}
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </Button>
          <a href="tel:7042218928" className="inline-flex items-center gap-2 rounded-[3px] border px-8 py-2.5 font-sans text-[15px] font-bold text-white transition-colors hover:bg-white/10" style={{ borderColor: "hsl(40 30% 90% / 0.4)" }}>
            <Phone className="h-4 w-4" />
            Call (704) 221-8928
          </a>
        </div>
      </div>
      </section>
    </>
  );
}
