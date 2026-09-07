import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    action: text("action").notNull(),
    details: text("details"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_activity_user_date").on(table.userId, table.createdAt)],
);

export type ActivityLog = typeof activityLogs.$inferSelect;
