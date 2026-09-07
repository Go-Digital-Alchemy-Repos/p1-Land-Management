import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";
import { therapistProfiles } from "./therapist-profiles";

export const savedProfessionals = pgTable(
  "saved_professionals",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    profileId: varchar("profile_id")
      .notNull()
      .references(() => therapistProfiles.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_sc_user_id").on(table.userId),
    index("idx_sc_profile_id").on(table.profileId),
    unique("uq_sc_user_profile").on(table.userId, table.profileId),
  ],
);

export const insertSavedProfessionalSchema = createInsertSchema(savedProfessionals).omit({
  id: true,
  createdAt: true,
});

export type InsertSavedProfessional = z.infer<typeof insertSavedProfessionalSchema>;
export type SavedProfessional = typeof savedProfessionals.$inferSelect;
