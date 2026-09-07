import { db } from "../db";
import { notifications, notificationPreferences } from "../../shared/schema/notifications";
import { eq, and, desc } from "drizzle-orm";
import type { Notification, NotificationPreferences } from "../../shared/schema/notifications";

export class NotificationStorage {
  async create(data: {
    userId: string;
    type?: string;
    title: string;
    body: string;
    linkUrl?: string;
  }): Promise<Notification> {
    const [notif] = await db
      .insert(notifications)
      .values({
        userId: data.userId,
        type: data.type ?? "new_message",
        title: data.title,
        body: data.body,
        linkUrl: data.linkUrl ?? null,
      })
      .returning();
    return notif;
  }

  async getForUser(userId: string): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const rows = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return rows.length;
  }

  async markRead(id: number, userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async markAllRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const [existing] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    if (existing) return existing;
    const [created] = await db
      .insert(notificationPreferences)
      .values({ userId, emailNewMessage: true, inAppNewMessage: true })
      .returning();
    return created;
  }

  async updatePreferences(
    userId: string,
    prefs: { emailNewMessage?: boolean; inAppNewMessage?: boolean },
  ): Promise<NotificationPreferences> {
    await db
      .insert(notificationPreferences)
      .values({ userId, ...prefs })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: prefs,
      });
    return this.getPreferences(userId);
  }
}
