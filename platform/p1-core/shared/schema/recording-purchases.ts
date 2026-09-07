import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { events } from "./events";
import { users } from "./users";

export const recordingPurchases = pgTable(
  "recording_purchases",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    eventId: varchar("event_id")
      .notNull()
      .references(() => events.id),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    amountPaid: integer("amount_paid"),
    purchasedAt: timestamp("purchased_at").defaultNow(),
  },
  (table) => [
    index("idx_rp_event_id").on(table.eventId),
    index("idx_rp_user_id").on(table.userId),
    uniqueIndex("idx_rp_event_user").on(table.eventId, table.userId),
  ],
);

export const insertRecordingPurchaseSchema = createInsertSchema(recordingPurchases).omit({
  id: true,
  purchasedAt: true,
});

export type InsertRecordingPurchase = z.infer<typeof insertRecordingPurchaseSchema>;
export type RecordingPurchase = typeof recordingPurchases.$inferSelect;
