import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

type LockSummaryState = {
  hasLocking: boolean;
  hasLoaded: boolean;
  isLockedByOther: boolean;
  lockState: {
    lock: {
      lockedByName: string;
    } | null;
  } | null;
};

type UseLockConflictGuardOptions = {
  active: boolean;
  resourceId?: string | null;
  resourceLabel: string;
  editorLock: LockSummaryState;
  onConflict: () => void;
};

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function useLockConflictGuard({
  active,
  resourceId,
  resourceLabel,
  editorLock,
  onConflict,
}: UseLockConflictGuardOptions) {
  const { toast } = useToast();
  const dismissedResourceRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active || !resourceId) {
      dismissedResourceRef.current = null;
    }
  }, [active, resourceId]);

  useEffect(() => {
    if (
      !active ||
      !resourceId ||
      !editorLock.hasLocking ||
      !editorLock.hasLoaded ||
      !editorLock.isLockedByOther ||
      dismissedResourceRef.current === resourceId
    ) {
      return;
    }

    dismissedResourceRef.current = resourceId;
    const lockedByName = editorLock.lockState?.lock?.lockedByName;
    toast({
      title: `${toTitleCase(resourceLabel)} already checked out`,
      description: lockedByName
        ? `${lockedByName} is already editing this ${resourceLabel}. Please try again after they leave the editor or the lock expires.`
        : `Another user is already editing this ${resourceLabel}. Please try again later.`,
      variant: "destructive",
    });
    onConflict();
  }, [
    active,
    editorLock.hasLoaded,
    editorLock.hasLocking,
    editorLock.isLockedByOther,
    editorLock.lockState,
    onConflict,
    resourceId,
    resourceLabel,
    toast,
  ]);
}
