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
import { MembershipAccessRuleCard } from "./components/membership-access-rule-card";
import type { BlogPost, BlogTaxonomy, CmsSidebar } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useEditorLock } from "@/hooks/use-editor-lock";
import { useLockConflictGuard } from "@/hooks/use-lock-conflict-guard";
import { useEditorSaveState } from "@/hooks/use-editor-save-state";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";

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
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = !id || id === "new";
  const slugManuallyEdited = useRef(false);
  const [initialized, setInitialized] = useState(false);

  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: ["/api/admin/blog", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/blog/${id}`, { credentials: "include" });
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
    enabled: !isNew,
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

  useEffect(() => {
    if (post && !initialized) {
      form.reset({
        title: post.title,
        slug: post.slug,
        authorName: post.authorName,
        categories: post.categories?.length
          ? post.categories
          : post.category
            ? [post.category]
            : [],
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
    }
  }, [post, initialized, form]);

  useLockConflictGuard({
    active: !isNew,
    resourceId: isNew ? null : (post?.id ?? id ?? null),
    resourceLabel: "post",
    editorLock,
    onConflict: () => navigate("/admin/cms/blog"),
  });

  const watchTitle = form.watch("title");
  useEffect(() => {
    if (isNew && !slugManuallyEdited.current) {
      form.setValue("slug", generateSlug(watchTitle), { shouldValidate: false });
    }
  }, [watchTitle, isNew, form]);

  const [blogScheduleDate, setBlogScheduleDate] = useState("");
  const [blogScheduleOpen, setBlogScheduleOpen] = useState(false);
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
    const nextCategories = dedupeValues(data.categories ?? []);
    const nextTags = dedupeValues(data.tags ?? []);
    return {
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
      isPublished: data.isPublished,
      publishedAt: data.isPublished ? new Date() : null,
      scheduledAt: data.isPublished ? null : undefined,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      ogImageUrl: data.ogImageUrl || null,
      noindex: data.noindex ?? false,
    };
  };

  const createMutation = useMutation({
    mutationFn: async (data: PostForm) => {
      const res = await apiRequest("POST", "/api/admin/blog", buildPayload(data));
      return res.json();
    },
    onSuccess: (created: BlogPost, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      toast({ title: "Post created" });
      form.reset(variables);
      saveState.markSaved();
      navigate(`/admin/cms/blog/${created.id}`);
    },
    onError: () => {
      toast({ title: "Failed to create post", variant: "destructive" });
      saveState.markError();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PostForm) => {
      const res = await apiRequest("PUT", `/api/admin/blog/${id}`, buildPayload(data));
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      toast({ title: "Post saved" });
      form.reset(variables);
      saveState.markSaved();
    },
    onError: () => {
      toast({ title: "Failed to save post", variant: "destructive" });
      saveState.markError();
    },
  });

  const onSave = () => {
    form.handleSubmit((data) => {
      if (isNew) {
        createMutation.mutate(data);
      } else {
        updateMutation.mutate(data);
      }
    })();
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

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isDirty = form.formState.isDirty;
  const saveState = useEditorSaveState({
    isDirty,
    isSaving,
  });
  const unsavedChangesGuard = useUnsavedChangesGuard({
    isDirty,
    message: "You have unsaved changes to this post. Leave without saving?",
  });
  const confirmSavedPostAction = (actionLabel: string, onProceed: () => void) =>
    unsavedChangesGuard.confirmIfDirty(
      onProceed,
      `You have unsaved changes to this post. ${actionLabel} will use the last saved version, not your in-progress edits. Continue?`,
    );
  const isPublished = form.watch("isPublished");
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

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                unsavedChangesGuard.confirmDiscardChanges(() => navigate("/admin/cms/blog"))
              }
            >
              <ArrowLeft className="h-4 w-4" />
              Blog
            </Button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-orange-500" />
              <h1
                className="text-xl font-heading font-semibold"
                data-testid="text-blog-editor-title"
              >
                {isNew ? "New Post" : form.watch("title") || "Edit Post"}
              </h1>
              {!isNew &&
                (isPublished ? (
                  <Badge
                    className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    data-testid="badge-post-published"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Published
                  </Badge>
                ) : post?.scheduledAt ? (
                  <Badge
                    className="bg-blue-600 text-white"
                    data-testid="badge-post-scheduled-header"
                  >
                    <CalendarClock className="h-3 w-3 mr-1" />
                    Scheduled — {format(new Date(post.scheduledAt), "MMM d, h:mm a")}
                  </Badge>
                ) : (
                  <Badge variant="outline" data-testid="badge-post-draft">
                    <EyeOff className="h-3 w-3 mr-1" />
                    Draft
                  </Badge>
                ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isNew &&
              isPublished &&
              (watchPostType === "external" && form.watch("externalUrl") ? (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={form.watch("externalUrl")}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="button-view-live"
                  >
                    <Link2 className="h-4 w-4 mr-1.5" />
                    View External
                  </a>
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`/insights/${currentSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="button-view-live"
                  >
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    View Live
                  </a>
                </Button>
              ))}
            <AdminSaveBar
              state={saveState.state}
              type="button"
              onSave={onSave}
              primaryLabel="Save Post"
              disabled={isSaving || editorLock.isReadOnly}
              className="w-auto"
              buttonTestId="button-save-post"
            />
          </div>
        </div>

        <div
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
              <Tabs defaultValue="content" className="space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <TabsList>
                    <TabsTrigger value="content" data-testid="tab-content">
                      <BookOpen className="h-4 w-4 mr-1.5 text-blue-600" />
                      Content
                    </TabsTrigger>
                    <TabsTrigger value="layout" data-testid="tab-layout">
                      <LayoutTemplate className="h-4 w-4 mr-1.5 text-indigo-600" />
                      Layout
                    </TabsTrigger>
                    <TabsTrigger value="seo" data-testid="tab-seo">
                      <Globe className="h-4 w-4 mr-1.5 text-blue-600" />
                      SEO
                    </TabsTrigger>
                  </TabsList>
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
                            <SelectTrigger className="h-9 w-[180px]" data-testid="select-post-type">
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
                </div>

                <TabsContent value="content" className="space-y-4 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-muted-foreground font-medium">
                        Post Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                                <Card className="border-dashed">
                                  <CardContent className="p-4 space-y-4">
                                    <div className="max-h-60 overflow-y-auto rounded-md border">
                                      {categories.length > 0 ? (
                                        <div className="divide-y">
                                          {categories.map((category) => {
                                            const checked = selectedCategories.some(
                                              (value) =>
                                                value.toLowerCase() === category.name.toLowerCase(),
                                            );
                                            return (
                                              <label
                                                key={category.id}
                                                className="flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40"
                                              >
                                                <Checkbox
                                                  checked={checked}
                                                  onCheckedChange={(value) => {
                                                    const nextCategories = value
                                                      ? dedupeValues([
                                                          ...selectedCategories,
                                                          category.name,
                                                        ])
                                                      : selectedCategories.filter(
                                                          (item) =>
                                                            item.toLowerCase() !==
                                                            category.name.toLowerCase(),
                                                        );
                                                    field.onChange(nextCategories);
                                                  }}
                                                  data-testid={`checkbox-post-category-${category.slug}`}
                                                />
                                                <div className="space-y-0.5">
                                                  <div className="text-sm font-medium leading-none">
                                                    {buildCategoryPath(category, categories)}
                                                  </div>
                                                  {category.parentId && (
                                                    <p className="text-xs text-muted-foreground">
                                                      Nested category
                                                    </p>
                                                  )}
                                                </div>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="px-3 py-6 text-sm text-muted-foreground">
                                          No categories yet. Add one below.
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {selectedCategories.length > 0 ? (
                                        selectedCategories.map((category) => (
                                          <Badge key={category} variant="secondary">
                                            {category}
                                          </Badge>
                                        ))
                                      ) : (
                                        <p className="text-sm text-muted-foreground">
                                          No categories selected.
                                        </p>
                                      )}
                                    </div>
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
                                  </CardContent>
                                </Card>
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
                                <Card className="border-dashed">
                                  <CardContent className="p-4 space-y-4">
                                    <div className="max-h-60 overflow-y-auto rounded-md border">
                                      {availableTags.length > 0 ? (
                                        <div className="divide-y">
                                          {availableTags.map((tag) => {
                                            const checked = selectedTags.some(
                                              (value) =>
                                                value.toLowerCase() === tag.name.toLowerCase(),
                                            );
                                            return (
                                              <label
                                                key={tag.id}
                                                className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40"
                                              >
                                                <Checkbox
                                                  checked={checked}
                                                  onCheckedChange={(value) => {
                                                    const nextTags = value
                                                      ? dedupeValues([...selectedTags, tag.name])
                                                      : selectedTags.filter(
                                                          (item) =>
                                                            item.toLowerCase() !==
                                                            tag.name.toLowerCase(),
                                                        );
                                                    field.onChange(nextTags);
                                                  }}
                                                  data-testid={`checkbox-post-tag-${tag.slug}`}
                                                />
                                                <span className="text-sm font-medium">
                                                  {tag.name}
                                                </span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="px-3 py-6 text-sm text-muted-foreground">
                                          No tags yet. Add one below.
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {selectedTags.length > 0 ? (
                                        selectedTags.map((tag) => (
                                          <Badge key={tag} variant="secondary">
                                            {tag}
                                          </Badge>
                                        ))
                                      ) : (
                                        <p className="text-sm text-muted-foreground">
                                          No tags selected.
                                        </p>
                                      )}
                                    </div>
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
                                  </CardContent>
                                </Card>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>

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

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-muted-foreground font-medium">
                        Cover Image
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-muted-foreground font-medium">
                        Content
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-5 space-y-4">
                      <FormField
                        control={form.control}
                        name="isPublished"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center gap-3">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    if (checked) {
                                      setBlogScheduleDate("");
                                    }
                                  }}
                                  data-testid="switch-post-published"
                                />
                              </FormControl>
                              <div>
                                <FormLabel className="cursor-pointer">Publish this post</FormLabel>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {field.value
                                    ? "Post is visible to the public at /insights/"
                                    : "Post is saved as a draft and not visible publicly"}
                                </p>
                              </div>
                            </div>
                          </FormItem>
                        )}
                      />
                      {!isPublished && (
                        <div className="border-t pt-4">
                          {post?.scheduledAt ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge
                                  className="bg-blue-600 text-white"
                                  data-testid="badge-post-scheduled"
                                >
                                  <CalendarClock className="h-3 w-3 mr-1" />
                                  Scheduled
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(post.scheduledAt), "MMM d, yyyy 'at' h:mm a")}
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  confirmSavedPostAction("Canceling this schedule", async () => {
                                    try {
                                      await apiRequest("PUT", `/api/admin/blog/${id}`, {
                                        scheduledAt: null,
                                      });
                                      queryClient.invalidateQueries({
                                        queryKey: ["/api/admin/blog", id],
                                      });
                                      toast({ title: "Schedule cancelled" });
                                    } catch {
                                      toast({
                                        title: "Failed to cancel schedule",
                                        variant: "destructive",
                                      });
                                    }
                                  })
                                }
                                data-testid="button-cancel-blog-schedule"
                              >
                                Cancel Schedule
                              </Button>
                            </div>
                          ) : (
                            <Popover open={blogScheduleOpen} onOpenChange={setBlogScheduleOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  data-testid="button-open-blog-schedule"
                                >
                                  <CalendarClock className="h-4 w-4 mr-1.5" />
                                  Schedule Publishing
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72" align="start">
                                <div className="space-y-3">
                                  <p className="text-sm font-medium">Schedule Publishing</p>
                                  <p className="text-xs text-muted-foreground">
                                    Choose a future date and time for this post to go live
                                    automatically.
                                  </p>
                                  <input
                                    type="datetime-local"
                                    value={blogScheduleDate}
                                    onChange={(e) => setBlogScheduleDate(e.target.value)}
                                    min={new Date().toISOString().slice(0, 16)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    data-testid="input-blog-schedule-date"
                                  />
                                  <Button
                                    className="w-full"
                                    size="sm"
                                    disabled={
                                      !blogScheduleDate ||
                                      updateMutation.isPending ||
                                      createMutation.isPending
                                    }
                                    onClick={() =>
                                      confirmSavedPostAction("Scheduling this post", async () => {
                                        const scheduledIso = new Date(
                                          blogScheduleDate,
                                        ).toISOString();
                                        if (isNew) {
                                          form.handleSubmit(async (data) => {
                                            try {
                                              const res = await apiRequest(
                                                "POST",
                                                "/api/admin/blog",
                                                buildPayload(data),
                                              );
                                              const created: BlogPost = await res.json();
                                              await apiRequest(
                                                "PUT",
                                                `/api/admin/blog/${created.id}`,
                                                { scheduledAt: scheduledIso },
                                              );
                                              queryClient.invalidateQueries({
                                                queryKey: ["/api/admin/blog"],
                                              });
                                              setBlogScheduleOpen(false);
                                              setBlogScheduleDate("");
                                              toast({ title: "Post created and scheduled" });
                                              navigate(`/admin/cms/blog/${created.id}`);
                                            } catch {
                                              toast({
                                                title: "Failed to schedule post",
                                                variant: "destructive",
                                              });
                                            }
                                          })();
                                        } else {
                                          try {
                                            await apiRequest("PUT", `/api/admin/blog/${id}`, {
                                              scheduledAt: scheduledIso,
                                            });
                                            queryClient.invalidateQueries({
                                              queryKey: ["/api/admin/blog", id],
                                            });
                                            setBlogScheduleOpen(false);
                                            setBlogScheduleDate("");
                                            toast({ title: "Post scheduled for publishing" });
                                          } catch {
                                            toast({
                                              title: "Failed to schedule post",
                                              variant: "destructive",
                                            });
                                          }
                                        }
                                      })
                                    }
                                    data-testid="button-confirm-blog-schedule"
                                  >
                                    <CalendarClock className="h-4 w-4 mr-1.5" />
                                    Confirm Schedule
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <MembershipAccessRuleCard
                    resourceType="blog_post"
                    resourceId={isNew ? undefined : id}
                    disabled={editorLock.isReadOnly}
                  />
                </TabsContent>

                <TabsContent value="layout" className="mt-0 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Sidebar Layout</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-lg border px-4 py-3 bg-muted/20">
                        <p className="text-sm font-medium">
                          Blog posts always include a right sidebar.
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
                </TabsContent>

                <TabsContent value="seo" className="mt-0 space-y-4">
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
                </TabsContent>
              </Tabs>
            </form>
          </Form>
        </div>

        <div className="flex justify-end pb-8">
          <AdminSaveBar
            state={saveState.state}
            type="button"
            onSave={onSave}
            primaryLabel="Save Post"
            disabled={isSaving || editorLock.isReadOnly}
            className="w-auto"
            buttonTestId="button-save-post-bottom"
          />
        </div>
      </div>
      <AdminMobileActionBar>
        {!isNew && isPublished && watchPostType !== "external" && (
          <Button variant="outline" size="sm" asChild>
            <a href={`/insights/${currentSlug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Preview
            </a>
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={isSaving || editorLock.isReadOnly}
          data-testid="button-save-post-mobile"
        >
          Save Post
        </Button>
      </AdminMobileActionBar>
      {unsavedChangesGuard.dialog}
    </AdminSidebar>
  );
}
