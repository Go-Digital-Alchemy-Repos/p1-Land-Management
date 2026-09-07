// @vitest-environment jsdom

import React, { act } from "react";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateUserSheet } from "@/features/admin/users-page";

describe("CreateUserSheet", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { React?: typeof React; IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).React = React;
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    (globalThis as typeof globalThis & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver =
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver;
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

  async function renderSheet() {
    const client = new QueryClient();
    root = createRoot(container);

    await act(async () => {
      root!.render(
        React.createElement(
          QueryClientProvider,
          { client },
          React.createElement(CreateUserSheet, {
            open: true,
            onOpenChange: () => {},
            activeForms: [],
          }),
        ),
      );
    });
  }

  it("shows both system roles and swaps dependent controls when the role changes", async () => {
    await renderSheet();

    const adminButton = document.querySelector(
      '[data-testid="create-role-admin"]',
    ) as HTMLButtonElement | null;
    const editorButton = document.querySelector(
      '[data-testid="create-role-editor"]',
    ) as HTMLButtonElement | null;

    expect(adminButton?.textContent).toContain("System Admin");
    expect(editorButton?.textContent).toContain("Editor");
    expect(document.body.textContent).toContain("Editor Permissions");

    await act(async () => {
      adminButton?.click();
    });

    expect(document.body.textContent).toContain(
      "System Admins can access every admin tool group, including System settings.",
    );
    expect(document.body.textContent).not.toContain("Editor Permissions");

    await act(async () => {
      editorButton?.click();
    });

    expect(document.body.textContent).toContain("Editor Permissions");
  });
});
