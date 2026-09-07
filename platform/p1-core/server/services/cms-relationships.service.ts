import type { CmsPage, MenuItem } from "@shared/schema";
import { storage } from "../storage";

export interface CmsPageRelationshipSyncResult {
  menusUpdated: number;
  itemsUpdated: number;
}

export interface CmsPageRelationshipCleanupResult {
  menusUpdated: number;
  itemsRemoved: number;
}

export interface CmsPageMenuReference {
  menuId: string;
  menuName: string;
  menuLocation: string;
  itemId: string;
  itemLabel: string;
  itemUrl: string;
  labelSource?: "page" | "custom";
  depth: number;
}

function pagePath(slug: string | null | undefined): string {
  const cleanSlug = String(slug ?? "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  return cleanSlug ? `/${cleanSlug}` : "/";
}

function normalizeUrlForMatch(url: string | null | undefined): string {
  const value = String(url ?? "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return "";

  try {
    const parsed = new URL(value, "https://example.test");
    return parsed.pathname.replace(/\/+$/, "") || "/";
  } catch {
    const [withoutHash] = value.split("#");
    const [withoutQuery] = withoutHash.split("?");
    const normalized = withoutQuery.trim().replace(/\/+$/, "");
    return normalized || "/";
  }
}

function syncMenuItemsForPage(items: MenuItem[], oldPage: CmsPage, newPage: CmsPage) {
  let changed = false;
  let itemsUpdated = 0;
  const oldPath = pagePath(oldPage.slug);
  const newPath = pagePath(newPage.slug);

  const nextItems = items.map((item) => {
    const childResult = syncMenuItemsForPage(item.children ?? [], oldPage, newPage);
    const normalizedUrl = normalizeUrlForMatch(item.url);
    const isLinkedById = item.pageId === newPage.id || item.pageId === oldPage.id;
    const isLegacyPageUrl =
      !item.pageId && (normalizedUrl === oldPath || normalizedUrl === newPath);
    const shouldSyncLabel =
      item.labelSource === "page" ||
      (isLegacyPageUrl && (!item.label.trim() || item.label.trim() === oldPage.title.trim()));

    let nextItem: MenuItem = childResult.changed ? { ...item, children: childResult.items } : item;

    if (isLinkedById || isLegacyPageUrl) {
      const nextUrl =
        isLinkedById || item.url === oldPath || normalizedUrl === oldPath ? newPath : item.url;
      const nextLabel = shouldSyncLabel ? newPage.title : item.label;
      const nextLabelSource = shouldSyncLabel ? "page" : (item.labelSource ?? "custom");

      if (
        nextItem.pageId !== newPage.id ||
        nextItem.url !== nextUrl ||
        nextItem.label !== nextLabel ||
        nextItem.labelSource !== nextLabelSource
      ) {
        nextItem = {
          ...nextItem,
          pageId: newPage.id,
          url: nextUrl,
          label: nextLabel,
          labelSource: nextLabelSource,
        };
        changed = true;
        itemsUpdated += 1;
      }
    }

    if (childResult.changed) {
      changed = true;
      itemsUpdated += childResult.itemsUpdated;
    }

    return nextItem;
  });

  return { items: nextItems, changed, itemsUpdated };
}

function collectMenuReferences(
  items: MenuItem[],
  page: CmsPage,
  menu: { id: string; name: string; location: string },
  depth = 1,
): CmsPageMenuReference[] {
  const path = pagePath(page.slug);
  const references: CmsPageMenuReference[] = [];

  for (const item of items) {
    const isReference =
      item.pageId === page.id || (!item.pageId && normalizeUrlForMatch(item.url) === path);
    if (isReference) {
      references.push({
        menuId: menu.id,
        menuName: menu.name,
        menuLocation: menu.location,
        itemId: item.id,
        itemLabel: item.label,
        itemUrl: item.url,
        labelSource: item.labelSource,
        depth,
      });
    }

    references.push(...collectMenuReferences(item.children ?? [], page, menu, depth + 1));
  }

  return references;
}

function removeMenuReferencesForPage(items: MenuItem[], page: CmsPage) {
  let changed = false;
  let itemsRemoved = 0;
  const path = pagePath(page.slug);
  const nextItems: MenuItem[] = [];

  for (const item of items) {
    const childResult = removeMenuReferencesForPage(item.children ?? [], page);
    const isReference =
      item.pageId === page.id || (!item.pageId && normalizeUrlForMatch(item.url) === path);

    if (isReference) {
      changed = true;
      itemsRemoved += 1;
      continue;
    }

    if (childResult.changed) {
      changed = true;
      itemsRemoved += childResult.itemsRemoved;
      nextItems.push({ ...item, children: childResult.items });
    } else {
      nextItems.push(item);
    }
  }

  return { items: nextItems, changed, itemsRemoved };
}

export function syncMenuItemsWithPage(items: MenuItem[], oldPage: CmsPage, newPage: CmsPage) {
  return syncMenuItemsForPage(items, oldPage, newPage);
}

export function removeMenuItemsForPage(items: MenuItem[], page: CmsPage) {
  return removeMenuReferencesForPage(items, page);
}

export async function getCmsPageMenuReferences(page: CmsPage): Promise<CmsPageMenuReference[]> {
  const menus = await storage.cmsMenus.getAll();
  return menus.flatMap((menu) =>
    collectMenuReferences((menu.items as MenuItem[]) || [], page, {
      id: menu.id,
      name: menu.name,
      location: menu.location,
    }),
  );
}

export async function removeCmsPageMenuReferences(
  page: CmsPage,
): Promise<CmsPageRelationshipCleanupResult> {
  const menus = await storage.cmsMenus.getAll();
  let menusUpdated = 0;
  let itemsRemoved = 0;

  for (const menu of menus) {
    const result = removeMenuItemsForPage((menu.items as MenuItem[]) || [], page);
    if (!result.changed) continue;

    await storage.cmsMenus.update(menu.id, { items: result.items });
    menusUpdated += 1;
    itemsRemoved += result.itemsRemoved;
  }

  return { menusUpdated, itemsRemoved };
}

export async function syncCmsPageRelationships(
  oldPage: CmsPage,
  newPage: CmsPage,
): Promise<CmsPageRelationshipSyncResult> {
  const menus = await storage.cmsMenus.getAll();
  let menusUpdated = 0;
  let itemsUpdated = 0;

  for (const menu of menus) {
    const result = syncMenuItemsWithPage((menu.items as MenuItem[]) || [], oldPage, newPage);
    if (!result.changed) continue;

    await storage.cmsMenus.update(menu.id, { items: result.items });
    menusUpdated += 1;
    itemsUpdated += result.itemsUpdated;
  }

  return { menusUpdated, itemsUpdated };
}
