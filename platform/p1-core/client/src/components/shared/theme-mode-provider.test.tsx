// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeModeProvider, useThemeMode } from "@/components/shared/theme-mode-provider";

function ThemeHarness() {
  const { mode, setMode } = useThemeMode();

  return (
    <button type="button" onClick={() => setMode(mode === "dark" ? "light" : "dark")}>
      {mode}
    </button>
  );
}

describe("ThemeModeProvider", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    window.localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    document.documentElement.classList.remove("dark");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.documentElement.classList.remove("dark");
    window.localStorage.clear();
  });

  it("persists theme mode and toggles the dark class", () => {
    act(() => {
      root.render(
        <ThemeModeProvider>
          <ThemeHarness />
        </ThemeModeProvider>,
      );
    });

    const button = container.querySelector("button")!;
    expect(button.textContent).toBe("system");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    act(() => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(window.localStorage.getItem("core-platform-theme-mode")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
