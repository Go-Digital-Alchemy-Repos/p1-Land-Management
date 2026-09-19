import React, {
  useState,
  useCallback,
  useContext,
  createContext,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  CornerDownRight,
  CornerUpLeft,
  Menu as MenuIcon,
  Link2,
  AlertTriangle,
} from "lucide-react";
import type { MenuItem } from "../../../../shared/schema/cms-menus";
import { reorderMenuItems, menuSubtreeHeight } from "./menu-tree-operations";
export type MenuPageReference = { id: string; title: string; slug: string; status: string };
export type MenuFormReference = { id: string; slug: string; name: string };
export type MenuPrimitives = Record<
  | "Input"
  | "Button"
  | "DropdownMenu"
  | "DropdownMenuTrigger"
  | "DropdownMenuContent"
  | "DropdownMenuItem",
  ComponentType<any>
> & { requireFields?: boolean; formNotice?: ReactNode; confirmDelete?: (label: string) => boolean };
export const MenuPresentationContext = createContext<MenuPrimitives>({} as MenuPrimitives);
function cmsPagePath(slug: string): string {
  const cleanSlug = slug.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  return cleanSlug ? `/${cleanSlug}` : "/";
}

type MenuItemLinkType = "existing-page" | "custom-url" | "form-modal";

function getMenuItemLinkType(item: MenuItem): MenuItemLinkType {
  if (item.action === "form-modal" || item.formSlug) return "form-modal";
  if (item.action === "internal-link" || item.pageId) return "existing-page";
  return "custom-url";
}

export function createMenuItem(): MenuItem {
  return {
    id: crypto.randomUUID(),
    label: "",
    url: "/",
    openInNewTab: false,
    action: "custom-link",
    pageId: null,
    labelSource: "custom",
    children: [],
  };
}

