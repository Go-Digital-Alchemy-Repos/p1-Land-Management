import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, STALE_TIMES } from "@/lib/queryClient";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, EyeOff, Globe, CalendarClock, Link2, Copy } from "lucide-react";
import type { CmsPage } from "@shared/schema";
import { format } from "date-fns";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

const PAGE_TYPE_COLORS: Record<string, string> = {
  home: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  about: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  contact: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  landing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  custom: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
};

interface CmsPageRelationshipSummary {
  menuReferences: Array<{
    menuId: string;
    menuName: string;
    itemId: string;
    itemLabel: string;
    itemUrl: string;
    labelSource?: "page" | "custom";
  }>;
  counts: {
    menuItems: number;
  };
}

export default function CmsPagesPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<CmsPage | null>(null);

  const { data: pages = [], isLoading } = useQuery<CmsPage[]>({
    queryKey: ["/api/admin/cms/pages"],
  });

  const { data: pageLocks = [] } = useQuery<
    Array<{ resourceId: string; lock: { lockedByUserId: string; lockedByName: string } }>
  >({
    queryKey: ["/api/admin/editor-locks/resource", "cms_page"],
    queryFn: async () => {
      const response = await fetch("/api/admin/editor-locks/resource/cms_page", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load page lock status");
      return response.json();
    },
    refetchInterval: 15000,
    staleTime: STALE_TIMES.PREVIEW,
  });

  const pageLocksById = new Map(pageLocks.map((entry) => [entry.resourceId, entry.lock] as const));

  const publishMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/cms/pages/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] });
      toast({ title: "Page published" });
    },
    onError: () => toast({ title: "Failed to publish page", variant: "destructive" }),
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/cms/pages/${id}/unpublish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] });
      toast({ title: "Page moved to draft" });
    },
    onError: (error: Error) =>
      toast({
        title: "Failed to unpublish page",
        description: error.message,
        variant: "destructive",
      }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/admin/cms/pages/${id}/duplicate`);
      return response.json() as Promise<CmsPage>;
    },
    onSuccess: (page) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] });
      toast({ title: "Page duplicated", description: `${page.title} is ready to edit.` });
      navigate(`/admin/cms/pages/${page.id}`);
    },
    onError: (error: Error) =>
      toast({
        title: "Failed to duplicate page",
        description: error.message,
        variant: "destructive",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) =>
      apiRequest("DELETE", `/api/admin/cms/pages/${id}${force ? "?force=true" : ""}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] });
      toast({ title: "Page deleted" });
      setDeleteTarget(null);
    },
    onError: (error: Error) =>
      toast({ title: "Failed to delete page", description: error.message, variant: "destructive" }),
  });

  const { data: deleteRelationships } = useQuery<CmsPageRelationshipSummary>({
    queryKey: ["/api/admin/cms/pages", deleteTarget?.id, "relationships"],
    queryFn: async () => {
      const response = await fetch(`/api/admin/cms/pages/${deleteTarget!.id}/relationships`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load page references");
      return response.json();
    },
    enabled: Boolean(deleteTarget?.id),
  });

  const getEditorHref = (page: CmsPage) =>
    page.slug === "directory" ? "/admin/cms/pages/directory" : `/admin/cms/pages/${page.id}`;

  return (
    <AdminSidebar>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-semibold" data-testid="text-cms-pages-title">
              Pages
            </h1>
            <p className="text-muted-foreground mt-1">Manage your public-facing website pages</p>
          </div>
          <Button onClick={() => navigate("/admin/cms/pages/new")} data-testid="button-new-page">
            <Plus className="h-4 w-4 mr-2" />
            New Page
          </Button>
        </div>

        <Card>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3 pt-6">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : pages.length === 0 ? (
              <div
                className="text-center py-16 text-muted-foreground"
                data-testid="text-empty-pages"
              >
                <Globe className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No pages yet</p>
                <p className="text-sm mt-1">Create your first CMS page to get started</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate("/admin/cms/pages/new")}
                  data-testid="button-create-first"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Page
                </Button>
              </div>
            ) : (
              <table className="w-full text-sm" data-testid="table-cms-pages">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Title</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden md:table-cell">
                      Slug
                    </th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden lg:table-cell">
                      Type
                    </th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                      Status
                    </th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden md:table-cell">
                      Updated
                    </th>
                    <th className="text-right py-3 px-2 text-muted-foreground font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((page) => {
                    const activeLock = pageLocksById.get(page.id);
                    const isLockedByOther = Boolean(
                      activeLock && activeLock.lockedByUserId !== user?.id,
                    );
                    const isOwnedByCurrentUser = Boolean(
                      activeLock && activeLock.lockedByUserId === user?.id,
                    );
                    return (
                      <tr
                        key={page.id}
                        className={`border-b last:border-0 ${isLockedByOther ? "bg-muted/10 cursor-not-allowed opacity-80" : "hover:bg-muted/20 cursor-pointer"}`}
                        onClick={() => {
                          if (!isLockedByOther) navigate(getEditorHref(page));
                        }}
                        data-testid={`row-page-${page.id}`}
                      >
                        <td className="py-3 px-2 font-medium">
                          <div className="flex flex-col gap-1">
                            <span>{page.title}</span>
                            {activeLock ? (
                              <Badge
                                variant={isOwnedByCurrentUser ? "default" : "outline"}
                                className="w-fit text-[10px]"
                                data-testid={`badge-lock-${page.id}`}
                              >
                                {isOwnedByCurrentUser
                                  ? "You’re editing"
                                  : `Being edited by ${activeLock.lockedByName}`}
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground font-mono text-xs hidden md:table-cell">
                          {page.slug}
                        </td>
                        <td className="py-3 px-2 hidden lg:table-cell">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PAGE_TYPE_COLORS[page.pageType] ?? PAGE_TYPE_COLORS.custom}`}
                          >
                            {page.pageType}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex flex-col gap-0.5">
                            <Badge
                              variant={page.status === "published" ? "default" : "outline"}
                              className={`text-xs ${page.status === "published" ? "bg-green-600 hover:bg-green-700" : page.status === "scheduled" ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" : ""}`}
                              data-testid={`badge-status-${page.id}`}
                            >
                              {page.status === "scheduled" && (
                                <CalendarClock className="h-3 w-3 mr-1" />
                              )}
                              {page.status}
                            </Badge>
                            {page.status === "scheduled" && page.scheduledAt && (
                              <span
                                className="text-[10px] text-muted-foreground"
                                data-testid={`text-scheduled-date-${page.id}`}
                              >
                                {format(new Date(page.scheduledAt), "MMM d, h:mm a")}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground text-xs hidden md:table-cell">
                          {page.updatedAt ? format(new Date(page.updatedAt), "MMM d, yyyy") : "—"}
                        </td>
                        <td className="py-3 px-2">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => navigate(getEditorHref(page))}
                              disabled={isLockedByOther}
                              title={`Edit ${page.title}`}
                              data-testid={`button-edit-${page.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => duplicateMutation.mutate(page.id)}
                              disabled={duplicateMutation.isPending || isLockedByOther}
                              title={`Duplicate ${page.title}`}
                              data-testid={`button-duplicate-${page.id}`}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {page.status === "published" || page.status === "scheduled" ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-600"
                                onClick={() => unpublishMutation.mutate(page.id)}
                                disabled={unpublishMutation.isPending || isLockedByOther}
                                data-testid={`button-unpublish-${page.id}`}
                                title={
                                  page.status === "scheduled" ? "Cancel schedule" : "Move to draft"
                                }
                              >
                                <EyeOff className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600"
                                onClick={() => publishMutation.mutate(page.id)}
                                disabled={publishMutation.isPending || isLockedByOther}
                                data-testid={`button-publish-${page.id}`}
                                title="Publish page"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => setDeleteTarget(page)}
                              disabled={isLockedByOther}
                              data-testid={`button-delete-${page.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteRelationships && deleteRelationships.counts.menuItems > 0 && (
            <div
              className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
              data-testid="delete-page-reference-warning"
            >
              <div className="flex items-center gap-2 font-medium">
                <Link2 className="h-4 w-4" />
                {deleteRelationships.counts.menuItems} navigation reference
                {deleteRelationships.counts.menuItems === 1 ? "" : "s"} will remain
              </div>
              <div className="mt-2 space-y-1 text-xs">
                {deleteRelationships.menuReferences.slice(0, 4).map((reference) => (
                  <p key={`${reference.menuId}-${reference.itemId}`}>
                    {reference.menuName}: {reference.itemLabel || "(no label)"} ·{" "}
                    {reference.itemUrl}
                  </p>
                ))}
                {deleteRelationships.menuReferences.length > 4 && (
                  <p>+{deleteRelationships.menuReferences.length - 4} more</p>
                )}
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() =>
                deleteTarget &&
                deleteMutation.mutate({
                  id: deleteTarget.id,
                  force: Boolean(deleteRelationships && deleteRelationships.counts.menuItems > 0),
                })
              }
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteRelationships && deleteRelationships.counts.menuItems > 0
                ? "Delete Anyway"
                : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminSidebar>
  );
}
