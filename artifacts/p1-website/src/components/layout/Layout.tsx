import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col w-full bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1 w-full">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
