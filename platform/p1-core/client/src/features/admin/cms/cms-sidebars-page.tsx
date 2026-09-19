import { SidebarListPresentation } from "@/components/shared/sidebar-list-presentation";
import {
  SidebarEditorPresentation,
  defaultWidget,
} from "@/components/shared/sidebar-editor-presentation";
import { useCallback, useState } from "react";
import type { ElementType } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, STALE_TIMES } from "@/lib/queryClient";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { EditorLockBanner } from "@/components/shared/editor-lock-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  Edit,
  GripVertical,
  Loader2,
  Mail,
  PanelRight,
  Plus,
  Search,
  Star,
  Tag,
  Trash2,
  Type,
} from "lucide-react";
import {
  SIDEBAR_WIDGET_TYPES,
  type CmsForm,
  type CmsSidebar,
  type SidebarWidget,
  type SidebarWidgetType,
} from "@shared/schema";
import { useEditorLock } from "@/hooks/use-editor-lock";
import { useLockConflictGuard } from "@/hooks/use-lock-conflict-guard";

function widgetCount(sidebar: CmsSidebar) {
  return Array.isArray(sidebar.widgets) ? sidebar.widgets.length : 0;
}

function SidebarEditor({ sidebar, onClose }: { sidebar: CmsSidebar | null; onClose: () => void }) {
  const { toast } = useToast();
  const isNew = !sidebar;
  const [name, setName] = useState(sidebar?.name ?? "");
  const [description, setDescription] = useState(sidebar?.description ?? "");
  const [isDefault, setIsDefault] = useState(Boolean(sidebar?.isDefault));
  const [widgets, setWidgets] = useState<SidebarWidget[]>(
    Array.isArray(sidebar?.widgets) ? (sidebar!.widgets as SidebarWidget[]) : [],
  );
  const { data: forms = [] } = useQuery<CmsForm[]>({
    queryKey: ["/api/admin/forms"],
    staleTime: STALE_TIMES.LIVE,
  });
  const editorLock = useEditorLock({
    resourceType: "cms_sidebar",
    resourceId: isNew ? null : (sidebar?.id ?? null),
    enabled: !isNew,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { name, description: description || null, isDefault, widgets };
      if (isNew) return apiRequest("POST", "/api/admin/cms/sidebars", body);
      return apiRequest("PUT", `/api/admin/cms/sidebars/${sidebar!.id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/sidebars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cms/sidebars"] });
      toast({ title: isNew ? "Sidebar created" : "Sidebar saved" });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save sidebar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useLockConflictGuard({
    active: !isNew && Boolean(sidebar?.id),
    resourceId: isNew ? null : (sidebar?.id ?? null),
    resourceLabel: "sidebar",
    editorLock,
    onConflict: onClose,
  });

  const updateWidget = useCallback((id: string, updates: Partial<SidebarWidget>) => {
    setWidgets((current) =>
      current.map((widget) => (widget.id === id ? { ...widget, ...updates } : widget)),
    );
  }, []);

  const moveWidget = (id: string, direction: -1 | 1) => {
    setWidgets((current) => {
      const index = current.findIndex((widget) => widget.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const addWidget = (type: SidebarWidgetType) => {
    setWidgets((current) => [...current, defaultWidget(type)]);
  };

  return (
    <SidebarEditorPresentation
      ui={{
        Button,
        Input,
        Textarea,
        Label,
        Switch,
        Badge,
        Card,
        CardContent,
        CardDescription,
        CardHeader,
        CardTitle,
        Select,
        SelectContent,
        SelectItem,
        SelectTrigger,
        SelectValue,
      }}
      isNew={isNew}
      name={name}
      description={description}
      isDefault={isDefault}
      widgets={widgets}
      forms={forms}
      setName={setName}
      setDescription={setDescription}
      setIsDefault={setIsDefault}
      onSave={() => saveMutation.mutate()}
      onClose={onClose}
      updateWidget={updateWidget}
      moveWidget={moveWidget}
      addWidget={addWidget}
      onRemoveWidget={(id) => setWidgets((current) => current.filter((item) => item.id !== id))}
      busy={saveMutation.isPending}
      readOnly={editorLock.isReadOnly}
      reservation={
        editorLock.summary ? (
          <EditorLockBanner
            variant={editorLock.summary.variant}
            title={editorLock.summary.title}
            description={editorLock.summary.description}
            isLoading={editorLock.isLoading}
            onRefresh={editorLock.acquire}
          />
        ) : null
      }
    />
  );
}

export default function CmsSidebarsPage() {
  const { toast } = useToast();
  const [editingSidebar, setEditingSidebar] = useState<CmsSidebar | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<CmsSidebar | null>(null);

  const { data: sidebars = [], isLoading } = useQuery<CmsSidebar[]>({
    queryKey: ["/api/admin/cms/sidebars"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/cms/sidebars/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/sidebars"] });
      toast({ title: "Sidebar deleted" });
      setDeleteTarget(null);
    },
    onError: () => toast({ title: "Failed to delete sidebar", variant: "destructive" }),
  });

  if (editingSidebar !== null) {
    return (
      <AdminSidebar>
        <div className="p-4 sm:p-6 max-w-5xl mx-auto">
          <SidebarEditor
            sidebar={editingSidebar === "new" ? null : editingSidebar}
            onClose={() => setEditingSidebar(null)}
          />
        </div>
      </AdminSidebar>
    );
  }

  return (
    <AdminSidebar>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <SidebarListPresentation
          ui={{ Button, Card, CardHeader, CardTitle, CardContent, CardDescription, Badge }}
          sidebars={sidebars}
          isLoading={isLoading}
          onCreate={() => setEditingSidebar("new")}
          onEdit={(id) => {
            const row = sidebars.find((sidebar) => sidebar.id === id);
            if (row) setEditingSidebar(row);
          }}
          onDelete={(id) => {
            const row = sidebars.find((sidebar) => sidebar.id === id);
            if (row) setDeleteTarget(row);
          }}
        />
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sidebar</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? Pages using this sidebar will
              fall back to a full-width layout until another sidebar is selected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              data-testid="button-confirm-delete-sidebar"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminSidebar>
  );
}
