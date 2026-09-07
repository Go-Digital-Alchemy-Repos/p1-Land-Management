import { STALE_TIMES } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { JsonLd } from "@/components/shared/json-ld";
import { buildOrganizationLd, buildWebSiteLd } from "@/lib/structured-data";
import type { SeoSettings } from "@shared/schema";

function SiteOrganizationJsonLd() {
  const { data: globalSeo } = useQuery<SeoSettings>({
    queryKey: ["/api/seo/global"],
    staleTime: STALE_TIMES.CONTENT,
  });

  if (!globalSeo) return null;

  return <JsonLd schemas={[buildOrganizationLd(globalSeo), buildWebSiteLd(globalSeo)]} />;
}

export function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteOrganizationJsonLd />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
