import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const EMAIL_TEMPLATE_MODULES = [
  "events",
  "ecommerce",
  "membership",
  "forms",
  "users",
  "directory",
  "crm",
  "system",
] as const;

export type EmailTemplateModule = (typeof EMAIL_TEMPLATE_MODULES)[number];

export const emailTemplates = pgTable("email_templates", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  module: text("module").notNull().default("system"),
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  description: text("description").notNull(),
  variables: text("variables").array().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  updatedAt: true,
});

export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
