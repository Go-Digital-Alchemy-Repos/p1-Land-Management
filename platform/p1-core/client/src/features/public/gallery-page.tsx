import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { GalleryRenderer } from "@/components/shared/gallery-renderer";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import type { CmsGalleryWithItems } from "@shared/schema";

interface PublicGalleryPageProps {
  slug: string;
}

export default function PublicGalleryPage({ slug }: PublicGalleryPageProps) {
  const { data: gallery, isLoading } = useQuery<CmsGalleryWithItems>({
    queryKey: ["/api/cms/galleries", slug],
    queryFn: async () => {
      const response = await fetch(`/api/cms/galleries/${slug}`, { credentials: "include" });
      if (!response.ok) throw new Error("Gallery not found");
      return response.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (!gallery) return;
    const previousTitle = document.title;
    document.title = `${gallery.title} | Core Platform`;
    return () => {
      document.title = previousTitle;
    };
  }, [gallery]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!gallery) return <NotFound />;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <header className="mx-auto mb-10 max-w-3xl text-center">
            <h1 className="text-3xl font-heading font-semibold text-foreground sm:text-4xl">
              {gallery.title}
            </h1>
            {gallery.description ? (
              <p className="mt-3 text-muted-foreground">{gallery.description}</p>
            ) : null}
          </header>
          <GalleryRenderer gallery={gallery} />
        </section>
      </main>
      <Footer />
    </div>
  );
}
