import { STALE_TIMES } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  BookOpen,
  CalendarDays,
  ShieldOff,
  EyeOff,
  ImageOff,
  AlignLeft,
  Type,
  User,
  Link2Off,
} from "lucide-react";

interface AuditItem {
  id: string;
  title: string;
  slug?: string;
  status?: string;
  isPublished?: boolean;
  noindex?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageUrl?: string | null;
  coverImageUrl?: string | null;
  canonicalUrl?: string | null;
  authorName?: string | null;
  visibility?: string;
  date?: string;
  imageUrl?: string | null;
  issues: string[];
}

interface AuditData {
  pages: AuditItem[];
  posts: AuditItem[];
  events: AuditItem[];
}

const ISSUE_META: Record<
  string,
  { label: string; icon: React.ElementType; severity: "high" | "medium" | "low" }
> = {
  missing_seo_title: { label: "No SEO title", icon: Type, severity: "high" },
  missing_seo_description: { label: "No meta description", icon: AlignLeft, severity: "high" },
  missing_og_image: { label: "No social image", icon: ImageOff, severity: "medium" },
  noindex: { label: "Noindex", icon: EyeOff, severity: "high" },
  not_published: { label: "Not published", icon: ShieldOff, severity: "low" },
  no_canonical: { label: "No canonical URL", icon: Link2Off, severity: "low" },
  non_public: { label: "Non-public", icon: ShieldOff, severity: "low" },
  missing_author: { label: "No author", icon: User, severity: "medium" },
  missing_description: { label: "No description", icon: AlignLeft, severity: "medium" },
};

