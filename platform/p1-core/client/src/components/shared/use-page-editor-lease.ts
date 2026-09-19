import { useCallback, useEffect, useMemo, useRef, useState } from "react";
export type PageLeaseState = {
  status: string;
  ownedByCurrentEditor?: boolean;
  ownedByCurrentUser: boolean;
  lock: { id: string; lockedByName: string; editorInstanceId?: string | null } | null;
};
export type PageWritePreconditions = {
  expectedVersion: number;
  editorInstanceId: string;
  leaseId: string;
};
export type PageLeaseTransport = (
  action: "acquire" | "heartbeat" | "release",
  id: string,
  payload: { editorInstanceId: string; leaseId?: string },
  options?: RequestInit,
) => Promise<PageLeaseState>;
/** A page lease belongs to this editor instance, never merely to the signed-in user. */
export function usePageEditorLease(id: string | null, transport: PageLeaseTransport) {
  const editorInstanceId = useMemo(() => crypto.randomUUID(), [id]);
  const [state, setState] = useState<PageLeaseState | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const current = useRef<PageLeaseState | null>(null),
    controller = useRef<AbortController | null>(null),
    releaseTimer = useRef<{
      id: string;
      instance: string;
      timer: ReturnType<typeof setTimeout>;
    } | null>(null);
  const acquire = useCallback(async () => {
    if (!id) return null;
    const signal = controller.current?.signal;
    setLoading(true);
    try {
      const result = await transport("acquire", id, { editorInstanceId }, { signal });
      if (signal?.aborted) return null;
      current.current = result;
      setState(result);
      setError("");
      return result;
    } catch (e) {
      if (!signal?.aborted) {
        current.current = null;
        setState(null);
        setError((e as Error).message);
      }
      return null;
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [id, editorInstanceId, transport]);
  const verify = useCallback(async () => {
    if (!id) throw Error("Save this page before changing its publication status.");
    const lease = current.current;
    if (!lease?.ownedByCurrentEditor || !lease.lock)
      throw Error("This editor does not hold the page reservation. Your draft is retained.");
    const signal = controller.current?.signal;
    try {
      const result = await transport(
        "heartbeat",
        id,
        { editorInstanceId, leaseId: lease.lock.id },
        { signal },
      );
      if (signal?.aborted) throw Error("Editor closed");
      current.current = result;
      setState(result);
      if (!result.ownedByCurrentEditor || !result.lock)
        throw Error("Page reservation lost. Your draft is retained.");
      return result;
    } catch (e) {
      if (!signal?.aborted) {
        current.current = null;
        setState(null);
        setError((e as Error).message);
      }
      throw e;
    }
  }, [id, editorInstanceId, transport]);
  const preconditions = useCallback(
    async (expectedVersion: number): Promise<PageWritePreconditions> => {
      if (!Number.isInteger(expectedVersion) || expectedVersion <= 0)
        throw Error("Reload this page to obtain its saved version before editing.");
      const lease = await verify();
      return { expectedVersion, editorInstanceId, leaseId: lease.lock!.id };
    },
    [verify, editorInstanceId],
  );
  useEffect(() => {
    if (releaseTimer.current?.id === id && releaseTimer.current.instance === editorInstanceId)
      clearTimeout(releaseTimer.current.timer);
    const abort = new AbortController();
    controller.current = abort;
    current.current = null;
    setState(null);
    setError("");
    if (!id) return () => abort.abort();
    void acquire();
    const timer = setInterval(() => {
      if (current.current?.ownedByCurrentEditor) void verify().catch(() => {});
    }, 30000);
    const release = () => {
      const lease = current.current;
      if (lease?.ownedByCurrentEditor && lease.lock)
        void transport(
          "release",
          id,
          { editorInstanceId, leaseId: lease.lock.id },
          { keepalive: true },
        ).catch(() => {});
    };
    window.addEventListener("beforeunload", release);
    return () => {
      abort.abort();
      clearInterval(timer);
      window.removeEventListener("beforeunload", release);
      const lease = current.current;
      releaseTimer.current = {
        id,
        instance: editorInstanceId,
        timer: setTimeout(() => {
          if (lease?.ownedByCurrentEditor && lease.lock)
            void transport(
              "release",
              id,
              { editorInstanceId, leaseId: lease.lock.id },
              { keepalive: true },
            ).catch(() => {});
        }, 0),
      };
    };
  }, [id, editorInstanceId, acquire, verify, transport]);
  const owned = !id || Boolean(state?.ownedByCurrentEditor && state.lock);
  return {
    owned,
    state,
    error,
    loading,
    acquire,
    verify,
    preconditions,
    editorInstanceId,
    holder: state?.lock?.lockedByName,
  };
}
