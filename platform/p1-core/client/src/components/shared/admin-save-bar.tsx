import React from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorSaveIndicator } from "@/components/shared/editor-save-indicator";
import type { EditorSaveUiState } from "@/hooks/use-editor-save-state";
import { cn } from "@/lib/utils";

interface AdminSaveBarProps {
  state: EditorSaveUiState;
  primaryLabel?: string;
  savingLabel?: string;
  disabled?: boolean;
  form?: string;
  type?: "button" | "submit";
  onSave?: () => void;
  cancelLabel?: string;
  onCancel?: () => void;
  className?: string;
  buttonTestId?: string;
}

export function AdminSaveBar({
  state,
  primaryLabel = "Save changes",
  savingLabel = "Saving changes",
  disabled = false,
  form,
  type = "submit",
  onSave,
  cancelLabel,
  onCancel,
  className,
  buttonTestId = "button-admin-save",
}: AdminSaveBarProps) {
  const isSaving = state === "saving";

  return (
    <div
      className={cn(
        "admin-save-bar flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      data-testid="admin-save-bar"
    >
      <EditorSaveIndicator state={state} />
      <div className="flex flex-col-reverse gap-2 xs:flex-row xs:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {cancelLabel ?? "Cancel"}
          </Button>
        )}
        <Button
          type={type}
          form={form}
          onClick={onSave}
          className="w-full xs:min-w-[160px] xs:w-auto"
          disabled={disabled}
          data-testid={buttonTestId}
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? savingLabel : primaryLabel}
        </Button>
      </div>
    </div>
  );
}
