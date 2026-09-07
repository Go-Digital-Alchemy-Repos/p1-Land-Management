import { eq, asc } from "drizzle-orm";
import { db } from "../db";
import { docs, type Doc, type InsertDoc } from "@shared/schema";

export class DocsStorage {
  async getDoc(id: string): Promise<Doc | undefined> {
    const [doc] = await db.select().from(docs).where(eq(docs.id, id));
    return doc;
  }

  async getDocBySlug(slug: string): Promise<Doc | undefined> {
    const [doc] = await db.select().from(docs).where(eq(docs.slug, slug));
    return doc;
  }

  async getAllDocs(): Promise<Doc[]> {
    return db.select().from(docs).orderBy(asc(docs.sortOrder), asc(docs.title));
  }

  async getDocsByCategory(category: string): Promise<Doc[]> {
    return db
      .select()
      .from(docs)
      .where(eq(docs.category, category))
      .orderBy(asc(docs.sortOrder), asc(docs.title));
  }

  async getPublishedDocs(): Promise<Doc[]> {
    return db
      .select()
      .from(docs)
      .where(eq(docs.isPublished, true))
      .orderBy(asc(docs.sortOrder), asc(docs.title));
  }

  async createDoc(data: InsertDoc): Promise<Doc> {
    const [doc] = await db.insert(docs).values(data).returning();
    return doc;
  }

  async updateDoc(id: string, data: Partial<InsertDoc>): Promise<Doc | undefined> {
    const [doc] = await db
      .update(docs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(docs.id, id))
      .returning();
    return doc;
  }

  async deleteDoc(id: string): Promise<boolean> {
    await db.delete(docs).where(eq(docs.id, id));
    return true;
  }
}
