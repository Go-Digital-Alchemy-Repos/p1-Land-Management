import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DEFAULT_MESSAGE = "You have unsaved changes. Leave without saving?";

interface UseUnsavedChangesGuardOptions {
  isDirty: boolean;
  enabled?: boolean;
  message?: string;
}

export function useUnsavedChangesGuard({
  isDirty,
  enabled = true,
  message = DEFAULT_MESSAGE,
}: UseUnsavedChangesGuardOptions) {
  const shouldWarn = enabled && isDirty;
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    message: string;
    onProceed?: () => void;
  } | null>(null);

  useEffect(() => {
    if (!shouldWarn) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [message, shouldWarn]);

  const confirmIfDirty = useCallback(
    (onProceed?: () => void, overrideMessage?: string) => {
      const promptMessage = overrideMessage ?? message;
      if (shouldWarn) {
        setPendingConfirmation({ message: promptMessage, onProceed });
        return false;
      }

      onProceed?.();
      return true;
    },
    [message, shouldWarn],
  );

  const confirmDiscardChanges = useCallback(
    (onDiscard?: () => void, overrideMessage?: string) =>
      confirmIfDirty(onDiscard, overrideMessage),
    [confirmIfDirty],
  );

  const dialog = useMemo(
    () =>
      React.createElement(
        AlertDialog,
        {
          open: Boolean(pendingConfirmation),
          onOpenChange: (open: boolean) => {
            if (!open) setPendingConfirmation(null);
          },
        },
        React.createElement(
          AlertDialogContent,
          { className: "max-w-md rounded-lg border-slate-200 p-0 shadow-2xl" },
          React.createElement(
            "div",
            { className: "space-y-5 p-6" },
            React.createElement(
              AlertDialogHeader,
              { className: "space-y-3 text-left" },
              React.createElement(
                "div",
                {
                  className:
                    "flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700",
                },
                React.createElement(AlertTriangle, { className: "h-5 w-5" }),
              ),
              React.createElement(
                AlertDialogTitle,
                { className: "text-xl font-semibold text-slate-950" },
                "Unsaved changes",
              ),
              React.createElement(
                AlertDialogDescription,
                { className: "text-sm leading-6 text-slate-600" },
                pendingConfirmation?.message ?? DEFAULT_MESSAGE,
              ),
            ),
            React.createElement(
              AlertDialogFooter,
              { className: "gap-2 sm:justify-end sm:space-x-0" },
              React.createElement(AlertDialogCancel, { className: "mt-0" }, "Keep editing"),
              React.createElement(
                AlertDialogAction,
                {
                  className: "bg-red-600 text-white hover:bg-red-700",
                  onClick: () => {
                    const onProceed = pendingConfirmation?.onProceed;
                    setPendingConfirmation(null);
                    onProceed?.();
                  },
                },
                "Discard changes",
              ),
            ),
          ),
        ),
      ),
    [pendingConfirmation],
  );

  return {
    shouldWarn,
    confirmIfDirty,
    confirmDiscardChanges,
    dialog,
  };
}
