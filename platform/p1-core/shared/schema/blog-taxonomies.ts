import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const BLOG_TAXONOMY_TYPES = ["category", "tag"] as const;

export const blogTaxonomies = pgTable(
  "blog_taxonomies",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    type: text("type").$type<(typeof BLOG_TAXONOMY_TYPES)[number]>().notNull(),
    parentId: varchar("parent_id"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_blog_taxonomies_type_slug_unique").on(table.type, table.slug),
    index("idx_blog_taxonomies_type").on(table.type),
    index("idx_blog_taxonomies_parent").on(table.parentId),
  ],
);

export const insertBlogTaxonomySchema = createInsertSchema(blogTaxonomies)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    type: z.enum(BLOG_TAXONOMY_TYPES),
  });

export type InsertBlogTaxonomy = z.infer<typeof insertBlogTaxonomySchema>;
export type BlogTaxonomy = typeof blogTaxonomies.$inferSelect;
