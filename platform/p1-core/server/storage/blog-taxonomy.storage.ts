import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { blogTaxonomies, type BlogTaxonomy, type InsertBlogTaxonomy } from "@shared/schema";

export class BlogTaxonomyStorage {
  async getAllTaxonomies(): Promise<BlogTaxonomy[]> {
    return db
      .select()
      .from(blogTaxonomies)
      .orderBy(asc(blogTaxonomies.type), asc(blogTaxonomies.sortOrder), asc(blogTaxonomies.name));
  }

  async getTaxonomy(id: string): Promise<BlogTaxonomy | undefined> {
    const [row] = await db.select().from(blogTaxonomies).where(eq(blogTaxonomies.id, id));
    return row;
  }

  async findByTypeAndName(
    type: BlogTaxonomy["type"],
    name: string,
  ): Promise<BlogTaxonomy | undefined> {
    const rows = await db.select().from(blogTaxonomies).where(eq(blogTaxonomies.type, type));
    return rows.find((row) => row.name.trim().toLowerCase() === name.trim().toLowerCase());
  }

  async createTaxonomy(data: InsertBlogTaxonomy): Promise<BlogTaxonomy> {
    const [row] = await db.insert(blogTaxonomies).values(data).returning();
    return row;
  }

  async updateTaxonomy(
    id: string,
    data: Partial<InsertBlogTaxonomy>,
  ): Promise<BlogTaxonomy | undefined> {
    const [row] = await db
      .update(blogTaxonomies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(blogTaxonomies.id, id))
      .returning();
    return row;
  }

  async clearParent(id: string): Promise<void> {
    await db
      .update(blogTaxonomies)
      .set({ parentId: null, updatedAt: new Date() })
      .where(eq(blogTaxonomies.parentId, id));
  }

  async deleteTaxonomy(id: string): Promise<BlogTaxonomy | undefined> {
    const [row] = await db.delete(blogTaxonomies).where(eq(blogTaxonomies.id, id)).returning();
    return row;
  }

  async getByIds(ids: string[]): Promise<BlogTaxonomy[]> {
    if (ids.length === 0) return [];
    return db.select().from(blogTaxonomies).where(inArray(blogTaxonomies.id, ids));
  }

  async getChildren(parentId: string): Promise<BlogTaxonomy[]> {
    return db
      .select()
      .from(blogTaxonomies)
      .where(and(eq(blogTaxonomies.parentId, parentId), eq(blogTaxonomies.type, "category")));
  }
}
