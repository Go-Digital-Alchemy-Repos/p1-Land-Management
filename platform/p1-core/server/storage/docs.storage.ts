import { createHash } from "node:crypto";
import { eq, asc, sql } from "drizzle-orm";
import { db } from "../db";
import { activityLogs, docs, type Doc, type InsertDoc } from "@shared/schema";

export class DocsConflictError extends Error {
  readonly statusCode = 409;
  constructor() { super("Documentation changed. Reload saved documents before trying again."); }
}
export function docVersion(doc: Doc): string {
  return createHash("sha256").update(JSON.stringify([
    doc.id, doc.title, doc.slug, doc.category, doc.content, doc.sortOrder,
    doc.isPublished, doc.createdBy, doc.createdAt, doc.updatedAt,
  ])).digest("hex");
}
export function docsVersion(rows: Doc[]): string {
  return createHash("sha256").update(JSON.stringify(
    rows.map(row => [row.id, docVersion(row)]).sort((a, b) => a[0].localeCompare(b[0])),
  )).digest("hex");
}
type DocEdit = Pick<InsertDoc, "title" | "slug" | "category" | "content" | "sortOrder" | "isPublished">;
type DocDefinition = Pick<InsertDoc, "title" | "slug" | "category" | "content" | "sortOrder">;
type DocAudit = { userId: string; action: string; details: string };

export class DocsStorage {
  constructor(private readonly database: typeof db = db) {}

  async getVersionedDocs() {
    const rows = await this.getAllDocs();
    return { version: docsVersion(rows), docs: rows.map(row => ({ ...row, version: docVersion(row) })) };
  }

  /** The short lock coordinates even existing legacy/direct SQL writers.
   * Reads remain available. Conflicts and audit failures roll back every write.
   */
  private async locked<T>(work: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>): Promise<T> {
    return this.database.transaction(async tx => {
      await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
      await tx.execute(sql`LOCK TABLE docs IN SHARE ROW EXCLUSIVE MODE`);
      return work(tx);
    }).catch((error: unknown) => {
      if (error instanceof DocsConflictError) throw error;
      // Database exceptions may embed SQL parameters, including private document
      // bodies. The HTTP error logger must receive only a sanitized exception.
      throw Object.assign(new Error("Document operation failed. Reload saved documents before retrying."), { statusCode: 503 });
    });
  }

  async createVersionedDoc(data: DocEdit, audit: DocAudit) {
    return this.locked(async tx => {
      const [saved] = await tx.insert(docs).values({ ...data, createdBy: audit.userId }).returning();
      await tx.insert(activityLogs).values(audit);
      return { ...saved, version: docVersion(saved) };
    });
  }

  async saveVersionedDoc(id: string, data: DocEdit, expectedVersion: string, audit: DocAudit) {
    return this.locked(async tx => {
      const [current] = await tx.select().from(docs).where(eq(docs.id, id));
      if (!current || docVersion(current) !== expectedVersion) throw new DocsConflictError();
      const [saved] = await tx.update(docs).set({ ...data, updatedAt: new Date() }).where(eq(docs.id, id)).returning();
      await tx.insert(activityLogs).values(audit);
      return { ...saved, version: docVersion(saved) };
    });
  }

  async deleteVersionedDoc(id: string, expectedVersion: string, audit: DocAudit) {
    return this.locked(async tx => {
      const [current] = await tx.select().from(docs).where(eq(docs.id, id));
      if (!current || docVersion(current) !== expectedVersion) throw new DocsConflictError();
      await tx.delete(docs).where(eq(docs.id, id));
      await tx.insert(activityLogs).values(audit);
    });
  }

  async synchronizeVersionedDocs(definitions: DocDefinition[], expectedVersion: string, audit: DocAudit) {
    if (new Set(definitions.map(item => item.slug)).size !== definitions.length)
      throw new Error("Duplicate system document slug");
    return this.locked(async tx => {
      const current = await tx.select().from(docs);
      if (docsVersion(current) !== expectedVersion) throw new DocsConflictError();
      const bySlug = new Map(current.map(row => [row.slug, row]));
      let created = 0, updated = 0;
      for (const definition of definitions) {
        const { title, slug, category, content, sortOrder } = definition;
        const fields = { title, slug, category, content, sortOrder };
        const existing = bySlug.get(slug);
        if (existing) {
          // Sync never changes author, publication choice, IDs or custom documents.
          await tx.update(docs).set({ ...fields, updatedAt: new Date() }).where(eq(docs.id, existing.id));
          updated++;
        } else {
          await tx.insert(docs).values({ ...fields, isPublished: true, createdBy: audit.userId });
          created++;
        }
      }
      await tx.insert(activityLogs).values(audit);
      const rows = await tx.select().from(docs).orderBy(asc(docs.sortOrder), asc(docs.title));
      return { created, updated, total: rows.length, version: docsVersion(rows), docs: rows.map(row => ({ ...row, version: docVersion(row) })) };
    });
  }

  async getDoc(id: string): Promise<Doc | undefined> {
    const [doc] = await this.database.select().from(docs).where(eq(docs.id, id));
    return doc;
  }

  async getDocBySlug(slug: string): Promise<Doc | undefined> {
    const [doc] = await this.database.select().from(docs).where(eq(docs.slug, slug));
    return doc;
  }

  async getAllDocs(): Promise<Doc[]> {
    return this.database.select().from(docs).orderBy(asc(docs.sortOrder), asc(docs.title));
  }

  async getDocsByCategory(category: string): Promise<Doc[]> {
    return this.database
      .select()
      .from(docs)
      .where(eq(docs.category, category))
      .orderBy(asc(docs.sortOrder), asc(docs.title));
  }

  async getPublishedDocs(): Promise<Doc[]> {
    return this.database
      .select()
      .from(docs)
      .where(eq(docs.isPublished, true))
      .orderBy(asc(docs.sortOrder), asc(docs.title));
  }

  async createDoc(data: InsertDoc): Promise<Doc> {
    const [doc] = await this.database.insert(docs).values(data).returning();
    return doc;
  }

  async updateDoc(id: string, data: Partial<InsertDoc>): Promise<Doc | undefined> {
    const [doc] = await this.database
      .update(docs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(docs.id, id))
      .returning();
    return doc;
  }

  async deleteDoc(id: string): Promise<boolean> {
    await this.database.delete(docs).where(eq(docs.id, id));
    return true;
  }
}
