import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";
import { cmsMedia } from "./cms-media";

export const CMS_GALLERY_STATUSES = ["draft", "published", "archived"] as const;
export const CMS_GALLERY_LAYOUTS = ["grid", "masonry", "carousel", "slider", "featured"] as const;

export const cmsGalleries = pgTable(
  "cms_galleries",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    status: text("status").notNull().default("draft"),
    layout: text("layout").notNull().default("grid"),
    settings: jsonb("settings")
      .$type<CmsGallerySettings>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: varchar("updated_by").references(() => users.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_cms_galleries_slug").on(table.slug),
    index("idx_cms_galleries_status").on(table.status),
    index("idx_cms_galleries_updated_at").on(table.updatedAt),
  ],
);

export const cmsGalleryItems = pgTable(
  "cms_gallery_items",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    galleryId: varchar("gallery_id")
      .notNull()
      .references(() => cmsGalleries.id, { onDelete: "cascade" }),
    mediaId: varchar("media_id").references(() => cmsMedia.id, { onDelete: "set null" }),
    imageUrl: text("image_url").notNull(),
    alt: text("alt"),
    title: text("title"),
    caption: text("caption"),
    linkUrl: text("link_url"),
    ctaText: text("cta_text"),
    tags: text("tags").array(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_cms_gallery_items_gallery_id").on(table.galleryId),
    index("idx_cms_gallery_items_media_id").on(table.mediaId),
  ],
);

export const cmsGallerySettingsSchema = z.object({
  columnsDesktop: z.number().int().min(1).max(6).default(3),
  columnsTablet: z.number().int().min(1).max(4).default(2),
  columnsMobile: z.number().int().min(1).max(2).default(1),
  spacing: z.enum(["none", "sm", "md", "lg"]).default("md"),
  imageRatio: z.enum(["auto", "1/1", "4/3", "3/2", "16/9"]).default("4/3"),
  cropMode: z.enum(["cover", "contain"]).default("cover"),
  borderRadius: z.enum(["none", "sm", "md", "lg"]).default("md"),
  transitionEffect: z.enum(["none", "fade", "slide", "zoom"]).default("none"),
  arrowIconColor: z.string().max(32).default("#ffffff"),
  arrowBackgroundColor: z.string().max(32).default("#6b7280"),
  showTitle: z.boolean().default(true),
  showCaptions: z.boolean().default(true),
  captionPosition: z.enum(["below", "overlay"]).default("below"),
  lightbox: z.boolean().default(true),
  hoverEffect: z.enum(["none", "zoom", "fade"]).default("zoom"),
  maxImages: z.number().int().min(0).max(200).default(0),
  customClassName: z.string().max(120).optional().default(""),
});

export type CmsGallerySettings = z.infer<typeof cmsGallerySettingsSchema>;

export const insertCmsGallerySchema = createInsertSchema(cmsGalleries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCmsGalleryItemSchema = createInsertSchema(cmsGalleryItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCmsGallery = typeof cmsGalleries.$inferInsert;
export type InsertCmsGalleryItem = typeof cmsGalleryItems.$inferInsert;
export type CmsGallery = typeof cmsGalleries.$inferSelect;
export type CmsGalleryItem = typeof cmsGalleryItems.$inferSelect;
export type CmsGalleryStatus = (typeof CMS_GALLERY_STATUSES)[number];
export type CmsGalleryLayout = (typeof CMS_GALLERY_LAYOUTS)[number];
export type CmsGalleryWithItems = CmsGallery & {
  items: CmsGalleryItem[];
  imageCount: number;
  authorName?: string | null;
};
