import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

export const guestMessages = pgTable(
  "guest_messages",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    professionalId: varchar("professional_id")
      .notNull()
      .references(() => users.id),
    senderName: text("sender_name"),
    contactMethod: text("contact_method").notNull(),
    contactValue: text("contact_value").notNull(),
    message: text("message").notNull(),
    ageAcknowledged: boolean("age_acknowledged").notNull().default(false),
    phiAcknowledged: boolean("phi_acknowledged").notNull().default(false),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_guest_msg_counselor").on(table.professionalId),
    index("idx_guest_msg_read").on(table.professionalId, table.isRead),
    index("idx_guest_msg_created").on(table.createdAt),
  ],
);

export const insertGuestMessageSchema = createInsertSchema(guestMessages).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

export type InsertGuestMessage = z.infer<typeof insertGuestMessageSchema>;
export type GuestMessage = typeof guestMessages.$inferSelect;
