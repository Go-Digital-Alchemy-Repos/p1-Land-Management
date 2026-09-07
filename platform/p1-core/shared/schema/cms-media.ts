import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

export const cmsMedia = pgTable(
  "cms_media",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    filename: text("filename").notNull(),
    originalName: text("original_name").notNull(),
    title: text("title"),
    url: text("url").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    r2Key: text("r2_key"),
    alt: text("alt"),
    caption: text("caption"),
    description: text("description"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    ogTitle: text("og_title"),
    ogDescription: text("og_description"),
    uploadedBy: varchar("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_cms_media_created_at").on(table.createdAt)],
);

export const insertCmsMediaSchema = createInsertSchema(cmsMedia).omit({
  id: true,
  createdAt: true,
});

export type InsertCmsMedia = z.infer<typeof insertCmsMediaSchema>;
export type CmsMediaAsset = typeof cmsMedia.$inferSelect;

export type CmsMediaUsageEntityType =
  | "page"
  | "blog_post"
  | "event"
  | "global_seo"
  | "directory_profile"
  | "cms_gallery"
  | "team_member"
  | "branding"
  | "ecommerce_product"
  | "ecommerce_category"
  | "portfolio_project";
export type CmsMediaAssetKind = "image" | "document";

export interface CmsMediaUsageReference {
  entityType: CmsMediaUsageEntityType;
  entityId: string;
  entityName: string;
  field: string;
  path?: string;
  statusLabel: string;
  isLive: boolean;
}

export interface CmsMediaLibraryAsset extends CmsMediaAsset {
  assetKind: CmsMediaAssetKind;
  usageRefs: CmsMediaUsageReference[];
  usageCount: number;
  liveUsageCount: number;
  isInUse: boolean;
}
