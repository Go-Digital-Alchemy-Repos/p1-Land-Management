// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { useLockConflictGuard } from "@/hooks/use-lock-conflict-guard";

const toastMock = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

type HarnessProps = {
  active: boolean;
  resourceId?: string | null;
  resourceLabel: string;
  editorLock: {
    hasLocking: boolean;
    hasLoaded: boolean;
    isLockedByOther: boolean;
    lockState: {
      lock: {
        lockedByName: string;
      } | null;
    } | null;
  };
  onConflict: () => void;
};

function LockConflictHarness(props: HarnessProps) {
  useLockConflictGuard(props);
  return React.createElement("div", null, "harness");
}

describe("useLockConflictGuard", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  const lockedByOtherState = {
    hasLocking: true,
    hasLoaded: true,
    isLockedByOther: true,
    lockState: {
      lock: {
        lockedByName: "Alex Admin",
      },
    },
  } as const;

  beforeEach(() => {
    toastMock.mockReset();
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
    container.remove();
    document.body.innerHTML = "";
  });

  async function renderHarness(props: HarnessProps) {
    if (!root) {
      root = createRoot(container);
    }

    await act(async () => {
      root!.render(React.createElement(LockConflictHarness, props));
    });
  }

  it("toasts and invokes the conflict callback when another user already holds the lock", async () => {
    const onConflict = vi.fn();

    await renderHarness({
      active: true,
      resourceId: "page-1",
      resourceLabel: "page",
      editorLock: lockedByOtherState,
      onConflict,
    });

    expect(onConflict).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Page already checked out",
        description:
          "Alex Admin is already editing this page. Please try again after they leave the editor or the lock expires.",
        variant: "destructive",
      }),
    );
  });

  it("does not re-fire repeatedly for the same locked resource", async () => {
    const onConflict = vi.fn();

    const props: HarnessProps = {
      active: true,
      resourceId: "page-1",
      resourceLabel: "page",
      editorLock: lockedByOtherState,
      onConflict,
    };

    await renderHarness(props);
    await renderHarness(props);

    expect(onConflict).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledTimes(1);
  });

  it("resets after the resource changes so the next conflict still surfaces", async () => {
    const onConflict = vi.fn();

    await renderHarness({
      active: true,
      resourceId: "page-1",
      resourceLabel: "page",
      editorLock: lockedByOtherState,
      onConflict,
    });

    await renderHarness({
      active: false,
      resourceId: null,
      resourceLabel: "page",
      editorLock: {
        hasLocking: false,
        hasLoaded: false,
        isLockedByOther: false,
        lockState: null,
      },
      onConflict,
    });

    await renderHarness({
      active: true,
      resourceId: "page-2",
      resourceLabel: "page",
      editorLock: lockedByOtherState,
      onConflict,
    });

    expect(onConflict).toHaveBeenCalledTimes(2);
    expect(toastMock).toHaveBeenCalledTimes(2);
  });
});
