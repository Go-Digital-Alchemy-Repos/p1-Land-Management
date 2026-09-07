// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { ErrorBoundary } from "@/components/shared/error-boundary";

function ThrowingChild() {
  throw new Error("Boundary exploded");
}

describe("ErrorBoundary", () => {
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

  it("renders the fallback and forwards the captured error to onError", async () => {
    const onError = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    root = createRoot(container);

    await act(async () => {
      root!.render(
        <ErrorBoundary
          name="test-boundary"
          onError={onError}
          fallback={<div data-testid="boundary-fallback">Fallback UI</div>}
        >
          <ThrowingChild />
        </ErrorBoundary>,
      );
    });

    expect(container.querySelector('[data-testid="boundary-fallback"]')?.textContent).toBe(
      "Fallback UI",
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        componentStack: expect.any(String),
      }),
    );
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
