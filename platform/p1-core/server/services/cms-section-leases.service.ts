import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { cmsSections, editorLocks, type User, type EditorLock } from "@shared/schema";
import { CmsMutationError, databaseNow } from "./cms-concurrency";
import { lockSectionResource } from "./cms-section-concurrency";
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
    resourceType: "cms_section" as const,
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
export async function sectionLease(
  action: "status" | "acquire" | "heartbeat" | "release",
  identifier: string,
  user: User | undefined,
  body: unknown = {},
) {
  if (!user || (user.role !== "admin" && user.role !== "editor"))
    throw new CmsMutationError(400, "CMS_SECTION_LEASE_LOST", "Sign in again.");
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
    const [section] = await tx
      .select({ id: cmsSections.id })
      .from(cmsSections)
      .where(eq(cmsSections.id, identifier))
      .limit(1);
    if (!section) throw new CmsMutationError(404, "CMS_SECTION_NOT_FOUND", "Section not found");
    await lockSectionResource(tx, section.id);
    // Deletion also uses the resource lock; recheck after acquiring it.
    const [exists] = await tx
      .select({ id: cmsSections.id })
      .from(cmsSections)
      .where(eq(cmsSections.id, section.id));
    if (!exists) throw new CmsMutationError(404, "CMS_SECTION_NOT_FOUND", "Section not found");
    const rows = await tx
      .select()
      .from(editorLocks)
      .where(
        and(eq(editorLocks.resourceType, "cms_section"), eq(editorLocks.resourceId, section.id)),
      )
      .for("update");
    let lock: EditorLock | undefined = rows[0];
    const now = await databaseNow(tx);
    if (lock && lock.expiresAt <= now) {
      await tx.delete(editorLocks).where(eq(editorLocks.id, lock.id));
      lock = undefined;
    }
    if (action === "status") return response(section.id, user, lock ?? null);
    if (action === "acquire" && !lock) {
      [lock] = await tx
        .insert(editorLocks)
        .values({
          resourceType: "cms_section",
          resourceId: section.id,
          editorInstanceId: input!.editorInstanceId,
          lockedByUserId: user.id,
          lockedByName:
            [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email,
          lockedAt: now,
          lastHeartbeatAt: now,
          expiresAt: new Date(now.getTime() + 300000),
        })
        .returning();
      return response(section.id, user, lock, input!.editorInstanceId);
    }
    const owned = Boolean(
      lock &&
      lock.lockedByUserId === user.id &&
      lock.editorInstanceId === input!.editorInstanceId &&
      (action === "acquire" || lock.id === input!.leaseId),
    );
    if (!owned || !lock) return response(section.id, user, lock ?? null); // Never echo ownership for a stale generation.
    if (action === "release") {
      await tx.delete(editorLocks).where(eq(editorLocks.id, lock.id));
      return response(section.id, user, null);
    }
    [lock] = await tx
      .update(editorLocks)
      .set({ lastHeartbeatAt: now, expiresAt: new Date(now.getTime() + 300000), updatedAt: now })
      .where(eq(editorLocks.id, lock.id))
      .returning();
    return response(section.id, user, lock, input!.editorInstanceId);
  });
}
