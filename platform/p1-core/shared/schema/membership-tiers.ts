import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const membershipTiers = pgTable("membership_tiers", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  monthlyPrice: integer("monthly_price").notNull(),
  annualPrice: integer("annual_price").notNull(),
  features: text("features").array(),
  isActive: boolean("is_active").default(true),
  stripePriceIdMonthly: text("stripe_price_id_monthly"),
  stripePriceIdAnnual: text("stripe_price_id_annual"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMembershipTierSchema = createInsertSchema(membershipTiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMembershipTier = z.infer<typeof insertMembershipTierSchema>;
export type MembershipTier = typeof membershipTiers.$inferSelect;
