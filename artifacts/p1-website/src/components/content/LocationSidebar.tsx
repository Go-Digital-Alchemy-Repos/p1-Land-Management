import { ArrowRight, ArrowUpRight, MapPin, Phone } from "lucide-react";
import { Link } from "wouter";
import { ContourField } from "@/components/layout/ContourField";
import locations from "@/lib/service-locations.json";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";

export function LocationSidebar({ currentPath }: { currentPath: string }) {
  return (
    <aside aria-label="Site assessment and service locations" className="min-w-0 space-y-6">
      <section aria-labelledby="location-cta-heading" className="relative overflow-hidden rounded-lg border-t-4 border-clay bg-navy-deep p-6 text-white shadow-lg sm:p-8 lg:p-6">
        <ContourField stroke="hsl(32 42% 62%)" opacity={0.18} />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay">Let's walk your property</p>
          <h2 id="location-cta-heading" className="mt-4 font-display text-3xl leading-tight text-white">A better plan for your land.</h2>
          <p className="mt-4 text-sm leading-relaxed text-white/80">Tell us about your property and priorities. Start with a free site assessment.</p>
          <Link href="/contact" className="mt-6 flex min-h-12 items-center justify-between gap-3 rounded bg-white px-4 py-3 text-sm font-bold text-secondary transition-colors hover:bg-white/90">
            Get a Free Site Assessment <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" />
          </Link>
          <a href={PHONE_HREF} className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded text-sm font-semibold text-white underline-offset-4 hover:underline">
            <Phone aria-hidden="true" className="h-4 w-4" /> {PHONE_DISPLAY}
          </a>
        </div>
      </section>
      <nav aria-labelledby="location-directory-heading" className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-primary">
          <MapPin aria-hidden="true" className="h-5 w-5" />
          <h2 id="location-directory-heading" className="font-display text-2xl text-secondary">Where we work</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Explore all NC &amp; SC service areas.</p>
        {[["NC", "North Carolina"], ["SC", "South Carolina"]].map(([state, label]) => (
          <section key={state} className="mt-6 border-t border-border pt-5">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-secondary">{label}</h3>
            <ul>
              {locations.filter(location => location.state === state).map(location => (
                <li key={location.path}>
                  <Link href={location.path} aria-current={currentPath === location.path ? "page" : undefined}
                    className={`flex min-h-11 items-center justify-between gap-2 rounded px-3 py-2 text-sm transition-colors hover:bg-primary/10 hover:text-primary ${currentPath === location.path ? "bg-primary/10 font-bold text-primary" : "text-secondary/80"}`}>
                    {location.name}
                    {currentPath === location.path && <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <Link href="/service-areas" className="mt-5 flex min-h-11 items-center justify-between gap-2 border-t border-border pt-4 text-sm font-bold text-primary hover:underline">
          Service area overview <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </nav>
    </aside>
  );
}
