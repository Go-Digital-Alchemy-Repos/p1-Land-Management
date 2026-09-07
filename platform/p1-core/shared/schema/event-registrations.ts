import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { events } from "./events";
import { users } from "./users";

export const eventRegistrations = pgTable(
  "event_registrations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    eventId: varchar("event_id")
      .notNull()
      .references(() => events.id),
    userId: varchar("user_id").references(() => users.id),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    status: text("status").notNull().default("confirmed"),
    paymentStatus: text("payment_status").default("not_required"),
    paymentIntentId: text("payment_intent_id"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    amountPaid: integer("amount_paid"),
    notes: text("notes"),
    attended: boolean("attended").default(false),
    checkedInAt: timestamp("checked_in_at"),
    registeredAt: timestamp("registered_at").defaultNow(),
    canceledAt: timestamp("canceled_at"),
    reminderSentAt: timestamp("reminder_sent_at"),
  },
  (table) => [
    index("idx_er_event_id").on(table.eventId),
    index("idx_er_user_id").on(table.userId),
    uniqueIndex("idx_er_event_user").on(table.eventId, table.userId),
    uniqueIndex("idx_er_event_email").on(table.eventId, table.email),
  ],
);

export const insertEventRegistrationSchema = createInsertSchema(eventRegistrations).omit({
  id: true,
  registeredAt: true,
  reminderSentAt: true,
});

export type InsertEventRegistration = z.infer<typeof insertEventRegistrationSchema>;
export type EventRegistration = typeof eventRegistrations.$inferSelect;
