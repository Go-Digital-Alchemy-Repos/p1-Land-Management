import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const specializations = pgTable("specializations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSpecializationSchema = createInsertSchema(specializations).omit({
  id: true,
  createdAt: true,
});
export type InsertSpecialization = z.infer<typeof insertSpecializationSchema>;
export type Specialization = typeof specializations.$inferSelect;
