import { db } from "../db";
import { cmsSections, type CmsSection, type InsertCmsSection } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export class CmsSectionsStorage {
  async getAllSections(): Promise<CmsSection[]> {
    return db.select().from(cmsSections).orderBy(desc(cmsSections.createdAt));
  }

  async getSectionsByCategory(category: string): Promise<CmsSection[]> {
    return db
      .select()
      .from(cmsSections)
      .where(eq(cmsSections.category, category))
      .orderBy(desc(cmsSections.createdAt));
  }

  async getSection(id: string): Promise<CmsSection | undefined> {
    const [section] = await db.select().from(cmsSections).where(eq(cmsSections.id, id));
    return section;
  }

  async createSection(data: InsertCmsSection): Promise<CmsSection> {
    const [section] = await db.insert(cmsSections).values(data).returning();
    return section;
  }

  async updateSection(
    id: string,
    data: Partial<InsertCmsSection>,
  ): Promise<CmsSection | undefined> {
    const [section] = await db
      .update(cmsSections)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cmsSections.id, id))
      .returning();
    return section;
  }

  async deleteSection(id: string): Promise<boolean> {
    const result = await db.delete(cmsSections).where(eq(cmsSections.id, id)).returning();
    return result.length > 0;
  }
}
