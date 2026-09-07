import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, STALE_TIMES } from "@/lib/queryClient";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { AdminSidebar } from "./admin-sidebar";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CmsImageUpload } from "@/features/admin/cms/components/cms-image-upload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Trash2, Eye, EyeOff, BookOpen } from "lucide-react";
import type { BlogPost, InsertBlogPost } from "@shared/schema";

export default function AdminBlogPage() {
  return (
    <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
      <AdminSidebar>
        <BlogContent />
      </AdminSidebar>
    </ProtectedRoute>
  );
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function BlogContent() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    coverImageUrl: "",
    authorName: "",
    category: "",
    tags: "",
    isPublished: false,
  });

  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/blog"],
    staleTime: STALE_TIMES.OPERATIONAL,
    refetchOnWindowFocus: true,
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertBlogPost) => apiRequest("POST", "/api/admin/blog", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Post created" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertBlogPost> }) =>
      apiRequest("PUT", `/api/admin/blog/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      setDialogOpen(false);
      setEditingPost(null);
      resetForm();
      toast({ title: "Post updated" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/blog/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      setDeleteId(null);
      toast({ title: "Post deleted" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function resetForm() {
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      coverImageUrl: "",
      authorName: "",
      category: "",
      tags: "",
      isPublished: false,
    });
  }

  function openCreate() {
    setEditingPost(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(post: BlogPost) {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? "",
      content: post.content,
      coverImageUrl: post.coverImageUrl ?? "",
      authorName: post.authorName,
      category: post.category ?? "",
      tags: post.tags?.join(", ") ?? "",
      isPublished: post.isPublished ?? false,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    const tagsArray = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload: InsertBlogPost = {
      title: formData.title,
      slug: formData.slug || generateSlug(formData.title),
      excerpt: formData.excerpt || null,
      content: formData.content,
      coverImageUrl: formData.coverImageUrl || null,
      authorName: formData.authorName,
      category: formData.category || null,
      tags: tagsArray.length > 0 ? tagsArray : null,
      isPublished: formData.isPublished,
      publishedAt: formData.isPublished ? new Date() : null,
    };

    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner />
      </div>
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-semibold" data-testid="text-admin-blog-title">
          Blog Management
        </h1>
        <Button onClick={openCreate} data-testid="button-create-post">
          <Plus className="h-4 w-4 mr-2" />
          New Post
        </Button>
      </div>

      {posts && posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id} data-testid={`card-blog-admin-${post.id}`}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3
                      className="font-semibold truncate"
                      data-testid={`text-blog-admin-title-${post.id}`}
                    >
                      {post.title}
                    </h3>
                    {post.isPublished ? (
                      <Badge
                        className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        data-testid={`badge-published-${post.id}`}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="outline" data-testid={`badge-draft-${post.id}`}>
                        <EyeOff className="h-3 w-3 mr-1" />
                        Draft
                      </Badge>
                    )}
                    {post.category && (
                      <Badge variant="secondary" className="text-xs">
                        {post.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    By {post.authorName}
                    {post.publishedAt && (
                      <>
                        {" "}
                        ·{" "}
                        {new Date(post.publishedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(post)}
                    data-testid={`button-edit-post-${post.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setDeleteId(post.id)}
                    data-testid={`button-delete-post-${post.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No blog posts yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first post to get started.
          </p>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Post
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? "Edit Post" : "New Post"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setFormData((f) => ({
                    ...f,
                    title,
                    slug: editingPost ? f.slug : generateSlug(title),
                  }));
                }}
                data-testid="input-post-title"
              />
            </div>
            <div>
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData((f) => ({ ...f, slug: e.target.value }))}
                data-testid="input-post-slug"
              />
            </div>
            <div>
              <Label htmlFor="authorName">Author Name</Label>
              <Input
                id="authorName"
                value={formData.authorName}
                onChange={(e) => setFormData((f) => ({ ...f, authorName: e.target.value }))}
                data-testid="input-post-author"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g., Core Platform Research, Provider Tips"
                data-testid="input-post-category"
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData((f) => ({ ...f, tags: e.target.value }))}
                placeholder="e.g., Core Platform, identity, belonging"
                data-testid="input-post-tags"
              />
            </div>
            <div>
              <Label>Cover Image</Label>
              <CmsImageUpload
                value={formData.coverImageUrl}
                onChange={(url) => setFormData((f) => ({ ...f, coverImageUrl: url }))}
                data-testid="input-post-cover"
              />
            </div>
            <div>
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData((f) => ({ ...f, excerpt: e.target.value }))}
                rows={2}
                placeholder="Brief summary for listing cards..."
                data-testid="input-post-excerpt"
              />
            </div>
            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData((f) => ({ ...f, content: e.target.value }))}
                rows={12}
                placeholder="Write your article content here..."
                data-testid="input-post-content"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="isPublished"
                checked={formData.isPublished}
                onCheckedChange={(checked) => setFormData((f) => ({ ...f, isPublished: checked }))}
                data-testid="switch-post-published"
              />
              <Label htmlFor="isPublished">Publish immediately</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-testid="button-cancel-post"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !formData.title || !formData.content || !formData.authorName}
              data-testid="button-save-post"
            >
              {isPending ? "Saving..." : editingPost ? "Update Post" : "Create Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this blog post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
