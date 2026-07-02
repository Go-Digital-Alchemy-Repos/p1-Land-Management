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
      <main id="main-content" className="flex-1 w-full">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
