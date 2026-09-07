import { STALE_TIMES } from "@/lib/queryClient";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Tag, ArrowRight } from "lucide-react";
import { PublicFormRenderer } from "@/components/forms/public-form-renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_SITE_FEATURES, type SiteFeatures } from "@shared/site-features";
import type { BlogPost, CmsSidebar, SidebarWidget } from "@shared/schema";

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function WidgetCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <Card className="shadow-sm" data-testid="public-sidebar-widget">
      {title && (
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? "pt-0" : "pt-5"}>{children}</CardContent>
    </Card>
  );
}

function RecentPostsWidget({ widget }: { widget: SidebarWidget }) {
  const limit = numberValue(widget.settings.limit, 5);
  const { data: posts = [] } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
    staleTime: STALE_TIMES.SESSION,
  });

  const visiblePosts = posts.slice(0, limit);

  return (
    <WidgetCard title={widget.title || "Recent Posts"}>
      <div className="space-y-4">
        {visiblePosts.length === 0 ? (
          <p className="text-sm public-helper-text">Recent posts will appear here.</p>
        ) : (
          visiblePosts.map((post) =>
            post.postType === "external" && post.externalUrl ? (
              <a
                key={post.id}
                href={post.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm font-medium leading-relaxed public-link-text hover:text-[var(--public-text-link-hover)] transition-colors"
                data-testid={`sidebar-recent-post-${post.id}`}
              >
                {post.title}
              </a>
            ) : (
              <Link key={post.id} href={`/insights/${post.slug}`}>
                <span
                  className="block text-sm font-medium leading-relaxed public-link-text hover:text-[var(--public-text-link-hover)] transition-colors"
                  data-testid={`sidebar-recent-post-${post.id}`}
                >
                  {post.title}
                </span>
              </Link>
            ),
          )
        )}
      </div>
    </WidgetCard>
  );
}

function NewsletterWidget({ widget }: { widget: SidebarWidget }) {
  const heading = widget.title || "Stay Connected";
  const description = text(
    widget.settings.description,
    "Get platform-approved articles, events, and resources in your inbox.",
  );
  const buttonText = text(widget.settings.buttonText, "Sign Up");
  const formSlug = text(widget.settings.formSlug, "newsletter-signup");

  return (
    <WidgetCard title={heading}>
      <PublicFormRenderer
        slug={formSlug}
        showHeader={false}
        descriptionOverride={description}
        buttonTextOverride={buttonText}
        compact
        className="space-y-3"
      />
    </WidgetCard>
  );
}

function FormWidget({ widget }: { widget: SidebarWidget }) {
  const heading = widget.title || "Form";
  const formSlug = text(widget.settings.formSlug, "contact-form");
  const description = text(widget.settings.description);
  const buttonText = text(widget.settings.buttonText);

  return (
    <WidgetCard title={heading}>
      <PublicFormRenderer
        slug={formSlug}
        showHeader={false}
        descriptionOverride={description || undefined}
        buttonTextOverride={buttonText || undefined}
        compact
        className="space-y-3"
      />
    </WidgetCard>
  );
}

function CalloutWidget({ widget }: { widget: SidebarWidget }) {
  const body = text(
    widget.settings.body,
    "Add a short message, promotion, or supporting note here.",
  );
  const buttonText = text(widget.settings.buttonText);
  const buttonUrl = text(widget.settings.buttonUrl, "#");

  return (
    <WidgetCard title={widget.title || "Helpful Resource"}>
      <div className="space-y-4">
        <p className="text-sm public-body-text leading-relaxed">{body}</p>
        {buttonText && (
          <Button asChild variant="outline" className="w-full">
            <Link href={buttonUrl}>
              {buttonText}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </WidgetCard>
  );
}

function SearchWidget({ widget }: { widget: SidebarWidget }) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");

  return (
    <WidgetCard title={widget.title || "Search"}>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          navigate(query.trim() ? `/search?query=${encodeURIComponent(query.trim())}` : "/search");
        }}
        data-testid="sidebar-search-form"
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search articles and site content..."
        />
        <Button type="submit" size="icon" aria-label="Search">
          <Search className="h-4 w-4" />
        </Button>
      </form>
    </WidgetCard>
  );
}

