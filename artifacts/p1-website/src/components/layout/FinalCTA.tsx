import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ContourField } from "@/components/layout/ContourField";
import { Phone, ArrowUpRight } from "lucide-react";
import ctaImg from "@/assets/fine-grading.png";

const TAN = "hsl(32 42% 62%)";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-navy-deep">
      <div className="absolute inset-0">
        <img src={ctaImg} alt="" aria-hidden className="h-full w-full object-cover" style={{ opacity: 0.22 }} />
      </div>
      <div className="absolute inset-0" style={{ background: "linear-gradient(100deg, hsl(215 50% 11%) 30%, hsl(208 64% 40% / 0.4))" }} />
      <div className="absolute inset-0" style={{ mixBlendMode: "soft-light" }}>
        <ContourField stroke={TAN} opacity={0.45} />
      </div>
      <div className="relative mx-auto flex max-w-[1240px] flex-col items-center gap-8 px-6 py-20 text-center">
        <span className="inline-flex items-center gap-2 font-sans text-[11px] font-bold uppercase text-clay" style={{ letterSpacing: "0.28em" }}>
          <span className="inline-block h-px w-7 bg-clay" />
          Start the Conversation
        </span>
        <h2 className="max-w-3xl font-display text-[clamp(2.2rem,4.6vw,3.8rem)] font-light leading-[1.02] tracking-[-0.02em] text-white">
          Have acreage that needs shaping? Let's walk it together.
        </h2>
        <p className="max-w-xl text-lg" style={{ color: "hsl(40 20% 92% / 0.78)" }}>
          Free, no-pressure quotes across Upstate SC and the Charlotte metro.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg" className="group h-12 rounded-[3px] border-0 bg-white px-8 font-sans text-[15px] font-bold text-secondary hover:bg-white/90" style={{ boxShadow: "0 18px 40px -16px hsl(0 0% 0% / 0.5)" }}>
            <Link href="/contact">
              Get a Free Quote
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
  );
}
