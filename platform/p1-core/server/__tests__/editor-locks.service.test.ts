import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EditorLock, EditorLockResourceType, User } from "@shared/schema";

let currentLock: EditorLock | undefined;

const mockGetByResource = vi.fn(async () => currentLock);
const mockCreate = vi.fn(async (data) => {
  currentLock = {
    id: "lock-1",
    createdAt: new Date("2026-04-15T20:30:00.000Z"),
    updatedAt: new Date("2026-04-15T20:30:00.000Z"),
    ...data,
  };
  return currentLock!;
});
const mockUpdate = vi.fn(async (_id: string, data) => {
  if (!currentLock) return undefined;
  currentLock = {
    ...currentLock,
    ...data,
    updatedAt: data.updatedAt ?? new Date("2026-04-15T20:10:00.000Z"),
  };
  return currentLock;
});
const mockDeleteById = vi.fn(async () => {
  currentLock = undefined;
  return true;
});
const mockDeleteExpiredForResource = vi.fn(
  async (_type: EditorLockResourceType, _resourceId: string, now: Date) => {
    if (currentLock && new Date(currentLock.expiresAt).getTime() <= now.getTime()) {
      currentLock = undefined;
      return 1;
    }
    return 0;
  },
);
const mockListActiveByResourceType = vi.fn(async () => (currentLock ? [currentLock] : []));

vi.mock("../storage", () => ({
  storage: {
    editorLocks: {
      getByResource: mockGetByResource,
      create: mockCreate,
      update: mockUpdate,
      deleteById: mockDeleteById,
      deleteExpiredForResource: mockDeleteExpiredForResource,
      listActiveByResourceType: mockListActiveByResourceType,
    },
  },
}));

const adminUser: User = {
  id: "admin-1",
  email: "admin@example.com",
  password: "secret",
  firstName: "Alex",
  lastName: "Admin",
  role: "admin",
  adminPermissions: [],
  formNotificationFormIds: [],
  profileImageUrl: null,
  isSuspended: false,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const editorUser: User = {
  ...adminUser,
  id: "editor-1",
  email: "editor@example.com",
  firstName: "Erin",
  lastName: "Editor",
  role: "editor",
  adminPermissions: ["content"],
};

describe("editor-locks.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T20:30:00.000Z"));
    currentLock = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns locked_by_other when another user already holds the resource", async () => {
    const service = await import("../services/editor-locks.service");

    const first = await service.acquireEditorLock("cms_page", "page-1", adminUser);
    const second = await service.acquireEditorLock("cms_page", "page-1", editorUser);

    expect(first.status).toBe("acquired");
    expect(second.status).toBe("locked_by_other");
    expect(second.lock?.lockedByUserId).toBe(adminUser.id);
  });

  it("refreshes the expiry when the owner heartbeats", async () => {
    const service = await import("../services/editor-locks.service");
    await service.acquireEditorLock("blog_post", "post-1", adminUser);
    currentLock = {
      ...currentLock!,
      expiresAt: new Date("2026-04-15T20:31:00.000Z"),
    };

    const heartbeat = await service.heartbeatEditorLock("blog_post", "post-1", adminUser);

    expect(heartbeat.status).toBe("acquired");
    expect(new Date(String(currentLock?.expiresAt)).getTime()).toBeGreaterThan(
      new Date("2026-04-15T20:31:00.000Z").getTime(),
    );
  });

  it("treats expired locks as available and lets a new user reacquire", async () => {
    currentLock = {
      id: "expired-lock",
      resourceType: "form",
      resourceId: "form-1",
      lockedByUserId: adminUser.id,
      lockedByName: "Alex Admin",
      lockedAt: new Date("2026-04-15T20:00:00.000Z"),
      lastHeartbeatAt: new Date("2026-04-15T20:00:00.000Z"),
      expiresAt: new Date("2026-04-15T20:00:00.000Z"),
      createdAt: new Date("2026-04-15T20:00:00.000Z"),
      updatedAt: new Date("2026-04-15T20:00:00.000Z"),
    };

    const service = await import("../services/editor-locks.service");
    const acquired = await service.acquireEditorLock("form", "form-1", editorUser);

    expect(mockDeleteExpiredForResource).toHaveBeenCalled();
    expect(acquired.status).toBe("acquired");
    expect(acquired.lock?.lockedByUserId).toBe(editorUser.id);
  });

  it("does not let another admin release someone else's active lock", async () => {
    const secondAdmin: User = {
      ...adminUser,
      id: "admin-2",
      email: "second-admin@example.com",
      firstName: "Sam",
      lastName: "Supervisor",
    };

    const service = await import("../services/editor-locks.service");
    await service.acquireEditorLock("cms_page", "page-1", adminUser);

    const releaseAttempt = await service.releaseEditorLock("cms_page", "page-1", secondAdmin);

    expect(releaseAttempt.status).toBe("locked_by_other");
    expect(releaseAttempt.lock?.lockedByUserId).toBe(adminUser.id);
    expect(mockDeleteById).not.toHaveBeenCalled();
  });
});
