import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, index, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    excerpt: text("excerpt"),
    content: text("content").notNull(),
    coverImageUrl: text("cover_image_url"),
    coverImagePositionX: integer("cover_image_position_x").default(50),
    coverImagePositionY: integer("cover_image_position_y").default(50),
    authorName: text("author_name").notNull(),
    category: varchar("category", { length: 100 }),
    categories: text("categories").array(),
    tags: text("tags").array(),
    postType: text("post_type").default("article"),
    podcastUrl: text("podcast_url"),
    externalUrl: text("external_url"),
    sidebarId: varchar("sidebar_id"),
    isPublished: boolean("is_published").default(false),
    scheduledAt: timestamp("scheduled_at"),
    publishedAt: timestamp("published_at"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    ogImageUrl: text("og_image_url"),
    noindex: boolean("noindex").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_blog_posts_slug").on(table.slug),
    index("idx_blog_posts_published").on(table.isPublished, table.publishedAt),
  ],
);

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
