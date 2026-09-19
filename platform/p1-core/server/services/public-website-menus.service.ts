import { createHash } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { cmsMenus, cmsPages, cmsForms } from "@shared/schema";
import { loadConfiguredClientSiteManifest } from "./client-site-content.service";
import {
  PUBLIC_WEBSITE_MENU_LOCATIONS,
  MAX_PUBLIC_MENU_DEPTH,
  MAX_PUBLIC_MENU_ITEMS,
  MAX_PUBLIC_MENU_SLOT_BYTES,
  MAX_PUBLIC_MENU_BYTES,
  PUBLIC_MENU_STRING_LIMITS,
  isSafePublicMenuUrl,
  type PublicWebsiteMenuItem,
  type PublicWebsiteMenus,
} from "../../shared/public-menus";

type StoredMenu = { id: string; version: number; location: string; items: unknown };
type PublicPage = { id: string; status: string; title: string; slug: string };
type EligibleForm = { slug: string; isActive: boolean | null; kind: string | null };
type SourceItem = PublicWebsiteMenuItem & { pageId: string | null; labelSource: string | null };
const identifier = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(value);
const plain = (value: unknown, max: number, required = false): value is string =>
  typeof value === "string" &&
  value.length <= max &&
  (!required || !!value.trim()) &&
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
function parseItems(input: unknown): SourceItem[] {
  let count = 0;
  const seen = new Set<string>();
  function items(value: unknown, depth: number): SourceItem[] {
    if (!Array.isArray(value) || (value.length && depth > MAX_PUBLIC_MENU_DEPTH))
      throw Error("Invalid menu depth");
    return value.map((raw) => {
      if (++count > MAX_PUBLIC_MENU_ITEMS || !raw || typeof raw !== "object" || Array.isArray(raw))
        throw Error("Invalid menu item");
      const item = raw as Record<string, unknown>;
      if (
        !identifier(item.id) ||
        seen.has(item.id) ||
        !plain(item.label, PUBLIC_MENU_STRING_LIMITS.label, true)
      )
        throw Error("Invalid menu identity");
      seen.add(item.id);
      const pageId = item.pageId == null ? null : item.pageId;
      if (pageId !== null && !identifier(pageId)) throw Error("Invalid page reference");
      const action =
        item.action ?? (item.formSlug ? "form-modal" : pageId ? "internal-link" : "custom-link");
      if (!["internal-link", "custom-link", "form-modal"].includes(String(action)))
        throw Error("Invalid menu action");
      if (item.openInNewTab != null && typeof item.openInNewTab !== "boolean")
        throw Error("Invalid target");
      if (item.labelSource != null && !["page", "custom"].includes(String(item.labelSource)))
        throw Error("Invalid label source");
      const formSlug = item.formSlug == null ? null : item.formSlug;
      if (formSlug !== null && !identifier(formSlug)) throw Error("Invalid form reference");
      const modalTitle = item.modalTitle == null ? null : item.modalTitle;
      const modalDescription = item.modalDescription == null ? null : item.modalDescription;
      if (modalTitle !== null && !plain(modalTitle, PUBLIC_MENU_STRING_LIMITS.modalTitle))
        throw Error("Invalid modal title");
      if (
        modalDescription !== null &&
        !plain(modalDescription, PUBLIC_MENU_STRING_LIMITS.modalDescription)
      )
        throw Error("Invalid modal description");
      if (!plain(item.url, PUBLIC_MENU_STRING_LIMITS.url, true)) throw Error("Invalid destination");
      return {
        id: item.id,
        label: item.label,
        url: item.url,
        action: action as SourceItem["action"],
        openInNewTab: item.openInNewTab === true,
        pageId,
        labelSource: (item.labelSource as string) ?? null,
        formSlug,
        modalTitle,
        modalDescription,
        children: items(item.children ?? [], depth + 1),
      };
    });
  }
  return items(input, 1);
}
function parseSlot(menus: StoredMenu[], location: string) {
  const assigned = menus.filter((menu) => menu.location === location);
  if (assigned.length !== 1) return null;
  const menu = assigned[0];
  try {
    if (
      !identifier(menu.id) ||
      !Number.isSafeInteger(menu.version) ||
      menu.version < 1 ||
      Buffer.byteLength(JSON.stringify(menu.items) ?? "") > MAX_PUBLIC_MENU_SLOT_BYTES
    )
      return null;
    return { id: menu.id, version: menu.version, items: parseItems(menu.items) };
  } catch {
    return null;
  }
}
/** Pure projection: metadata from hidden/unroutable references never enters the result. */
export function projectPublicWebsiteMenus(
  menus: StoredMenu[],
  pages: PublicPage[],
  forms: EligibleForm[],
  routePaths: readonly string[],
): PublicWebsiteMenus {
  const routes = new Set(routePaths);
  const published = new Map(
    pages.filter((page) => page.status === "published").map((page) => [page.id, page]),
  );
  const eligible = new Set(
    forms.filter((form) => form.isActive && form.kind !== "application").map((form) => form.slug),
  );
  function project(items: SourceItem[]): PublicWebsiteMenuItem[] {
    return items.flatMap((item) => {
      let url = item.url,
        label = item.label;
      if (item.pageId) {
        const page = published.get(item.pageId);
        if (!page) return [];
        url = `/${page.slug.replace(/^\/+|\/+$/g, "")}`;
        if (!routes.has(url) || !isSafePublicMenuUrl(url)) return [];
        if (item.labelSource === "page") label = page.title;
        if (!plain(label, PUBLIC_MENU_STRING_LIMITS.label, true)) return [];
      }
      if (item.action === "form-modal") {
        if (!item.formSlug || !eligible.has(item.formSlug)) return [];
        url = "#";
      } else if (!isSafePublicMenuUrl(url)) throw Error("Unsafe menu destination");
      return [
        {
          id: item.id,
          label,
          url,
          openInNewTab: item.action === "form-modal" ? false : item.openInNewTab,
          action: item.pageId && item.action !== "form-modal" ? "internal-link" : item.action,
          formSlug: item.action === "form-modal" ? item.formSlug : null,
          modalTitle: item.action === "form-modal" ? item.modalTitle : null,
          modalDescription: item.action === "form-modal" ? item.modalDescription : null,
          children: project(item.children as SourceItem[]),
        },
      ];
    });
  }
  const locations = Object.fromEntries(
    PUBLIC_WEBSITE_MENU_LOCATIONS.map((location) => {
      const slot = parseSlot(menus, location);
      if (!slot) return [location, null];
      try {
        const value = { ...slot, items: project(slot.items) };
        return [
          location,
          Buffer.byteLength(JSON.stringify(value)) <= MAX_PUBLIC_MENU_SLOT_BYTES ? value : null,
        ];
      } catch {
        return [location, null];
      }
    }),
  ) as PublicWebsiteMenus["locations"];
  const result: PublicWebsiteMenus = {
    schemaVersion: 1,
    stackId: "p1-land-management",
    revision: createHash("sha256").update(JSON.stringify(locations)).digest("hex"),
    locations,
  };
  if (Buffer.byteLength(JSON.stringify(result)) > MAX_PUBLIC_MENU_BYTES)
    throw Error("Oversized public menus");
  return result;
}

