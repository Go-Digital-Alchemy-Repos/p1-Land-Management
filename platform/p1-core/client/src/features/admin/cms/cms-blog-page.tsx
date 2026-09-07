import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  BookOpen,
  Search,
  ExternalLink,
  CalendarClock,
  MessageSquare,
  Settings,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { getPostCategories, getPrimaryPostCategory } from "@/lib/blog-post-categories";
import type { BlogPost } from "@shared/schema";
import { format } from "date-fns";
import { BlogSettingsPanel, CommentSettingsPanel } from "./cms-blog-settings-page";

export default function CmsBlogPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const locationTab = useMemo<"posts" | "settings" | "comments">(() => {
    const params = new URLSearchParams(location.split("?")[1] ?? "");
    const tab = params.get("tab");
    if (tab === "settings") return "settings";
    if (tab === "comments") return "comments";
    return "posts";
  }, [location]);
  const [activeTab, setActiveTab] = useState<"posts" | "settings" | "comments">(locationTab);

  useEffect(() => {
    if (activeTab !== locationTab) {
      setActiveTab(locationTab);
    }
  }, [locationTab, activeTab]);

  const { data: posts = [], isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/blog"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/blog/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      toast({ title: "Post deleted" });
      setDeletingId(null);
    },
    onError: () => toast({ title: "Failed to delete post", variant: "destructive" }),
  });

  const filtered = posts.filter((p) => {
    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.authorName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      getPostCategories(p).some((category) =>
        category.toLowerCase().includes(search.toLowerCase()),
      );
    const isScheduled = !p.isPublished && !!p.scheduledAt;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "published" && p.isPublished) ||
      (statusFilter === "scheduled" && isScheduled) ||
      (statusFilter === "draft" && !p.isPublished && !isScheduled);
    return matchSearch && matchStatus;
  });

  const handleTabChange = (value: string) => {
    const nextTab = value === "settings" || value === "comments" ? value : "posts";
    setActiveTab(nextTab);

    const params = new URLSearchParams(location.split("?")[1] ?? "");
    if (nextTab === "posts") {
      params.delete("tab");
    } else {
      params.set("tab", nextTab);
    }
    const nextQuery = params.toString();
    window.history.replaceState({}, "", `/admin/cms/blog${nextQuery ? `?${nextQuery}` : ""}`);
  };

  return (
    <AdminSidebar>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-heading font-semibold" data-testid="text-cms-blog-title">
              Blog
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage articles, editorial settings, and community conversation around /insights.
            </p>
          </div>
          <Button asChild data-testid="button-new-post">
            <Link href="/admin/cms/blog/new">
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Link>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList>
            <TabsTrigger value="posts" data-testid="tab-blog-posts">
              <BookOpen className="mr-1.5 h-4 w-4 text-blue-600" />
              Blog Posts
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-blog-settings">
              <Settings className="mr-1.5 h-4 w-4 text-slate-500" />
              Blog Settings
            </TabsTrigger>
            <TabsTrigger value="comments" data-testid="tab-blog-comments">
              <MessageSquare className="mr-1.5 h-4 w-4 text-emerald-600" />
              Comments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-0 space-y-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search posts…"
                  className="pl-9"
                  data-testid="input-blog-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36" data-testid="select-blog-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All posts</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="draft">Drafts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="pt-14 pb-14 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-8 w-8 text-orange-400" />
                  </div>
                  <h2 className="text-lg font-semibold mb-2">
                    {search || statusFilter !== "all"
                      ? "No posts match your filters"
                      : "No blog posts yet"}
                  </h2>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-5">
                    {search || statusFilter !== "all"
                      ? "Try different search terms or filters."
                      : "Create your first post to start sharing insights with the Core Platform community."}
                  </p>
                  {!search && statusFilter === "all" && (
                    <Button asChild variant="outline">
                      <Link href="/admin/cms/blog/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Write First Post
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filtered.map((post) => (
                  <Card
                    key={post.id}
                    className="hover:border-orange-200 dark:hover:border-orange-800 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/cms/blog/${post.id}`)}
                    data-testid={`card-post-${post.id}`}
                  >
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3
                            className="font-semibold truncate"
                            data-testid={`text-post-title-${post.id}`}
                          >
                            {post.title}
                          </h3>
                          {post.isPublished ? (
                            <Badge
                              className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs"
                              data-testid={`badge-published-${post.id}`}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Published
                            </Badge>
                          ) : post.scheduledAt ? (
                            <Badge
                              className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs"
                              data-testid={`badge-scheduled-${post.id}`}
                            >
                              <CalendarClock className="h-3 w-3 mr-1" />
                              Scheduled · {format(new Date(post.scheduledAt), "MMM d, yyyy h:mm a")}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs"
                              data-testid={`badge-draft-${post.id}`}
                            >
                              <EyeOff className="h-3 w-3 mr-1" />
                              Draft
                            </Badge>
                          )}
                          {getPrimaryPostCategory(post) && (
                            <Badge variant="secondary" className="text-xs">
                              {getPrimaryPostCategory(post)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          By {post.authorName}
                          {post.publishedAt && (
                            <> · {format(new Date(post.publishedAt), "MMM d, yyyy")}</>
                          )}
                          <span className="ml-2 font-mono text-xs text-muted-foreground/60">
                            /insights/{post.slug}
                          </span>
                        </p>
                      </div>
                      <div
                        className="flex items-center gap-2 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {post.isPublished && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            asChild
                            title="View on site"
                          >
                            <a
                              href={`/insights/${post.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-testid={`link-view-post-${post.id}`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingId(post.id)}
                          data-testid={`button-delete-post-${post.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <BlogSettingsPanel />
          </TabsContent>

          <TabsContent value="comments" className="mt-0">
            <CommentSettingsPanel />
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the blog post. Published posts will immediately disappear
              from the public site. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-post"
            >
              Delete Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminSidebar>
  );
}
