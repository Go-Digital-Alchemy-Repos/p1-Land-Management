import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Loader2, PencilLine } from "lucide-react";
import type { EditorSaveUiState } from "@/hooks/use-editor-save-state";

interface EditorSaveIndicatorProps {
  state: EditorSaveUiState;
  className?: string;
}

const COPY: Record<EditorSaveUiState, string> = {
  clean: "All changes saved",
  dirty: "Unsaved changes",
  saving: "Saving changes",
  saved: "Changes saved",
  error: "Save failed",
};

export function EditorSaveIndicator({ state, className }: EditorSaveIndicatorProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 border",
        state === "clean" && "border-slate-200 bg-slate-50 text-slate-700",
        state === "dirty" && "border-amber-300 bg-amber-50 text-amber-800",
        state === "saving" && "border-sky-300 bg-sky-50 text-sky-800",
        state === "saved" && "border-emerald-300 bg-emerald-50 text-emerald-800",
        state === "error" && "border-red-300 bg-red-50 text-red-800",
        className,
      )}
    >
      {state === "saving" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : state === "saved" || state === "clean" ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : state === "error" ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : (
        <PencilLine className="h-3.5 w-3.5" />
      )}
      {COPY[state]}
    </Badge>
  );
}