export async function getPublicWebsiteMenus(): Promise<PublicWebsiteMenus> {
  const manifest = await loadConfiguredClientSiteManifest();
  if (
    manifest.client.stackId !== "p1-land-management" ||
    manifest.origins.publicSite !== "https://www.p1landmanagement.com"
  )
    throw Error("Unexpected website manifest");
  return db.transaction(
    async (tx) => {
      await tx.execute(sql`SET LOCAL statement_timeout = '5s'`);
      const menus: StoredMenu[] = [];
      for (const location of PUBLIC_WEBSITE_MENU_LOCATIONS) {
        menus.push(
          ...(await tx
            .select({
              id: cmsMenus.id,
              version: cmsMenus.version,
              location: cmsMenus.location,
              items: sql<unknown>`CASE WHEN octet_length(${cmsMenus.items}::text) <= ${MAX_PUBLIC_MENU_SLOT_BYTES} THEN ${cmsMenus.items} ELSE NULL END`,
            })
            .from(cmsMenus)
            .where(eq(cmsMenus.location, location))
            .limit(2)),
        );
      }
      const pageIds = new Set<string>(),
        formSlugs = new Set<string>();
      function collect(items: SourceItem[]) {
        for (const item of items) {
          if (item.pageId) pageIds.add(item.pageId);
          if (item.formSlug) formSlugs.add(item.formSlug);
          collect(item.children as SourceItem[]);
        }
      }
      for (const location of PUBLIC_WEBSITE_MENU_LOCATIONS) {
        const slot = parseSlot(menus, location);
        if (slot) collect(slot.items);
      }
      const pages = pageIds.size
        ? await tx
            .select({
              id: cmsPages.id,
              status: cmsPages.status,
              title: cmsPages.title,
              slug: cmsPages.slug,
            })
            .from(cmsPages)
            .where(and(inArray(cmsPages.id, [...pageIds]), eq(cmsPages.status, "published")))
        : [];
      const forms = formSlugs.size
        ? await tx
            .select({ slug: cmsForms.slug, isActive: cmsForms.isActive, kind: cmsForms.kind })
            .from(cmsForms)
            .where(and(inArray(cmsForms.slug, [...formSlugs]), eq(cmsForms.isActive, true)))
        : [];
      return projectPublicWebsiteMenus(
        menus,
        pages,
        forms,
        manifest.routes.map((route) => route.path),
      );
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
