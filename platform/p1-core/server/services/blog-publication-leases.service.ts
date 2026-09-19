import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { blogPosts, editorLocks, type User, type EditorLock } from "@shared/schema";
import { CmsMutationError, databaseNow, type CmsTransaction } from "./cms-concurrency";
import { blogPublicationState as states } from "@shared/schema/blog-publications";
import { lockBlogPublication } from "./blog-publication.service";
const inputSchema = z
  .object({
    editorInstanceId: z.string().uuid(),
    leaseId: z.string().uuid().optional(),
  })
  .strict();
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
  allowLegacy = false,
) {
  return db.transaction((tx) =>
    blogLeaseInTransaction(tx, action, identifier, user, body, allowLegacy),
  );
}
export async function blogLeaseInTransaction(
  tx: CmsTransaction,
  action: "status" | "acquire" | "heartbeat" | "release",
  identifier: string,
  user: User | undefined,
  body: unknown = {},
  allowLegacy = false,
) {
  if (!user || (user.role !== "admin" && user.role !== "editor"))
    throw new CmsMutationError(400, "BLOG_LEASE_LOST", "Sign in again.");
  await lockBlogPublication(tx);
  const [state] = await tx.select().from(states).where(eq(states.postId, identifier));
  const [legacy] = await tx
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(eq(blogPosts.id, identifier));
  if (!legacy || state?.visibility === "deleted" || (!state && !allowLegacy))
    throw new CmsMutationError(404, "BLOG_NOT_INITIALIZED", "Explicit adoption is required.");
  let input: z.infer<typeof inputSchema> | undefined;
  if (action !== "status" && state) {
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success || (action !== "acquire" && !parsed.data.leaseId))
      throw new CmsMutationError(
        400,
        "CMS_CONCURRENCY_REQUIRED",
        "Reload this editor. An editor instance and current lease are required.",
      );
    input = parsed.data;
  }
  let [lock] = await tx
    .select()
    .from(editorLocks)
    .where(and(eq(editorLocks.resourceType, "blog_post"), eq(editorLocks.resourceId, identifier)))
    .for("update");
  const now = await databaseNow(tx);
  if (lock && lock.expiresAt <= now) {
    await tx.delete(editorLocks).where(eq(editorLocks.id, lock.id));
    lock = undefined!;
  }
  if (action === "status") {
    const result = response(identifier, user, lock ?? null);
    return !state && lock?.lockedByUserId === user.id && lock.editorInstanceId === null
      ? { ...result, status: "acquired" as const }
      : result;
  }
  if (action === "acquire" && !lock) {
    [lock] = await tx
      .insert(editorLocks)
      .values({
        resourceType: "blog_post",
        resourceId: identifier,
        editorInstanceId: input?.editorInstanceId ?? null,
        lockedByUserId: user.id,
        lockedByName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
        lockedAt: now,
        lastHeartbeatAt: now,
        expiresAt: new Date(now.getTime() + 300000),
        updatedAt: now,
      })
      .returning();
    return state
      ? response(identifier, user, lock, input?.editorInstanceId)
      : { ...response(identifier, user, lock), status: "acquired" as const };
  }
  const owned = Boolean(
    lock &&
    lock.lockedByUserId === user.id &&
    (state
      ? lock.editorInstanceId === input!.editorInstanceId &&
        (action === "acquire" || lock.id === input!.leaseId)
      : lock.editorInstanceId === null),
  );
  if (!owned || !lock) return response(identifier, user, lock ?? null);
  if (action === "release") {
    await tx.delete(editorLocks).where(eq(editorLocks.id, lock.id));
    return response(identifier, user, null);
  }
  [lock] = await tx
    .update(editorLocks)
    .set({ lastHeartbeatAt: now, expiresAt: new Date(now.getTime() + 300000), updatedAt: now })
    .where(eq(editorLocks.id, lock.id))
    .returning();
  return state
    ? response(identifier, user, lock, input?.editorInstanceId)
    : { ...response(identifier, user, lock), status: "acquired" as const };
}
