import { pageLeaseTransport } from "../../../hooks/use-editor-lock";
import { PageListPresentation } from "../../../components/shared/cms-page-presentation";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, STALE_TIMES } from "@/lib/queryClient";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
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
import { Link2 } from "lucide-react";
import type { CmsPage } from "@shared/schema";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

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

  async function mutatePage(id: string, method: string, path: string) {
    const row = pages.find((page) => page.id === id);
    const expectedVersion = (row as (CmsPage & { version: number }) | undefined)?.version;
    if (!Number.isInteger(expectedVersion))
      throw Error("Reload the page list to obtain its saved version.");
    const editorInstanceId = crypto.randomUUID();
    const lease = await pageLeaseTransport("acquire", id, { editorInstanceId });
    if (!lease.ownedByCurrentEditor || !lease.lock)
      throw Error("Another editor instance holds this page.");
    try {
      return await apiRequest(method, path, {
        expectedVersion,
        editorInstanceId,
        leaseId: lease.lock.id,
      });
    } finally {
      await pageLeaseTransport(
        "release",
        id,
        { editorInstanceId, leaseId: lease.lock.id },
        { keepalive: true },
      ).catch(() => {});
    }
  }
  const publishMutation = useMutation({
    mutationFn: (id: string) => mutatePage(id, "POST", `/api/admin/cms/pages/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] });
      toast({ title: "Page published" });
    },
    onError: () => toast({ title: "Failed to publish page", variant: "destructive" }),
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => mutatePage(id, "POST", `/api/admin/cms/pages/${id}/unpublish`),
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
      mutatePage(id, "DELETE", `/api/admin/cms/pages/${id}${force ? "?force=true" : ""}`),
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
      <PageListPresentation
        pages={pages}
        loading={isLoading}
        filters={null}
        onNew={() => navigate("/admin/cms/pages/new")}
        onEdit={(id) => {
          const page = pages.find((row) => row.id === id);
          if (page) navigate(getEditorHref(page));
        }}
        locks={Object.fromEntries(
          pageLocks.map(({ resourceId, lock }) => [
            resourceId,
            { name: lock.lockedByName, owned: false },
          ]),
        )}
        busy={
          publishMutation.isPending ||
          unpublishMutation.isPending ||
          duplicateMutation.isPending ||
          deleteMutation.isPending
        }
        onAction={(id, action) => {
          if (action === "duplicate") duplicateMutation.mutate(id);
          else if (action === "publish") publishMutation.mutate(id);
          else if (action === "unpublish") unpublishMutation.mutate(id);
          else setDeleteTarget(pages.find((row) => row.id === id) || null);
        }}
      />

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
