import { describe, expect, it, vi, afterEach } from "vitest";
import { reportBuilderRenderError } from "./builder-diagnostics";

describe("reportBuilderRenderError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs structured builder surface context for preview failures", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Preview failed");

    reportBuilderRenderError({
      surface: "builder-block-preview",
      error,
      errorInfo: {
        componentStack: "\n    at PreviewBlock",
      },
      block: {
        id: "block-123",
        type: "cta",
      },
      context: {
        index: 2,
        label: "CTA",
      },
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[BuilderDiagnostics] Render failure",
      expect.objectContaining({
        surface: "builder-block-preview",
        blockId: "block-123",
        blockType: "cta",
        message: "Preview failed",
        componentStack: "\n    at PreviewBlock",
        context: expect.objectContaining({
          index: 2,
          label: "CTA",
        }),
      }),
    );
  });
});
