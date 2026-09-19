export { promoteMenuItemToRoot, reorderMenuItems } from "@/components/shared/menu-tree-operations";
import { MenuCardPresentation } from "@/components/shared/menu-card-presentation";
import { MenuLocationsPresentation } from "@/components/shared/menu-locations-presentation";
import {
  MenuItemEditor,
  createMenuItem,
  MenuPresentationContext,
} from "@/components/shared/menu-item-presentation";
import {
  indentMenuItem,
  outdentMenuItem,
  promoteMenuItemToRoot,
  reorderMenuItems,
} from "@/components/shared/menu-tree-operations";
import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { EditorLockBanner } from "@/components/shared/editor-lock-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Menu as MenuIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  MENU_LOCATION_LABELS,
  STANDARD_MENU_LOCATIONS,
  LEGACY_MENU_LOCATIONS,
  type CmsMenu,
  type CmsForm,
  type CmsPage,
  type MenuItem,
  type MenuLocation,
} from "@shared/schema";
import { useEditorLock } from "@/hooks/use-editor-lock";
import { useLockConflictGuard } from "@/hooks/use-lock-conflict-guard";

const STANDARD_LOCATION_OPTIONS = STANDARD_MENU_LOCATIONS.map((location) => ({
  value: location,
  label: MENU_LOCATION_LABELS[location],
}));

const LEGACY_LOCATION_OPTIONS = LEGACY_MENU_LOCATIONS.map((location) => ({
  value: location,
  label: MENU_LOCATION_LABELS[location],
}));

