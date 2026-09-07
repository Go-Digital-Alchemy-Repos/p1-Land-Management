import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "../db";
import {
  editorLocks,
  type EditorLock,
  type EditorLockResourceType,
  type InsertEditorLock,
} from "@shared/schema";

export class EditorLocksStorage {
  async getByResource(
    resourceType: EditorLockResourceType,
    resourceId: string,
  ): Promise<EditorLock | undefined> {
    const [lock] = await db
      .select()
      .from(editorLocks)
      .where(
        and(eq(editorLocks.resourceType, resourceType), eq(editorLocks.resourceId, resourceId)),
      )
      .limit(1);
    return lock;
  }

  async create(data: InsertEditorLock): Promise<EditorLock> {
    const [lock] = await db.insert(editorLocks).values(data).returning();
    return lock;
  }

  async update(id: string, data: Partial<InsertEditorLock>): Promise<EditorLock | undefined> {
    const [lock] = await db
      .update(editorLocks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(editorLocks.id, id))
      .returning();
    return lock;
  }

  async deleteByResource(
    resourceType: EditorLockResourceType,
    resourceId: string,
  ): Promise<boolean> {
    const deleted = await db
      .delete(editorLocks)
      .where(
        and(eq(editorLocks.resourceType, resourceType), eq(editorLocks.resourceId, resourceId)),
      )
      .returning({ id: editorLocks.id });
    return deleted.length > 0;
  }

  async deleteById(id: string): Promise<boolean> {
    const deleted = await db
      .delete(editorLocks)
      .where(eq(editorLocks.id, id))
      .returning({ id: editorLocks.id });
    return deleted.length > 0;
  }

  async deleteExpiredForResource(
    resourceType: EditorLockResourceType,
    resourceId: string,
    now: Date,
  ): Promise<number> {
    const deleted = await db
      .delete(editorLocks)
      .where(
        and(
          eq(editorLocks.resourceType, resourceType),
          eq(editorLocks.resourceId, resourceId),
          lt(editorLocks.expiresAt, now),
        ),
      )
      .returning({ id: editorLocks.id });
    return deleted.length;
  }

  async listActiveByResourceType(
    resourceType: EditorLockResourceType,
    now: Date,
  ): Promise<EditorLock[]> {
    return db
      .select()
      .from(editorLocks)
      .where(and(eq(editorLocks.resourceType, resourceType), gt(editorLocks.expiresAt, now)));
  }
}
