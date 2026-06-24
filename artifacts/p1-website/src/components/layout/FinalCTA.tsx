import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function FinalCTA() {
  return (
    <section className="py-24 bg-muted text-center px-4 border-y border-border">
      <div className="container mx-auto max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <h2 className="text-4xl font-serif font-bold text-secondary">
          Ready to Put Your Property in the Right Hands?
        </h2>
        <p className="text-lg text-secondary/80 leading-relaxed max-w-2xl mx-auto">
          Whether you need a one-time project or an ongoing maintenance partner, P1 Land & Property Management is ready to walk your property and give you a straight answer on what it needs.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button asChild size="lg" className="text-base px-8 h-14 w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
            <Link href="/contact">Request a Free Estimate</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-base px-8 h-14 w-full sm:w-auto border-secondary/20 text-secondary hover:bg-secondary/5 font-bold">
            <a href="tel:7042218928">Call (704) 221-8928</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
