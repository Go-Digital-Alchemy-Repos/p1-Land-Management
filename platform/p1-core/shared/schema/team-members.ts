import { sql } from "drizzle-orm";
import { pgTable, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const teamMembers = pgTable(
  "team_members",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    role: text("role").notNull().default(""),
    biography: text("biography").notNull().default(""),
    excerpt: text("excerpt").notNull().default(""),
    photoUrl: text("photo_url").notNull().default(""),
    photoAlt: text("photo_alt").notNull().default(""),
    status: text("status").notNull().default("draft"),
    createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: varchar("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("idx_team_members_status").on(table.status)],
);
export type TeamMember = typeof teamMembers.$inferSelect;
