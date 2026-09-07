import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

export const docs = pgTable("docs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull(),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").default(0),
  isPublished: boolean("is_published").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDocSchema = createInsertSchema(docs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDoc = z.infer<typeof insertDocSchema>;
export type Doc = typeof docs.$inferSelect;
