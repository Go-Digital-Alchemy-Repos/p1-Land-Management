import {
  BlogPresentationEditor,
  alignPresentationTitle,
} from "@/components/shared/blog-presentation-editor";
import { Label } from "@/components/ui/label";
import { validateBlogPresentation, type BlogPresentation } from "@shared/blog-presentation";
import type {
  BlogPublicationPostResponse as MarketingBlogPublicationPost,
  BlogPublicationAction as MarketingBlogPublicationActionAction,
  BlogRevisionResponse as MarketingBlogRevision,
  BlogPreviewResponse as MarketingBlogPreview,
} from "@shared/blog-publication-response";
import {
  BlogEditorTabs,
  BlogEditorCard,
  BlogEditorHeader,
  BlogTaxonomyPicker,
} from "@/components/shared/blog-editor-presentation";
import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BlogEditor } from "@/components/shared/blog-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { AdminSaveBar } from "@/components/shared/admin-save-bar";
import { AdminMobileActionBar } from "@/components/shared/admin-mobile-action-bar";
import { EditorLockBanner } from "@/components/shared/editor-lock-banner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Globe,
  Eye,
  EyeOff,
  BookOpen,
  ExternalLink,
  Headphones,
  Link2,
  FileText,
  CalendarClock,
  Plus,
  Settings2,
  LayoutTemplate,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link } from "wouter";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { CmsImageUpload } from "./components/cms-image-upload";
import { SeoPreview } from "@/components/shared/seo-preview";
import { StructuredDataStatus } from "@/components/shared/structured-data-status";
import { ImagePositionPicker } from "./components/image-position-picker";
import type { BlogPost, BlogTaxonomy, CmsSidebar } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useEditorLock } from "@/hooks/use-editor-lock";

import { useEditorSaveState } from "@/hooks/use-editor-save-state";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";

