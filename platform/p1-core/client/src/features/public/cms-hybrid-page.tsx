import { STALE_TIMES } from "@/lib/queryClient";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PublicBlockRenderer, PublicPageRenderer } from "@/features/public/public-block-renderer";
import { PublicSidebar } from "@/features/public/public-sidebar";
import { useFrontendEditTarget } from "@/features/frontend-edit/frontend-edit";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import type { BlockInstance, BuilderContent } from "@/features/admin/cms/builder/block-registry";
import type { CmsPage, SeoSettings } from "@shared/schema";
import { JsonLd } from "@/components/shared/json-ld";
import {
  buildOrganizationLd,
  buildBreadcrumbLd,
  buildFaqPageLd,
  extractFaqItems,
} from "@/lib/structured-data";

interface CmsHybridPageProps {
  slug: string;
  fallback: React.ReactNode;
  enabled?: boolean;
}

interface CmsPageViewProps {
  page: CmsPage;
  globalSeo?: SeoSettings;
  previewLabel?: string;
}

class CmsNotFoundError extends Error {
  constructor(slug: string) {
    super(`CMS page not found: ${slug}`);
    this.name = "CmsNotFoundError";
  }
}

class CmsMembershipAccessError extends Error {
  status: number;
  teaser: string | null;

  constructor(status: number, teaser: string | null) {
    super("Membership access required");
    this.name = "CmsMembershipAccessError";
    this.status = status;
    this.teaser = teaser;
  }
}

function isValidCmsPage(data: unknown): data is CmsPage {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return (
    (typeof obj.id === "string" || typeof obj.id === "number") &&
    typeof obj.slug === "string" &&
    typeof obj.title === "string" &&
    typeof obj.status === "string"
  );
}

function parseCmsContent(content: unknown): BlockInstance[] {
  if (!content || typeof content !== "object") return [];
  const c = content as BuilderContent;
  return Array.isArray(c.blocks) ? c.blocks : [];
}