function CategoriesWidget({ widget }: { widget: SidebarWidget }) {
  const { data: posts = [] } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
    staleTime: STALE_TIMES.SESSION,
  });
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach((post) => {
      if (!post.category) return;
      counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [posts]);

  return (
    <WidgetCard title={widget.title || "Categories"}>
      <div className="space-y-2">
        {categories.length === 0 ? (
          <p className="text-sm public-helper-text">
            Categories will appear as posts are published.
          </p>
        ) : (
          categories.map(([category, count]) => (
            <Link key={category} href={`/insights?category=${encodeURIComponent(category)}`}>
              <span className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50 transition-colors">
                <span>{category}</span>
                <Badge variant="secondary">{count}</Badge>
              </span>
            </Link>
          ))
        )}
      </div>
    </WidgetCard>
  );
}

function TagsWidget({ widget }: { widget: SidebarWidget }) {
  const { data: posts = [] } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
    staleTime: STALE_TIMES.SESSION,
  });
  const tags = useMemo(() => {
    const unique = new Set<string>();
    posts.forEach((post) => post.tags?.forEach((tag) => unique.add(tag)));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [posts]);

  return (
    <WidgetCard title={widget.title || "Popular Topics"}>
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <p className="text-sm public-helper-text">Tags will appear as posts are published.</p>
        ) : (
          tags.map((tag) => (
            <Link key={tag} href={`/insights?tag=${encodeURIComponent(tag)}`}>
              <Badge variant="outline" className="cursor-pointer">
                <Tag className="mr-1 h-3 w-3" />
                {tag}
              </Badge>
            </Link>
          ))
        )}
      </div>
    </WidgetCard>
  );
}

function HtmlWidget({ widget }: { widget: SidebarWidget }) {
  return (
    <WidgetCard title={widget.title}>
      <div
        className="prose prose-sm prose-neutral max-w-none"
        dangerouslySetInnerHTML={{ __html: text(widget.settings.html, "") }}
      />
    </WidgetCard>
  );
}

function SidebarWidgetRenderer({ widget }: { widget: SidebarWidget }) {
  if (widget.type === "recent-posts") return <RecentPostsWidget widget={widget} />;
  if (widget.type === "newsletter") return <NewsletterWidget widget={widget} />;
  if (widget.type === "form") return <FormWidget widget={widget} />;
  if (widget.type === "callout") return <CalloutWidget widget={widget} />;
  if (widget.type === "search") return <SearchWidget widget={widget} />;
  if (widget.type === "categories") return <CategoriesWidget widget={widget} />;
  if (widget.type === "tag-cloud") return <TagsWidget widget={widget} />;
  if (widget.type === "custom-html") return <HtmlWidget widget={widget} />;
  return null;
}

export function PublicSidebar({
  sidebarId,
  useDefault = false,
}: {
  sidebarId?: string | null;
  useDefault?: boolean;
}) {
  const { data: siteFeaturesData } = useQuery<SiteFeatures>({
    queryKey: ["/api/site-config"],
    staleTime: STALE_TIMES.LIVE,
  });
  const siteFeatures = siteFeaturesData ?? DEFAULT_SITE_FEATURES;
  const shouldFetch = siteFeatures.cmsEnabled && Boolean(sidebarId || useDefault);
  const endpoint = sidebarId ? `/api/cms/sidebars/${sidebarId}` : "/api/cms/sidebars/default";
  const { data: sidebar } = useQuery<CmsSidebar>({
    queryKey: ["/api/cms/sidebars", sidebarId || "default"],
    queryFn: async () => {
      const response = await fetch(endpoint, { credentials: "include" });
      if (!response.ok) throw new Error("Sidebar not found");
      return response.json();
    },
    enabled: shouldFetch,
    retry: false,
    staleTime: STALE_TIMES.SESSION,
  });

  const widgets = Array.isArray(sidebar?.widgets) ? (sidebar.widgets as SidebarWidget[]) : [];
  if (!shouldFetch || !sidebar || widgets.length === 0) return null;

  return (
    <aside className="space-y-5 lg:sticky lg:top-24" data-testid="public-sidebar">
      {widgets.map((widget) => (
        <SidebarWidgetRenderer key={widget.id} widget={widget} />
      ))}
    </aside>
  );
}
