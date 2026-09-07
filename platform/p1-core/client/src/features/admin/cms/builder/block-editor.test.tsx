// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ALL_BLOCKS } from "@/features/admin/cms/builder/block-registry";
import { ResilientBlockEditor } from "@/features/admin/cms/builder/block-editor";

describe("ResilientBlockEditor", () => {
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

  it("renders every registered block definition without crashing the inspector", async () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    root = createRoot(container);

    for (const blockDef of ALL_BLOCKS) {
      await act(async () => {
        root!.render(
          React.createElement(
            QueryClientProvider,
            { client },
            React.createElement(ResilientBlockEditor, {
              blockDef,
              blockType: blockDef.type,
              props: { ...blockDef.defaultProps },
              onChange: vi.fn(),
            }),
          ),
        );
      });

      expect(container.textContent?.length ?? 0).toBeGreaterThan(0);
    }
  });
});
