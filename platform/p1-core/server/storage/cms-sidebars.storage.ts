import { db } from "../db";
import { cmsSidebars, type CmsSidebar, type InsertCmsSidebar } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export class CmsSidebarsStorage {
  async getAll(): Promise<CmsSidebar[]> {
    return db.select().from(cmsSidebars).orderBy(desc(cmsSidebars.updatedAt));
  }

  async getById(id: string): Promise<CmsSidebar | undefined> {
    const [sidebar] = await db.select().from(cmsSidebars).where(eq(cmsSidebars.id, id));
    return sidebar;
  }

  async getDefault(): Promise<CmsSidebar | undefined> {
    const [sidebar] = await db
      .select()
      .from(cmsSidebars)
      .where(eq(cmsSidebars.isDefault, true))
      .orderBy(desc(cmsSidebars.updatedAt))
      .limit(1);
    return sidebar;
  }

  async create(data: InsertCmsSidebar): Promise<CmsSidebar> {
    if (data.isDefault) {
      await this.clearDefault();
    }
    const [sidebar] = await db.insert(cmsSidebars).values(data).returning();
    return sidebar;
  }

  async update(id: string, data: Partial<InsertCmsSidebar>): Promise<CmsSidebar | undefined> {
    if (data.isDefault) {
      await this.clearDefault();
    }
    const [sidebar] = await db
      .update(cmsSidebars)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cmsSidebars.id, id))
      .returning();
    return sidebar;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(cmsSidebars).where(eq(cmsSidebars.id, id)).returning();
    return result.length > 0;
  }

  async clearDefault(): Promise<void> {
    await db
      .update(cmsSidebars)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(cmsSidebars.isDefault, true));
  }
}
