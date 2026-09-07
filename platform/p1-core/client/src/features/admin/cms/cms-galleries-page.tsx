import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Copy, Eye, EyeOff, Image, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CmsGalleryWithItems } from "@shared/schema";

export default function CmsGalleriesPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("updated");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    if (sort) params.set("sort", sort);
    return params.toString();
  }, [search, sort, status]);

  const { data: galleries = [], isLoading } = useQuery<CmsGalleryWithItems[]>({
    queryKey: [`/api/admin/cms/galleries${queryString ? `?${queryString}` : ""}`],
  });

  const invalidate = () => {
    queryClient.invalidateQueries({
      predicate: (query) => String(query.queryKey[0]).startsWith("/api/admin/cms/galleries"),
    });
  };

  const publishMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/cms/galleries/${id}/publish`),
    onSuccess: () => {
      invalidate();
      toast({ title: "Gallery published" });
    },
    onError: (error: Error) =>
      toast({
        title: "Failed to publish gallery",
        description: error.message,
        variant: "destructive",
      }),
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/cms/galleries/${id}/unpublish`),
    onSuccess: () => {
      invalidate();
      toast({ title: "Gallery moved to draft" });
    },
    onError: (error: Error) =>
      toast({
        title: "Failed to unpublish gallery",
        description: error.message,
        variant: "destructive",
      }),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/cms/galleries/${id}/duplicate`),
    onSuccess: async (res) => {
      const gallery: CmsGalleryWithItems = await res.json();
      invalidate();
      toast({ title: "Gallery duplicated" });
      navigate(`/admin/cms/galleries/${gallery.id}`);
    },
    onError: (error: Error) =>
      toast({
        title: "Failed to duplicate gallery",
        description: error.message,
        variant: "destructive",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/cms/galleries/${id}`),
    onSuccess: () => {
      invalidate();
      toast({ title: "Gallery deleted" });
    },
    onError: (error: Error) =>
      toast({
        title: "Failed to delete gallery",
        description: error.message,
        variant: "destructive",
      }),
  });

  return (
    <AdminSidebar>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-heading font-semibold">Galleries</h1>
            <p className="mt-1 text-muted-foreground">
              Create reusable photo galleries for pages and blog posts.
            </p>
          </div>
          <Button onClick={() => navigate("/admin/cms/galleries/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Gallery
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search galleries"
                  className="pl-9"
                />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Recently updated</SelectItem>
                  <SelectItem value="created">Recently created</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-16 w-full" />
                ))}
              </div>
            ) : galleries.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Image className="mx-auto mb-3 h-10 w-10 opacity-35" />
                <p className="font-medium text-foreground">No galleries yet</p>
                <p className="mt-1 text-sm">
                  Create your first gallery to reuse it across the site.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-2 py-3 font-medium">Title</th>
                      <th className="px-2 py-3 font-medium hidden md:table-cell">Slug</th>
                      <th className="px-2 py-3 font-medium">Images</th>
                      <th className="px-2 py-3 font-medium">Status</th>
                      <th className="px-2 py-3 font-medium hidden lg:table-cell">Updated</th>
                      <th className="px-2 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {galleries.map((gallery) => (
                      <tr
                        key={gallery.id}
                        className="border-b last:border-0 hover:bg-muted/30"
                        onClick={() => navigate(`/admin/cms/galleries/${gallery.id}`)}
                      >
                        <td className="px-2 py-3 font-medium">{gallery.title}</td>
                        <td className="px-2 py-3 hidden md:table-cell font-mono text-xs text-muted-foreground">
                          {gallery.slug}
                        </td>
                        <td className="px-2 py-3">{gallery.imageCount}</td>
                        <td className="px-2 py-3">
                          <Badge
                            variant={gallery.status === "published" ? "default" : "outline"}
                            className={gallery.status === "published" ? "bg-green-600" : ""}
                          >
                            {gallery.status}
                          </Badge>
                        </td>
                        <td className="px-2 py-3 hidden lg:table-cell text-muted-foreground">
                          {gallery.updatedAt
                            ? format(new Date(gallery.updatedAt), "MMM d, yyyy")
                            : ""}
                        </td>
                        <td className="px-2 py-3">
                          <div
                            className="flex justify-end gap-1"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/admin/cms/galleries/${gallery.id}`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {gallery.status === "published" ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => unpublishMutation.mutate(gallery.id)}
                              >
                                <EyeOff className="h-4 w-4 text-amber-600" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => publishMutation.mutate(gallery.id)}
                              >
                                <Eye className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => duplicateMutation.mutate(gallery.id)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(gallery.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminSidebar>
  );
}
