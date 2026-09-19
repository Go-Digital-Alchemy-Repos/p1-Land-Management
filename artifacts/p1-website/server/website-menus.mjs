import path from "node:path";
import { createPublicSettingsStore } from "./public-settings.mjs";

export const menuLocations = [
  "main_navigation",
  "p1_footer_services",
  "p1_footer_service_areas",
  "p1_footer_company",
];
const object = (value) =>
  value && typeof value === "object" && !Array.isArray(value);
const text = (value, max) =>
  typeof value === "string" &&
  value.length <= max &&
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
const identifier = (value) =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(value);
const exactKeys = (value, keys) =>
  object(value) && Object.keys(value).sort().join() === [...keys].sort().join();
// Mirror shared/public-menus.ts: this server module runs directly without a TS loader.
export function safeMenuDestination(value) {
  if (typeof value !== "string" || !value || value.length > 2048) return false;
  if (/[\\\u0000-\u0020\u007f]/.test(value)) return false;
  try {
    if (/[\\\u0000-\u001f\u007f]/.test(decodeURIComponent(value))) return false;
    if (/^#[A-Za-z0-9_-]+$/.test(value) || value === "#") return true;
    if (
      /^mailto:[A-Za-z0-9.!#$&*+_=-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)
    )
      return true;
    if (/^tel:\+?[0-9()-]{3,30}$/.test(value)) return true;
    const url = new URL(value, "https://www.p1landmanagement.com");
    if (value.startsWith("/"))
      return (
        !value.startsWith("//") &&
        url.origin === "https://www.p1landmanagement.com"
      );
    return (
      /^https?:\/\//.test(value) &&
      ["http:", "https:"].includes(url.protocol) &&
      !!url.hostname &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function parseSlot(value) {
  if (value === null) return null;
  if (
    !exactKeys(value, ["id", "version", "items"]) ||
    !identifier(value.id) ||
    !Number.isSafeInteger(value.version) ||
    value.version < 1 ||
    !Array.isArray(value.items) ||
    Buffer.byteLength(JSON.stringify(value)) > 65536
  )
    throw Error("Invalid menu");
  const ids = new Set();
  let count = 0;
  function items(rows, depth) {
    if (!Array.isArray(rows) || (depth > 3 && rows.length))
      throw Error("Invalid menu depth");
    return rows.map((row) => {
      if (
        ++count > 200 ||
        !exactKeys(row, [
          "id",
          "label",
          "url",
          "openInNewTab",
          "action",
          "formSlug",
          "modalTitle",
          "modalDescription",
          "children",
        ]) ||
        !identifier(row.id) ||
        ids.has(row.id) ||
        !text(row.label, 300) ||
        !row.label.trim() ||
        typeof row.openInNewTab !== "boolean" ||
        !safeMenuDestination(row.url)
      )
        throw Error("Invalid menu item");
      ids.add(row.id);
      if (!["internal-link", "custom-link", "form-modal"].includes(row.action))
        throw Error("Invalid menu action");
      if (row.action === "form-modal") {
        if (!identifier(row.formSlug) || row.url !== "#" || row.openInNewTab)
          throw Error("Invalid modal");
        for (const [key, max] of [
          ["modalTitle", 300],
          ["modalDescription", 2000],
        ])
          if (row[key] !== null && !text(row[key], max))
            throw Error("Invalid modal text");
      } else if (
        row.formSlug !== null ||
        row.modalTitle !== null ||
        row.modalDescription !== null
      )
        throw Error("Unexpected form fields");
      return {
        id: row.id,
        label: row.label,
        url: row.url,
        openInNewTab: row.openInNewTab,
        action: row.action,
        formSlug: row.formSlug,
        modalTitle: row.modalTitle,
        modalDescription: row.modalDescription,
        children: items(row.children, depth + 1),
      };
    });
  }
  return { id: value.id, version: value.version, items: items(value.items, 1) };
}
export function parseWebsiteMenus(data) {
  if (
    !exactKeys(data, ["schemaVersion", "stackId", "revision", "locations"]) ||
    Buffer.byteLength(JSON.stringify(data)) > 270336 ||
    data.schemaVersion !== 1 ||
    data.stackId !== "p1-land-management" ||
    typeof data.revision !== "string" ||
    !/^[a-f0-9]{64}$/.test(data.revision) ||
    !object(data.locations) ||
    Object.keys(data.locations).sort().join() !==
      [...menuLocations].sort().join()
  )
    throw Error("Invalid menu projection");
  const locations = Object.fromEntries(
    menuLocations.map((key) => {
      try {
        return [key, parseSlot(data.locations[key])];
      } catch {
        return [key, null];
      }
    }),
  );
  return {
    schemaVersion: 1,
    stackId: "p1-land-management",
    revision: data.revision,
    locations,
  };
}
export function createWebsiteMenuStore({ cacheDir, ...options }) {
  return createPublicSettingsStore({
    ...options,
    path: "/api/p1/website-menus",
    parse: parseWebsiteMenus,
    fallback: () => null,
    maxBytes: 270336,
    preserveLastValid: true,
    cacheFile: cacheDir ? path.join(cacheDir, "website-menus.json") : undefined,
  });
}
