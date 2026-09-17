import "./lead-notes.css";
import { useCmsUnsavedChanges } from "./marketing/useCmsUnsavedChanges";
import { useEffect, useRef, useState } from "react";
import {
  createLeadNote,
  listLeadNotes,
} from "@workspace/api-client-react/dashboard";

type LeadNote = Awaited<ReturnType<typeof listLeadNotes>>["items"][number];

export function LeadNotes({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lead-notes">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        disabled={open}
      >
        Inquiry notes
      </button>
      {open && <NoteHistory key={leadId} leadId={leadId} />}
    </div>
  );
}
function NoteHistory({ leadId }: { leadId: string }) {
  const [notes, setNotes] = useState<LeadNote[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [body, setBody] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [pending, setPending] = useState<{ id: string; body: string } | null>(null);
  const active = useRef(true),
    gate = useRef(false),
    controller = useRef<AbortController | null>(null);
  async function load(append = false) {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    try {
      const result = await listLeadNotes(
        leadId,
        append && cursor ? { cursor } : {},
        {
          signal: AbortSignal.any([
            controller.current.signal,
            AbortSignal.timeout(30000),
          ]),
        },
      );
      if (active.current) {
        setNotes((old) =>
          append
            ? [
                ...old,
                ...result.items.filter((n) => !old.some((p) => p.id === n.id)),
              ]
            : result.items,
        );
        setCursor(result.nextCursor);
        setLoaded(true);
      }
    } catch {
      if (active.current) setError("Could not load inquiry notes. Try again.");
    } finally {
      gate.current = false;
      if (active.current) setBusy(false);
    }
  }
  useEffect(() => {
    active.current = true;
    void load();
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, [leadId]);
  useCmsUnsavedChanges(
    Boolean(body.trim() || pending),
    pending
      ? "Leave this inquiry? The note save is unconfirmed. Check its history before adding the same note again."
      : "Discard your unsaved inquiry note?",
  );
  async function save() {
    if (gate.current) return;
    const input = pending || { id: crypto.randomUUID(), body: body.trim() };
    if (!input.body) return;
    gate.current = true;
    setBusy(true);
    setPending(input);
    setError("");
    setMessage("");
    controller.current = new AbortController();
    let saved = false;
    try {
      await createLeadNote(leadId, input, {
        signal: AbortSignal.any([
          controller.current.signal,
          AbortSignal.timeout(30000),
        ]),
      });
      if (active.current) {
        setPending(null);
        setBody("");
        setMessage("Note saved.");
        saved = true;
      }
    } catch {
      if (active.current)
        setError(
          "The save could not be confirmed. Retry this same note to check or finish saving it.",
        );
    } finally {
      gate.current = false;
      if (active.current) setBusy(false);
    }
    if (saved) await load();
  }
  return (
    <section aria-label="Inquiry note history">
      <h3>Notes</h3>
      <p>Internal Sales notes. Saved notes remain in the inquiry history.</p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <button type="button" disabled={busy} onClick={() => void load()}>
        Refresh notes
      </button>
      {loaded && !notes.length && <p>No notes yet.</p>}
      <ol style={{ paddingLeft: "1.5rem" }}>
        {notes.map((note) => (
          <li key={note.id} style={{ marginBlock: "1rem" }}>
            <strong>
              {note.authorName || "Historical author unavailable"}
            </strong>
            {note.imported && <span> · Imported</span>}
            <small style={{ display: "block" }}>
              <time dateTime={note.createdAt}>
                {new Date(note.createdAt).toLocaleString()}
              </time>
            </small>
            <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {note.body}
            </p>
          </li>
        ))}
      </ol>
      {cursor && (
        <button type="button" disabled={busy} onClick={() => void load(true)}>
          Load older notes
        </button>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label>
          New inquiry note
          <textarea
            value={body}
            disabled={busy || Boolean(pending)}
            maxLength={10000}
            required
            onChange={(e) => setBody(e.target.value)}
            rows={4}
          />
        </label>
        {pending && (
          <p>
            The original note is kept for a safe retry. Do not submit it again
            from another window.
          </p>
        )}
        <button disabled={busy || !body.trim()} type="submit">
          {busy ? "Working…" : pending ? "Retry note save" : "Save note"}
        </button>
      </form>
    </section>
  );
}
