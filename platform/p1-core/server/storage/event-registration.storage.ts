import { eq, and, count, asc, sum, sql, inArray, isNull } from "drizzle-orm";
import { db } from "../db";
import {
  eventRegistrations,
  type EventRegistration,
  type InsertEventRegistration,
} from "@shared/schema";

export class EventRegistrationStorage {
  async getRegistration(id: string): Promise<EventRegistration | undefined> {
    const [reg] = await db.select().from(eventRegistrations).where(eq(eventRegistrations.id, id));
    return reg;
  }

  async getRegistrationByEventAndUser(
    eventId: string,
    userId: string,
  ): Promise<EventRegistration | undefined> {
    const [reg] = await db
      .select()
      .from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, userId)));
    return reg;
  }

  async getRegistrationByEventAndEmail(
    eventId: string,
    email: string,
  ): Promise<EventRegistration | undefined> {
    const [reg] = await db
      .select()
      .from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.email, email)));
    return reg;
  }

  async getRegistrationsByEvent(eventId: string): Promise<EventRegistration[]> {
    return db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, eventId))
      .orderBy(asc(eventRegistrations.registeredAt));
  }

  async getConfirmedRegistrations(eventId: string): Promise<EventRegistration[]> {
    return db
      .select()
      .from(eventRegistrations)
      .where(
        and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, "confirmed")),
      );
  }

  async getRegistrationsByUser(userId: string): Promise<EventRegistration[]> {
    return db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.userId, userId))
      .orderBy(asc(eventRegistrations.registeredAt));
  }

  async getRegistrationByCheckoutSession(
    sessionId: string,
  ): Promise<EventRegistration | undefined> {
    const [reg] = await db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.stripeCheckoutSessionId, sessionId));
    return reg;
  }

  async getConfirmedCount(eventId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(eventRegistrations)
      .where(
        and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, "confirmed")),
      );
    return result?.count ?? 0;
  }

  async getFirstWaitlisted(eventId: string): Promise<EventRegistration | undefined> {
    const [reg] = await db
      .select()
      .from(eventRegistrations)
      .where(
        and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, "waitlisted")),
      )
      .orderBy(asc(eventRegistrations.registeredAt))
      .limit(1);
    return reg;
  }

  async createRegistration(data: InsertEventRegistration): Promise<EventRegistration> {
    const [reg] = await db.insert(eventRegistrations).values(data).returning();
    return reg;
  }

  async cancelRegistration(id: string): Promise<EventRegistration | undefined> {
    const [reg] = await db
      .update(eventRegistrations)
      .set({ status: "canceled", canceledAt: new Date() })
      .where(eq(eventRegistrations.id, id))
      .returning();
    return reg;
  }

  async cancelAllActiveRegistrations(eventId: string): Promise<number> {
    const result = await db
      .update(eventRegistrations)
      .set({ status: "canceled", canceledAt: new Date() })
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          sql`${eventRegistrations.status} IN ('confirmed', 'waitlisted')`,
        ),
      );
    return result.rowCount ?? 0;
  }

  async checkInRegistration(id: string, attended: boolean): Promise<EventRegistration | undefined> {
    const [reg] = await db
      .update(eventRegistrations)
      .set({
        attended,
        checkedInAt: attended ? new Date() : null,
      })
      .where(eq(eventRegistrations.id, id))
      .returning();
    return reg;
  }

  async getEventAnalytics(eventId: string): Promise<{
    confirmed: number;
    waitlisted: number;
    canceled: number;
    attended: number;
    totalRevenueCents: number;
  }> {
    const stats = await db
      .select({
        status: eventRegistrations.status,
        count: count(),
        revenue: sum(eventRegistrations.amountPaid),
      })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, eventId))
      .groupBy(eventRegistrations.status);

    const attendedCount = await db
      .select({ count: count() })
      .from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.attended, true)));

    const analytics = {
      confirmed: 0,
      waitlisted: 0,
      canceled: 0,
      attended: attendedCount[0]?.count ?? 0,
      totalRevenueCents: 0,
    };

    stats.forEach((s) => {
      if (s.status === "confirmed") analytics.confirmed = s.count;
      if (s.status === "waitlisted") analytics.waitlisted = s.count;
      if (s.status === "canceled") analytics.canceled = s.count;
      // revenue only from paid registrations
    });

    const revenueResult = await db
      .select({ total: sum(eventRegistrations.amountPaid) })
      .from(eventRegistrations)
      .where(
        and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.paymentStatus, "paid")),
      );

    analytics.totalRevenueCents = Number(revenueResult[0]?.total ?? 0);

    return analytics;
  }

  async updateRegistrationStatus(
    id: string,
    status: string,
  ): Promise<EventRegistration | undefined> {
    const updates: Partial<InsertEventRegistration> = { status };
    if (status !== "canceled") {
      updates.canceledAt = null;
    }
    const [reg] = await db
      .update(eventRegistrations)
      .set(updates)
      .where(eq(eventRegistrations.id, id))
      .returning();
    return reg;
  }

  async updateRegistration(
    id: string,
    data: Partial<Pick<EventRegistration, "status" | "fullName" | "email" | "canceledAt">>,
  ): Promise<EventRegistration | undefined> {
    const [reg] = await db
      .update(eventRegistrations)
      .set(data)
      .where(eq(eventRegistrations.id, id))
      .returning();
    return reg;
  }

  async updatePaymentDetails(
    id: string,
    data: {
      paymentStatus?: string;
      paymentIntentId?: string;
      amountPaid?: number;
      status?: string;
      stripeCheckoutSessionId?: string;
    },
  ): Promise<EventRegistration | undefined> {
    const [reg] = await db
      .update(eventRegistrations)
      .set(data)
      .where(eq(eventRegistrations.id, id))
      .returning();
    return reg;
  }

  async deleteRegistration(id: string): Promise<boolean> {
    await db.delete(eventRegistrations).where(eq(eventRegistrations.id, id));
    return true;
  }

  async getConfirmedRegistrationsNeedingReminder(eventIds: string[]): Promise<EventRegistration[]> {
    if (eventIds.length === 0) return [];
    return db
      .select()
      .from(eventRegistrations)
      .where(
        and(
          inArray(eventRegistrations.eventId, eventIds),
          eq(eventRegistrations.status, "confirmed"),
          isNull(eventRegistrations.reminderSentAt),
        ),
      );
  }

  async markReminderSent(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db
      .update(eventRegistrations)
      .set({ reminderSentAt: new Date() })
      .where(inArray(eventRegistrations.id, ids));
  }
}
