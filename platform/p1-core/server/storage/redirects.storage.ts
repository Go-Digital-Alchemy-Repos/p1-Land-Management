import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { redirects } from "../../shared/schema/redirects";
import type { Redirect, InsertRedirect } from "../../shared/schema/redirects";

export class RedirectsStorage {
  async getAll(): Promise<Redirect[]> {
    return db.select().from(redirects).orderBy(redirects.createdAt);
  }

  async getById(id: string): Promise<Redirect | undefined> {
    const [row] = await db.select().from(redirects).where(eq(redirects.id, id));
    return row;
  }

  async getActiveForPath(path: string): Promise<Redirect | undefined> {
    const [row] = await db
      .select()
      .from(redirects)
      .where(and(eq(redirects.fromPath, path), eq(redirects.isActive, true)));
    return row;
  }

  async create(data: InsertRedirect): Promise<Redirect> {
    const [row] = await db.insert(redirects).values(data).returning();
    return row;
  }

  async update(id: string, data: Partial<InsertRedirect>): Promise<Redirect | undefined> {
    const [row] = await db
      .update(redirects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(redirects.id, id))
      .returning();
    return row;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(redirects).where(eq(redirects.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}
