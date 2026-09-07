import { Link } from "wouter";
import { PHONE_HREF } from "@/lib/site";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col w-full bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>
      <SiteHeader />
      <main tabIndex={-1} id="main-content" className="flex-1 w-full">
        {children}
      </main>
      <SiteFooter />
      <nav aria-label="Quick contact" className="sticky bottom-0 z-40 grid grid-cols-2 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
        <a href={PHONE_HREF} className="p-4 text-center font-bold text-secondary">Call P1</a>
        <Link href="/contact" className="bg-primary p-4 text-center font-bold text-primary-foreground">Get an Estimate</Link>
      </nav>
    </div>
  );
}
