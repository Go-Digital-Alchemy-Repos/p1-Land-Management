import { sectionLeaseTransport } from "@/hooks/use-editor-lock";
import { useState } from "react";
import { useLocation } from "wouter";
import { SectionListPresentation } from "@/components/shared/cms-section-list-presentation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
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
import { apiRequest } from "@/lib/queryClient";
import type { CmsSection } from "@shared/schema";
import { format } from "date-fns";

export default function CmsSectionsPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: sections = [], isLoading } = useQuery<CmsSection[]>({
    queryKey: ["/api/admin/cms/sections"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const section = sections.find((section) => section.id === id);
      if (!section?.version) throw Error("Reload sections before deleting.");
      const editorInstanceId = crypto.randomUUID();
      const lease = await sectionLeaseTransport("acquire", id, { editorInstanceId });
      if (!lease.ownedByCurrentEditor || !lease.lock)
        throw Error("Another editor holds this section.");
      try {
        await apiRequest("DELETE", `/api/admin/cms/sections/${id}`, {
          expectedVersion: section.version,
          editorInstanceId,
          leaseId: lease.lock.id,
        });
      } finally {
        await sectionLeaseTransport("release", id, {
          editorInstanceId,
          leaseId: lease.lock.id,
        }).catch(() => {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/sections"] });
      toast({ title: "Section deleted" });
      setDeletingId(null);
    },
    onError: () => toast({ title: "Failed to delete section", variant: "destructive" }),
  });

  const restoreStartersMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/cms/sections/system/starter-library");
      return response.json() as Promise<{
        created: number;
        updated: number;
        deleted: number;
        total: number;
      }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/sections"] });
      toast({
        title: "Starter section library updated",
        description: `${result.created} created, ${result.updated} refreshed, and ${result.deleted ?? 0} outdated starter sections removed.`,
      });
    },
    onError: () => {
      toast({ title: "Failed to restore starter sections", variant: "destructive" });
    },
  });

  return (
    <AdminSidebar>
      <SectionListPresentation
        sections={sections}
        isLoading={isLoading}
        search={search}
        setSearch={setSearch}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        restoring={restoreStartersMutation.isPending}
        onRestore={() => restoreStartersMutation.mutate()}
        onEdit={(id) => navigate(`/admin/cms/sections/${id}`)}
        onDelete={setDeletingId}
        formatDate={(date) => format(new Date(date), "MMM d, yyyy")}
        ui={{
          Button,
          Card,
          CardContent,
          Badge,
          Input,
          Skeleton,
          Select,
          SelectTrigger,
          SelectValue,
          SelectContent,
          SelectItem,
        }}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this reusable section?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the saved section template. Pages that already inserted this section are
              not affected — their blocks remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-section"
            >
              Delete Section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminSidebar>
  );
}
