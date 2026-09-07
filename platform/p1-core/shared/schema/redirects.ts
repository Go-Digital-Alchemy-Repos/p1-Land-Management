import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const redirects = pgTable("redirects", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  fromPath: text("from_path").notNull(),
  toPath: text("to_path").notNull(),
  statusCode: integer("status_code").notNull().default(301),
  isActive: boolean("is_active").notNull().default(true),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRedirectSchema = createInsertSchema(redirects)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    fromPath: z.string().min(1).startsWith("/"),
    toPath: z.string().min(1),
    statusCode: z.union([z.literal(301), z.literal(302)]).default(301),
  });

export type InsertRedirect = z.infer<typeof insertRedirectSchema>;
export type Redirect = typeof redirects.$inferSelect;
