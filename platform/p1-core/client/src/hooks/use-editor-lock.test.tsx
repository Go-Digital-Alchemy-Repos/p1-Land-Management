// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { useEditorLock } from "@/hooks/use-editor-lock";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      firstName: "Alex",
      lastName: "Admin",
      email: "alex@example.com",
      role: "admin",
      adminPermissions: ["content", "design", "directory"],
    },
  }),
}));

type HarnessProps = {
  resourceId?: string | null;
  enabled?: boolean;
};

function createLockResponse(
  status: "acquired" | "locked_by_other" | "expired_available",
  overrides: Partial<{
    ownedByCurrentUser: boolean;
    lockedByName: string;
  }> = {},
) {
  const ownedByCurrentUser = overrides.ownedByCurrentUser ?? status === "acquired";
  const lockedByName = overrides.lockedByName ?? "Jordan Editor";

  return {
    status,
    resourceType: "cms_page" as const,
    resourceId: "page-1",
    ownedByCurrentUser,
    lock:
      status === "expired_available"
        ? null
        : {
            id: "lock-1",
            lockedByUserId: ownedByCurrentUser ? "user-1" : "user-2",
            lockedByName: ownedByCurrentUser ? "Alex Admin" : lockedByName,
            lockedAt: new Date("2026-04-16T10:00:00.000Z").toISOString(),
            lastHeartbeatAt: new Date("2026-04-16T10:00:00.000Z").toISOString(),
            expiresAt: new Date("2026-04-16T10:05:00.000Z").toISOString(),
          },
  };
}

function EditorLockHarness({ resourceId = "page-1", enabled = true }: HarnessProps) {
  const lock = useEditorLock({
    resourceType: "cms_page",
    resourceId,
    enabled,
  });

  return React.createElement(
    "div",
    {
      "data-testid": "lock-state",
      "data-owned": String(lock.isOwned),
      "data-readonly": String(lock.isReadOnly),
      "data-loaded": String(lock.hasLoaded),
      "data-lost-lock": String(lock.lostLock),
    },
    lock.summary?.title ?? "no-summary",
  );
}

describe("useEditorLock", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    (
      globalThis as typeof globalThis & { React?: typeof React; IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).React = React;
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    vi.useRealTimers();
    vi.unstubAllGlobals();
    container.remove();
    document.body.innerHTML = "";
  });

  async function renderHarness(props: HarnessProps = {}) {
    if (!root) {
      root = createRoot(container);
    }

    await act(async () => {
      root!.render(React.createElement(EditorLockHarness, props));
    });
  }

  function getStateNode() {
    return container.querySelector('[data-testid="lock-state"]') as HTMLDivElement | null;
  }

  it("acquires the lock on mount and reports editable state for the current user", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => createLockResponse("acquired"),
      }),
    );

    await renderHarness();
    await act(async () => {
      await Promise.resolve();
    });

    const stateNode = getStateNode();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/editor-locks/acquire",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(stateNode?.dataset.owned).toBe("true");
    expect(stateNode?.dataset.readonly).toBe("false");
    expect(stateNode?.textContent).toBe("You’re editing this item");
  });

  it("reacquires the lock if a heartbeat finds the lock temporarily expired", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createLockResponse("acquired"),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createLockResponse("expired_available", { ownedByCurrentUser: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createLockResponse("acquired"),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => createLockResponse("acquired"),
      });

    vi.stubGlobal("fetch", fetchMock);

    await renderHarness();
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    const stateNode = getStateNode();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/admin/editor-locks/heartbeat",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/admin/editor-locks/acquire",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(stateNode?.dataset.owned).toBe("true");
    expect(stateNode?.dataset["lostLock"]).toBe("false");
    expect(stateNode?.textContent).toBe("You’re editing this item");
  });

  it("switches into lost-lock read-only mode when another user holds the resource after refresh", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createLockResponse("acquired"),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createLockResponse("locked_by_other", {
            ownedByCurrentUser: false,
            lockedByName: "Jamie Editor",
          }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () =>
          createLockResponse("locked_by_other", {
            ownedByCurrentUser: false,
            lockedByName: "Jamie Editor",
          }),
      });

    vi.stubGlobal("fetch", fetchMock);

    await renderHarness();
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    const stateNode = getStateNode();
    expect(stateNode?.dataset.readonly).toBe("true");
    expect(stateNode?.dataset["lostLock"]).toBe("true");
    expect(stateNode?.textContent).toBe("Editing access changed");
  });
});
