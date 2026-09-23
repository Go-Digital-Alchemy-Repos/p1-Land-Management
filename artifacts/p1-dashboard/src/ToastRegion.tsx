import { useEffect, useState } from "react";

type Toast = { id: number; text: string; kind: "success" | "error"; undo?: () => void };

/** One shell-level pair of live regions; inline form errors remain beside inputs. */
export function ToastRegion({ notice, error }: { notice: string; error: string }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    if (!notice) return;
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, text: notice, kind: "success" as const }].slice(-3));
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 6000);
  }, [notice]);
  useEffect(() => {
    if (!error) return;
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, text: error, kind: "error" as const }].slice(-3));
  }, [error]);
  return <div className="toast-stack" aria-label="Notifications">
    <div role="status" aria-live="polite" aria-atomic="true">{toasts.filter((item) => item.kind === "success").map((item) => <div key={item.id} className="toast toast-success">{item.text}<button type="button" aria-label="Dismiss notification" onClick={() => setToasts((current) => current.filter((row) => row.id !== item.id))}>×</button></div>)}</div>
    <div role="alert" aria-live="assertive" aria-atomic="true">{toasts.filter((item) => item.kind === "error").map((item) => <div key={item.id} className="toast toast-error">{item.text}<button type="button" aria-label="Dismiss error" onClick={() => setToasts((current) => current.filter((row) => row.id !== item.id))}>×</button></div>)}</div>
  </div>;
}
