import { useEffect, useRef, useState } from "react";
import {
  getLeadFollowUp,
  updateLeadFollowUp,
} from "@workspace/api-client-react/dashboard";
import { useCmsUnsavedChanges } from "./marketing/useCmsUnsavedChanges";
import "./lead-follow-up.css";
type FollowUp = Awaited<ReturnType<typeof updateLeadFollowUp>>;
type Owner = Awaited<ReturnType<typeof getLeadFollowUp>>["owners"][number];
const stages = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const;
function localTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function LeadFollowUp({
  leadId,
  onSaved,
}: {
  leadId: string;
  onSaved: (lead: FollowUp) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lead-follow-up">
      <button
        type="button"
        aria-expanded={open}
        disabled={open}
        onClick={() => setOpen(true)}
      >
        Manage inquiry
      </button>
      {open && (
        <FollowUpEditor key={leadId} leadId={leadId} onSaved={onSaved} />
      )}
    </div>
  );
}
function FollowUpEditor({
  leadId,
  onSaved,
}: {
  leadId: string;
  onSaved: (lead: FollowUp) => void;
}) {
  const [saved, setSaved] = useState<FollowUp | null>(null),
    [owners, setOwners] = useState<Owner[]>([]),
    [owner, setOwner] = useState(""),
    [status, setStatus] = useState("new"),
    [action, setAction] = useState(""),
    [due, setDue] = useState(""),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const alive = useRef(true),
    gate = useRef(false),
    controller = useRef<AbortController | null>(null);
  const dirty = Boolean(
    saved &&
    (owner !== (saved.owner_id || "") ||
      status !== saved.status ||
      action !== (saved.next_action || "") ||
      due !== localTime(saved.next_action_due_at)),
  );
  useCmsUnsavedChanges(
    dirty || uncertain,
    "Leave these inquiry changes? Reload the saved inquiry after an unconfirmed save.",
  );
  function options() {
    controller.current = new AbortController();
    return {
      signal: AbortSignal.any([
        controller.current.signal,
        AbortSignal.timeout(30000),
      ]),
    };
  }
  function apply(lead: FollowUp) {
    setSaved(lead);
    setOwner(lead.owner_id || "");
    setStatus(lead.status);
    setAction(lead.next_action || "");
    setDue(localTime(lead.next_action_due_at));
    setUncertain(false);
  }
  async function load() {
    if (gate.current) return;
    if (
      (dirty || uncertain) &&
      !confirm("Discard local follow-up changes and reload the saved inquiry?")
    )
      return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      const view = await getLeadFollowUp(leadId, options());
      if (alive.current) {
        apply(view.lead);
        setOwners(view.owners);
        onSaved(view.lead);
      }
    } catch {
      if (alive.current)
        setError(
          "Could not load the saved inquiry. Your local changes are still here.",
        );
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, [leadId]);
  async function save() {
    if (
      gate.current ||
      !saved ||
      uncertain ||
      !stages.includes(status as (typeof stages)[number])
    )
      return;
    let nextDue: string | null;
    try {
      nextDue =
        due === localTime(saved.next_action_due_at)
          ? saved.next_action_due_at
          : due
            ? new Date(due).toISOString()
            : null;
      if (due && localTime(nextDue) !== due) throw Error("Skipped local time");
    } catch {
      setError(
        "Enter a valid local due time. Times skipped by daylight saving are unavailable.",
      );
      return;
    }
    gate.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await updateLeadFollowUp(
        leadId,
        {
          expectedVersion: saved.version,
          ownerId: owner || null,
          status: status as (typeof stages)[number],
          nextAction: action.trim(),
          nextActionDueAt: nextDue,
        },
        options(),
      );
      if (alive.current) {
        apply(result);
        onSaved(result);
        setMessage("Inquiry follow-up saved.");
      }
    } catch {
      if (alive.current) {
        setUncertain(true);
        setError(
          "The inquiry may have changed or the save could not be confirmed. Reload its saved state before another edit.",
        );
      }
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section aria-label="Inquiry follow-up">
      <h3>Owner & next action</h3>
      <p>
        Won records the sales outcome. Client onboarding is a separate step.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <button type="button" disabled={busy} onClick={() => void load()}>
        Reload inquiry
      </button>
      {saved && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <fieldset disabled={busy || uncertain}>
            <label>
              Sales owner
              <select
                aria-label="Sales owner"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
              >
                <option value="">Unassigned</option>
                {owner && !owners.some((o) => o.id === owner) && (
                  <option value={owner} disabled>
                    Previous owner — choose an active owner
                  </option>
                )}
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Inquiry stage
              <select
                aria-label="Inquiry stage"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {!stages.includes(status as (typeof stages)[number]) && (
                  <option value={status} disabled>
                    Previous stage: {status}
                  </option>
                )}
                {stages.map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Next action
              <textarea
                aria-label="Next action"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                required
                maxLength={2000}
                rows={3}
              />
            </label>
            <label>
              Next action due (
              {Intl.DateTimeFormat().resolvedOptions().timeZone})
              <input
                type="datetime-local"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </label>
          </fieldset>
          <button
            type="submit"
            disabled={
              busy ||
              uncertain ||
              !dirty ||
              !action.trim() ||
              !stages.includes(status as (typeof stages)[number])
            }
          >
            {busy ? "Working…" : "Save follow-up"}
          </button>
          <small>
            Version {saved.version}
            {saved.last_activity_at
              ? " · Updated " +
                new Date(saved.last_activity_at).toLocaleString()
              : ""}
          </small>
        </form>
      )}
    </section>
  );
}
