import { db } from "../db";
import { cmsMenus, type CmsMenu, type InsertCmsMenu } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export class CmsMenusStorage {
  async getAll(): Promise<CmsMenu[]> {
    return db.select().from(cmsMenus).orderBy(desc(cmsMenus.updatedAt));
  }

  async getById(id: string): Promise<CmsMenu | undefined> {
    const [menu] = await db.select().from(cmsMenus).where(eq(cmsMenus.id, id));
    return menu;
  }

  async getByLocation(location: string): Promise<CmsMenu | undefined> {
    const [menu] = await db
      .select()
      .from(cmsMenus)
      .where(eq(cmsMenus.location, location))
      .orderBy(desc(cmsMenus.updatedAt))
      .limit(1);
    return menu;
  }

  async create(data: InsertCmsMenu): Promise<CmsMenu> {
    const [menu] = await db.insert(cmsMenus).values(data).returning();
    return menu;
  }

  async update(id: string, data: Partial<InsertCmsMenu>): Promise<CmsMenu | undefined> {
    const [menu] = await db
      .update(cmsMenus)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cmsMenus.id, id))
      .returning();
    return menu;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(cmsMenus).where(eq(cmsMenus.id, id)).returning();
    return result.length > 0;
  }

  async clearLocation(location: string): Promise<void> {
    await db
      .update(cmsMenus)
      .set({ location: "unassigned", updatedAt: new Date() })
      .where(eq(cmsMenus.location, location));
  }
}
