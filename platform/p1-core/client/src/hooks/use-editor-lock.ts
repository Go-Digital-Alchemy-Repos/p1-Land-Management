import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EditorLockResourceType, EditorLockResponse } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

const EDITOR_LOCK_HEARTBEAT_MS = 30_000;

type UseEditorLockOptions = {
  resourceType: EditorLockResourceType;
  resourceId?: string | null;
  enabled?: boolean;
};

type LockAction = "acquire" | "heartbeat" | "release";
type RunActionOptions = {
  background?: boolean;
};

async function postLockAction(
  action: LockAction,
  resourceType: EditorLockResourceType,
  resourceId: string,
): Promise<EditorLockResponse> {
  const res = await fetch(`/api/admin/editor-locks/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ resourceType, resourceId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to ${action} editor lock`);
  }

  return res.json();
}

async function getLockStatus(
  resourceType: EditorLockResourceType,
  resourceId: string,
): Promise<EditorLockResponse> {
  const res = await fetch(`/api/admin/editor-locks/${resourceType}/${resourceId}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to load editor lock");
  }

  return res.json();
}

function releaseLockKeepAlive(resourceType: EditorLockResourceType, resourceId: string) {
  const payload = JSON.stringify({ resourceType, resourceId });
  void fetch("/api/admin/editor-locks/release", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

export function useEditorLock({ resourceType, resourceId, enabled = true }: UseEditorLockOptions) {
  const { user } = useAuth();
  const [lockState, setLockState] = useState<EditorLockResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lostLock, setLostLock] = useState(false);
  const activeRef = useRef(false);
  const ownedLockRef = useRef(false);

  const isEnabled = Boolean(enabled && user && resourceId);
  const resolvedResourceId = resourceId ?? null;

  const runAction = useCallback(
    async (action: LockAction | "status", options: RunActionOptions = {}) => {
      if (!resolvedResourceId) return null;
      if (!options.background) {
        setIsLoading(true);
      }
      try {
        const nextState =
          action === "status"
            ? await getLockStatus(resourceType, resolvedResourceId)
            : await postLockAction(action, resourceType, resolvedResourceId);
        setLockState(nextState);
        setHasLoaded(true);
        setLostLock((current) => {
          if (action === "acquire" && nextState.ownedByCurrentUser) return false;
          if (nextState.status === "locked_by_other" && current) return true;
          if (nextState.status === "acquired" && nextState.ownedByCurrentUser) return false;
          return current;
        });
        return nextState;
      } finally {
        if (!options.background) {
          setIsLoading(false);
        }
      }
    },
    [resolvedResourceId, resourceType],
  );

  const acquire = useCallback(async () => {
    if (!isEnabled) return null;
    const nextState = await runAction("acquire");
    if (nextState && nextState.status === "locked_by_other" && activeRef.current) {
      setLostLock(false);
    }
    return nextState;
  }, [isEnabled, runAction]);

  const refresh = useCallback(async () => {
    if (!isEnabled) return null;
    return runAction("status");
  }, [isEnabled, runAction]);

  const refreshOrRecover = useCallback(async () => {
    if (!isEnabled) return null;

    try {
      const nextState = await runAction("heartbeat", { background: true });
      if (!nextState) return null;

      if (nextState.status === "acquired" && nextState.ownedByCurrentUser) {
        setLostLock(false);
        return nextState;
      }

      if (nextState.status === "expired_available") {
        const recoveredState = await runAction("acquire", { background: true });
        if (recoveredState?.status === "acquired" && recoveredState.ownedByCurrentUser) {
          setLostLock(false);
          return recoveredState;
        }
        if (recoveredState?.status === "locked_by_other") {
          setLostLock(true);
        }
        return recoveredState;
      }

      if (nextState.status === "locked_by_other") {
        setLostLock(true);
      }

      return nextState;
    } catch {
      return null;
    }
  }, [isEnabled, runAction]);

  useEffect(() => {
    ownedLockRef.current = Boolean(
      lockState?.ownedByCurrentUser && lockState.status === "acquired" && !lostLock,
    );
  }, [lockState, lostLock]);

  useEffect(() => {
    activeRef.current = true;
    if (!isEnabled) {
      setLockState(null);
      setHasLoaded(false);
      setLostLock(false);
      ownedLockRef.current = false;
      return () => {
        activeRef.current = false;
      };
    }

    void acquire();

    return () => {
      activeRef.current = false;
    };
  }, [acquire, isEnabled, resourceType, resolvedResourceId]);

  useEffect(() => {
    if (
      !isEnabled ||
      !lockState?.ownedByCurrentUser ||
      lockState.status !== "acquired" ||
      !resolvedResourceId
    ) {
      return;
    }

    const heartbeat = window.setInterval(async () => {
      await refreshOrRecover();
    }, EDITOR_LOCK_HEARTBEAT_MS);

    return () => window.clearInterval(heartbeat);
  }, [isEnabled, lockState, refreshOrRecover, resolvedResourceId]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const handleResync = () => {
      if (!activeRef.current) return;
      if (document.visibilityState && document.visibilityState !== "visible") return;
      void refreshOrRecover();
    };

    window.addEventListener("focus", handleResync);
    window.addEventListener("online", handleResync);
    document.addEventListener("visibilitychange", handleResync);

    return () => {
      window.removeEventListener("focus", handleResync);
      window.removeEventListener("online", handleResync);
      document.removeEventListener("visibilitychange", handleResync);
    };
  }, [isEnabled, refreshOrRecover]);

  useEffect(() => {
    if (!isEnabled || !resolvedResourceId) {
      return;
    }

    const handleBeforeUnload = () => {
      if (ownedLockRef.current) {
        releaseLockKeepAlive(resourceType, resolvedResourceId);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (ownedLockRef.current) {
        releaseLockKeepAlive(resourceType, resolvedResourceId);
      }
    };
  }, [isEnabled, resourceType, resolvedResourceId]);

  const isOwned = Boolean(
    lockState?.status === "acquired" && lockState.ownedByCurrentUser && !lostLock,
  );
  const isLockedByOther = Boolean(
    lockState?.status === "locked_by_other" && !lockState.ownedByCurrentUser,
  );
  const isReadOnly = Boolean(
    isEnabled &&
    (!hasLoaded ||
      isLoading ||
      lostLock ||
      !lockState ||
      lockState.status !== "acquired" ||
      !lockState.ownedByCurrentUser),
  );

  const summary = useMemo(() => {
    if (!isEnabled) return null;
    if (lostLock) {
      return {
        variant: "lost-lock" as const,
        title: "Editing access changed",
        description:
          "This editor lost its active lock, so we’ve switched it into read-only mode to protect your work. Refresh to continue.",
      };
    }
    if (!lockState) {
      return {
        variant: "locked-by-other" as const,
        title: "Checking edit access",
        description: "We’re confirming whether this item is available for editing.",
      };
    }
    if (lockState.status === "acquired" && lockState.ownedByCurrentUser) {
      return {
        variant: "active-owned" as const,
        title: "You’re editing this item",
        description:
          "Your edit lock is active and will keep refreshing while this editor stays open.",
      };
    }
    if (lockState.lock) {
      return {
        variant: "locked-by-other" as const,
        title: `Checked out by ${lockState.lock.lockedByName}`,
        description: `${lockState.lock.lockedByName} is already editing this item. Please try again after they leave the editor or the lock expires.`,
      };
    }
    return {
      variant: "locked-by-other" as const,
      title: "This item is available",
      description: "Try again to acquire the edit lock and continue editing.",
    };
  }, [isEnabled, lockState, lostLock]);

  return {
    hasLocking: isEnabled,
    lockState,
    summary,
    isLoading,
    hasLoaded,
    isOwned,
    isReadOnly,
    isLockedByOther,
    lostLock,
    acquire,
    refresh,
  };
}
