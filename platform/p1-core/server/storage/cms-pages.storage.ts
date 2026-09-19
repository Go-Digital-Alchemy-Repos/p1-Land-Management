import { db } from "../db";
import { cmsPages, cmsPageRevisions, type CmsPage, type InsertCmsPage } from "@shared/schema";
import { eq, desc, and, lte, asc, sql } from "drizzle-orm";

export class CmsPagesStorage {
  async getAllPages(): Promise<CmsPage[]> {
    return db.select().from(cmsPages).orderBy(desc(cmsPages.updatedAt));
  }

  async getPage(id: string): Promise<CmsPage | undefined> {
    const [page] = await db.select().from(cmsPages).where(eq(cmsPages.id, id));
    return page;
  }

  async getPageBySlug(slug: string): Promise<CmsPage | undefined> {
    const [page] = await db.select().from(cmsPages).where(eq(cmsPages.slug, slug));
    return page;
  }

  async getPageByIdOrSlug(identifier: string): Promise<CmsPage | undefined> {
    const byId = await this.getPage(identifier);
    if (byId) return byId;
    return this.getPageBySlug(identifier);
  }

  async createPage(data: InsertCmsPage): Promise<CmsPage> {
    const [page] = await db.insert(cmsPages).values(data).returning();
    return page;
  }

  async updatePage(id: string, data: Partial<InsertCmsPage>): Promise<CmsPage | undefined> {
    const [page] = await db
      .update(cmsPages)
      .set({ ...data, version: sql`${cmsPages.version}+1`, updatedAt: new Date() })
      .where(eq(cmsPages.id, id))
      .returning();
    return page;
  }

  async deletePage(id: string): Promise<boolean> {
    const result = await db.delete(cmsPages).where(eq(cmsPages.id, id)).returning();
    return result.length > 0;
  }

  async publishPage(id: string, adminId: string): Promise<CmsPage | undefined> {
    const [page] = await db
      .update(cmsPages)
      .set({
        version: sql`${cmsPages.version}+1`,
        status: "published",
        publishedAt: new Date(),
        updatedBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(cmsPages.id, id))
      .returning();
    return page;
  }

  async unpublishPage(id: string, adminId: string): Promise<CmsPage | undefined> {
    const [page] = await db
      .update(cmsPages)
      .set({
        version: sql`${cmsPages.version}+1`,
        status: "draft",
        publishedAt: null,
        scheduledAt: null,
        updatedBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(cmsPages.id, id))
      .returning();
    return page;
  }

  async schedulePage(id: string, scheduledAt: Date, adminId: string): Promise<CmsPage | undefined> {
    const [page] = await db
      .update(cmsPages)
      .set({
        version: sql`${cmsPages.version}+1`,
        status: "scheduled",
        scheduledAt,
        publishedAt: null,
        updatedBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(cmsPages.id, id))
      .returning();
    return page;
  }

  async publishScheduledPages(): Promise<number> {
    return db.transaction(async (tx) => {
      const nowResult = await tx.execute(sql`select clock_timestamp() as now`);
      const now = new Date(nowResult.rows[0].now as string);
      const due = await tx
        .select()
        .from(cmsPages)
        .where(and(eq(cmsPages.status, "scheduled"), lte(cmsPages.scheduledAt, now)))
        .for("update", { skipLocked: true });
      for (const page of due) {
        await tx
          .insert(cmsPageRevisions)
          .values({
            pageId: page.id,
            title: page.title,
            content: page.content,
            status: page.status,
            changedBy: null,
            changeNote: "Before scheduled publication",
          });
        await tx
          .update(cmsPages)
          .set({
            status: "published",
            publishedAt: now,
            scheduledAt: null,
            updatedAt: now,
            version: sql`${cmsPages.version}+1`,
          })
          .where(eq(cmsPages.id, page.id));
      }
      return due.length;
    });
  }

  async getNextScheduledTime(): Promise<Date | null> {
    const [row] = await db
      .select({ scheduledAt: cmsPages.scheduledAt })
      .from(cmsPages)
      .where(and(eq(cmsPages.status, "scheduled"), sql`${cmsPages.scheduledAt} IS NOT NULL`))
      .orderBy(asc(cmsPages.scheduledAt))
      .limit(1);
    return row?.scheduledAt ?? null;
  }
}
