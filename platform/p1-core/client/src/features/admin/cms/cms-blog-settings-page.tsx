import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { BlogTaxonomy } from "@shared/schema";
import {
  BookOpen,
  FolderTree,
  MessageSquare,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  Tag,
  Trash2,
} from "lucide-react";

type TaxonomyDraft = {
  id?: string;
  name: string;
  parentId: string;
};

type BlogCommentStatus = "pending" | "approved" | "spam" | "rejected";

type BlogCommentSettings = {
  commentsEnabled: boolean;
  allowGuestComments: boolean;
  allowLinksInComments: boolean;
  requireApproval: boolean;
  enableSpamProtection: boolean;
  enableHoneypot: boolean;
  enableRateLimit: boolean;
  rateLimitSeconds: number;
  maxLinksPerComment: number;
};

type BlogCommentStatusCounts = Record<BlogCommentStatus, number>;

type AdminBlogComment = {
  id: string;
  postId: string;
  postTitle: string;
  postSlug: string;
  authorName: string;
  authorEmail: string | null;
  body: string;
  status: BlogCommentStatus;
  moderationNote: string | null;
  createdAt: string | null;
};

const DEFAULT_COMMENT_SETTINGS: BlogCommentSettings = {
  commentsEnabled: false,
  allowGuestComments: false,
  allowLinksInComments: false,
  requireApproval: true,
  enableSpamProtection: true,
  enableHoneypot: true,
  enableRateLimit: true,
  rateLimitSeconds: 60,
  maxLinksPerComment: 2,
};

