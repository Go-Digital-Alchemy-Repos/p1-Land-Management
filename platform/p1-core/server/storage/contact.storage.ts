import { eq, sql, desc } from "drizzle-orm";
import { db } from "../db";
import { contactMessages, type ContactMessage, type InsertContactMessage } from "@shared/schema";

export class ContactStorage {
  async createMessage(
    data: InsertContactMessage,
    transaction?: Parameters<Parameters<typeof db.transaction>[0]>[0],
  ): Promise<ContactMessage> {
    const [msg] = await (transaction ?? db).insert(contactMessages).values(data).returning();
    return msg;
  }

  async getAllMessages(): Promise<ContactMessage[]> {
    return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  }

  async getUnreadMessages(): Promise<ContactMessage[]> {
    return db
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.isRead, false))
      .orderBy(desc(contactMessages.createdAt));
  }

  async markAsRead(id: string): Promise<ContactMessage | undefined> {
    const [msg] = await db
      .update(contactMessages)
      .set({ isRead: true })
      .where(eq(contactMessages.id, id))
      .returning();
    return msg;
  }

  async countUnread(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(contactMessages)
      .where(eq(contactMessages.isRead, false));
    return Number(result[0].count);
  }
}
