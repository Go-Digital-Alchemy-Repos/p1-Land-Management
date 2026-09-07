import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

export const MEMBERSHIP_SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
  "suspended",
  "manual",
  "incomplete",
] as const;

export const MEMBERSHIP_ACCESS_LEVELS = [
  "public",
  "logged_in",
  "any_member",
  "plans",
  "entitlements",
] as const;

export const membershipPlans = pgTable(
  "membership_plans",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    status: text("status").notNull().default("draft"),
    visibility: text("visibility").notNull().default("public"),
    sortOrder: integer("sort_order").notNull().default(0),
    trialDays: integer("trial_days").notNull().default(0),
    isFree: boolean("is_free").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_membership_plans_slug").on(table.slug),
    index("idx_membership_plans_status").on(table.status),
  ],
);

export const membershipPlanPrices = pgTable(
  "membership_plan_prices",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    planId: varchar("plan_id")
      .notNull()
      .references(() => membershipPlans.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    interval: text("interval").notNull().default("month"),
    amount: integer("amount").notNull().default(0),
    currency: text("currency").notNull().default("usd"),
    stripePriceId: text("stripe_price_id"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_membership_plan_prices_plan").on(table.planId),
    index("idx_membership_plan_prices_stripe").on(table.stripePriceId),
  ],
);

export const membershipPlanEntitlements = pgTable(
  "membership_plan_entitlements",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    planId: varchar("plan_id")
      .notNull()
      .references(() => membershipPlans.id, { onDelete: "cascade" }),
    entitlement: text("entitlement").notNull(),
    label: text("label"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_membership_plan_entitlements_unique").on(table.planId, table.entitlement),
    index("idx_membership_plan_entitlements_plan").on(table.planId),
  ],
);

export const membershipSubscriptions = pgTable(
  "membership_subscriptions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: varchar("plan_id").references(() => membershipPlans.id, { onDelete: "set null" }),
    priceId: varchar("price_id").references(() => membershipPlanPrices.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("incomplete"),
    source: text("source").notNull().default("manual"),
    provider: text("provider"),
    providerCustomerId: text("provider_customer_id"),
    providerSubscriptionId: text("provider_subscription_id"),
    providerCheckoutSessionId: text("provider_checkout_session_id"),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    trialEndsAt: timestamp("trial_ends_at"),
    canceledAt: timestamp("canceled_at"),
    suspendedAt: timestamp("suspended_at"),
    expiresAt: timestamp("expires_at"),
    lastPaymentFailedAt: timestamp("last_payment_failed_at"),
    adminNotes: text("admin_notes"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_membership_subscriptions_user").on(table.userId),
    index("idx_membership_subscriptions_plan").on(table.planId),
    index("idx_membership_subscriptions_status").on(table.status),
    index("idx_membership_subscriptions_provider_customer").on(table.providerCustomerId),
    index("idx_membership_subscriptions_provider_subscription").on(table.providerSubscriptionId),
  ],
);

export const membershipAccessRules = pgTable(
  "membership_access_rules",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    resourceType: text("resource_type").notNull(),
    resourceId: varchar("resource_id").notNull(),
    accessLevel: text("access_level").notNull().default("public"),
    planIds: jsonb("plan_ids")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    entitlements: jsonb("entitlements")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    teaser: text("teaser"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_membership_access_rules_resource").on(table.resourceType, table.resourceId),
    index("idx_membership_access_rules_type").on(table.resourceType),
  ],
);

export const membershipProcessedWebhookEvents = pgTable(
  "membership_processed_webhook_events",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    status: text("status").notNull().default("processing"),
    attemptCount: integer("attempt_count").notNull().default(1),
    processingToken: varchar("processing_token"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
    lastError: text("last_error"),
    processedAt: timestamp("processed_at"),
  },
  (table) => [
    uniqueIndex("idx_membership_webhook_provider_event").on(table.provider, table.eventId),
    index("idx_membership_webhook_status_started").on(table.status, table.startedAt),
  ],
);

export const membershipAuditEvents = pgTable(
  "membership_audit_events",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
    actorUserId: varchar("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    subscriptionId: varchar("subscription_id").references(() => membershipSubscriptions.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    note: text("note"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_membership_audit_user").on(table.userId),
    index("idx_membership_audit_subscription").on(table.subscriptionId),
  ],
);

export const insertMembershipPlanSchema = createInsertSchema(membershipPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertMembershipPlanPriceSchema = createInsertSchema(membershipPlanPrices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertMembershipPlanEntitlementSchema = createInsertSchema(
  membershipPlanEntitlements,
).omit({
  id: true,
  createdAt: true,
});
export const insertMembershipSubscriptionSchema = createInsertSchema(membershipSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertMembershipAccessRuleSchema = createInsertSchema(membershipAccessRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertMembershipAuditEventSchema = createInsertSchema(membershipAuditEvents).omit({
  id: true,
  createdAt: true,
});

export type MembershipSubscriptionStatus = (typeof MEMBERSHIP_SUBSCRIPTION_STATUSES)[number];
export type MembershipAccessLevel = (typeof MEMBERSHIP_ACCESS_LEVELS)[number];
export type MembershipPlan = typeof membershipPlans.$inferSelect;
export type InsertMembershipPlan = z.infer<typeof insertMembershipPlanSchema>;
export type MembershipPlanPrice = typeof membershipPlanPrices.$inferSelect;
export type InsertMembershipPlanPrice = z.infer<typeof insertMembershipPlanPriceSchema>;
export type MembershipPlanEntitlement = typeof membershipPlanEntitlements.$inferSelect;
export type InsertMembershipPlanEntitlement = z.infer<typeof insertMembershipPlanEntitlementSchema>;
export type MembershipSubscription = typeof membershipSubscriptions.$inferSelect;
export type InsertMembershipSubscription = z.infer<typeof insertMembershipSubscriptionSchema>;
export type MembershipAccessRule = typeof membershipAccessRules.$inferSelect;
export type InsertMembershipAccessRule = z.infer<typeof insertMembershipAccessRuleSchema>;
export type MembershipAuditEvent = typeof membershipAuditEvents.$inferSelect;
export type InsertMembershipAuditEvent = z.infer<typeof insertMembershipAuditEventSchema>;
