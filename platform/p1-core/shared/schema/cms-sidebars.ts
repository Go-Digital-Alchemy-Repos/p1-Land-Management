import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const SIDEBAR_WIDGET_TYPES = [
  "recent-posts",
  "newsletter",
  "form",
  "callout",
  "search",
  "categories",
  "tag-cloud",
  "custom-html",
] as const;

export type SidebarWidgetType = (typeof SIDEBAR_WIDGET_TYPES)[number];

export interface SidebarWidget {
  id: string;
  type: SidebarWidgetType;
  title: string;
  settings: Record<string, unknown>;
}

export const sidebarWidgetSchema = z.object({
  id: z.string().min(1),
  type: z.enum(SIDEBAR_WIDGET_TYPES),
  title: z.string().default(""),
  settings: z.record(z.unknown()).default({}),
});

export const cmsSidebars = pgTable(
  "cms_sidebars",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    description: text("description"),
    isDefault: boolean("is_default").default(false),
    widgets: jsonb("widgets").default([]),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_cms_sidebars_default").on(table.isDefault),
    index("idx_cms_sidebars_updated_at").on(table.updatedAt),
  ],
);

export const insertCmsSidebarSchema = createInsertSchema(cmsSidebars).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCmsSidebar = z.infer<typeof insertCmsSidebarSchema>;
export type CmsSidebar = typeof cmsSidebars.$inferSelect;
