import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  therapistSubscriptions,
  type TherapistSubscription,
  type InsertSubscription,
} from "@shared/schema";

export class SubscriptionStorage {
  async getSubscription(id: string): Promise<TherapistSubscription | undefined> {
    const [sub] = await db
      .select()
      .from(therapistSubscriptions)
      .where(eq(therapistSubscriptions.id, id));
    return sub;
  }

  async getSubscriptionByTherapist(
    therapistId: string,
  ): Promise<TherapistSubscription | undefined> {
    const [sub] = await db
      .select()
      .from(therapistSubscriptions)
      .where(eq(therapistSubscriptions.therapistId, therapistId));
    return sub;
  }

  async createSubscription(data: InsertSubscription): Promise<TherapistSubscription> {
    const [sub] = await db.insert(therapistSubscriptions).values(data).returning();
    return sub;
  }

  async updateSubscription(
    id: string,
    data: Partial<TherapistSubscription>,
  ): Promise<TherapistSubscription | undefined> {
    const [sub] = await db
      .update(therapistSubscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(therapistSubscriptions.id, id))
      .returning();
    return sub;
  }

  async updateByStripeSubscriptionId(
    stripeSubId: string,
    data: Partial<TherapistSubscription>,
  ): Promise<TherapistSubscription | undefined> {
    const [sub] = await db
      .update(therapistSubscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(therapistSubscriptions.stripeSubscriptionId, stripeSubId))
      .returning();
    return sub;
  }

  async getByStripeSubscriptionId(stripeSubId: string): Promise<TherapistSubscription | undefined> {
    const [sub] = await db
      .select()
      .from(therapistSubscriptions)
      .where(eq(therapistSubscriptions.stripeSubscriptionId, stripeSubId));
    return sub;
  }

  async getByStripeCustomerId(customerId: string): Promise<TherapistSubscription | undefined> {
    const [sub] = await db
      .select()
      .from(therapistSubscriptions)
      .where(eq(therapistSubscriptions.stripeCustomerId, customerId));
    return sub;
  }

  async getActiveSubscriptions(): Promise<TherapistSubscription[]> {
    return db
      .select()
      .from(therapistSubscriptions)
      .where(eq(therapistSubscriptions.status, "active"));
  }

  async getSubscriptionsByStatuses(statuses: string[]): Promise<TherapistSubscription[]> {
    if (statuses.length === 0) return [];
    return db
      .select()
      .from(therapistSubscriptions)
      .where(inArray(therapistSubscriptions.status, statuses));
  }

  async countByStatus(status: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(therapistSubscriptions)
      .where(eq(therapistSubscriptions.status, status));
    return Number(result[0].count);
  }
}
