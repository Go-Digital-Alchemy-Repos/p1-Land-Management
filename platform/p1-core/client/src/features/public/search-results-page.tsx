import { STALE_TIMES } from "@/lib/queryClient";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  FileText,
  Newspaper,
  CalendarDays,
  ArrowRight,
  AlertTriangle,
  Briefcase,
} from "lucide-react";
import type { PublicSearchResult } from "@shared/types/public-search";

function getActiveQuery(searchString: string) {
  const params = new URLSearchParams(searchString);
  return (params.get("query") || params.get("q") || "").trim();
}

function ResultSection({
  title,
  items,
  icon,
}: {
  title: string;
  items: PublicSearchResult[];
  icon: ReactNode;
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-heading text-xl font-semibold">{title}</h2>
        <Badge variant="outline">{items.length}</Badge>
      </div>
      <div className="space-y-3">
        {items.map((result) => (
          <Link key={`${result.type}-${result.id}`} href={result.url}>
            <Card
              className="cursor-pointer transition-shadow hover:shadow-md"
              data-testid={`search-result-${result.type}-${result.id}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize">
                        {result.type}
                      </Badge>
                      {result.metadata ? (
                        <span className="text-xs public-meta-text">{result.metadata}</span>
                      ) : null}
                    </div>
                    <h3 className="font-semibold text-lg public-heading-3">{result.title}</h3>
                    <p className="text-sm public-body-text leading-relaxed">
                      {result.excerpt || "No preview available yet."}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function SearchResultsPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const activeQuery = getActiveQuery(search);
  const [draftQuery, setDraftQuery] = useState(activeQuery);

  useEffect(() => {
    setDraftQuery(activeQuery);
  }, [activeQuery]);

  const {
    data: results = [],
    isLoading,
    error,
  } = useQuery<PublicSearchResult[]>({
    queryKey: ["/api/search", activeQuery],
    queryFn: async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(activeQuery)}`);
      if (!response.ok) throw new Error("Failed to search the site");
      return response.json();
    },
    enabled: activeQuery.length > 0,
    staleTime: STALE_TIMES.SEARCH,
  });

  const groupedResults = useMemo(
    () => ({
      pages: results.filter((result) => result.type === "page"),
      posts: results.filter((result) => result.type === "post"),
      events: results.filter((result) => result.type === "event"),
      jobs: results.filter((result) => result.type === "job"),
    }),
    [results],
  );

  return (
    <PageLayout>
      <section
        className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8"
        data-testid="section-site-search"
      >
        <div className="space-y-4">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold public-heading-1">
            Search the Site
          </h1>
          <p className="public-supporting-copy max-w-2xl">
            Search published pages, insights, events, and jobs from one place.
          </p>
          <form
            className="flex flex-col sm:flex-row gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              navigate(
                draftQuery.trim()
                  ? `/search?query=${encodeURIComponent(draftQuery.trim())}`
                  : "/search",
              );
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder="Search the site..."
                className="pl-10"
                data-testid="input-site-search"
              />
            </div>
            <Button type="submit" data-testid="button-site-search-submit">
              Search
            </Button>
          </form>
          {activeQuery ? (
            <p className="text-sm public-meta-text" data-testid="text-site-search-summary">
              {isLoading
                ? "Searching..."
                : error
                  ? `We couldn't complete the search for "${activeQuery}".`
                  : `${results.length} result${results.length === 1 ? "" : "s"} for "${activeQuery}"`}
            </p>
          ) : null}
        </div>

        {!activeQuery ? (
          <Card>
            <CardContent className="p-8 text-center space-y-2">
              <Search className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="font-semibold text-lg">Start a site search</h2>
              <p className="public-helper-text">
                Try a page title, article topic, event name, or job title.
              </p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((item) => (
              <Card key={item}>
                <CardContent className="p-5">
                  <div className="space-y-3">
                    <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                    <div className="h-5 w-1/2 rounded bg-muted animate-pulse" />
                    <div className="h-4 w-full rounded bg-muted animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center space-y-2">
              <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
              <h2 className="font-semibold text-lg">Search is temporarily unavailable</h2>
              <p className="public-helper-text">
                We couldn&apos;t complete that search just now. Please try again in a moment.
              </p>
            </CardContent>
          </Card>
        ) : results.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-2">
              <Search className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="font-semibold text-lg">No results found</h2>
              <p className="public-helper-text">Try a broader phrase or a different keyword.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <ResultSection
              title="Pages"
              items={groupedResults.pages}
              icon={<FileText className="h-5 w-5 text-muted-foreground" />}
            />
            <ResultSection
              title="Articles"
              items={groupedResults.posts}
              icon={<Newspaper className="h-5 w-5 text-muted-foreground" />}
            />
            <ResultSection
              title="Events"
              items={groupedResults.events}
              icon={<CalendarDays className="h-5 w-5 text-muted-foreground" />}
            />
            <ResultSection
              title="Jobs"
              items={groupedResults.jobs}
              icon={<Briefcase className="h-5 w-5 text-muted-foreground" />}
            />
          </div>
        )}
      </section>
    </PageLayout>
  );
}
