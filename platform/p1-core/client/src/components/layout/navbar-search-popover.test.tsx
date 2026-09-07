// @vitest-environment jsdom

import React, { act } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { NavbarSearchPopover } from "@/components/layout/navbar-search-popover";

const navigate = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => ["/", navigate],
}));

describe("NavbarSearchPopover", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    navigate.mockReset();
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

  it("submits to the site search route instead of the directory", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(NavbarSearchPopover));
    });

    const openButton = container.querySelector(
      '[data-testid="button-search-open"]',
    ) as HTMLButtonElement | null;
    expect(openButton).not.toBeNull();

    await act(async () => {
      openButton?.click();
    });

    const input = container.querySelector(
      '[data-testid="input-search"]',
    ) as HTMLInputElement | null;
    const form = input?.closest("form");
    expect(input).not.toBeNull();
    expect(form).not.toBeNull();

    await act(async () => {
      if (input) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value",
        )?.set;
        valueSetter?.call(input, "Application Process");
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    await act(async () => {
      form?.requestSubmit();
    });

    expect(navigate).toHaveBeenCalledWith("/search?query=Application%20Process");
  });
});
