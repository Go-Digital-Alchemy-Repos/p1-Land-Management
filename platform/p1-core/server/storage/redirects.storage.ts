import { validateRedirectCollection } from "../../shared/public-redirects";
import { eq, and, sql } from "drizzle-orm";
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
    return db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
      await tx.execute(sql`SELECT pg_advisory_xact_lock(880120442)`);
      const rows = await tx.select().from(redirects);
      validateRedirectCollection([
        ...rows,
        { ...data, statusCode: data.statusCode ?? 301, isActive: data.isActive ?? true },
      ]);
      const [row] = await tx.insert(redirects).values(data).returning();
      return row;
    });
  }
  async update(id: string, data: Partial<InsertRedirect>): Promise<Redirect | undefined> {
    return db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
      await tx.execute(sql`SELECT pg_advisory_xact_lock(880120442)`);
      const rows = await tx.select().from(redirects);
      if (!rows.some((row) => row.id === id)) return undefined;
      // Deactivation can only remove an edge from the live graph. Keep this
      // repair path available even when other historical rows remain invalid.
      if (data.isActive !== false) {
        validateRedirectCollection(rows.map((row) => (row.id === id ? { ...row, ...data } : row)));
      }
      const [row] = await tx
        .update(redirects)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(redirects.id, id))
        .returning();
      return row;
    });
  }
  async delete(id: string): Promise<boolean> {
    return db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
      await tx.execute(sql`SELECT pg_advisory_xact_lock(880120442)`);
      // Deletion must remain available to repair historical invalid collections.
      const result = await tx.delete(redirects).where(eq(redirects.id, id));
      return (result.rowCount ?? 0) > 0;
    });
  }
}
