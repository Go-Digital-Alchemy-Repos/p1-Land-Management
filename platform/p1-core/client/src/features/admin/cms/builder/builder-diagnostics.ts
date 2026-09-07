import type { ErrorInfo } from "react";
import type { BlockInstance } from "./block-registry";

interface ReportBuilderRenderErrorOptions {
  surface: string;
  error: Error;
  errorInfo: ErrorInfo;
  block?: Pick<BlockInstance, "id" | "type"> | null;
  context?: Record<string, unknown>;
}

export function reportBuilderRenderError({
  surface,
  error,
  errorInfo,
  block,
  context,
}: ReportBuilderRenderErrorOptions) {
  console.error("[BuilderDiagnostics] Render failure", {
    surface,
    blockId: block?.id ?? null,
    blockType: block?.type ?? null,
    message: error.message,
    stack: error.stack ?? null,
    componentStack: errorInfo.componentStack,
    context: context ?? null,
  });
}