function setMeta(name: string, content: string, property = false) {
  const attr = property ? "property" : "name";
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function removeMeta(name: string, property = false) {
  const attr = property ? "property" : "name";
  const el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (el) el.remove();
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function removeLink(rel: string) {
  const el = document.head.querySelector(`link[rel="${rel}"]`);
  if (el) el.remove();
}

function CmsPageSeo({ page, globalSeo }: { page: CmsPage; globalSeo?: SeoSettings }) {
  useEffect(() => {
    const prevTitle = document.title;
    const effectiveTitle = page.seoTitle || page.title;
    const titleSuffix = globalSeo?.titleSuffix ?? " | Core Platform";
    const effectiveDescription = page.seoDescription || globalSeo?.defaultMetaDescription || "";
    const effectiveOgImage = page.ogImageUrl || globalSeo?.defaultOgImageUrl || "";
    const origin =
      globalSeo?.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");

    if (effectiveTitle) document.title = `${effectiveTitle}${titleSuffix}`;

    if (effectiveDescription) {
      setMeta("description", effectiveDescription);
      setMeta("og:description", effectiveDescription, true);
    }

    if (effectiveTitle) setMeta("og:title", effectiveTitle, true);

    if (effectiveOgImage) {
      setMeta("og:image", effectiveOgImage, true);
    } else {
      removeMeta("og:image", true);
    }

    const canonical = page.canonicalUrl || `${origin}/${page.slug}`;
    setLink("canonical", canonical);

    if (page.noindex) {
      setMeta("robots", "noindex,nofollow");
    } else {
      removeMeta("robots");
    }

    return () => {
      document.title = prevTitle;
      removeLink("canonical");
      removeMeta("robots");
    };
  }, [page, globalSeo]);

  const origin =
    globalSeo?.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");

  const isHome = page.slug === "home" || page.slug === "";
  const pageUrl = page.canonicalUrl || (isHome ? origin : `${origin}/${page.slug}`);
  const pageLabel = page.seoTitle || page.title;

  const breadcrumbs = isHome
    ? null
    : buildBreadcrumbLd([
        { name: "Home", url: origin || "/" },
        { name: pageLabel, url: pageUrl },
      ]);

  const faqItems = extractFaqItems(page.content);

  return (
    <JsonLd
      schemas={[
        globalSeo ? buildOrganizationLd(globalSeo) : null,
        breadcrumbs,
        buildFaqPageLd(faqItems),
      ]}
    />
  );
}

function CmsLoadingPage() {
  return (
    <div className="min-h-screen flex flex-col" data-testid="cms-public-loading">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
      <Footer />
    </div>
  );
}

function MembershipRestrictedPage({ teaser, status }: { teaser?: string | null; status: number }) {
  return (
    <div className="min-h-screen flex flex-col" data-testid="cms-membership-restricted">
      <Navbar />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center">
          <h1 className="text-3xl font-heading font-semibold mb-4">
            {status === 401 ? "Sign in to continue" : "Membership required"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {teaser || "This content is available to members with the right access level."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/admin/login">
              <Button>{status === 401 ? "Sign In" : "Sign In"}</Button>
            </Link>
            <Link href="/membership">
              <Button variant="outline">View Memberships</Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function CmsPageView({ page, globalSeo, previewLabel }: CmsPageViewProps) {
  useFrontendEditTarget({
    kind: "cms-page",
    id: String(page.id),
    label: `Edit ${page.title}`,
  });

  const blocks = parseCmsContent(page.content);
  const showSidebar =
    page.template === "with-sidebar" && Boolean(page.sidebarId || page.slug === "insights");
  const useDefaultSidebar = !page.sidebarId && page.slug === "insights";
  const heroBlocks = showSidebar && blocks[0] && /hero/i.test(blocks[0].type) ? [blocks[0]] : [];
  const contentBlocks = heroBlocks.length > 0 ? blocks.slice(1) : blocks;

  return (
    <div className="min-h-screen flex flex-col" data-testid="cms-public-page">
      <CmsPageSeo page={page} globalSeo={globalSeo} />
      {previewLabel ? (
        <div className="border-b border-primary/20 bg-primary/10 px-4 py-2 text-center text-sm font-medium text-primary">
          {previewLabel}
        </div>
      ) : null}
      <Navbar />
      <main className="flex-1">
        {blocks.length > 0 ? (
          showSidebar ? (
            <>
              {heroBlocks.length > 0 && <PublicPageRenderer blocks={heroBlocks} />}
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
                  <div className="space-y-8" data-testid="cms-page-main-with-sidebar">
                    {contentBlocks.map((block) => (
                      <PublicBlockRenderer key={block.id} block={block} />
                    ))}
                  </div>
                  <PublicSidebar sidebarId={page.sidebarId} useDefault={useDefaultSidebar} />
                </div>
              </div>
            </>
          ) : (
            <PublicPageRenderer blocks={blocks} />
          )
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-16">
            <h1 className="text-3xl font-heading font-semibold">{page.title}</h1>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export function CmsHybridPage({ slug, fallback, enabled = true }: CmsHybridPageProps) {
  const {
    data: page,
    isLoading,
    error,
  } = useQuery<CmsPage>({
    queryKey: ["/api/cms/pages/by-slug", slug],
    queryFn: async () => {
      const res = await fetch(`/api/cms/pages/by-slug/${slug}`, { credentials: "include" });
      if (res.status === 404) {
        throw new CmsNotFoundError(slug);
      }
      if (res.status === 401 || res.status === 403) {
        const payload = await res.json().catch(() => ({}));
        throw new CmsMembershipAccessError(
          res.status,
          typeof payload.teaser === "string" ? payload.teaser : null,
        );
      }
      if (!res.ok) {
        throw new Error(`CMS fetch failed: ${res.status} ${res.statusText}`);
      }
      const data: unknown = await res.json();
      if (!isValidCmsPage(data)) {
        if (import.meta.env.DEV) {
          console.error(`[CmsHybridPage] Invalid response shape for slug "${slug}"`, data);
        }
        throw new Error("Invalid CMS page response shape");
      }
      return data;
    },
    retry: (failureCount, err) => {
      if (err instanceof CmsNotFoundError) return false;
      return failureCount < 2;
    },
    enabled,
    staleTime: STALE_TIMES.SESSION,
  });

  const { data: globalSeo } = useQuery<SeoSettings>({
    queryKey: ["/api/seo/global"],
    staleTime: STALE_TIMES.CONTENT,
  });

  if (!enabled) {
    return <>{fallback}</>;
  }

  if (isLoading) {
    return <CmsLoadingPage />;
  }

  if (error) {
    if (error instanceof CmsMembershipAccessError) {
      return <MembershipRestrictedPage status={error.status} teaser={error.teaser} />;
    }
    if (import.meta.env.DEV && !(error instanceof CmsNotFoundError)) {
      console.warn(
        `[CmsHybridPage] Transient error for slug "${slug}", showing fallback:`,
        error.message,
      );
    }
    return <>{fallback}</>;
  }

  if (!page || page.status !== "published") {
    return <>{fallback}</>;
  }

  return <CmsPageView page={page} globalSeo={globalSeo} />;
}