function IssueBadge({ issue }: { issue: string }) {
  const meta = ISSUE_META[issue] ?? { label: issue, icon: AlertTriangle, severity: "low" };
  const Icon = meta.icon;
  const colors =
    meta.severity === "high"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : meta.severity === "medium"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${colors}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function AuditRow({
  item,
  editPath,
  previewPath,
  type,
}: {
  item: AuditItem;
  editPath: string;
  previewPath?: string;
  type: "page" | "post" | "event";
}) {
  const clean = item.issues.length === 0;
  return (
    <div
      className="flex items-start justify-between gap-4 py-3 border-b last:border-0"
      data-testid={`audit-row-${type}-${item.id}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-medium truncate" data-testid={`audit-title-${item.id}`}>
            {item.title}
          </span>
          {item.slug && (
            <span className="text-xs text-muted-foreground font-mono truncate">/{item.slug}</span>
          )}
        </div>
        {clean ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            No issues
          </span>
        ) : (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.issues.map((issue) => (
              <IssueBadge key={issue} issue={issue} />
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {previewPath && (
          <a href={previewPath} target="_blank" rel="noopener noreferrer">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              data-testid={`audit-preview-${item.id}`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
        )}
        <Link href={editPath}>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs"
            data-testid={`audit-edit-${item.id}`}
          >
            Edit
          </Button>
        </Link>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  total,
  issues,
  icon: Icon,
  color,
}: {
  label: string;
  total: number;
  issues: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${color} bg-opacity-10`}>
            <Icon className={`h-4 w-4 ${color.replace("bg-", "text-")}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold leading-tight">{total}</p>
          </div>
          {issues > 0 && (
            <Badge
              variant="secondary"
              className="ml-auto bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs"
            >
              {issues} issue{issues !== 1 ? "s" : ""}
            </Badge>
          )}
          {issues === 0 && total > 0 && (
            <Badge
              variant="secondary"
              className="ml-auto bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs"
            >
              All clear
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CmsSeoAuditTab() {
  const { data, isLoading, error } = useQuery<AuditData>({
    queryKey: ["/api/admin/cms/seo-audit"],
    staleTime: STALE_TIMES.OPERATIONAL,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 mt-5">
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="mt-5">
        <CardContent className="pt-6 text-center text-muted-foreground text-sm">
          Failed to load audit data.
        </CardContent>
      </Card>
    );
  }

  const pagesWithIssues = data.pages.filter((p) => p.issues.length > 0).length;
  const postsWithIssues = data.posts.filter((p) => p.issues.length > 0).length;
  const eventsWithIssues = data.events.filter((e) => e.issues.length > 0).length;

  const allItems = [
    ...data.pages.map((p) => ({ ...p, _type: "page" as const })),
    ...data.posts.map((p) => ({ ...p, _type: "post" as const })),
    ...data.events.map((e) => ({ ...e, _type: "event" as const })),
  ];
  const itemsWithIssues = allItems.filter((i) => i.issues.length > 0);
  const totalIssues = allItems.reduce((sum, i) => sum + i.issues.length, 0);

  return (
    <div className="space-y-5 mt-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          label="CMS Pages"
          total={data.pages.length}
          issues={pagesWithIssues}
          icon={FileText}
          color="bg-violet-500"
        />
        <SummaryCard
          label="Blog Posts"
          total={data.posts.length}
          issues={postsWithIssues}
          icon={BookOpen}
          color="bg-purple-500"
        />
        <SummaryCard
          label="Events"
          total={data.events.length}
          issues={eventsWithIssues}
          icon={CalendarDays}
          color="bg-indigo-500"
        />
      </div>

      {totalIssues === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
            <p className="font-medium text-sm">No SEO issues found</p>
            <p className="text-xs text-muted-foreground mt-1">
              All content has SEO titles, descriptions, and images.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base">
                {itemsWithIssues.length} item{itemsWithIssues.length !== 1 ? "s" : ""} with SEO
                issues
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              {totalIssues} signal{totalIssues !== 1 ? "s" : ""} detected across all content. Click
              Edit to resolve them.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {itemsWithIssues.filter((i) => i._type === "page").length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <FileText className="h-3 w-3" /> Pages
                </p>
                {itemsWithIssues
                  .filter((i) => i._type === "page")
                  .map((item) => (
                    <AuditRow
                      key={item.id}
                      item={item}
                      type="page"
                      editPath={`/admin/cms/pages/${item.id}`}
                      previewPath={
                        item.slug && item.status === "published" ? `/${item.slug}` : undefined
                      }
                    />
                  ))}
              </div>
            )}

            {itemsWithIssues.filter((i) => i._type === "post").length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <BookOpen className="h-3 w-3" /> Blog Posts
                </p>
                {itemsWithIssues
                  .filter((i) => i._type === "post")
                  .map((item) => (
                    <AuditRow
                      key={item.id}
                      item={item}
                      type="post"
                      editPath={`/admin/cms/blog/${item.id}`}
                      previewPath={
                        item.slug && item.isPublished ? `/insights/${item.slug}` : undefined
                      }
                    />
                  ))}
              </div>
            )}

            {itemsWithIssues.filter((i) => i._type === "event").length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <CalendarDays className="h-3 w-3" /> Events
                </p>
                {itemsWithIssues
                  .filter((i) => i._type === "event")
                  .map((item) => (
                    <AuditRow
                      key={item.id}
                      item={item}
                      type="event"
                      editPath={`/admin/events/${item.id}`}
                      previewPath={
                        item.status !== "draft" ? `/events/${item.slug || item.id}` : undefined
                      }
                    />
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Issue Reference</CardTitle>
          <CardDescription className="text-xs">
            What each signal means and how to resolve it
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(ISSUE_META).map(([key, meta]) => {
              const Icon = meta.icon;
              return (
                <div key={key} className="flex items-start gap-2">
                  <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {key === "missing_seo_title" &&
                        "Set a custom SEO Title in the page/post SEO tab."}
                      {key === "missing_seo_description" &&
                        "Add a Meta Description for better click-through rates."}
                      {key === "missing_og_image" &&
                        "Upload a social sharing image for rich link previews."}
                      {key === "noindex" &&
                        "This content is marked as noindex and won't appear in search results."}
                      {key === "not_published" &&
                        "Content is in draft state and not publicly visible."}
                      {key === "no_canonical" &&
                        "Published pages benefit from an explicit canonical URL."}
                      {key === "non_public" &&
                        "Event visibility is restricted — not crawlable by search engines."}
                      {key === "missing_author" &&
                        "Add an author name to blog posts for Article structured data."}
                      {key === "missing_description" &&
                        "Events should include a description for rich search results."}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
