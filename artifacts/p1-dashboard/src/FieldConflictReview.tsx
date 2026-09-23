import { useEffect, useRef, useState } from "react";
import {
  listFieldConflicts,
  resolveFieldConflict,
} from "@workspace/api-client-react/dashboard";
import { useCmsUnsavedChanges } from "./marketing/useCmsUnsavedChanges";
type Row = Awaited<ReturnType<typeof listFieldConflicts>>["items"][number];
export function FieldConflictReview() {
  const [rows, setRows] = useState<Row[]>([]),
    [selected, setSelected] = useState<Row | null>(null);
  const [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loaded, setLoaded] = useState(false),
    [more, setMore] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const alive = useRef(true),
    gate = useRef(false);
  useCmsUnsavedChanges(
    Boolean(note) || uncertain || (busy && Boolean(selected)),
    "Leave this field review? Unsaved notes will be lost; an unconfirmed resolution must be checked before further action.",
  );
  async function load() {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await listFieldConflicts({
        signal: AbortSignal.timeout(30000),
      });
      if (alive.current) {
        setRows(result.items);
        setMore(result.hasMore);
        setLoaded(true);
      }
    } catch {
      if (alive.current)
        setError("Could not load field conflicts. Retry to refresh the list.");
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
    };
  }, []);
  async function resolve() {
    if (gate.current || !selected || !note.trim()) return;
    if (!uncertain && !confirming) {
      setConfirming(true);
      return;
    }
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      await resolveFieldConflict(
        selected.id,
        { note: note.trim(), disposition: "record_only" },
        { signal: AbortSignal.timeout(30000) },
      );
      if (alive.current) {
        setRows((old) => old.filter((row) => row.id !== selected.id));
        setSelected(null);
        setNote("");
        setConfirming(false);
        setUncertain(false);
        setNotice(
          "Review recorded. Work status and billing are unchanged. The crew can sync again.",
        );
      }
    } catch {
      if (alive.current) {
        setUncertain(true);
        setError(
          "The review could not be confirmed. Retry this same decision, or reload the list before making another decision.",
        );
      }
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="panel" aria-label="Field entries needing review">
      <div className="panel-heading">
        <h2>Field entries needing review</h2>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (
              (note || uncertain) &&
              !confirm(
                "Discard this local review and reload? A previously submitted review may already be recorded.",
              )
            )
              return;
            setSelected(null);
            setNote("");
            setConfirming(false);
            setUncertain(false);
            void load();
          }}
        >
          Reload conflicts
        </button>
      </div>
      <p>
        Review entries captured against changed assignments. Resolving an entry
        records your decision; it does not complete work, change schedules, or
        authorize billing.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {loaded && !rows.length && !error && <p>No field entries need review.</p>}
      {more && (
        <p>
          Showing the first 100 entries. Resolve entries and reload to continue.
        </p>
      )}
      {rows.map((row) => (
        <div className="schedule-row" key={row.id}>
          <div>
            <strong>{row.work_title}</strong>
            <small>
              {row.property_name} · {row.submitted_by} · {row.kind} ·{" "}
              {new Date(row.captured_at).toLocaleString()}
            </small>
            <span>Current work status: {row.work_status}</span>
          </div>
          <button
            type="button"
            disabled={busy || !!selected}
            onClick={() => {
              setSelected(row);
              setError("");
              setNotice("");
            }}
          >
            Review entry
          </button>
        </div>
      ))}
      {selected && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void resolve();
          }}
        >
          <h3>Review: {selected.work_title}</h3>
          <p>
            Captured against assignment version {selected.base_version}.
            Coordinate any corrective work separately through the normal
            scheduling and approval workflow.
          </p>
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {JSON.stringify(selected.payload, null, 2)}
          </pre>
          <label>
            Review decision
            <textarea
              aria-label="Review decision"
              required
              maxLength={2000}
              rows={4}
              disabled={busy || uncertain || confirming}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          {confirming && !uncertain && (
            <p role="status">
              Confirm this review without applying the field entry. The original
              remains in history. The crew can clear its queued copy on its next
              sync.
            </p>
          )}
          <button type="submit" disabled={busy || !note.trim()}>
            {uncertain
              ? "Retry same resolution"
              : confirming
                ? "Confirm review"
                : "Resolve without applying"}
          </button>
          <button
            type="button"
            disabled={busy || uncertain}
            onClick={() => {
              if (note && !confirm("Discard this unsaved review?")) return;
              setSelected(null);
              setNote("");
              setConfirming(false);
            }}
          >
            Cancel review
          </button>
        </form>
      )}
    </section>
  );
}