async function publicationRequest(method: string, url: string, data?: unknown): Promise<Response> {
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw Object.assign(
      Error(detail.error || detail.message || "Blog publication request failed"),
      { status: response.status },
    );
  }
  return response;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function dedupeValues(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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

const postFormSchema = z.object({
  presentation: z.custom<BlogPresentation | null>().optional(),
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  authorName: z.string().min(1, "Author name is required"),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  excerpt: z.string().optional(),
  content: z.string().optional().default(""),
  coverImageUrl: z.string().optional(),
  coverImagePositionX: z.number().default(50),
  coverImagePositionY: z.number().default(50),
  postType: z.enum(["article", "podcast", "external"]).default("article"),
  podcastUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  externalUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  sidebarId: z.string().default(""),
  isPublished: z.boolean().default(false),
  seoTitle: z.string().optional(),
  seoDescription: z.string().max(160, "Max 160 characters").optional(),
  ogImageUrl: z.string().optional(),
  noindex: z.boolean().default(false),
});

type PostForm = z.infer<typeof postFormSchema>;

export default function CmsBlogEditorPage() {
  const { id } = useParams<{ id: string }>();
  return <CmsBlogEditor key={id || "new"} />;
}

function CmsBlogEditor() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = !id || id === "new";
  const slugManuallyEdited = useRef(false);
  const [initialized, setInitialized] = useState(false);

  const [snapshot, setSnapshot] = useState<MarketingBlogPublicationPost | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [reading, setReading] = useState(false);
  const [publicationError, setPublicationError] = useState("");
  const [adoptionReason, setAdoptionReason] = useState("");
  const [revisions, setRevisions] = useState<MarketingBlogRevision[]>([]);
  const [preview, setPreview] = useState<MarketingBlogPreview | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const {
    data: post,
    isLoading,
    error: loadError,
  } = useQuery<MarketingBlogPublicationPost>({
    queryKey: ["/api/admin/blog/publications", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/blog/publications/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Post not found");
      return res.json();
    },
    enabled: !isNew,
  });

  const { data: sidebars = [] } = useQuery<CmsSidebar[]>({
    queryKey: ["/api/admin/cms/sidebars"],
  });
  const { data: taxonomies = [] } = useQuery<BlogTaxonomy[]>({
    queryKey: ["/api/admin/blog/settings/taxonomies"],
  });

  const editorLock = useEditorLock({
    resourceType: "blog_post",
    resourceId: isNew ? null : (post?.id ?? id ?? null),
    enabled: !isNew && !!snapshot && !snapshot.publication.requiresAdoption,
  });

  const form = useForm<PostForm>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      title: "",
      slug: "",
      authorName: "",
      categories: [],
      tags: [],
      excerpt: "",
      content: "",
      coverImageUrl: "",
      coverImagePositionX: 50,
      coverImagePositionY: 50,
      postType: "article",
      podcastUrl: "",
      externalUrl: "",
      sidebarId: "",
      isPublished: false,
      seoTitle: "",
      seoDescription: "",
      ogImageUrl: "",
      noindex: false,
    },
  });

  const adoptSnapshot = (post: MarketingBlogPublicationPost) => {
    setSnapshot(post);
    form.reset({
      ...(post.presentation !== undefined ? { presentation: post.presentation } : {}),
      title: post.title,
      slug: post.slug,
      authorName: post.authorName,
      categories: post.categories?.length ? post.categories : post.category ? [post.category] : [],
      tags: post.tags ?? [],
      excerpt: post.excerpt ?? "",
      content: post.content,
      coverImageUrl: post.coverImageUrl ?? "",
      coverImagePositionX: post.coverImagePositionX ?? 50,
      coverImagePositionY: post.coverImagePositionY ?? 50,
      postType: (post.postType as "article" | "podcast" | "external") ?? "article",
      podcastUrl: post.podcastUrl ?? "",
      externalUrl: post.externalUrl ?? "",
      sidebarId: post.sidebarId ?? "",
      isPublished: post.isPublished ?? false,
      seoTitle: post.seoTitle ?? "",
      seoDescription: post.seoDescription ?? "",
      ogImageUrl: post.ogImageUrl ?? "",
      noindex: post.noindex ?? false,
    });
    slugManuallyEdited.current = true;
    setInitialized(true);
  };
  useEffect(() => {
    if (post && !initialized) adoptSnapshot(post);
  }, [post, initialized]);

  const watchTitle = form.watch("title");
  useEffect(() => {
    if (isNew && !slugManuallyEdited.current) {
      form.setValue("slug", generateSlug(watchTitle), { shouldValidate: false });
    }
  }, [watchTitle, isNew, form]);

  const [blogScheduleDate, setBlogScheduleDate] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newTagName, setNewTagName] = useState("");

  const categories = useMemo(
    () => taxonomies.filter((item) => item.type === "category"),
    [taxonomies],
  );
  const availableTags = useMemo(
    () => taxonomies.filter((item) => item.type === "tag"),
    [taxonomies],
  );

  const buildPayload = (data: PostForm) => {
    const presentation = alignPresentationTitle(data.presentation, data.title);
    if (presentation != null && !validateBlogPresentation(presentation, data.title))
      throw Object.assign(
        Error(
          "This post contains unsupported presentation metadata. Check the headline and declared dates; modification must not precede publication. Your draft is retained.",
        ),
        { status: 400 },
      );
    const nextCategories = dedupeValues(data.categories ?? []);
    const nextTags = dedupeValues(data.tags ?? []);
    return {
      ...(presentation !== undefined ? { presentation } : {}),
      title: data.title,
      slug: data.slug || generateSlug(data.title),
      excerpt: data.excerpt || null,
      content: data.content || "",
      coverImageUrl: data.coverImageUrl || null,
      coverImagePositionX: data.coverImagePositionX ?? 50,
      coverImagePositionY: data.coverImagePositionY ?? 50,
      authorName: data.authorName,
      postType: data.postType || "article",
      podcastUrl: data.podcastUrl || null,
      externalUrl: data.externalUrl || null,
      sidebarId: data.sidebarId || null,
      category: nextCategories[0] || null,
      categories: nextCategories.length > 0 ? nextCategories : null,
      tags: nextTags.length > 0 ? nextTags : null,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      ogImageUrl: data.ogImageUrl || null,
      noindex: data.noindex ?? false,
    };
  };

  const publicationMutation = useMutation({
    mutationFn: async ({
      action,
      data,
      revisionId,
    }: {
      action: MarketingBlogPublicationActionAction | "adopt";
      data?: PostForm;
      revisionId?: string;
    }) => {
      if (blocked)
        throw Error("Verify the saved state before another write. Your draft is retained.");
      const path = "/api/admin/blog/publications";
      let response: Response;
      if (isNew) {
        response = await publicationRequest("POST", path, {
          data: buildPayload(data!),
          editorInstanceId: editorLock.editorInstanceId,
        });
      } else if (action === "adopt") {
        response = await publicationRequest("POST", `${path}/${id}/adopt`, {
          expectedLegacyFingerprint: snapshot!.publication.legacyFingerprint,
          reason: adoptionReason.trim(),
          editorInstanceId: editorLock.editorInstanceId,
        });
      } else {
        if (!snapshot?.publication.version)
          throw Error("Explicit adoption is required before editing.");
        const proof = await editorLock.preconditions(snapshot.publication.version);
        if (
          action === "schedule" &&
          (!blogScheduleDate || Date.parse(blogScheduleDate) <= Date.now())
        )
          throw Object.assign(Error("Choose a future publication date."), { status: 400 });
        response = await publicationRequest("POST", `${path}/${id}/actions`, {
          ...proof,
          action,
          ...(data ? { data: buildPayload(data) } : {}),
          ...(revisionId ? { revisionId } : {}),
          ...(action === "schedule"
            ? { scheduledAt: new Date(blogScheduleDate).toISOString() }
            : {}),
        });
      }
      const result: MarketingBlogPublicationPost = await response.json();
      if (result.lease?.ownedByCurrentEditor && result.lease.lock) {
        await publicationRequest("POST", `/api/admin/editor-locks/blog_post/${result.id}/release`, {
          editorInstanceId: editorLock.editorInstanceId,
          leaseId: result.lease.lock.id,
        });
      }
      return result;
    },
    onSuccess: (result, variables) => {
      if (!mounted.current) return;
      setSnapshot(result);
      setBlocked(false);
      setPublicationError("");
      setRevisions([]);
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/publications"] });
      if (variables.action === "delete") {
        navigate("/admin/cms/blog");
        return;
      }
      if (variables.data) form.reset({ ...variables.data, presentation: result.presentation });
      else if (["restore", "adopt"].includes(variables.action)) {
        // Explicit adoption/restore replaces the draft; background reads never do.
        queryClient.setQueryData(["/api/admin/blog/publications", id], result);
        adoptSnapshot(result);
      }
      saveState.markSaved();
      toast({
        title:
          variables.action === "save"
            ? "Draft saved; public content unchanged"
            : "Publication action completed",
      });
      if (isNew) navigate(`/admin/cms/blog/${result.id}`);
    },
    onError: (error: Error) => {
      if (!mounted.current) return;
      setBlocked(![400, 413, 422].includes(Number((error as Error & { status?: number }).status)));
      setPublicationError(error.message);
      saveState.markError();
      toast({ title: error.message, variant: "destructive" });
    },
  });
  const onSave = () => {
    if (
      publicationMutation.isPending ||
      blocked ||
      snapshot?.publication.requiresAdoption ||
      editorLock.isReadOnly
    )
      return;
    form.handleSubmit((data) => publicationMutation.mutate({ action: "save", data }))();
  };
  const action = (action: MarketingBlogPublicationActionAction, revisionId?: string) => {
    if (publicationMutation.isPending || blocked || editorLock.isReadOnly) return;
    if (
      !window.confirm(
        action === "schedule"
          ? "Schedule the saved revision? Unsaved edits are excluded and later draft saves do not change the pinned revision."
          : action === "restore"
            ? "Discard unsaved changes and restore this revision to the draft? Public content is unchanged."
            : action === "delete"
              ? "Delete this post and discard unsaved changes?"
              : `${action === "publish" ? "Save and publish the entered content" : action + " this post"}?`,
      )
    )
      return;
    if (action === "publish")
      form.handleSubmit((data) => publicationMutation.mutate({ action, data }))();
    else publicationMutation.mutate({ action, revisionId });
  };
  const reload = async () => {
    if (
      publicationMutation.isPending ||
      (form.formState.isDirty &&
        !window.confirm("Discard entered changes and load the latest saved draft?"))
    )
      return;
    if (isNew) {
      setPublicationError(
        "Creation may have succeeded. Return to the list to verify before creating again.",
      );
      return;
    }
    setReading(true);
    try {
      const response = await publicationRequest("GET", `/api/admin/blog/publications/${id}`);
      const result = await response.json();
      if (!mounted.current) return;
      queryClient.setQueryData(["/api/admin/blog/publications", id], result);
      adoptSnapshot(result);
      setBlocked(false);
      setPublicationError("");
    } catch (e) {
      if (mounted.current) setPublicationError((e as Error).message);
    } finally {
      if (mounted.current) setReading(false);
    }
  };
  const createTaxonomyMutation = useMutation({
    mutationFn: async (payload: { name: string; type: "category" | "tag" }) => {
      const response = await apiRequest("POST", "/api/admin/blog/settings/taxonomies", payload);
      return response.json() as Promise<BlogTaxonomy>;
    },
    onSuccess: (taxonomy) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/settings/taxonomies"] });
      if (taxonomy.type === "category") {
        const nextCategories = dedupeValues([
          ...(form.getValues("categories") ?? []),
          taxonomy.name,
        ]);
        form.setValue("categories", nextCategories, { shouldDirty: true });
        setNewCategoryName("");
        toast({ title: "Category added to blog settings" });
      } else {
        const nextTags = dedupeValues([...(form.getValues("tags") ?? []), taxonomy.name]);
        form.setValue("tags", nextTags, { shouldDirty: true });
        setNewTagName("");
        toast({ title: "Tag added to blog settings" });
      }
    },
    onError: (error: Error) =>
      toast({ title: error.message || "Failed to add taxonomy", variant: "destructive" }),
  });

  const isSaving = publicationMutation.isPending || reading;
  const unavailable =
    isSaving ||
    blocked ||
    (!isNew && !snapshot) ||
    !!snapshot?.publication.requiresAdoption ||
    editorLock.isReadOnly;
  const isDirty = form.formState.isDirty;
  const saveState = useEditorSaveState({
    isDirty,
    isSaving,
  });
  const unsavedChangesGuard = useUnsavedChangesGuard({
    isDirty: isDirty || isSaving,
    message: "You have unsaved changes to this post. Leave without saving?",
  });
  const isPublished = snapshot?.publication.visibility === "published";
  const watchPostType = form.watch("postType");
  const currentSlug = form.watch("slug");
  const watchSeoTitle = form.watch("seoTitle");
  const watchSeoDescription = form.watch("seoDescription");
  const watchOgImageUrl = form.watch("ogImageUrl");
  const watchCoverImageUrl = form.watch("coverImageUrl");
  const watchCoverImagePositionX = form.watch("coverImagePositionX");
  const watchCoverImagePositionY = form.watch("coverImagePositionY");
  const watchBlogTitle = form.watch("title");
  const watchAuthorName = form.watch("authorName");
  const watchNoindex = form.watch("noindex");

  if (!isNew && isLoading) {
    return (
      <AdminSidebar>
        <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminSidebar>
    );
  }

  return (
    <AdminSidebar>
      <div className="admin-has-mobile-action-bar mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        {editorLock.summary ? (
          <EditorLockBanner
            variant={editorLock.summary.variant}
            title={editorLock.summary.title}
            description={editorLock.summary.description}
            isLoading={editorLock.isLoading}
            onRefresh={editorLock.acquire}
          />
        ) : null}

        <BlogEditorHeader
          back={
            <>
              {" "}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() =>
                  !isSaving &&
                  unsavedChangesGuard.confirmDiscardChanges(() => navigate("/admin/cms/blog"))
                }
              >
                <ArrowLeft className="h-4 w-4" />
                Blog
              </Button>
            </>
          }
          title={isNew ? "New Post" : form.watch("title") || "Edit Post"}
          status={
            <>
              {" "}
              {!isNew &&
                (isPublished ? (
                  <Badge
                    className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    data-testid="badge-post-published"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Published
                  </Badge>
                ) : snapshot?.scheduledAt ? (
                  <Badge
                    className="bg-blue-600 text-white"
                    data-testid="badge-post-scheduled-header"
                  >
                    <CalendarClock className="h-3 w-3 mr-1" />
                    Scheduled — {format(new Date(snapshot.scheduledAt), "MMM d, h:mm a")}
                  </Badge>
                ) : (
                  <Badge variant="outline" data-testid="badge-post-draft">
                    <EyeOff className="h-3 w-3 mr-1" />
                    Draft
                  </Badge>
                ))}
            </>
          }
          actions={
            <>
              <AdminSaveBar
                state={saveState.state}
                type="button"
                onSave={onSave}
                primaryLabel="Save Post"
                disabled={unavailable}
                className="w-auto"
                buttonTestId="button-save-post"
              />
            </>
          }
        />
        <div
          ref={(node) => {
            if (node) node.inert = unavailable;
          }}
          className={cn(
            editorLock.hasLocking &&
              editorLock.isReadOnly &&
              "pointer-events-none select-none opacity-70",
          )}
        >
          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSave();
              }}
            >
              <BlogEditorTabs
                ui={{ Tabs, TabsList, TabsTrigger, TabsContent }}
                postType={
                  <>
                    {" "}
                    <FormField
                      control={form.control}
                      name="postType"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormLabel className="text-xs text-muted-foreground whitespace-nowrap">
                            Post Type:
                          </FormLabel>
                          <Select value={field.value || "article"} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger
                                className="h-9 w-[180px]"
                                data-testid="select-post-type"
                              >
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="article">
                                <span className="flex items-center gap-2">
                                  <FileText className="h-3.5 w-3.5" />
                                  Article
                                </span>
                              </SelectItem>
                              <SelectItem value="podcast">
                                <span className="flex items-center gap-2">
                                  <Headphones className="h-3.5 w-3.5" />
                                  Podcast
                                </span>
                              </SelectItem>
                              <SelectItem value="external">
                                <span className="flex items-center gap-2">
                                  <Link2 className="h-3.5 w-3.5" />
                                  External Article
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </>
                }
                content={
                  <>
                    <BlogEditorCard
                      ui={{ Card, CardHeader, CardTitle, CardContent }}
                      title="Post Details"
                    >
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Post title"
                                {...field}
                                data-testid="input-post-title"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL Slug</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="post-url-slug"
                                {...field}
                                onChange={(e) => {
                                  slugManuallyEdited.current = true;
                                  field.onChange(e);
                                }}
                                className="font-mono text-sm"
                                data-testid="input-post-slug"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Public URL: /insights/
                              <span className="font-mono">{currentSlug || "…"}</span>
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="authorName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Author Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-post-author" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="categories"
                          render={({ field }) => {
                            const selectedCategories = field.value ?? [];
                            return (
                              <FormItem>
                                <FormLabel>Categories</FormLabel>
                                <BlogTaxonomyPicker
                                  ui={{ Card, CardContent, Badge, Checkbox }}
                                  kind="category"
                                  selected={selectedCategories}
                                  options={categories.map((category) => ({
                                    id: category.id,
                                    name: category.name,
                                    label: buildCategoryPath(category, categories),
                                    nested: !!category.parentId,
                                  }))}
                                  onChange={field.onChange}
                                  add={
                                    <>
                                      <div className="flex gap-2">
                                        <Input
                                          value={newCategoryName}
                                          onChange={(e) => setNewCategoryName(e.target.value)}
                                          placeholder="Add a new category"
                                          data-testid="input-post-category-new"
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() =>
                                            createTaxonomyMutation.mutate({
                                              name: newCategoryName.trim(),
                                              type: "category",
                                            })
                                          }
                                          disabled={
                                            !newCategoryName.trim() ||
                                            createTaxonomyMutation.isPending
                                          }
                                          data-testid="button-post-category-add"
                                        >
                                          <Plus className="h-4 w-4 mr-1.5" />
                                          Add
                                        </Button>
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        Need subcategories or bulk cleanup? Use{" "}
                                        <Link href="/admin/cms/blog/settings">
                                          <span className="underline cursor-pointer">
                                            Blog Settings
                                          </span>
                                        </Link>
                                        .
                                      </p>
                                    </>
                                  }
                                />
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                        <FormField
                          control={form.control}
                          name="tags"
                          render={({ field }) => {
                            const selectedTags = field.value ?? [];
                            return (
                              <FormItem>
                                <FormLabel>Tags</FormLabel>
                                <BlogTaxonomyPicker
                                  ui={{ Card, CardContent, Badge, Checkbox }}
                                  kind="tag"
                                  selected={selectedTags}
                                  options={availableTags}
                                  onChange={field.onChange}
                                  add={
                                    <>
                                      <div className="flex gap-2">
                                        <Input
                                          value={newTagName}
                                          onChange={(e) => setNewTagName(e.target.value)}
                                          placeholder="Create a new tag"
                                          data-testid="input-post-tag-new"
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() =>
                                            createTaxonomyMutation.mutate({
                                              name: newTagName.trim(),
                                              type: "tag",
                                            })
                                          }
                                          disabled={
                                            !newTagName.trim() || createTaxonomyMutation.isPending
                                          }
                                          data-testid="button-post-tag-add"
                                        >
                                          <Plus className="h-4 w-4 mr-1.5" />
                                          Add
                                        </Button>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        asChild
                                        data-testid="button-blog-settings-inline"
                                      >
                                        <Link href="/admin/cms/blog/settings">
                                          <Settings2 className="h-4 w-4 mr-1.5" />
                                          Manage Tags & Categories
                                        </Link>
                                      </Button>
                                    </>
                                  }
                                />
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      </div>
                    </BlogEditorCard>

                    {watchPostType === "podcast" && (
                      <Card className="border-purple-200 dark:border-purple-800/50 bg-purple-50/30 dark:bg-purple-950/10">
                        <CardHeader>
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Headphones className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            Podcast Audio
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <FormField
                            control={form.control}
                            name="podcastUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Podcast URL</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="https://podcasts.apple.com/... or https://open.spotify.com/episode/..."
                                    autoPrependHttps
                                    {...field}
                                    data-testid="input-podcast-url"
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  Link to the podcast episode on any platform (Spotify, Apple
                                  Podcasts, SoundCloud, etc.). An audio player will be displayed at
                                  the top of the blog post.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    )}

                    {watchPostType === "external" && (
                      <Card className="border-blue-200 dark:border-blue-800/50 bg-blue-50/30 dark:bg-blue-950/10">
                        <CardHeader>
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            External Article
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <FormField
                            control={form.control}
                            name="externalUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>External URL</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="https://example.com/article-title"
                                    autoPrependHttps
                                    {...field}
                                    data-testid="input-external-url"
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  Clicking this post from the blog grid will open this URL in a new
                                  tab. You can still add an excerpt, cover image, and other details
                                  for the card.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    )}

                    <BlogEditorCard
                      ui={{ Card, CardHeader, CardTitle, CardContent }}
                      title="Cover Image"
                    >
                      <FormField
                        control={form.control}
                        name="coverImageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <CmsImageUpload
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                helpText="Displayed at the top of the article. Recommended: 1200 × 630 px."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {watchCoverImageUrl && (
                        <ImagePositionPicker
                          imageUrl={watchCoverImageUrl}
                          positionX={watchCoverImagePositionX ?? 50}
                          positionY={watchCoverImagePositionY ?? 50}
                          onPositionChange={(x, y) => {
                            form.setValue("coverImagePositionX", x, { shouldDirty: true });
                            form.setValue("coverImagePositionY", y, { shouldDirty: true });
                          }}
                        />
                      )}
                    </BlogEditorCard>

                    <BlogEditorCard
                      ui={{ Card, CardHeader, CardTitle, CardContent }}
                      title="Content"
                    >
                      <FormField
                        control={form.control}
                        name="excerpt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Excerpt
                              <span className="text-muted-foreground font-normal text-xs ml-1">
                                {watchPostType === "external"
                                  ? "(shown on blog card)"
                                  : "(optional)"}
                              </span>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Brief summary for listing cards…"
                                rows={2}
                                {...field}
                                data-testid="input-post-excerpt"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Body Content
                              {watchPostType === "external" && (
                                <span className="text-muted-foreground font-normal text-xs ml-1">
                                  (optional)
                                </span>
                              )}
                            </FormLabel>
                            <FormControl>
                              <BlogEditor
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                placeholder={
                                  watchPostType === "podcast"
                                    ? "Write show notes, a transcript, or additional context…"
                                    : watchPostType === "external"
                                      ? "Optionally add your own commentary or notes…"
                                      : "Write your article here…"
                                }
                                data-testid="input-post-content"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </BlogEditorCard>

                    <Card>
                      <CardContent className="pt-5 space-y-4">
                        <p>
                          Save keeps editorial changes in a draft. Publication actions below control
                          the public version.
                        </p>
                      </CardContent>
                    </Card>
                  </>
                }
                layout={
                  <>
                    <BlogPresentationEditor
                      ui={{
                        Card,
                        CardHeader,
                        CardTitle,
                        CardContent,
                        Input,
                        Label,
                        Textarea,
                        Checkbox,
                        Button,
                        Select,
                        SelectTrigger,
                        SelectValue,
                        SelectContent,
                        SelectItem,
                      }}
                      value={form.watch("presentation")}
                      title={form.watch("title")}
                      excerpt={form.watch("excerpt") || ""}
                      disabled={unavailable}
                      onChange={(value) =>
                        form.setValue("presentation", value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    />
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Sidebar Layout</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="rounded-lg border px-4 py-3 bg-muted/20">
                          <p className="text-sm font-medium">
                            Saved sidebar layout selection is retained. Public rendering depends on
                            the site renderer.
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Leave this on the default option to use the system-wide default blog
                            sidebar, or choose a specific sidebar for this post.
                          </p>
                        </div>
                        <FormField
                          control={form.control}
                          name="sidebarId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sidebar Selection</FormLabel>
                              <Select
                                onValueChange={(value) =>
                                  field.onChange(value === "default" ? "" : value)
                                }
                                value={field.value || "default"}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-blog-sidebar">
                                    <SelectValue placeholder="Select sidebar" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="default">Use Default Blog Sidebar</SelectItem>
                                  {sidebars.map((sidebar) => (
                                    <SelectItem key={sidebar.id} value={sidebar.id}>
                                      {sidebar.name}
                                      {sidebar.isDefault ? " (Default Blog)" : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription className="text-xs">
                                Build reusable sidebars in Admin &gt; CMS &gt; Sidebars & Widgets.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </>
                }
                seo={
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          Search Engine
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="seoTitle"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel>
                                  SEO Title{" "}
                                  <span className="text-muted-foreground font-normal text-xs">
                                    (optional)
                                  </span>
                                </FormLabel>
                                {(field.value ?? "").length > 0 && (
                                  <span
                                    className={`text-xs ${(field.value ?? "").length > 60 ? "text-amber-500" : (field.value ?? "").length < 20 ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"}`}
                                  >
                                    {(field.value ?? "").length}/60
                                  </span>
                                )}
                              </div>
                              <FormControl>
                                <Input
                                  placeholder="Overrides post title in search results"
                                  {...field}
                                  data-testid="input-seo-title"
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                If blank, the post title is used. Aim for 30–60 characters.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="seoDescription"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Meta Description
                                <span
                                  className={`ml-2 text-xs font-normal ${(field.value ?? "").length > 130 ? "text-amber-500" : "text-muted-foreground"}`}
                                >
                                  ({(field.value ?? "").length}/160)
                                </span>
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Brief description for search engine results (max 160 chars)"
                                  rows={3}
                                  {...field}
                                  data-testid="textarea-seo-description"
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                If blank, the post excerpt is used.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="noindex"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                                <div>
                                  <FormLabel className="text-sm font-medium cursor-pointer">
                                    Hide from search engines
                                  </FormLabel>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Sets noindex,nofollow. Use for drafts or unlisted posts.
                                  </p>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-noindex"
                                  />
                                </FormControl>
                              </div>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          Social / Open Graph
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <FormField
                          control={form.control}
                          name="ogImageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Open Graph / Social Share Image{" "}
                                <span className="text-muted-foreground font-normal text-xs">
                                  (optional)
                                </span>
                              </FormLabel>
                              <FormControl>
                                <CmsImageUpload
                                  value={field.value ?? ""}
                                  onChange={field.onChange}
                                  helpText="Shown when the article is shared on social media. Recommended: 1200 × 630 px. Defaults to cover image, then global OG image."
                                  data-testid="og-image-upload"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    <SeoPreview
                      title={watchSeoTitle || watchBlogTitle || ""}
                      description={watchSeoDescription || ""}
                      url={`${typeof window !== "undefined" ? window.location.origin : ""}/insights/${currentSlug || ""}`}
                      ogImage={watchOgImageUrl || watchCoverImageUrl || ""}
                      source="post"
                      data-testid="seo-preview-panel"
                    />

                    <StructuredDataStatus
                      contentType="post"
                      fields={{
                        hasTitle: !!(watchSeoTitle || watchBlogTitle),
                        hasDescription: !!watchSeoDescription,
                        hasImage: !!(watchOgImageUrl || watchCoverImageUrl),
                        hasAuthor: !!watchAuthorName,
                        hasDate: !!isPublished,
                        noindex: !!watchNoindex,
                        isPublished: !!isPublished,
                      }}
                      data-testid="structured-data-status"
                    />
                  </>
                }
              />
            </form>
          </Form>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Publication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadError && <p role="alert">Unable to load this post. Reload before editing.</p>}
            {publicationError && (
              <p role="alert">
                {publicationError} Your entered changes are retained. Verify the saved state before
                another write.
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => void reload()}
            >
              Reload saved draft
            </Button>
            {snapshot?.publication.requiresAdoption ? (
              <>
                <p>
                  This legacy post requires explicit adoption as an unpublished draft before
                  editing.
                </p>
                <label>
                  Adoption reason
                  <Input
                    value={adoptionReason}
                    disabled={isSaving}
                    onChange={(e) => setAdoptionReason(e.target.value)}
                  />
                </label>
                <Button
                  type="button"
                  disabled={isSaving || blocked || !adoptionReason.trim()}
                  onClick={() => {
                    if (window.confirm("Adopt this legacy post as an unpublished draft?"))
                      publicationMutation.mutate({ action: "adopt" });
                  }}
                >
                  Adopt legacy post
                </Button>
              </>
            ) : (
              !isNew && (
                <>
                  <p>
                    Visibility: {snapshot?.publication.visibility}. Version:{" "}
                    {snapshot?.publication.version}.
                  </p>
                  <Button type="button" disabled={unavailable} onClick={() => action("publish")}>
                    Save &amp; Publish
                  </Button>{" "}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={unavailable}
                    onClick={() => action("unpublish")}
                  >
                    Unpublish
                  </Button>
                  <label>
                    Scheduled publication (your local time)
                    <Input
                      type="datetime-local"
                      value={blogScheduleDate}
                      disabled={unavailable}
                      onChange={(e) => setBlogScheduleDate(e.target.value)}
                    />
                  </label>
                  <Button
                    type="button"
                    disabled={unavailable || !blogScheduleDate}
                    onClick={() => action("schedule")}
                  >
                    Schedule saved revision
                  </Button>{" "}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={unavailable}
                    onClick={() => action("cancel_schedule")}
                  >
                    Cancel schedule
                  </Button>
                  {snapshot?.publication.schedule && (
                    <p>
                      Schedule: {snapshot.publication.schedule.status} —{" "}
                      {new Date(snapshot.publication.schedule.scheduledAt).toLocaleString()}{" "}
                      (revision {snapshot.publication.schedule.revisionId}). Later saves do not
                      change the pinned revision.{" "}
                      {snapshot.publication.schedule.failureCode && (
                        <>
                          Failure: {snapshot.publication.schedule.failureCode}. Review the draft and
                          explicitly reschedule.
                        </>
                      )}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSaving}
                    onClick={async () => {
                      try {
                        const response = await apiRequest(
                          "GET",
                          `/api/admin/blog/publications/${id}/revisions`,
                        );
                        const rows = await response.json();
                        if (mounted.current) setRevisions(rows);
                      } catch (e) {
                        if (mounted.current) setPublicationError((e as Error).message);
                      }
                    }}
                  >
                    Revision history
                  </Button>{" "}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSaving}
                    onClick={async () => {
                      try {
                        const response = await apiRequest(
                          "GET",
                          `/api/admin/blog/publications/${id}/preview`,
                        );
                        const result = await response.json();
                        if (mounted.current) setPreview(result);
                      } catch (e) {
                        if (mounted.current) setPublicationError((e as Error).message);
                      }
                    }}
                  >
                    Preview saved draft
                  </Button>
                  {preview && (
                    <section aria-label="Private saved preview">
                      <h2>{preview.snapshot.title}</h2>
                      <p>Saved revision {preview.revisionId}; unsaved changes are not included.</p>
                      <iframe
                        className="w-full min-h-[320px] rounded-lg border bg-white"
                        title="Private blog preview"
                        sandbox=""
                        srcDoc={preview.snapshot.content}
                      />
                    </section>
                  )}
                  {revisions.map((revision) => (
                    <p
                      className="flex flex-wrap items-center justify-between gap-3 border-t pt-3"
                      key={revision.id}
                    >
                      Version {revision.version}: {revision.action}{" "}
                      <Button
                        type="button"
                        variant="outline"
                        disabled={unavailable}
                        onClick={() => action("restore", revision.id)}
                      >
                        Restore revision {revision.version} to draft
                      </Button>
                    </p>
                  ))}
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={unavailable}
                    onClick={() => action("delete")}
                  >
                    Delete post
                  </Button>
                </>
              )
            )}
          </CardContent>
        </Card>
        <div className="flex justify-end pb-8">
          <AdminSaveBar
            state={saveState.state}
            type="button"
            onSave={onSave}
            primaryLabel="Save Post"
            disabled={unavailable}
            className="w-auto"
            buttonTestId="button-save-post-bottom"
          />
        </div>
      </div>
      <AdminMobileActionBar>
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={unavailable}
          data-testid="button-save-post-mobile"
        >
          Save Post
        </Button>
      </AdminMobileActionBar>
      {unsavedChangesGuard.dialog}
    </AdminSidebar>
  );
}
