import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { cmsPages } from "./cms-pages";
import { users } from "./users";

export const cmsPageRevisions = pgTable(
  "cms_page_revisions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    pageId: varchar("page_id")
      .notNull()
      .references(() => cmsPages.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: jsonb("content").default({}),
    status: text("status").notNull(),
    changedBy: varchar("changed_by").references(() => users.id, { onDelete: "set null" }),
    changeNote: text("change_note"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_cms_page_revisions_page_id").on(table.pageId)],
);

export const insertCmsPageRevisionSchema = createInsertSchema(cmsPageRevisions).omit({
  id: true,
  createdAt: true,
});

export type InsertCmsPageRevision = z.infer<typeof insertCmsPageRevisionSchema>;
export type CmsPageRevision = typeof cmsPageRevisions.$inferSelect;