export function MenuItemEditor({
  item,
  pages,
  forms,
  depth,
  index,
  totalSiblings,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onIndent,
  onOutdent,
  onPromoteToRoot,
  onReorder,
}: {
  item: MenuItem;
  pages: MenuPageReference[];
  forms: MenuFormReference[];
  depth: number;
  index: number;
  totalSiblings: number;
  onUpdate: (id: string, updates: Partial<MenuItem>) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onIndent: (id: string) => void;
  onOutdent: (id: string) => void;
  onPromoteToRoot: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
}) {
  const {
    Input,
    Button,
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    formNotice,
    requireFields,
    confirmDelete,
  } = useContext(MenuPresentationContext);
  const [expanded, setExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const canNest = depth < 3;
  const selectedPageId = item.pageId ?? "";
  const linkType = getMenuItemLinkType(item);
  const selectedPage = selectedPageId ? pages.find((entry) => entry.id === selectedPageId) : null;
  const hasMissingPage = Boolean(selectedPageId && !selectedPage);
  const isUnpublishedPage = Boolean(selectedPage && selectedPage.status !== "published");
  const isPageSynced = Boolean(selectedPage && item.labelSource === "page");

  const updateChild = useCallback(
    (childId: string, updates: Partial<MenuItem>) => {
      const updatedChildren = item.children.map((c) =>
        c.id === childId ? { ...c, ...updates } : c,
      );
      onUpdate(item.id, { children: updatedChildren });
    },
    [item, onUpdate],
  );

  const deleteChild = useCallback(
    (childId: string) => {
      onUpdate(item.id, {
        children: item.children.filter((c) => c.id !== childId),
      });
    },
    [item, onUpdate],
  );

  const moveChildUp = useCallback(
    (childId: string) => {
      const idx = item.children.findIndex((c) => c.id === childId);
      if (idx <= 0) return;
      const arr = [...item.children];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      onUpdate(item.id, { children: arr });
    },
    [item, onUpdate],
  );

  const moveChildDown = useCallback(
    (childId: string) => {
      const idx = item.children.findIndex((c) => c.id === childId);
      if (idx < 0 || idx >= item.children.length - 1) return;
      const arr = [...item.children];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      onUpdate(item.id, { children: arr });
    },
    [item, onUpdate],
  );

  const reorderChild = useCallback(
    (activeId: string, overId: string) => {
      onUpdate(item.id, { children: reorderMenuItems(item.children, activeId, overId) });
    },
    [item, onUpdate],
  );

  const updateLabel = (label: string) => {
    onUpdate(item.id, {
      label,
      labelSource: item.pageId ? "custom" : item.labelSource,
    });
  };

  const updateUrl = (url: string) => {
    onUpdate(item.id, {
      url,
      pageId: null,
      labelSource: item.pageId ? "custom" : item.labelSource,
    });
  };

  const selectPage = (pageId: string) => {
    if (!pageId) {
      onUpdate(item.id, {
        action: "internal-link",
        pageId: null,
        labelSource: "custom",
        formSlug: null,
        modalTitle: null,
        modalDescription: null,
      });
      return;
    }

    const page = pages.find((entry) => entry.id === pageId);
    if (!page) return;

    onUpdate(item.id, {
      action: "internal-link",
      pageId: page.id,
      label: page.title,
      url: cmsPagePath(page.slug),
      labelSource: "page",
      openInNewTab: false,
      formSlug: null,
      modalTitle: null,
      modalDescription: null,
    });
  };

  const selectLinkType = (nextType: MenuItemLinkType) => {
    if (nextType === "existing-page") {
      onUpdate(item.id, {
        action: "internal-link",
        pageId: null,
        labelSource: "custom",
        formSlug: null,
        modalTitle: null,
        modalDescription: null,
      });
      return;
    }
    if (nextType === "form-modal") {
      onUpdate(item.id, {
        action: "form-modal",
        url: "#",
        pageId: null,
        labelSource: "custom",
        openInNewTab: false,
      });
      return;
    }
    onUpdate(item.id, {
      action: "custom-link",
      pageId: null,
      labelSource: "custom",
      formSlug: null,
      modalTitle: null,
      modalDescription: null,
    });
  };

  const selectForm = (formSlug: string) => {
    const form = forms.find((entry) => entry.slug === formSlug);
    onUpdate(item.id, {
      action: "form-modal",
      formSlug: formSlug || null,
      url: "#",
      label: item.label || form?.name || "",
      modalTitle: item.modalTitle || form?.name || null,
      pageId: null,
      labelSource: "custom",
      openInNewTab: false,
    });
  };

  const useSelectedPageTitle = () => {
    if (!selectedPage) return;
    onUpdate(item.id, {
      label: selectedPage.title,
      url: cmsPagePath(selectedPage.slug),
      labelSource: "page",
      pageId: selectedPage.id,
    });
  };

  const clearPageLink = () => {
    onUpdate(item.id, {
      pageId: null,
      labelSource: "custom",
    });
  };

  const addChild = useCallback(() => {
    onUpdate(item.id, { children: [...item.children, createMenuItem()] });
  }, [item, onUpdate]);

  return (
    <div
      className="border rounded-lg bg-card"
      data-testid={`menu-item-${item.id}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const activeId = event.dataTransfer.getData("text/plain");
        if (activeId) onReorder(activeId, item.id);
      }}
    >
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", item.id);
          }}
          className="shrink-0 cursor-grab rounded p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label={`Drag ${item.label || "menu item"}`}
          data-testid={`drag-menu-item-${item.id}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {hasChildren ? (
          <button
            type="button"
            aria-label={`${expanded ? "Collapse" : "Expand"} ${item.label}`}
            onClick={() => setExpanded(!expanded)}
            className="shrink-0"
            data-testid={`toggle-children-${item.id}`}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-4 shrink-0" />
        )}

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-[0.9fr_1fr_1fr_1fr_auto] gap-2 items-start">
          <select
            aria-label={`Link type for ${item.label}`}
            value={linkType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              selectLinkType(e.target.value as MenuItemLinkType)
            }
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid={`select-link-type-${item.id}`}
          >
            <option value="existing-page">Existing page</option>
            <option value="custom-url">Custom URL</option>
            <option value="form-modal">
              {formNotice ? "Form popup (unsupported on P1 public website)" : "Open modal"}
            </option>
          </select>
          <div className="space-y-1">
            {linkType === "existing-page" ? (
              <select
                aria-label={`Page for ${item.label}`}
                value={selectedPageId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => selectPage(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid={`select-page-${item.id}`}
              >
                <option value="">Choose page</option>
                {hasMissingPage && <option value={selectedPageId}>Missing page</option>}
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title}
                  </option>
                ))}
              </select>
            ) : linkType === "form-modal" ? (
              <select
                required={requireFields}
                aria-label={`Form for ${item.label}`}
                value={item.formSlug ?? ""}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => selectForm(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid={`select-form-${item.id}`}
              >
                <option value="">Choose form</option>
                {item.formSlug && !forms.some((form) => form.slug === item.formSlug) && (
                  <option value={item.formSlug}>Missing form: {item.formSlug}</option>
                )}
                {forms.map((form) => (
                  <option key={form.id} value={form.slug}>
                    {form.name}
                  </option>
                ))}
              </select>
            ) : (
              <div
                className="flex h-8 w-full items-center rounded-md border border-input bg-muted/40 px-2 py-1 text-sm text-muted-foreground"
                data-testid={`text-custom-url-type-${item.id}`}
              >
                Custom URL
              </div>
            )}
            <div className="flex min-h-4 items-center gap-1.5 text-[11px] text-muted-foreground">
              {hasMissingPage ? (
                <>
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                  <span className="text-destructive">Missing page</span>
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={clearPageLink}
                    data-testid={`button-clear-page-link-${item.id}`}
                  >
                    Clear link
                  </button>
                </>
              ) : selectedPage ? (
                <>
                  {isUnpublishedPage ? (
                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                  ) : (
                    <Link2 className="h-3 w-3" />
                  )}
                  <span>
                    {isUnpublishedPage
                      ? `Linked to ${selectedPage.status} page`
                      : isPageSynced
                        ? "Synced from page"
                        : "Custom label"}
                  </span>
                  {!isPageSynced && (
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline"
                      onClick={useSelectedPageTitle}
                      data-testid={`button-use-page-title-${item.id}`}
                    >
                      Use page title
                    </button>
                  )}
                </>
              ) : (
                <span>{linkType === "form-modal" ? "Form opens in modal" : "Manual URL"}</span>
              )}
            </div>
          </div>
          <Input
            required={requireFields}
            aria-label={`Label for ${item.label}`}
            value={item.label}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLabel(e.target.value)}
            placeholder="Label"
            className="h-8 text-sm"
            data-testid={`input-label-${item.id}`}
          />
          {linkType === "form-modal" ? (
            <Input
              aria-label={`Popup title for ${item.label}`}
              value={item.modalTitle ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onUpdate(item.id, { modalTitle: e.target.value })
              }
              placeholder="Modal title"
              className="h-8 text-sm"
              data-testid={`input-modal-title-${item.id}`}
            />
          ) : (
            <Input
              required={requireFields}
              aria-label={`URL for ${item.label}`}
              value={item.url}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateUrl(e.target.value)}
              placeholder="/url or https://..."
              className="h-8 text-sm"
              disabled={linkType === "existing-page"}
              data-testid={`input-url-${item.id}`}
            />
          )}
          {linkType === "form-modal" ? (
            <div className="h-8" />
          ) : (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                checked={item.openInNewTab}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdate(item.id, { openInNewTab: e.target.checked })
                }
                className="rounded"
                data-testid={`checkbox-newtab-${item.id}`}
              />
              <ExternalLink className="h-3 w-3" />
              New tab
            </label>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              aria-label={`Actions for ${item.label}`}
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              data-testid={`menu-item-actions-${item.id}`}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onMoveUp(item.id)} disabled={index === 0}>
              <ArrowUp className="mr-2 h-4 w-4" /> Move up
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onMoveDown(item.id)}
              disabled={index === totalSiblings - 1}
            >
              <ArrowDown className="mr-2 h-4 w-4" /> Move down
            </DropdownMenuItem>
            {depth > 1 && (
              <DropdownMenuItem onClick={() => onOutdent(item.id)}>
                <CornerUpLeft className="mr-2 h-4 w-4" /> Outdent
              </DropdownMenuItem>
            )}
            {depth > 1 && (
              <DropdownMenuItem onClick={() => onPromoteToRoot(item.id)}>
                <MenuIcon className="mr-2 h-4 w-4" /> Promote to main item
              </DropdownMenuItem>
            )}
            {depth < 3 && index > 0 && (
              <DropdownMenuItem
                onClick={() => onIndent(item.id)}
                disabled={depth + menuSubtreeHeight(item) > 3}
              >
                <CornerDownRight className="mr-2 h-4 w-4" /> Indent
              </DropdownMenuItem>
            )}
            {canNest && (
              <DropdownMenuItem onClick={addChild}>
                <Plus className="mr-2 h-4 w-4" /> Add child item
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                if (!confirmDelete || confirmDelete(item.label)) onDelete(item.id);
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {linkType === "form-modal" && (
        <div className="px-3 pb-3">
          <label className="text-xs">
            Popup description
            <Input
              value={item.modalDescription ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onUpdate(item.id, { modalDescription: e.target.value })
              }
            />
          </label>
          {formNotice && <p className="text-xs text-muted-foreground">{formNotice}</p>}
        </div>
      )}
      {hasChildren && expanded && (
        <div className="pl-6 pr-3 pb-3 space-y-2">
          {item.children.map((child, cIdx) => (
            <MenuItemEditor
              key={child.id}
              item={child}
              pages={pages}
              forms={forms}
              depth={depth + 1}
              index={cIdx}
              totalSiblings={item.children.length}
              onUpdate={updateChild}
              onDelete={deleteChild}
              onMoveUp={moveChildUp}
              onMoveDown={moveChildDown}
              onReorder={reorderChild}
              onIndent={onIndent}
              onOutdent={onOutdent}
              onPromoteToRoot={onPromoteToRoot}
            />
          ))}
        </div>
      )}
    </div>
  );
}
