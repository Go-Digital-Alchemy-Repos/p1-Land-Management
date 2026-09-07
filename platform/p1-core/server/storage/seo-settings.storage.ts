import { db } from "../db";
import { seoSettings, type SeoSettings, type InsertSeoSettings } from "@shared/schema";

const SINGLETON_ID = "global";

export class SeoSettingsStorage {
  async get(): Promise<SeoSettings | undefined> {
    const [row] = await db.select().from(seoSettings).limit(1);
    return row;
  }

  async upsert(data: Partial<InsertSeoSettings>): Promise<SeoSettings> {
    const existing = await this.get();

    if (existing) {
      const [updated] = await db
        .update(seoSettings)
        .set({ ...data, updatedAt: new Date() })
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(seoSettings)
      .values({ id: SINGLETON_ID, ...data })
      .returning();
    return created;
  }
}
