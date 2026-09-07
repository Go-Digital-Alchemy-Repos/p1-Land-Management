import { eq, desc, sql, and } from "drizzle-orm";
import { db } from "../db";
import { activityLogs, type ActivityLog } from "@shared/schema";

export class ActivityStorage {
  async log(userId: string, action: string, details?: string): Promise<void> {
    await db.insert(activityLogs).values({ userId, action, details });
  }

  async getByUser(userId: string, limit = 50): Promise<ActivityLog[]> {
    return db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  async countByAction(userId: string, action: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityLogs)
      .where(and(eq(activityLogs.userId, userId), eq(activityLogs.action, action)));
    return Number(result[0].count);
  }
}
