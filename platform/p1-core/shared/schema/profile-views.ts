import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, text, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";
import { therapistProfiles } from "./therapist-profiles";

export const profileViews = pgTable(
  "profile_views",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    profileId: varchar("profile_id")
      .notNull()
      .references(() => therapistProfiles.id),
    viewerId: varchar("viewer_id").references(() => users.id),
    source: text("source"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_pv_profile_id").on(table.profileId),
    index("idx_pv_profile_date").on(table.profileId, table.createdAt),
    index("idx_pv_viewer_id").on(table.viewerId),
  ],
);

export const insertProfileViewSchema = createInsertSchema(profileViews).omit({
  id: true,
  createdAt: true,
});

export type InsertProfileView = z.infer<typeof insertProfileViewSchema>;
export type ProfileView = typeof profileViews.$inferSelect;