function MenuEditor({
  menu,
  draft,
  onClose,
}: {
  menu: CmsMenu | null;
  draft?: Partial<Pick<CmsMenu, "name" | "location">>;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const isNew = !menu;
  const [name, setName] = useState(menu?.name || draft?.name || "");
  const [location, setLocation] = useState<MenuLocation>(
    (menu?.location as MenuLocation) || (draft?.location as MenuLocation) || "unassigned",
  );
  const [items, setItems] = useState<MenuItem[]>((menu?.items as MenuItem[]) || []);
  const { data: pages = [] } = useQuery<CmsPage[]>({
    queryKey: ["/api/admin/cms/pages"],
  });
  const { data: forms = [] } = useQuery<CmsForm[]>({
    queryKey: ["/api/admin/forms"],
  });
  const editorLock = useEditorLock({
    resourceType: "cms_menu",
    resourceId: isNew ? null : (menu?.id ?? null),
    enabled: !isNew,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { name, location, items };
      if (isNew) {
        return apiRequest("POST", "/api/admin/cms/menus", body);
      }
      return apiRequest("PUT", `/api/admin/cms/menus/${menu!.id}`, {
        ...body,
        expectedVersion: (menu as CmsMenu & { version: number }).version,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/menus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cms/menus"] });
      toast({ title: isNew ? "Menu created" : "Menu saved" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  useLockConflictGuard({
    active: !isNew && Boolean(menu?.id),
    resourceId: isNew ? null : (menu?.id ?? null),
    resourceLabel: "menu",
    editorLock,
    onConflict: onClose,
  });

  const updateItem = useCallback((id: string, updates: Partial<MenuItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const moveItemUp = useCallback((id: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx <= 0) return prev;
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  }, []);

  const moveItemDown = useCallback((id: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  }, []);

  const indentItem = useCallback((id: string) => setItems((prev) => indentMenuItem(prev, id)), []);
  const outdentItem = useCallback(
    (id: string) => setItems((prev) => outdentMenuItem(prev, id)),
    [],
  );

  const promoteItemToRoot = useCallback((id: string) => {
    setItems((prev) => promoteMenuItemToRoot(prev, id));
  }, []);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, createMenuItem()]);
  }, []);

  return (
    <MenuPresentationContext.Provider
      value={{
        Input,
        Button,
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuItem,
        DropdownMenuTrigger,
      }}
    >
      <div className="space-y-6">
        {editorLock.summary ? (
          <EditorLockBanner
            variant={editorLock.summary.variant}
            title={editorLock.summary.title}
            description={editorLock.summary.description}
            isLoading={editorLock.isLoading}
            onRefresh={editorLock.acquire}
          />
        ) : null}

        <p className="text-sm text-muted-foreground">Saving a menu assigned to Main Navigation or a P1 Footer location publishes its links, usually within 30 seconds. An empty assigned menu hides those links; an unassigned location keeps the existing website navigation. Other locations are retained but are not rendered by this website.</p>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" data-testid="text-menu-editor-title">
            {isNew ? "Create Menu" : `Edit: ${menu!.name}`}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} data-testid="button-cancel-menu">
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!name.trim() || saveMutation.isPending || editorLock.isReadOnly}
              data-testid="button-save-menu"
            >
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isNew ? "Create" : "Save"}
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "grid grid-cols-1 sm:grid-cols-2 gap-4",
            editorLock.hasLocking &&
              editorLock.isReadOnly &&
              "pointer-events-none select-none opacity-70",
          )}
        >
          <div className="space-y-2">
            <Label htmlFor="menu-name">Menu Name</Label>
            <Input
              id="menu-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Navigation"
              data-testid="input-menu-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="menu-location">Location</Label>
            <select
              id="menu-location"
              value={location}
              onChange={(e) => setLocation(e.target.value as MenuLocation)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="select-menu-location"
            >
              <option value="unassigned">Unassigned</option>
              <optgroup label="Theme Locations">
                {STANDARD_LOCATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Legacy Locations">
                {LEGACY_LOCATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        <div
          className={cn(
            "space-y-3",
            editorLock.hasLocking &&
              editorLock.isReadOnly &&
              "pointer-events-none select-none opacity-70",
          )}
        >
          <div className="flex items-center justify-between">
            <Label>Menu Items</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={addItem}
              data-testid="button-add-menu-item"
            >
              <Plus className="mr-1 h-4 w-4" /> Add Item
            </Button>
          </div>

          {items.length === 0 ? (
            <div
              className="border border-dashed rounded-lg p-8 text-center text-muted-foreground"
              data-testid="text-no-items"
            >
              <MenuIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No menu items yet. Click "Add Item" to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, idx) => (
                <MenuItemEditor
                  key={item.id}
                  item={item}
                  pages={pages}
                  forms={forms}
                  depth={1}
                  index={idx}
                  totalSiblings={items.length}
                  onUpdate={updateItem}
                  onDelete={deleteItem}
                  onMoveUp={moveItemUp}
                  onMoveDown={moveItemDown}
                  onReorder={(activeId, overId) => {
                    setItems((prev) => reorderMenuItems(prev, activeId, overId));
                  }}
                  onIndent={indentItem}
                  onOutdent={outdentItem}
                  onPromoteToRoot={promoteItemToRoot}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </MenuPresentationContext.Provider>
  );
}

export default function CmsMenusPage() {
  const { toast } = useToast();
  const [currentPath, navigate] = useLocation();
  const [editingMenu, setEditingMenu] = useState<CmsMenu | null | "new">(null);
  const [draftMenuDefaults, setDraftMenuDefaults] = useState<Partial<
    Pick<CmsMenu, "name" | "location">
  > | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CmsMenu | null>(null);

  const { data: menus, isLoading } = useQuery<CmsMenu[]>({
    queryKey: ["/api/admin/cms/menus"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/cms/menus/${id}`, {
        expectedVersion: (deleteConfirm as (CmsMenu & { version: number }) | null)?.version,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/menus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cms/menus"] });
      toast({ title: "Menu deleted" });
      setDeleteConfirm(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const countItems = (items: MenuItem[]): number => {
    let count = 0;
    for (const item of items) {
      count += 1;
      if (item.children) count += countItems(item.children);
    }
    return count;
  };

  const menusByLocation = new Map<MenuLocation, CmsMenu>();
  for (const menu of menus || []) {
    const location = menu.location as MenuLocation;
    if (!menusByLocation.has(location)) {
      menusByLocation.set(location, menu);
    }
  }

  useEffect(() => {
    if (!menus || editingMenu !== null) return;
    const query = currentPath.includes("?")
      ? currentPath.slice(currentPath.indexOf("?"))
      : window.location.search;
    const editMenuId = new URLSearchParams(query).get("editMenu");
    if (!editMenuId) return;

    const menu = menus.find((entry) => entry.id === editMenuId);
    if (menu) {
      setEditingMenu(menu);
      setDraftMenuDefaults(null);
    }
  }, [currentPath, editingMenu, menus]);

  if (editingMenu !== null) {
    return (
      <AdminSidebar>
        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
          <MenuEditor
            menu={editingMenu === "new" ? null : editingMenu}
            draft={draftMenuDefaults || undefined}
            onClose={() => {
              setEditingMenu(null);
              setDraftMenuDefaults(null);
              navigate("/admin/cms/menus");
            }}
          />
        </div>
      </AdminSidebar>
    );
  }

  return (
    <AdminSidebar>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-menus-title">
              Navigation Menus
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Saving a menu assigned to Main Navigation or a P1 Footer location publishes its links, usually within 30 seconds. An empty assigned menu hides those links; an unassigned location keeps the existing website navigation. Other locations are retained but are not rendered by this website.
            </p>
          </div>
          <Button
            onClick={() => {
              setDraftMenuDefaults(null);
              setEditingMenu("new");
            }}
            data-testid="button-create-menu"
          >
            <Plus className="mr-2 h-4 w-4" /> Create Menu
          </Button>
        </div>

        <MenuLocationsPresentation
          description="Saving a menu assigned to Main Navigation or a P1 Footer location publishes its links, usually within 30 seconds. An empty assigned menu hides those links; an unassigned location keeps the existing website navigation. Other locations are retained but are not rendered by this website."
          locations={STANDARD_LOCATION_OPTIONS}
          menus={menus || []}
          onManage={(location, id) => {
            const menu = menus?.find((m) => m.id === id);
            if (menu) {
              setEditingMenu(menu);
              setDraftMenuDefaults(null);
            } else {
              setDraftMenuDefaults({
                name: MENU_LOCATION_LABELS[location as MenuLocation],
                location: location as MenuLocation,
              });
              setEditingMenu("new");
            }
          }}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !menus || menus.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MenuIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-1" data-testid="text-no-menus">
                No Menus Yet
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a menu and assign it to a theme location to replace the default navigation.
              </p>
              <Button
                onClick={() => {
                  setDraftMenuDefaults(null);
                  setEditingMenu("new");
                }}
                data-testid="button-create-menu-empty"
              >
                <Plus className="mr-2 h-4 w-4" /> Create Your First Menu
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {menus.map((menu) => {
              const menuItems = (menu.items as MenuItem[]) || [];
              const itemCount = countItems(menuItems);
              return (
                <MenuCardPresentation
                  key={menu.id}
                  id={menu.id}
                  name={menu.name}
                  locationLabel={
                    MENU_LOCATION_LABELS[(menu.location as MenuLocation) || "unassigned"]
                  }
                  items={menuItems}
                  onEdit={() => setEditingMenu(menu)}
                  onDelete={() => setDeleteConfirm(menu)}
                />
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Menu</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
              {deleteConfirm?.location !== "unassigned" && (
                <span className="block mt-1 font-medium text-destructive">
                  This menu is currently assigned to the{" "}
                  {MENU_LOCATION_LABELS[(deleteConfirm?.location as MenuLocation) || "unassigned"]}.
                  Deleting it will revert that area to the default navigation.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
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
