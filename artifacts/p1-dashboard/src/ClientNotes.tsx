import { useEffect, useRef, useState } from "react";
import {
  createClientNote,
  listClientNotes,
} from "@workspace/api-client-react/dashboard";
import { RichTextEditor } from "./RichTextEditor";
import { useCmsUnsavedChanges } from "./marketing/useCmsUnsavedChanges";
type Note = Awaited<ReturnType<typeof listClientNotes>>["items"][number];
type Creation = { id: string; body: string; propertyId?: string };
export function ClientNotes({
  clientId,
  properties,
}: {
  clientId: string;
  properties: Array<{ id: string; name: string }>;
}) {
  const [items, setItems] = useState<Note[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [body, setBody] = useState(""),
    [propertyId, setPropertyId] = useState(""),
    [pending, setPending] = useState<Creation | null>(null),
    [editorVersion, setEditorVersion] = useState(0);
  const alive = useRef(true),
    gate = useRef(false),
    controller = useRef<AbortController | null>(null);
  useCmsUnsavedChanges(
    Boolean(body.trim() || pending),
    "Leave this customer note? An unconfirmed save may already be recorded; check the history before adding it again.",
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
  async function load(append = false) {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await listClientNotes(
        clientId,
        append && cursor ? { cursor } : {},
        options(),
      );
      if (alive.current) {
        setItems((old) =>
          append
            ? [
                ...old,
                ...result.items.filter((n) => !old.some((o) => o.id === n.id)),
              ]
            : result.items,
        );
        setCursor(result.nextCursor);
        setLoaded(true);
      }
    } catch {
      if (alive.current)
        setError("Could not load customer notes. Your draft is still here.");
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
  }, [clientId]);
  async function save() {
    if (gate.current || !body.trim()) return;
    const input = pending || {
      id: crypto.randomUUID(),
      body: body.trim(),
      ...(propertyId ? { propertyId } : {}),
    };
    gate.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    setPending(input);
    let saved = false;
    try {
      await createClientNote(clientId, input, options());
      if (alive.current) {
        setPending(null);
        setBody("");
        setPropertyId("");
        setEditorVersion((n) => n + 1);
        setMessage("Note saved.");
        saved = true;
      }
    } catch {
      if (alive.current)
        setError(
          "The save could not be confirmed. Retry the same note to check or finish saving it.",
        );
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
    if (saved) await load();
  }
  return (
    <section aria-label="Customer note history">
      <h3>Internal notes</h3>
      <p>Saved notes remain in this customer’s history.</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <form
        className="note-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label>
          New internal note
          <RichTextEditor
            key={editorVersion}
            value={body}
            onChange={setBody}
            disabled={busy || Boolean(pending)}
            required
            maxLength={10000}
            ariaLabel="New internal note"
            placeholder="Capture context for the office team. Notes are permanent once saved."
          />
        </label>
        <div className="note-composer-actions">
          <label>
            Property scope
            <select
              aria-label="Property scope"
              disabled={busy || Boolean(pending)}
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
            >
              <option value="">Client-wide note</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={busy || !body.trim()}>
            {busy ? "Working…" : pending ? "Retry note save" : "Add note"}
          </button>
        </div>
      </form>
      {pending && (
        <p>
          The original note and property scope are kept unchanged for a safe
          retry.
        </p>
      )}
      <button type="button" disabled={busy} onClick={() => void load()}>
        Refresh notes
      </button>
      {loaded && !items.length && <p>No notes yet.</p>}
      <div className="note-list">
        {items.map((note) => (
          <article key={note.id}>
            <header>
              <strong>
                {note.author_name || "Historical author unavailable"}
              </strong>
              <span>
                {note.property_name || "Client-wide"}
                {note.imported ? " · Imported" : ""}
              </span>
              <time dateTime={note.created_at}>
                {new Date(note.created_at).toLocaleString()}
              </time>
            </header>
            <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {note.body}
            </p>
          </article>
        ))}
      </div>
      {cursor && (
        <button type="button" disabled={busy} onClick={() => void load(true)}>
          Load older notes
        </button>
      )}
    </section>
  );
}
