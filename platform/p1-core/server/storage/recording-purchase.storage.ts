import { eq, and } from "drizzle-orm";
import { db } from "../db";
import {
  recordingPurchases,
  type RecordingPurchase,
  type InsertRecordingPurchase,
} from "@shared/schema";

export class RecordingPurchaseStorage {
  async create(data: InsertRecordingPurchase): Promise<RecordingPurchase> {
    const [purchase] = await db.insert(recordingPurchases).values(data).returning();
    return purchase;
  }

  async getByUserAndEvent(userId: string, eventId: string): Promise<RecordingPurchase | undefined> {
    const [purchase] = await db
      .select()
      .from(recordingPurchases)
      .where(and(eq(recordingPurchases.userId, userId), eq(recordingPurchases.eventId, eventId)));
    return purchase;
  }

  async getByUser(userId: string): Promise<RecordingPurchase[]> {
    return db.select().from(recordingPurchases).where(eq(recordingPurchases.userId, userId));
  }

  async updatePaymentDetails(
    id: string,
    data: Partial<
      Pick<RecordingPurchase, "stripePaymentIntentId" | "stripeCheckoutSessionId" | "amountPaid">
    >,
  ): Promise<RecordingPurchase | undefined> {
    const [purchase] = await db
      .update(recordingPurchases)
      .set(data)
      .where(eq(recordingPurchases.id, id))
      .returning();
    return purchase;
  }

  async getByCheckoutSession(sessionId: string): Promise<RecordingPurchase | undefined> {
    const [purchase] = await db
      .select()
      .from(recordingPurchases)
      .where(eq(recordingPurchases.stripeCheckoutSessionId, sessionId));
    return purchase;
  }

  async delete(id: string): Promise<boolean> {
    await db.delete(recordingPurchases).where(eq(recordingPurchases.id, id));
    return true;
  }
}
