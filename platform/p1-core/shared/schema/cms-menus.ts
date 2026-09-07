import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const STANDARD_MENU_LOCATIONS = [
  "main_navigation",
  "footer_platform",
  "footer_professionals",
  "footer_resources",
  "footer_company",
  "footer_legal",
] as const;

export const LEGACY_MENU_LOCATIONS = ["header", "footer"] as const;

export const MENU_LOCATIONS = [
  ...STANDARD_MENU_LOCATIONS,
  ...LEGACY_MENU_LOCATIONS,
  "unassigned",
] as const;

export type StandardMenuLocation = (typeof STANDARD_MENU_LOCATIONS)[number];
export type LegacyMenuLocation = (typeof LEGACY_MENU_LOCATIONS)[number];
export type MenuLocation = (typeof MENU_LOCATIONS)[number];

export const MENU_LOCATION_LABELS: Record<MenuLocation, string> = {
  main_navigation: "Main Navigation",
  footer_platform: "Footer Platform Column",
  footer_professionals: "Footer Professionals Column",
  footer_resources: "Footer Resources Column",
  footer_company: "Footer Company Column",
  footer_legal: "Footer Legal Links",
  header: "Header (Legacy)",
  footer: "Footer (Legacy)",
  unassigned: "Unassigned",
};

export const PUBLIC_MENU_LOCATIONS = [
  ...STANDARD_MENU_LOCATIONS,
  ...LEGACY_MENU_LOCATIONS,
] as const;

export type PublicMenuLocation = (typeof PUBLIC_MENU_LOCATIONS)[number];

export interface MenuItem {
  id: string;
  label: string;
  url: string;
  openInNewTab: boolean;
  action?: "internal-link" | "custom-link" | "form-modal";
  pageId?: string | null;
  labelSource?: "page" | "custom";
  formSlug?: string | null;
  modalTitle?: string | null;
  modalDescription?: string | null;
  children: MenuItem[];
}

export const menuItemSchema: z.ZodType<MenuItem> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string().min(1),
    url: z.string().min(1),
    openInNewTab: z.preprocess((v) => v ?? false, z.boolean()),
    action: z.enum(["internal-link", "custom-link", "form-modal"]).optional(),
    pageId: z.string().nullable().optional(),
    labelSource: z.enum(["page", "custom"]).optional(),
    formSlug: z.string().nullable().optional(),
    modalTitle: z.string().nullable().optional(),
    modalDescription: z.string().nullable().optional(),
    children: z.preprocess((v) => v ?? [], z.array(menuItemSchema)),
  }),
) as z.ZodType<MenuItem>;

export const cmsMenus = pgTable("cms_menus", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location: text("location").notNull().default("unassigned"),
  items: jsonb("items").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCmsMenuSchema = createInsertSchema(cmsMenus).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCmsMenu = z.infer<typeof insertCmsMenuSchema>;
export type CmsMenu = typeof cmsMenus.$inferSelect;
