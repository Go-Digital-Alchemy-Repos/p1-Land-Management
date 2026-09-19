import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { editorLocks, type User, type EditorLock } from "@shared/schema";
import { CmsMutationError, databaseNow } from "./cms-concurrency";
import { blogPublicationState as states } from "@shared/schema/blog-publications";
import { lockBlogPublication } from "./blog-publication.service";
const inputSchema = z.object({
  editorInstanceId: z.string().uuid(),
  leaseId: z.string().uuid().optional(),
});
function response(resourceId: string, user: User, lock: EditorLock | null, instance?: string) {
  const ownedByCurrentUser = lock?.lockedByUserId === user.id;
  const ownedByCurrentEditor = Boolean(
    ownedByCurrentUser && instance && lock?.editorInstanceId === instance,
  );
  return {
    resourceType: "blog_post" as const,
    resourceId,
    status: lock
      ? ownedByCurrentEditor
        ? ("acquired" as const)
        : ("locked_by_other" as const)
      : ("expired_available" as const),
    ownedByCurrentUser,
    ownedByCurrentEditor,
    lock: lock
      ? {
          id: lock.id,
          editorInstanceId: lock.editorInstanceId,
          lockedByUserId: lock.lockedByUserId,
          lockedByName: lock.lockedByName,
          lockedAt: lock.lockedAt.toISOString(),
          lastHeartbeatAt: lock.lastHeartbeatAt.toISOString(),
          expiresAt: lock.expiresAt.toISOString(),
        }
      : null,
  };
}
export async function blogPublicationLease(
  action: "status" | "acquire" | "heartbeat" | "release",
  identifier: string,
  user: User | undefined,
  body: unknown = {},
) {
  if (!user || (user.role !== "admin" && user.role !== "editor"))
    throw new CmsMutationError(400, "BLOG_LEASE_LOST", "Sign in again.");
  let input: z.infer<typeof inputSchema> | undefined;
  if (action !== "status") {
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success || (action !== "acquire" && !parsed.data.leaseId))
      throw new CmsMutationError(
        400,
        "CMS_CONCURRENCY_REQUIRED",
        "Reload this editor. An editor instance and current lease are required.",
      );
    input = parsed.data;
  }
  return db.transaction(async (tx) => {
    const [page] = await tx
      .select({ id: states.postId })
      .from(states)
      .where(eq(states.postId, identifier))
      .limit(1);
    if (!page) throw new CmsMutationError(404, "BLOG_NOT_FOUND", "Initialized post not found");
    await lockBlogPublication(tx);
    // Deletion also uses the resource lock; recheck after acquiring it.
    const [exists] = await tx
      .select({ id: states.postId })
      .from(states)
      .where(and(eq(states.postId, page.id), sql`${states.visibility} <> 'deleted'`));
    if (!exists) throw new CmsMutationError(404, "BLOG_NOT_FOUND", "Initialized post not found");
    const rows = await tx
      .select()
      .from(editorLocks)
      .where(and(eq(editorLocks.resourceType, "blog_post"), eq(editorLocks.resourceId, page.id)))
      .for("update");
    let lock: EditorLock | undefined = rows[0];
    const now = await databaseNow(tx);
    if (lock && lock.expiresAt <= now) {
      await tx.delete(editorLocks).where(eq(editorLocks.id, lock.id));
      lock = undefined;
    }
    if (action === "status") return response(page.id, user, lock ?? null);
    if (action === "acquire" && !lock) {
      [lock] = await tx
        .insert(editorLocks)
        .values({
          resourceType: "blog_post",
          resourceId: page.id,
          editorInstanceId: input!.editorInstanceId,
          lockedByUserId: user.id,
          lockedByName:
            [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email,
          lockedAt: now,
          lastHeartbeatAt: now,
          expiresAt: new Date(now.getTime() + 300000),
        })
        .returning();
      return response(page.id, user, lock, input!.editorInstanceId);
    }
    const owned = Boolean(
      lock &&
      lock.lockedByUserId === user.id &&
      lock.editorInstanceId === input!.editorInstanceId &&
      (action === "acquire" || lock.id === input!.leaseId),
    );
    if (!owned || !lock) return response(page.id, user, lock ?? null); // Never echo ownership for a stale generation.
    if (action === "release") {
      await tx.delete(editorLocks).where(eq(editorLocks.id, lock.id));
      return response(page.id, user, null);
    }
    [lock] = await tx
      .update(editorLocks)
      .set({ lastHeartbeatAt: now, expiresAt: new Date(now.getTime() + 300000), updatedAt: now })
      .where(eq(editorLocks.id, lock.id))
      .returning();
    return response(page.id, user, lock, input!.editorInstanceId);
  });
}
