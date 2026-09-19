import { mutateCmsMenu } from "../services/cms-menu-mutations.service";
import { lockMenus } from "../services/cms-concurrency";
import { db } from "../db";
import { cmsMenus, type CmsMenu, type InsertCmsMenu } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

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
    return (await mutateCmsMenu(null, data)) as CmsMenu;
  }
  async update(
    id: string,
    data: Partial<InsertCmsMenu>,
    expectedVersion: number,
  ): Promise<CmsMenu> {
    return (await mutateCmsMenu(id, data, expectedVersion)) as CmsMenu;
  }
  async delete(id: string, expectedVersion: number): Promise<boolean> {
    await mutateCmsMenu(id, {}, expectedVersion, true);
    return true;
  }
  async clearLocation(location: string): Promise<void> {
    await db.transaction(async (tx) => {
      await lockMenus(tx);
      await tx
        .update(cmsMenus)
        .set({ location: "unassigned", updatedAt: new Date(), version: sql`${cmsMenus.version}+1` })
        .where(eq(cmsMenus.location, location));
    });
  }
}
