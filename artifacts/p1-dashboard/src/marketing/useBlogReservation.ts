import { useEffect, useRef, useState } from "react";
import {
  acquireMarketingBlogReservation,
  heartbeatMarketingBlogReservation,
  releaseMarketingBlogReservation,
} from "@workspace/api-client-react/dashboard";
import type { WebsiteEditorReservation } from "../../../../lib/api-client-react/src/dashboard/models";
export function useBlogReservation(id: string | null) {
  const [reservation, setReservation] =
      useState<WebsiteEditorReservation | null>(null),
    [error, setError] = useState("");
  const abort = useRef(new AbortController());
  async function acquire() {
    if (!id) return;
    const signal = abort.current.signal;
    try {
      const next = await acquireMarketingBlogReservation(id, {
        signal,
      });
      if (signal.aborted) return;
      setReservation(next);
      setError("");
    } catch (e) {
      if (!signal.aborted) {
        setReservation(null);
        setError((e as Error).message);
      }
    }
  }
  async function verify() {
    if (!id) return;
    const signal = abort.current.signal;
    const next = await heartbeatMarketingBlogReservation(id, { signal });
    if (signal.aborted) throw Error("Editor closed");
    setReservation(next);
    if (!next.ownedByCurrentUser)
      throw Error("Another editor holds this post. Your changes are retained.");
  }
  useEffect(() => {
    const controller = new AbortController();
    abort.current = controller;
    setReservation(null);
    setError("");
    if (!id) return () => controller.abort();
    void acquire();
    const timer = setInterval(
      () =>
        void verify().catch((e) => {
          if (!controller.signal.aborted) {
            setReservation(null);
            setError((e as Error).message);
          }
        }),
      30000,
    );
    return () => {
      controller.abort();
      clearInterval(timer);
      void releaseMarketingBlogReservation(id, { keepalive: true }).catch(
        () => {},
      );
    };
  }, [id]);
  return {
    owned: !id || reservation?.ownedByCurrentUser === true,
    verify,
    acquire,
    error,
    holder: reservation?.lock?.lockedByName,
  };
}
