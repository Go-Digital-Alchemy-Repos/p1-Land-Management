import { pgTable, serial, varchar, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    type: varchar("type", { length: 50 }).notNull().default("new_message"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    linkUrl: text("link_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_notif_user_date").on(table.userId, table.createdAt),
    index("idx_notif_user_unread").on(table.userId, table.isRead),
  ],
);

export const notificationPreferences = pgTable("notification_preferences", {
  userId: varchar("user_id", { length: 255 })
    .primaryKey()
    .references(() => users.id),
  emailNewMessage: boolean("email_new_message").notNull().default(true),
  inAppNewMessage: boolean("in_app_new_message").notNull().default(true),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
