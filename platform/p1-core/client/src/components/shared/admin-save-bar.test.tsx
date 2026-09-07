// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminSaveBar } from "@/components/shared/admin-save-bar";

describe("AdminSaveBar", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("uses canonical dirty and saving copy", () => {
    act(() => {
      root.render(<AdminSaveBar state="dirty" primaryLabel="Save Event" />);
    });

    expect(container.textContent).toContain("Unsaved changes");
    expect(container.textContent).toContain("Save Event");

    act(() => {
      root.render(<AdminSaveBar state="saving" primaryLabel="Save Event" />);
    });

    expect(container.textContent).toContain("Saving changes");
  });

  it("keeps secondary actions before the primary save action", () => {
    const onCancel = vi.fn();

    act(() => {
      root.render(
        <AdminSaveBar
          state="clean"
          primaryLabel="Save changes"
          cancelLabel="Cancel"
          onCancel={onCancel}
        />,
      );
    });

    const buttons = [...container.querySelectorAll("button")].map((button) => button.textContent);
    expect(buttons).toEqual(["Cancel", "Save changes"]);
  });
});