function formatAdminCommentDate(value: string | null) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function CommentSettingsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<BlogCommentSettings>(DEFAULT_COMMENT_SETTINGS);
  const [statusFilter, setStatusFilter] = useState<"all" | BlogCommentStatus>("pending");
  const [commentDrafts, setCommentDrafts] = useState<
    Record<string, { body: string; moderationNote: string }>
  >({});

  const { data: commentsData, isLoading: isSettingsLoading } = useQuery<{
    settings: BlogCommentSettings;
    statusCounts: BlogCommentStatusCounts;
  }>({
    queryKey: ["/api/admin/blog/settings/comments"],
  });

  const { data: comments = [], isLoading: isCommentsLoading } = useQuery<AdminBlogComment[]>({
    queryKey: ["/api/admin/blog/comments", statusFilter],
    queryFn: async () => {
      const suffix = statusFilter === "all" ? "" : `?status=${statusFilter}`;
      const response = await fetch(`/api/admin/blog/comments${suffix}`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to load comments.");
      }
      return response.json();
    },
  });

  useEffect(() => {
    if (commentsData?.settings) {
      setDraft(commentsData.settings);
    }
  }, [commentsData]);

  useEffect(() => {
    setCommentDrafts((current) => {
      const next: Record<string, { body: string; moderationNote: string }> = {};
      for (const comment of comments) {
        next[comment.id] = current[comment.id] ?? {
          body: comment.body,
          moderationNote: comment.moderationNote ?? "",
        };
      }
      return next;
    });
  }, [comments]);

  const saveMutation = useMutation({
    mutationFn: async (payload: BlogCommentSettings) => {
      const response = await apiRequest("PUT", "/api/admin/blog/settings/comments", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/settings/comments"] });
      toast({ title: "Comment settings saved" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to save comment settings", variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BlogCommentStatus }) => {
      const response = await apiRequest("PATCH", `/api/admin/blog/comments/${id}/status`, {
        status,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/settings/comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/comments"] });
      toast({ title: "Comment updated" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to update comment", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/blog/comments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/settings/comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/comments"] });
      toast({ title: "Comment deleted" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to delete comment", variant: "destructive" });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async ({
      id,
      body,
      moderationNote,
    }: {
      id: string;
      body: string;
      moderationNote: string;
    }) => {
      const response = await apiRequest("PUT", `/api/admin/blog/comments/${id}`, {
        body,
        moderationNote: moderationNote.trim() || null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/comments"] });
      toast({ title: "Comment updated" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to update comment", variant: "destructive" });
    },
  });

  const counts = commentsData?.statusCounts ?? {
    pending: 0,
    approved: 0,
    spam: 0,
    rejected: 0,
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-violet-500" />
            Comment Settings
          </CardTitle>
          <CardDescription>
            Turn comments on sitewide and set practical moderation and anti-spam rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isSettingsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Enable Comments</Label>
                  <p className="text-xs text-muted-foreground">
                    Show or hide commenting across all public blog posts.
                  </p>
                </div>
                <Switch
                  checked={draft.commentsEnabled}
                  onCheckedChange={(checked) =>
                    setDraft((current) => ({ ...current, commentsEnabled: checked }))
                  }
                  data-testid="switch-blog-comments-enabled"
                />
              </div>

              <div className="space-y-3 rounded-xl border p-4">
                <div>
                  <h3 className="text-sm font-medium">Participation Rules</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Decide who can post and how visible comments become.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <Label>Allow guest comments</Label>
                      <p className="text-xs text-muted-foreground">
                        If off, only logged-in users can comment.
                      </p>
                    </div>
                    <Switch
                      checked={draft.allowGuestComments}
                      onCheckedChange={(checked) =>
                        setDraft((current) => ({ ...current, allowGuestComments: checked }))
                      }
                      disabled={!draft.commentsEnabled}
                      data-testid="switch-blog-comments-guests"
                    />
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <Label>Require approval</Label>
                      <p className="text-xs text-muted-foreground">
                        New comments stay pending until a moderator approves them.
                      </p>
                    </div>
                    <Switch
                      checked={draft.requireApproval}
                      onCheckedChange={(checked) =>
                        setDraft((current) => ({ ...current, requireApproval: checked }))
                      }
                      disabled={!draft.commentsEnabled}
                      data-testid="switch-blog-comments-approval"
                    />
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <Label>Allow links in comments</Label>
                      <p className="text-xs text-muted-foreground">
                        Turn this off if you want to eliminate URL-based spam entirely.
                      </p>
                    </div>
                    <Switch
                      checked={draft.allowLinksInComments}
                      onCheckedChange={(checked) =>
                        setDraft((current) => ({ ...current, allowLinksInComments: checked }))
                      }
                      disabled={!draft.commentsEnabled}
                      data-testid="switch-blog-comments-links"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-violet-500" />
                  <div>
                    <h3 className="text-sm font-medium">Spam Prevention</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add common-sense friction where it helps without overcomplicating the form.
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <Label>Enable spam protection</Label>
                      <p className="text-xs text-muted-foreground">
                        Excessive-link comments can be auto-flagged as spam.
                      </p>
                    </div>
                    <Switch
                      checked={draft.enableSpamProtection}
                      onCheckedChange={(checked) =>
                        setDraft((current) => ({ ...current, enableSpamProtection: checked }))
                      }
                      disabled={!draft.commentsEnabled}
                      data-testid="switch-blog-comments-spam"
                    />
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <Label>Enable honeypot trap</Label>
                      <p className="text-xs text-muted-foreground">
                        Quietly filters many automated bot submissions.
                      </p>
                    </div>
                    <Switch
                      checked={draft.enableHoneypot}
                      onCheckedChange={(checked) =>
                        setDraft((current) => ({ ...current, enableHoneypot: checked }))
                      }
                      disabled={!draft.commentsEnabled}
                      data-testid="switch-blog-comments-honeypot"
                    />
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <Label>Enable rate limit</Label>
                      <p className="text-xs text-muted-foreground">
                        Prevents repeat posting too quickly from the same identity.
                      </p>
                    </div>
                    <Switch
                      checked={draft.enableRateLimit}
                      onCheckedChange={(checked) =>
                        setDraft((current) => ({ ...current, enableRateLimit: checked }))
                      }
                      disabled={!draft.commentsEnabled}
                      data-testid="switch-blog-comments-rate-limit"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="comment-rate-limit">Rate limit window (seconds)</Label>
                    <Input
                      id="comment-rate-limit"
                      type="number"
                      min={10}
                      max={86400}
                      value={draft.rateLimitSeconds}
                      disabled={!draft.commentsEnabled || !draft.enableRateLimit}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          rateLimitSeconds: Number(event.target.value || 60),
                        }))
                      }
                      data-testid="input-blog-comments-rate-limit"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="comment-max-links">Maximum links per comment</Label>
                    <Input
                      id="comment-max-links"
                      type="number"
                      min={0}
                      max={20}
                      value={draft.maxLinksPerComment}
                      disabled={
                        !draft.commentsEnabled ||
                        !draft.enableSpamProtection ||
                        !draft.allowLinksInComments
                      }
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          maxLinksPerComment: Number(event.target.value || 0),
                        }))
                      }
                      data-testid="input-blog-comments-max-links"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={() => saveMutation.mutate(draft)}
                disabled={saveMutation.isPending}
                data-testid="button-save-blog-comment-settings"
              >
                Save Comment Settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-violet-500" />
              Comment Moderation
            </CardTitle>
            <CardDescription>
              Review pending comments, approve good ones, and keep spam out of public posts.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              data-testid="button-filter-comments-all"
            >
              All
            </Button>
            {(["pending", "approved", "spam", "rejected"] as BlogCommentStatus[]).map((status) => (
              <Button
                key={status}
                type="button"
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
                data-testid={`button-filter-comments-${status}`}
              >
                <span className="capitalize">{status}</span>
                <Badge variant="secondary" className="ml-2">
                  {counts[status]}
                </Badge>
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCommentsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : comments.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No comments found for this filter.
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-xl border p-4 space-y-3"
                data-testid={`card-admin-blog-comment-${comment.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{comment.authorName}</p>
                      <Badge variant="secondary" className="capitalize">
                        {comment.status}
                      </Badge>
                      <Badge variant="outline">{comment.postTitle}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {comment.authorEmail || "No email"} •{" "}
                      {formatAdminCommentDate(comment.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {comment.status !== "approved" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          statusMutation.mutate({ id: comment.id, status: "approved" })
                        }
                        disabled={statusMutation.isPending}
                        data-testid={`button-approve-comment-${comment.id}`}
                      >
                        Approve
                      </Button>
                    ) : null}
                    {comment.status !== "pending" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => statusMutation.mutate({ id: comment.id, status: "pending" })}
                        disabled={statusMutation.isPending}
                        data-testid={`button-pending-comment-${comment.id}`}
                      >
                        Pending
                      </Button>
                    ) : null}
                    {comment.status !== "spam" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => statusMutation.mutate({ id: comment.id, status: "spam" })}
                        disabled={statusMutation.isPending}
                        data-testid={`button-spam-comment-${comment.id}`}
                      >
                        Spam
                      </Button>
                    ) : null}
                    {comment.status !== "rejected" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          statusMutation.mutate({ id: comment.id, status: "rejected" })
                        }
                        disabled={statusMutation.isPending}
                        data-testid={`button-reject-comment-${comment.id}`}
                      >
                        Reject
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(comment.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-comment-${comment.id}`}
                    >
                      Delete
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const currentDraft = commentDrafts[comment.id] ?? {
                          body: comment.body,
                          moderationNote: comment.moderationNote ?? "",
                        };
                        updateCommentMutation.mutate({
                          id: comment.id,
                          body: currentDraft.body,
                          moderationNote: currentDraft.moderationNote,
                        });
                      }}
                      disabled={
                        updateCommentMutation.isPending ||
                        ((commentDrafts[comment.id]?.body ?? comment.body) === comment.body &&
                          (commentDrafts[comment.id]?.moderationNote ??
                            comment.moderationNote ??
                            "") === (comment.moderationNote ?? ""))
                      }
                      data-testid={`button-save-comment-${comment.id}`}
                    >
                      Save Edit
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`comment-body-${comment.id}`}>Comment Body</Label>
                    <Textarea
                      id={`comment-body-${comment.id}`}
                      value={commentDrafts[comment.id]?.body ?? comment.body}
                      onChange={(event) =>
                        setCommentDrafts((current) => ({
                          ...current,
                          [comment.id]: {
                            body: event.target.value,
                            moderationNote:
                              current[comment.id]?.moderationNote ?? comment.moderationNote ?? "",
                          },
                        }))
                      }
                      className="min-h-[120px] bg-muted/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`comment-note-${comment.id}`}>Moderation Note</Label>
                    <Textarea
                      id={`comment-note-${comment.id}`}
                      value={
                        commentDrafts[comment.id]?.moderationNote ?? comment.moderationNote ?? ""
                      }
                      onChange={(event) =>
                        setCommentDrafts((current) => ({
                          ...current,
                          [comment.id]: {
                            body: current[comment.id]?.body ?? comment.body,
                            moderationNote: event.target.value,
                          },
                        }))
                      }
                      className="min-h-[88px] bg-muted/10"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function buildCategoryPath(taxonomy: BlogTaxonomy, all: BlogTaxonomy[]): string {
  const labels = [taxonomy.name];
  let parentId = taxonomy.parentId;

  while (parentId) {
    const parent = all.find((item) => item.id === parentId);
    if (!parent) break;
    labels.unshift(parent.name);
    parentId = parent.parentId;
  }

  return labels.join(" / ");
}

function TaxonomyManager({
  type,
  taxonomies,
}: {
  type: "category" | "tag";
  taxonomies: BlogTaxonomy[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<TaxonomyDraft>({ name: "", parentId: "" });

  const categories = useMemo(
    () => taxonomies.filter((item) => item.type === "category"),
    [taxonomies],
  );
  const items = useMemo(() => taxonomies.filter((item) => item.type === type), [taxonomies, type]);

  const saveMutation = useMutation({
    mutationFn: async (payload: TaxonomyDraft) => {
      if (payload.id) {
        const response = await apiRequest(
          "PUT",
          `/api/admin/blog/settings/taxonomies/${payload.id}`,
          {
            name: payload.name,
            parentId: type === "category" ? payload.parentId || null : null,
          },
        );
        return response.json();
      }

      const response = await apiRequest("POST", "/api/admin/blog/settings/taxonomies", {
        name: payload.name,
        type,
        parentId: type === "category" ? payload.parentId || null : null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/settings/taxonomies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      toast({ title: `${type === "category" ? "Category" : "Tag"} saved` });
      setDraft({ name: "", parentId: "" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to save term", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/blog/settings/taxonomies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/settings/taxonomies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      toast({ title: `${type === "category" ? "Category" : "Tag"} deleted` });
      setDraft({ name: "", parentId: "" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to delete term", variant: "destructive" });
    },
  });

  const isEditing = Boolean(draft.id);
  const heading = type === "category" ? "Categories" : "Tags";
  const icon = type === "category" ? FolderTree : Tag;
  const Icon = icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-violet-500" />
          {heading}
        </CardTitle>
        <CardDescription>
          {type === "category"
            ? "Create top-level categories and subcategories for your blog posts."
            : "Manage reusable tags that editors can assign across multiple posts."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border p-4 bg-muted/10 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{type === "category" ? "Category Name" : "Tag Name"}</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))}
                placeholder={type === "category" ? "e.g. Core Platform Research" : "e.g. belonging"}
                data-testid={`input-blog-${type}-name`}
              />
            </div>
            {type === "category" && (
              <div className="space-y-1.5">
                <Label>Parent Category</Label>
                <Select
                  value={draft.parentId || "__none__"}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      parentId: value === "__none__" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger data-testid="select-blog-category-parent">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {categories
                      .filter((item) => item.id !== draft.id)
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {buildCategoryPath(item, categories)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              onClick={() => saveMutation.mutate(draft)}
              disabled={!draft.name.trim() || saveMutation.isPending}
              data-testid={`button-save-blog-${type}`}
            >
              {isEditing ? "Update" : "Add"} {type === "category" ? "Category" : "Tag"}
            </Button>
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setDraft({ name: "", parentId: "" })}
                data-testid={`button-cancel-blog-${type}`}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No {heading.toLowerCase()} yet.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border p-3"
                data-testid={`row-blog-taxonomy-${item.id}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">
                      {type === "category" ? buildCategoryPath(item, categories) : item.name}
                    </p>
                    {item.parentId && <Badge variant="outline">Subcategory</Badge>}
                    <Badge variant="secondary" className="capitalize">
                      {item.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">/{item.slug}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDraft({ id: item.id, name: item.name, parentId: item.parentId ?? "" })
                    }
                    data-testid={`button-edit-blog-taxonomy-${item.id}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(item.id)}
                    data-testid={`button-delete-blog-taxonomy-${item.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function BlogSettingsPanel() {
  const { data: taxonomies = [], isLoading } = useQuery<BlogTaxonomy[]>({
    queryKey: ["/api/admin/blog/settings/taxonomies"],
  });

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <TaxonomyManager type="category" taxonomies={taxonomies} />
          <TaxonomyManager type="tag" taxonomies={taxonomies} />
        </div>
      )}

      <Card className="border-dashed">
        <CardContent className="pt-6 text-sm text-muted-foreground flex items-center gap-2">
          <Plus className="h-4 w-4 text-violet-500" />
          Your editorial taxonomy lives here, while engagement and moderation rules can now stay in
          the Comments tab.
        </CardContent>
      </Card>
    </div>
  );
}

export default function CmsBlogSettingsPage() {
  return (
    <AdminSidebar>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1
              className="text-2xl font-heading font-semibold"
              data-testid="text-blog-settings-title"
            >
              Blog Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure reusable blog taxonomy controls and future publishing settings.
            </p>
          </div>
        </div>

        <Tabs defaultValue="taxonomy" className="space-y-4">
          <TabsList>
            <TabsTrigger value="taxonomy" data-testid="tab-blog-taxonomy">
              <BookOpen className="h-4 w-4 mr-1.5 text-blue-600" />
              Categories & Tags
            </TabsTrigger>
            <TabsTrigger value="comments" data-testid="tab-blog-comments">
              <MessageSquare className="h-4 w-4 mr-1.5 text-emerald-600" />
              Comments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="taxonomy" className="mt-0 space-y-4">
            <BlogSettingsPanel />
          </TabsContent>

          <TabsContent value="comments" className="mt-0">
            <CommentSettingsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AdminSidebar>
  );
}
