import { useEffect, useRef, useState } from "react";
import { ShieldCheck, UserRoundCog, X } from "lucide-react";
import "./owner-impersonation.css";

export type Impersonation = {
  ownerId: string;
  ownerName: string;
  demo: boolean;
  expiresAt: string;
};
type Target = { id: string; name: string; email: string; role: string; demo: boolean };
type Request = (path: string, body?: unknown) => Promise<any>;

export function OwnerImpersonation({
  name, role, active, request,
}: {
  name: string;
  role: string | null;
  active?: Impersonation | null;
  request: Request;
}) {
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  useEffect(() => {
    if (!active) return;
    const delay = Math.max(0, new Date(active.expiresAt).getTime() - Date.now());
    const timer = window.setTimeout(() => {
      void request("/impersonation/stop", {}).then(() => window.location.assign("/"))
        .catch(() => setError("User switch expired. Return to Owner when connected."));
    }, Math.min(delay, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [active?.expiresAt]);
  if (role !== "owner" && !active) return null;

  async function show() {
    setOpen(true);
    setError("");
    setLoading(true);
    try {
      const data = await request("/impersonation/targets");
      setTargets(data.items || []);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function seed() {
    setBusy(true);
    setError("");
    try {
      await request("/impersonation/demo-personas", {});
      const data = await request("/impersonation/targets");
      setTargets(data.items || []);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function switchTo(target: Target) {
    setBusy(true);
    setError("");
    try {
      await request("/impersonation", { targetId: target.id });
      window.location.assign("/");
    } catch (cause) {
      setError((cause as Error).message);
      setBusy(false);
    }
  }
  async function returnToOwner() {
    setBusy(true);
    setError("");
    try {
      await request("/impersonation/stop", {});
      window.location.assign("/");
    } catch (cause) {
      setError((cause as Error).message);
      setBusy(false);
    }
  }

  return <>
    <button type="button" className="impersonation-trigger" onClick={() => void show()}>
      <UserRoundCog size={17} aria-hidden="true" />
      {active ? `Acting as ${name}` : "Switch user"}
    </button>
    {active && <div className="impersonation-banner" role="status">
      <ShieldCheck size={17} aria-hidden="true" />
      <span><strong>Acting as {name}</strong> · {role}{active.demo ? " · Demo account" : ""}. Changes are real and audited.</span>
      <button type="button" disabled={busy} onClick={() => void returnToOwner()}>Return to Owner</button>
    </div>}
    <dialog ref={dialog} className="impersonation-dialog" aria-labelledby="impersonation-title"
      onClose={() => setOpen(false)} onCancel={() => setOpen(false)}>
        <div className="impersonation-dialog-heading">
          <div><p className="eyebrow">OWNER ACCESS</p><h2 id="impersonation-title">Switch user</h2></div>
          <button type="button" aria-label="Close switcher" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>
        <p>Work in another account’s actual dashboard context. Its permissions and client or crew assignments apply. Changes can affect live records and are logged under your Owner session.</p>
        {active && <button type="button" className="impersonation-return" disabled={busy} onClick={() => void returnToOwner()}>Return to Owner · {active.ownerName}</button>}
        {loading && <p role="status">Loading accounts…</p>}
        {!loading && <>
          {targets.filter((target) => target.demo).length < 6 && <button type="button" className="impersonation-seed" disabled={busy} onClick={() => void seed()}>Create six demo user types</button>}
          <div className="impersonation-targets">
            {targets.map((target) => <button type="button" key={target.id} disabled={busy} onClick={() => void switchTo(target)}>
              <span><strong>{target.name}</strong><small>{target.email}</small></span>
              <span className="impersonation-role">{target.role}{target.demo ? " · Demo" : ""}</span>
            </button>)}
            {!targets.length && <p>No active accounts to switch into yet.</p>}
          </div>
        </>}
        {error && <p className="error" role="alert">{error}</p>}
    </dialog>
  </>;
}
