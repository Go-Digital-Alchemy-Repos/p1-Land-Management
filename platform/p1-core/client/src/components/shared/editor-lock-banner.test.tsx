// @vitest-environment jsdom

import React from "react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { EditorLockBanner } from "@/components/shared/editor-lock-banner";

describe("EditorLockBanner", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
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

  async function renderBanner(props: React.ComponentProps<typeof EditorLockBanner>) {
    root = createRoot(container);
    await act(async () => {
      root!.render(React.createElement(EditorLockBanner, props));
    });
  }

  it("does not show takeover controls even when another user holds the lock", async () => {
    await renderBanner({
      variant: "locked-by-other",
      title: "Checked out by Alex Admin",
      description: "Alex Admin is already editing this item. Please try again later.",
      onRefresh: vi.fn(),
    });
    expect(container.textContent).toContain("Checked out by Alex Admin");
    expect(container.textContent).not.toContain("Take Over");
  });

  it("does not show takeover controls on the owned-state banner", async () => {
    await renderBanner({
      variant: "active-owned",
      title: "You’re editing this item",
      description: "Your lock is active.",
    });

    expect(container.textContent).toContain("You’re editing this item");
    expect(container.textContent).not.toContain("Take Over");
  });
});
