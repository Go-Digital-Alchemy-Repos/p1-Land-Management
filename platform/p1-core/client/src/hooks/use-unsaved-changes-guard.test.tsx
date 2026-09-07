// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";

type HarnessProps = {
  isDirty: boolean;
  enabled?: boolean;
  message?: string;
  onReady: (api: ReturnType<typeof useUnsavedChangesGuard>) => void;
};

function UnsavedChangesHarness({ onReady, ...props }: HarnessProps) {
  const api = useUnsavedChangesGuard(props);
  onReady(api);
  return React.createElement("div", null, "guard", api.dialog);
}

describe("useUnsavedChangesGuard", () => {
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
    vi.restoreAllMocks();
    container.remove();
    document.body.innerHTML = "";
  });

  async function renderHarness(props: Omit<HarnessProps, "onReady">) {
    if (!root) {
      root = createRoot(container);
    }

    let latestApi: ReturnType<typeof useUnsavedChangesGuard> | null = null;

    await act(async () => {
      root!.render(
        React.createElement(UnsavedChangesHarness, {
          ...props,
          onReady: (api) => {
            latestApi = api;
          },
        }),
      );
    });

    if (!latestApi) {
      throw new Error("Guard API not ready");
    }

    return latestApi;
  }

  function getButtonByText(text: string) {
    const button = [...document.body.querySelectorAll("button")].find((element) =>
      element.textContent?.includes(text),
    ) as HTMLButtonElement | undefined;
    if (!button) throw new Error(`Unable to find button: ${text}`);
    return button;
  }

  it("opens a custom dialog before discarding when the editor is dirty", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const onDiscard = vi.fn();
    const api = await renderHarness({ isDirty: true });

    await act(async () => {
      expect(api.confirmDiscardChanges(onDiscard)).toBe(false);
    });

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Unsaved changes");
    expect(document.body.textContent).toContain("You have unsaved changes. Leave without saving?");
    expect(onDiscard).not.toHaveBeenCalled();

    await act(async () => {
      getButtonByText("Discard changes").click();
    });

    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it("does not discard when the user keeps editing", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const onDiscard = vi.fn();
    const api = await renderHarness({ isDirty: true, message: "Leave this editor?" });

    await act(async () => {
      expect(api.confirmDiscardChanges(onDiscard)).toBe(false);
    });

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Leave this editor?");

    await act(async () => {
      getButtonByText("Keep editing").click();
    });

    expect(onDiscard).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("Leave this editor?");
  });

  it("supports override messages for non-navigation dirty actions", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const onProceed = vi.fn();
    const api = await renderHarness({ isDirty: true, message: "Leave this editor?" });

    await act(async () => {
      expect(api.confirmIfDirty(onProceed, "Publish the saved version instead?")).toBe(false);
    });

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Publish the saved version instead?");

    await act(async () => {
      getButtonByText("Discard changes").click();
    });

    expect(onProceed).toHaveBeenCalledTimes(1);
  });

  it("registers a beforeunload prompt only while dirty", async () => {
    await renderHarness({ isDirty: true, message: "Leave this editor?" });

    const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent & {
      returnValue?: string;
    };
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });
});
