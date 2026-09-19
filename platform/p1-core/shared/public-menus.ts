/** Public rendering contract only; no database or Node runtime dependencies. */
export const PUBLIC_WEBSITE_MENU_LOCATIONS = [
  "main_navigation",
  "p1_footer_services",
  "p1_footer_service_areas",
  "p1_footer_company",
] as const;
export type PublicWebsiteMenuLocation = (typeof PUBLIC_WEBSITE_MENU_LOCATIONS)[number];
export const MAX_PUBLIC_MENU_DEPTH = 3;
export const MAX_PUBLIC_MENU_ITEMS = 200;
export const MAX_PUBLIC_MENU_SLOT_BYTES = 65536;
export const MAX_PUBLIC_MENU_BYTES = 270336;
export const PUBLIC_MENU_STRING_LIMITS = {
  id: 200,
  label: 300,
  url: 2048,
  formSlug: 200,
  modalTitle: 300,
  modalDescription: 2000,
} as const;
export interface PublicWebsiteMenuItem {
  id: string;
  label: string;
  url: string;
  openInNewTab: boolean;
  action: "internal-link" | "custom-link" | "form-modal";
  formSlug: string | null;
  modalTitle: string | null;
  modalDescription: string | null;
  children: PublicWebsiteMenuItem[];
}
export interface PublicWebsiteMenu {
  id: string;
  version: number;
  items: PublicWebsiteMenuItem[];
}
export interface PublicWebsiteMenus {
  schemaVersion: 1;
  stackId: "p1-land-management";
  revision: string;
  locations: Record<PublicWebsiteMenuLocation, PublicWebsiteMenu | null>;
}
/** Reject browser normalization tricks before parsing, including encoded controls. */
export function isSafePublicMenuUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.length > PUBLIC_MENU_STRING_LIMITS.url)
    return false;
  if (/[\\\u0000-\u0020\u007f]/.test(value)) return false;
  try {
    if (/[\\\u0000-\u001f\u007f]/.test(decodeURIComponent(value))) return false;
    if (/^#[A-Za-z0-9_-]+$/.test(value) || value === "#") return true;
    if (/^mailto:[A-Za-z0-9.!#$&*+_=-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)) return true;
    if (/^tel:\+?[0-9()-]{3,30}$/.test(value)) return true;
    const url = new URL(value, "https://www.p1landmanagement.com");
    if (value.startsWith("/"))
      return !value.startsWith("//") && url.origin === "https://www.p1landmanagement.com";
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
