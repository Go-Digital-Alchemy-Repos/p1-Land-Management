import { Link } from "wouter";
import { Phone } from "lucide-react";
import { useSiteIdentity } from "../../lib/use-site-identity";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

interface LayoutProps {
  children: React.ReactNode;
  assessmentCta?: boolean;
}

export function Layout({ children, assessmentCta = false }: LayoutProps) {
  const identity = useSiteIdentity();
  return (
    <div className="min-h-screen flex flex-col w-full bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>
      <SiteHeader assessmentCta={assessmentCta} />
      <main tabIndex={-1} id="main-content" className="flex-1 w-full">
        {children}
      </main>
      <SiteFooter />
      <nav aria-label="Quick contact" className="sticky bottom-0 z-40 grid grid-cols-2 border-t border-border/80 bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_hsl(var(--secondary)/0.08)] backdrop-blur-xl md:hidden">
        <a href={identity.phoneHref} aria-label={`Call P1 at ${identity.phoneDisplay}`} className="flex min-h-16 items-center justify-center gap-2 px-3 text-center font-bold text-secondary transition-colors hover:bg-muted/70 active:bg-muted">
          <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>Call P1</span>
        </a>
        {assessmentCta ? <a href="#assessment-request" className="flex min-h-16 items-center justify-center bg-primary px-4 text-center text-sm font-bold leading-tight text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/85">Get a Free Site Assessment</a> : <Link href="/contact" className="flex min-h-16 items-center justify-center bg-primary px-4 text-center text-sm font-bold leading-tight text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/85">Get a Free Site Assessment</Link>}
      </nav>
    </div>
  );
}
