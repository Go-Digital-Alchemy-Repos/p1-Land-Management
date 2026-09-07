import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, index, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable(
  "users",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    role: text("role").notNull().default("therapist"),
    adminPermissions: jsonb("admin_permissions")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    formNotificationFormIds: jsonb("form_notification_form_ids")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    profileImageUrl: text("profile_image_url"),
    isSuspended: boolean("is_suspended").notNull().default(false),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("idx_users_role").on(table.role)],
);

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
