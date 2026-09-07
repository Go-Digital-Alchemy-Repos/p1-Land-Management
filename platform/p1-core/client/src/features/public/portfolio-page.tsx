import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowRight, FolderKanban, MapPin, Search, X } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSeo } from "@/hooks/use-seo";
import { stripHtml } from "@/lib/html";
import {
  PORTFOLIO_INDUSTRY_LABELS,
  type PortfolioIndustry,
  type PortfolioProject,
  type PortfolioSettings,
} from "@shared/schema";

interface FilterOptions {
  industries: PortfolioIndustry[];
  categories: string[];
  locations: string[];
}

function getSettingText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function ProjectCard({ project, layout }: { project: PortfolioProject; layout: "grid" | "list" }) {
  const image = project.heroImageUrl || project.gallery?.[0]?.url;
  const isList = layout === "list";
  return (
    <Link href={`/portfolio/${project.slug}`} className="block">
      <Card
        className="group h-full cursor-pointer overflow-hidden hover-elevate"
        data-testid={`card-portfolio-project-${project.id}`}
      >
        <div className={isList ? "md:flex md:items-stretch" : ""}>
          <div
            className={
              isList
                ? "aspect-[16/10] overflow-hidden md:aspect-auto md:min-h-[280px] md:w-[38%] md:max-w-[430px] md:shrink-0"
                : "aspect-[4/3] overflow-hidden"
            }
          >
            {image ? (
              <img
                src={image}
                alt={project.heroImageAlt || project.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <FolderKanban className="h-10 w-10 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <CardContent
            className={isList ? "min-w-0 flex-1 space-y-4 bg-card p-5 md:p-6" : "space-y-4 p-5"}
          >
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{PORTFOLIO_INDUSTRY_LABELS[project.industry]}</Badge>
              {project.featured && <Badge variant="outline">Featured</Badge>}
            </div>
            <div className="space-y-2">
              <h2 className="break-words text-xl font-semibold tracking-normal">{project.title}</h2>
              {project.subtitle && (
                <p className="text-sm text-muted-foreground">{project.subtitle}</p>
              )}
              {(project.location || project.projectType) && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {project.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {project.location}
                    </span>
                  )}
                  {project.projectType && <span>{project.projectType}</span>}
                </div>
              )}
            </div>
            {(project.summary || project.description) && (
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {stripHtml(project.summary || project.description || "")}
              </p>
            )}
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              View case study <ArrowRight className="h-4 w-4" />
            </span>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}

export function PortfolioGridSection({ props = {} }: { props?: Record<string, unknown> }) {
  const { data: settings } = useQuery<PortfolioSettings>({ queryKey: ["/api/portfolio/settings"] });
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("all");
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("all");
  const layout = props.layout === "list" || settings?.archiveLayout === "list" ? "list" : "grid";
  const heading = getSettingText(props.heading, settings?.archiveHeading ?? "Selected Work");
  const subheading = getSettingText(
    props.subheading,
    settings?.archiveSubheading ??
      "Explore case studies, projects, and outcomes from our portfolio.",
  );
  const eyebrow = getSettingText(props.eyebrow, settings?.archiveEyebrow ?? "Portfolio");
  const featuredOnly = props.featuredOnly === true;
  const excludeFeatured = props.excludeFeatured === true;
  const showSearch = props.showSearch !== false && settings?.showSearch !== false;
  const showIndustryFilter =
    props.showIndustryFilter !== false && settings?.showIndustryFilter !== false;
  const showCategoryFilter =
    props.showCategoryFilter !== false && settings?.showCategoryFilter !== false;
  const showLocationFilter =
    props.showLocationFilter !== false && settings?.showLocationFilter !== false;
  const limit = typeof props.limit === "number" ? props.limit : undefined;

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (industry !== "all") params.set("industry", industry);
    if (category !== "all") params.set("category", category);
    if (location !== "all") params.set("location", location);
    if (featuredOnly) params.set("featured", "true");
    if (excludeFeatured) params.set("excludeFeatured", "true");
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    return `/api/portfolio/projects${qs ? `?${qs}` : ""}`;
  }, [q, industry, category, location, featuredOnly, excludeFeatured, limit]);

  const { data: projects = [], isLoading } = useQuery<PortfolioProject[]>({ queryKey: [query] });
  const { data: filters } = useQuery<FilterOptions>({ queryKey: ["/api/portfolio/filters"] });
  const hasFilters = showSearch || showIndustryFilter || showCategoryFilter || showLocationFilter;

  const clearFilters = () => {
    setQ("");
    setIndustry("all");
    setCategory("all");
    setLocation("all");
  };

  return (
    <section
      className="container mx-auto space-y-8 px-4 py-10"
      data-testid="section-portfolio-grid"
    >
      <section className="space-y-3">
        <Badge variant="outline" className="gap-1.5">
          <FolderKanban className="h-3.5 w-3.5" />
          {eyebrow}
        </Badge>
        <h1 className="text-3xl font-bold tracking-normal sm:text-4xl">{heading}</h1>
        <p className="max-w-2xl text-muted-foreground">{subheading}</p>
      </section>

      {hasFilters && (
        <section className="grid gap-3 rounded-md border bg-card p-4 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
          {showSearch && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search projects"
                className="pl-9"
              />
            </div>
          )}
          {showIndustryFilter && (
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger>
                <SelectValue placeholder="Industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All industries</SelectItem>
                {(filters?.industries ?? []).map((item) => (
                  <SelectItem key={item} value={item}>
                    {PORTFOLIO_INDUSTRY_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {showCategoryFilter && (
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(filters?.categories ?? []).map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {showLocationFilter && (
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {(filters?.locations ?? []).map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="ghost" size="icon" onClick={clearFilters} aria-label="Clear filters">
            <X className="h-4 w-4" />
          </Button>
        </section>
      )}

      <section
        className={layout === "list" ? "space-y-5" : "grid gap-5 md:grid-cols-2 lg:grid-cols-3"}
      >
        {isLoading ? (
          Array.from({ length: layout === "list" ? 3 : 6 }).map((_, index) => (
            <Skeleton key={index} className="h-80 w-full" />
          ))
        ) : projects.length > 0 ? (
          projects.map((project) => (
            <ProjectCard key={project.id} project={project} layout={layout} />
          ))
        ) : (
          <Card className={layout === "grid" ? "md:col-span-2 lg:col-span-3" : ""}>
            <CardContent className="py-10 text-center text-muted-foreground">
              No portfolio projects match those filters.
            </CardContent>
          </Card>
        )}
      </section>
    </section>
  );
}

export default function PortfolioPage() {
  useSeo({
    title: "Portfolio | Core Platform",
    description: "Explore selected portfolio projects and case studies.",
    canonical: typeof window !== "undefined" ? `${window.location.origin}/portfolio` : undefined,
  });

  return (
    <PageLayout>
      <PortfolioGridSection />
    </PageLayout>
  );
}
