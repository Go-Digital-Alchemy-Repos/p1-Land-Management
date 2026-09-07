import {
  type EditorLock,
  type EditorLockResourceType,
  type EditorLockResponse,
  User,
} from "@shared/schema";
import { storage } from "../storage";

export const EDITOR_LOCK_HEARTBEAT_MS = 30_000;
export const EDITOR_LOCK_EXPIRY_MS = 5 * 60_000;

function toIso(value: Date | string | null | undefined): string {
  if (!value) return new Date(0).toISOString();
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function lockPayload(lock: EditorLock | null) {
  if (!lock) return null;
  return {
    id: lock.id,
    lockedByUserId: lock.lockedByUserId,
    lockedByName: lock.lockedByName,
    lockedAt: toIso(lock.lockedAt),
    lastHeartbeatAt: toIso(lock.lastHeartbeatAt),
    expiresAt: toIso(lock.expiresAt),
  };
}

function canUseEditorLocks(user: User | undefined): user is User {
  if (!user) return false;
  return user.role === "admin" || user.role === "editor";
}

function buildResponse(
  user: User,
  resourceType: EditorLockResourceType,
  resourceId: string,
  status: EditorLockResponse["status"],
  lock: EditorLock | null,
): EditorLockResponse {
  const lockOwnerId = lock?.lockedByUserId ?? null;
  return {
    status,
    resourceType,
    resourceId,
    ownedByCurrentUser: Boolean(lockOwnerId && lockOwnerId === user.id),
    lock: lockPayload(lock),
  };
}

function displayNameForUser(user: User) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.email;
}

async function getFreshLock(resourceType: EditorLockResourceType, resourceId: string, now: Date) {
  await storage.editorLocks.deleteExpiredForResource(resourceType, resourceId, now);
  return storage.editorLocks.getByResource(resourceType, resourceId);
}

async function refreshOwnedLock(lock: EditorLock, now: Date) {
  const expiresAt = new Date(now.getTime() + EDITOR_LOCK_EXPIRY_MS);
  return storage.editorLocks.update(lock.id, {
    lastHeartbeatAt: now,
    expiresAt,
    updatedAt: now,
  } as never);
}

export async function getEditorLock(
  resourceType: EditorLockResourceType,
  resourceId: string,
  user: User | undefined,
): Promise<EditorLockResponse> {
  if (!canUseEditorLocks(user)) {
    throw new Error("Unauthorized");
  }

  const now = new Date();
  const lock = await getFreshLock(resourceType, resourceId, now);
  if (!lock) {
    return buildResponse(user, resourceType, resourceId, "expired_available", null);
  }

  if (lock.lockedByUserId === user.id) {
    return buildResponse(user, resourceType, resourceId, "acquired", lock);
  }

  return buildResponse(user, resourceType, resourceId, "locked_by_other", lock);
}

export async function listActiveEditorLocks(
  resourceType: EditorLockResourceType,
  user: User | undefined,
): Promise<Array<{ resourceId: string; lock: NonNullable<EditorLockResponse["lock"]> }>> {
  if (!canUseEditorLocks(user)) {
    throw new Error("Unauthorized");
  }

  const now = new Date();
  const locks = await storage.editorLocks.listActiveByResourceType(resourceType, now);
  return locks.map((lock) => ({
    resourceId: lock.resourceId,
    lock: lockPayload(lock)!,
  }));
}

export async function acquireEditorLock(
  resourceType: EditorLockResourceType,
  resourceId: string,
  user: User | undefined,
): Promise<EditorLockResponse> {
  if (!canUseEditorLocks(user)) {
    throw new Error("Unauthorized");
  }

  const now = new Date();
  const existing = await getFreshLock(resourceType, resourceId, now);

  if (!existing) {
    try {
      const created = await storage.editorLocks.create({
        resourceType,
        resourceId,
        lockedByUserId: user.id,
        lockedByName: displayNameForUser(user),
        lockedAt: now,
        lastHeartbeatAt: now,
        expiresAt: new Date(now.getTime() + EDITOR_LOCK_EXPIRY_MS),
      });
      return buildResponse(user, resourceType, resourceId, "acquired", created);
    } catch {
      const conflicted = await storage.editorLocks.getByResource(resourceType, resourceId);
      if (!conflicted) {
        return buildResponse(user, resourceType, resourceId, "expired_available", null);
      }
      if (conflicted.lockedByUserId === user.id) {
        return buildResponse(user, resourceType, resourceId, "acquired", conflicted);
      }
      return buildResponse(user, resourceType, resourceId, "locked_by_other", conflicted);
    }
  }

  if (existing.lockedByUserId === user.id) {
    const refreshed = (await refreshOwnedLock(existing, now)) ?? existing;
    return buildResponse(user, resourceType, resourceId, "acquired", refreshed);
  }

  return buildResponse(user, resourceType, resourceId, "locked_by_other", existing);
}

export async function heartbeatEditorLock(
  resourceType: EditorLockResourceType,
  resourceId: string,
  user: User | undefined,
): Promise<EditorLockResponse> {
  if (!canUseEditorLocks(user)) {
    throw new Error("Unauthorized");
  }

  const now = new Date();
  const lock = await getFreshLock(resourceType, resourceId, now);
  if (!lock) {
    return buildResponse(user, resourceType, resourceId, "expired_available", null);
  }

  if (lock.lockedByUserId !== user.id) {
    return buildResponse(user, resourceType, resourceId, "locked_by_other", lock);
  }

  const refreshed = (await refreshOwnedLock(lock, now)) ?? lock;
  return buildResponse(user, resourceType, resourceId, "acquired", refreshed);
}

export async function releaseEditorLock(
  resourceType: EditorLockResourceType,
  resourceId: string,
  user: User | undefined,
): Promise<EditorLockResponse> {
  if (!canUseEditorLocks(user)) {
    throw new Error("Unauthorized");
  }

  const now = new Date();
  const lock = await getFreshLock(resourceType, resourceId, now);
  if (!lock) {
    return buildResponse(user, resourceType, resourceId, "expired_available", null);
  }

  if (lock.lockedByUserId !== user.id) {
    return buildResponse(user, resourceType, resourceId, "locked_by_other", lock);
  }

  await storage.editorLocks.deleteById(lock.id);
  return buildResponse(user, resourceType, resourceId, "expired_available", null);
}
