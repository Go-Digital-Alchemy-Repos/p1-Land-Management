import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

export const cmsSections = pgTable(
  "cms_sections",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").default("general"),
    blocks: jsonb("blocks")
      .notNull()
      .default(sql`'[]'::jsonb`),
    thumbnailUrl: text("thumbnail_url"),
    createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_cms_sections_category").on(table.category),
    index("idx_cms_sections_created_at").on(table.createdAt),
  ],
);

export const insertCmsSectionSchema = createInsertSchema(cmsSections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCmsSection = z.infer<typeof insertCmsSectionSchema>;
export type CmsSection = typeof cmsSections.$inferSelect;
