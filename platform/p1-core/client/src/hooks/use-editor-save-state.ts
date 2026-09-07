import { useEffect, useMemo, useState } from "react";

export type EditorSaveUiState = "clean" | "dirty" | "saving" | "saved" | "error";

interface UseEditorSaveStateOptions {
  isDirty: boolean;
  isSaving: boolean;
  resetDelayMs?: number;
}

export function useEditorSaveState({
  isDirty,
  isSaving,
  resetDelayMs = 2000,
}: UseEditorSaveStateOptions) {
  const [feedbackState, setFeedbackState] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    if (feedbackState === "idle") return;
    const timer = window.setTimeout(() => setFeedbackState("idle"), resetDelayMs);
    return () => window.clearTimeout(timer);
  }, [feedbackState, resetDelayMs]);

  const state = useMemo<EditorSaveUiState>(() => {
    if (isSaving) return "saving";
    if (feedbackState === "error") return "error";
    if (isDirty) return "dirty";
    if (feedbackState === "saved") return "saved";
    return "clean";
  }, [feedbackState, isDirty, isSaving]);

  return {
    state,
    markSaved: () => setFeedbackState("saved"),
    markError: () => setFeedbackState("error"),
    clearFeedback: () => setFeedbackState("idle"),
  };
}
