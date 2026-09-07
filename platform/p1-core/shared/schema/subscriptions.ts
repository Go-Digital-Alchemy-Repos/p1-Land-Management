import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";
import { membershipTiers } from "./membership-tiers";

export const therapistSubscriptions = pgTable(
  "therapist_subscriptions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    therapistId: varchar("therapist_id")
      .notNull()
      .references(() => users.id),
    tierId: varchar("tier_id").references(() => membershipTiers.id),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    lastFailedInvoiceId: text("last_failed_invoice_id"),
    status: text("status").notNull().default("inactive"),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    customPrice: integer("custom_price"),
    applicationFeeCreditAmount: integer("application_fee_credit_amount"),
    applicationFeeCreditAppliedAt: timestamp("application_fee_credit_applied_at"),
    renewalReminderSentForPeriodEnd: timestamp("renewal_reminder_sent_for_period_end"),
    lastPaymentFailedAt: timestamp("last_payment_failed_at"),
    paymentFailureNoticeSentAt: timestamp("payment_failure_notice_sent_at"),
    gracePeriodEndsAt: timestamp("grace_period_ends_at"),
    suspendedAt: timestamp("suspended_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_sub_therapist_id").on(table.therapistId),
    index("idx_sub_stripe_sub_id").on(table.stripeSubscriptionId),
    index("idx_sub_status").on(table.status),
  ],
);

export const insertSubscriptionSchema = createInsertSchema(therapistSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type TherapistSubscription = typeof therapistSubscriptions.$inferSelect;
