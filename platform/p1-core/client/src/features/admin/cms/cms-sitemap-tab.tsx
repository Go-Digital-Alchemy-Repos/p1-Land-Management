import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, STALE_TIMES } from "@/lib/queryClient";
import {
  ExternalLink,
  FileCode2,
  Globe,
  BookOpen,
  CalendarDays,
  FileText,
  CheckCircle2,
  EyeOff,
  ShieldOff,
  Save,
  RotateCcw,
} from "lucide-react";
import type { SeoSettings, CmsPage, BlogPost, Event } from "@shared/schema";
import { getEventPath } from "@shared/event-url";

interface SitemapEntry {
  loc: string;
  label: string;
  type: string;
  status?: string;
  noindex?: boolean;
  excluded: boolean;
  reason?: string;
}

interface RobotsTxtPayload {
  generatedContent: string;
  effectiveContent: string;
  customContent: string | null;
}

function EntryRow({ entry }: { entry: SitemapEntry }) {
  return (
    <div
      className={`flex items-center gap-3 py-2.5 border-b last:border-0 ${entry.excluded ? "opacity-50" : ""}`}
      data-testid={`sitemap-entry-${entry.loc.replace(/\//g, "-")}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-xs font-mono truncate">{entry.loc}</code>
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            {entry.type}
          </Badge>
        </div>
        {entry.reason && (
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            {entry.noindex ? <EyeOff className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
            {entry.reason}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">
        {entry.excluded ? (
          <Badge
            variant="secondary"
            className="text-xs bg-slate-100 text-slate-500 dark:bg-slate-800"
          >
            Excluded
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          >
            Included
          </Badge>
        )}
      </div>
    </div>
  );
}

export function CmsSitemapTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [robotsDialogOpen, setRobotsDialogOpen] = useState(false);
  const [robotsDraft, setRobotsDraft] = useState("");

  const { data: globalSeo } = useQuery<SeoSettings>({
    queryKey: ["/api/admin/cms/seo"],
    staleTime: STALE_TIMES.SESSION,
  });

  const { data: robotsTxt, isLoading: robotsLoading } = useQuery<RobotsTxtPayload>({
    queryKey: ["/api/admin/cms/seo/robots-txt"],
    staleTime: STALE_TIMES.LIVE,
  });

  useEffect(() => {
    if (robotsDialogOpen && robotsTxt) {
      setRobotsDraft(robotsTxt.customContent ?? robotsTxt.generatedContent);
    }
  }, [robotsDialogOpen, robotsTxt]);

  const { data: pages, isLoading: pagesLoading } = useQuery<CmsPage[]>({
    queryKey: ["/api/admin/cms/pages"],
  });

  const { data: posts, isLoading: postsLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/blog"],
  });

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/admin/events"],
  });

  const isLoading = pagesLoading || postsLoading || eventsLoading;

  const siteUrl = globalSeo?.siteUrl?.replace(/\/$/, "") || "";

  const staticEntries: SitemapEntry[] = [
    { loc: siteUrl || "/", label: "Home", type: "Static", excluded: false },
    { loc: `${siteUrl}/about`, label: "About", type: "Static", excluded: false },
    { loc: `${siteUrl}/insights`, label: "Blog Index", type: "Static", excluded: false },
    { loc: `${siteUrl}/events`, label: "Events Index", type: "Static", excluded: false },
    { loc: `${siteUrl}/directory`, label: "Directory", type: "Static", excluded: false },
    { loc: `${siteUrl}/join`, label: "Join Network", type: "Static", excluded: false },
    { loc: `${siteUrl}/contact`, label: "Contact", type: "Static", excluded: false },
  ];

  const corePageSlugs = ["home", "about", "contact", "join"];

  const cmsEntries: SitemapEntry[] = (pages ?? [])
    .filter((p) => !corePageSlugs.includes(p.slug))
    .map((p) => {
      const excluded = p.status !== "published" || !!p.noindex;
      return {
        loc: `${siteUrl}/${p.slug}`,
        label: p.title,
        type: "CMS Page",
        status: p.status ?? undefined,
        noindex: p.noindex ?? false,
        excluded,
        reason: p.noindex
          ? "Marked as noindex"
          : p.status !== "published"
            ? `Status: ${p.status}`
            : undefined,
      };
    });

  const postEntries: SitemapEntry[] = (posts ?? []).map((p) => {
    const excluded = !p.isPublished || !!p.noindex;
    return {
      loc: `${siteUrl}/insights/${p.slug}`,
      label: p.title,
      type: "Blog Post",
      noindex: p.noindex ?? false,
      excluded,
      reason: p.noindex ? "Marked as noindex" : !p.isPublished ? "Not published" : undefined,
    };
  });

  const eventEntries: SitemapEntry[] = (events ?? []).map((e) => {
    const excluded = e.status === "draft" || e.visibility !== "public";
    return {
      loc: `${siteUrl}${getEventPath(e)}`,
      label: e.title,
      type: "Event",
      status: e.status ?? undefined,
      excluded,
      reason:
        e.status === "draft"
          ? "Draft event"
          : e.visibility !== "public"
            ? `Visibility: ${e.visibility}`
            : undefined,
    };
  });

  const allEntries = [...staticEntries, ...cmsEntries, ...postEntries, ...eventEntries];
  const includedCount = allEntries.filter((e) => !e.excluded).length;
  const excludedCount = allEntries.filter((e) => e.excluded).length;

  const saveRobotsMutation = useMutation({
    mutationFn: async (customContent: string | null) => {
      const res = await apiRequest("PUT", "/api/admin/cms/seo/robots-txt", { customContent });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/seo/robots-txt"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/seo"] });
      toast({ title: "robots.txt saved" });
      setRobotsDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to save robots.txt", variant: "destructive" });
    },
  });

  const handleSaveRobots = () => {
    saveRobotsMutation.mutate(robotsDraft.trim() ? robotsDraft : null);
  };

  const handleResetRobots = () => {
    if (!robotsTxt) return;
    setRobotsDraft(robotsTxt.generatedContent);
  };

  const handleUseGeneratedVersion = () => {
    saveRobotsMutation.mutate(null);
  };

  return (
    <div className="space-y-5 mt-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-violet-500" />
            <CardTitle className="text-base">Sitemap Overview</CardTitle>
          </div>
          <CardDescription className="text-xs">
            The sitemap is auto-generated at{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">/sitemap.xml</code> from
            published content. Draft, noindex, and non-public content is automatically excluded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" data-testid="button-view-sitemap">
                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                View sitemap.xml
              </Button>
            </a>
            <Button
              size="sm"
              variant="outline"
              data-testid="button-view-robots"
              onClick={() => setRobotsDialogOpen(true)}
            >
              <FileText className="h-3.5 w-3.5 mr-2" />
              View robots.txt
            </Button>
            {siteUrl && (
              <code className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                {siteUrl}/sitemap.xml
              </code>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-md bg-muted/50 px-3 py-2 text-center">
              <p className="text-lg font-semibold">{includedCount}</p>
              <p className="text-xs text-muted-foreground">Indexed URLs</p>
            </div>
            <div className="rounded-md bg-muted/50 px-3 py-2 text-center">
              <p className="text-lg font-semibold">{excludedCount}</p>
              <p className="text-xs text-muted-foreground">Excluded URLs</p>
            </div>
            <div className="rounded-md bg-muted/50 px-3 py-2 text-center">
              <p className="text-lg font-semibold">
                {cmsEntries.filter((e) => !e.excluded).length + staticEntries.length}
              </p>
              <p className="text-xs text-muted-foreground">Pages</p>
            </div>
            <div className="rounded-md bg-muted/50 px-3 py-2 text-center">
              <p className="text-lg font-semibold">
                {postEntries.filter((e) => !e.excluded).length +
                  eventEntries.filter((e) => !e.excluded).length}
              </p>
              <p className="text-xs text-muted-foreground">Content</p>
            </div>
          </div>

          {!siteUrl && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
              <strong>Tip:</strong> Set your Canonical Site URL in Global Settings so the sitemap
              uses absolute URLs.
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 rounded" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">Static & Core Pages</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {staticEntries.map((e) => (
                <EntryRow key={e.loc} entry={e} />
              ))}
              {cmsEntries.map((e) => (
                <EntryRow key={e.loc} entry={e} />
              ))}
            </CardContent>
          </Card>

          {postEntries.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm">Blog Posts</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {postEntries.map((e) => (
                  <EntryRow key={e.loc} entry={e} />
                ))}
              </CardContent>
            </Card>
          )}

          {eventEntries.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm">Events</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {eventEntries.map((e) => (
                  <EntryRow key={e.loc} entry={e} />
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Exclusion Rules</CardTitle>
          <CardDescription className="text-xs">
            How content is filtered from the sitemap
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {[
              {
                icon: EyeOff,
                text: "Pages and posts with noindex = true are excluded from the sitemap.",
              },
              { icon: ShieldOff, text: "Draft CMS pages (status ≠ published) are excluded." },
              {
                icon: ShieldOff,
                text: "Unpublished blog posts (isPublished = false) are excluded.",
              },
              {
                icon: ShieldOff,
                text: "Draft events and events with visibility ≠ public are excluded.",
              },
              {
                icon: CheckCircle2,
                text: "Core routes (about, contact, join, directory) are always included.",
              },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={robotsDialogOpen} onOpenChange={setRobotsDialogOpen}>
        <DialogContent className="max-w-3xl" data-testid="dialog-robots-txt-editor">
          <DialogHeader>
            <DialogTitle>Edit robots.txt</DialogTitle>
            <DialogDescription>
              Review the generated default file and customize it when needed. Leave this blank to
              fall back to the generated version.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Serving mode</p>
              <p>
                {robotsTxt?.customContent
                  ? "A custom robots.txt file is currently live."
                  : "The system-generated robots.txt file is currently live."}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Editable robots.txt</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetRobots}
                  disabled={!robotsTxt || robotsLoading}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-2" />
                  Reset to Generated Default
                </Button>
              </div>
              <Textarea
                value={robotsDraft}
                onChange={(event) => setRobotsDraft(event.target.value)}
                className="min-h-[320px] font-mono text-xs"
                placeholder="User-agent: *&#10;Disallow: /admin"
                data-testid="textarea-robots-txt"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Current generated default</p>
              <pre
                className="max-h-48 overflow-auto rounded-md border bg-muted/20 p-3 text-xs whitespace-pre-wrap break-words"
                data-testid="generated-robots-preview"
              >
                {robotsTxt?.generatedContent ?? "Loading generated robots.txt..."}
              </pre>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setRobotsDialogOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleUseGeneratedVersion}
              disabled={saveRobotsMutation.isPending || robotsLoading || !robotsTxt?.customContent}
            >
              Use Generated Version
            </Button>
            <Button
              type="button"
              onClick={handleSaveRobots}
              disabled={saveRobotsMutation.isPending || robotsLoading}
            >
              <Save className="h-3.5 w-3.5 mr-2" />
              Save robots.txt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
