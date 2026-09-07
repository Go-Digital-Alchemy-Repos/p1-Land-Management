import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

export const cmsPages = pgTable(
  "cms_pages",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    status: text("status").notNull().default("draft"),
    pageType: text("page_type").notNull().default("custom"),
    template: text("template").notNull().default("full-width"),
    sidebarId: varchar("sidebar_id"),
    content: jsonb("content").default({}),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    seoKeywords: text("seo_keywords"),
    ogImageUrl: text("og_image_url"),
    canonicalUrl: text("canonical_url"),
    noindex: boolean("noindex").default(false),
    createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: varchar("updated_by").references(() => users.id, { onDelete: "set null" }),
    scheduledAt: timestamp("scheduled_at"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_cms_pages_slug").on(table.slug),
    index("idx_cms_pages_status").on(table.status),
  ],
);

export const insertCmsPageSchema = createInsertSchema(cmsPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCmsPage = z.infer<typeof insertCmsPageSchema>;
export type CmsPage = typeof cmsPages.$inferSelect;
