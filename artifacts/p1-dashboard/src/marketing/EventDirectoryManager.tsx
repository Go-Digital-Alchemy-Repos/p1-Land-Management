import { useEffect, useRef, useState } from "react";
import {
  listMarketingEventVenues,
  listMarketingEventOrganizers,
  createMarketingEventVenue,
  updateMarketingEventVenue,
  deleteMarketingEventVenue,
  createMarketingEventOrganizer,
  updateMarketingEventOrganizer,
  deleteMarketingEventOrganizer,
} from "@workspace/api-client-react/dashboard";
import type {
  MarketingEventVenue,
  MarketingEventOrganizer,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { MediaLibrary } from "./MediaLibrary";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
type Entry = MarketingEventVenue | MarketingEventOrganizer;
type Draft = { name: string; [key: string]: unknown };
const message = (error: unknown) =>
  (error as { data?: { message?: string; error?: string } }).data?.message ||
  (error as { data?: { error?: string } }).data?.error ||
  (error as Error).message ||
  "Directory request failed";
function draft(entry: Entry | "new"): Draft {
  if (entry === "new") return { name: "", slug: "" };
  const { id, createdAt, updatedAt, ...values } = entry;
  return structuredClone(values);
}
function EntryEditor({
  kind,
  entry,
  close,
  saved,
  canUseMedia,
}: {
  kind: "venue" | "organizer";
  entry: Entry | "new";
  close: () => void;
  saved: () => void;
  canUseMedia: boolean;
}) {
  const [value, setValue] = useState(() => draft(entry)),
    [baseline] = useState(() => JSON.stringify(draft(entry))),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [media, setMedia] = useState(false);
  const gate = useRef(false),
    alive = useRef(true),
    dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (media) dialog.current?.showModal();
    else dialog.current?.close();
  }, [media]);
  const dirty = JSON.stringify(value) !== baseline;
  useCmsUnsavedChanges(dirty);
  const patch = (key: string, next: unknown) =>
    setValue((old) => ({ ...old, [key]: next }));
  async function save() {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      if (kind === "venue") {
        if (entry === "new") await createMarketingEventVenue(value);
        else await updateMarketingEventVenue(entry.id, value);
      } else {
        if (entry === "new") await createMarketingEventOrganizer(value);
        else await updateMarketingEventOrganizer(entry.id, value);
      }
      if (alive.current) saved();
    } catch (error) {
      if (alive.current) setError(message(error));
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const fields = [
    ["name", "Name"],
    ["slug", "Slug"],
    ["email", "Email"],
    ["phone", "Phone"],
    ["websiteUrl", "Website URL"],
    ...(kind === "venue"
      ? [
          ["address", "Street address"],
          ["city", "City"],
          ["region", "State / region"],
          ["postalCode", "Postal code"],
          ["country", "Country"],
          ["latitude", "Latitude"],
          ["longitude", "Longitude"],
        ]
      : [["imageUrl", "Image URL"]]),
  ];
  const paragraphs = [
    ["description", "Description"],
    ...(kind === "venue"
      ? [
          ["parkingInfo", "Parking information"],
          ["accessibilityInfo", "Accessibility information"],
          ["transitInfo", "Transit information"],
          ["arrivalNotes", "Arrival notes"],
        ]
      : []),
  ];
  return (
    <section className="event-editor" aria-label={`${kind} editor`}>
      <h2>{entry === "new" ? `Create ${kind}` : `Edit ${entry.name}`}</h2>
      <p>
        This is a shared {kind} record. Event-specific location and speaker
        details remain editable on each event.
      </p>
      {error && <p role="alert">{error}</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={busy}>
          <legend>{kind === "venue" ? "Venue" : "Organizer"} details</legend>
          {fields.map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                aria-label={label}
                required={key === "name"}
                type={key === "email" ? "email" : "text"}
                pattern={
                  key === "slug" ? "[a-z0-9]+(?:-[a-z0-9]+)*" : undefined
                }
                value={String(value[key] ?? "")}
                onChange={(event) => patch(key, event.target.value)}
              />
            </label>
          ))}
          {paragraphs.map(([key, label]) => (
            <label key={key}>
              {label}
              <textarea
                aria-label={label}
                value={String(value[key] ?? "")}
                onChange={(event) => patch(key, event.target.value)}
              />
            </label>
          ))}
          {kind === "venue" && (
            <label className="event-check">
              <input
                type="checkbox"
                checked={!!value.isVirtual}
                onChange={(event) => patch("isVirtual", event.target.checked)}
              />
              Virtual venue
            </label>
          )}
          {kind === "organizer" && canUseMedia && (
            <button type="button" onClick={() => setMedia(true)}>
              Choose organizer image
            </button>
          )}
        </fieldset>
        <div className="event-actions">
          <button type="submit" disabled={busy}>
            {busy ? "Saving…" : `Save ${kind}`}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (
                !dirty ||
                window.confirm(`Discard your unsaved ${kind} changes?`)
              )
                close();
            }}
          >
            Cancel
          </button>
        </div>
      </form>
      <dialog
        ref={dialog}
        className="media-picker"
        aria-label="Choose organizer image"
        onCancel={() => setMedia(false)}
      >
        <button type="button" onClick={() => setMedia(false)}>
          Close image picker
        </button>
        {media && canUseMedia && (
          <MediaLibrary
            acceptAsset={(asset) => asset.mimeType.startsWith("image/")}
            onSelect={(asset) => {
              patch("imageUrl", asset.url);
              setMedia(false);
            }}
          />
        )}
      </dialog>
    </section>
  );
}
export function EventDirectoryManager({
  kind,
  close,
  canUseMedia,
}: {
  kind: "venue" | "organizer";
  close: () => void;
  canUseMedia: boolean;
}) {
  const [rows, setRows] = useState<Entry[]>([]),
    [editing, setEditing] = useState<Entry | "new" | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [deleting, setDeleting] = useState(false),
    [query, setQuery] = useState(""),
    [notice, setNotice] = useState("");
  const gate = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    const load =
      kind === "venue"
        ? listMarketingEventVenues
        : listMarketingEventOrganizers;
    void load({ signal: controller.signal })
      .then((rows) => {
        if (!controller.signal.aborted) setRows(rows);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(message(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [kind, attempt]);
  async function remove(entry: Entry) {
    if (
      gate.current ||
      !window.confirm(
        `Delete shared ${kind} ${entry.name}? Existing events remain, but their link to this ${kind} will be cleared. Copied event details remain saved.`,
      )
    )
      return;
    gate.current = true;
    setDeleting(true);
    setError("");
    try {
      if (kind === "venue") await deleteMarketingEventVenue(entry.id);
      else await deleteMarketingEventOrganizer(entry.id);
      if (alive.current) {
        setRows((rows) => rows.filter((row) => row.id !== entry.id));
        setNotice(`${kind === "venue" ? "Venue" : "Organizer"} deleted.`);
      }
    } catch (error) {
      if (alive.current) setError(message(error));
    } finally {
      gate.current = false;
      if (alive.current) setDeleting(false);
    }
  }
  if (editing)
    return (
      <EntryEditor
        key={editing === "new" ? "new" : editing.id}
        kind={kind}
        entry={editing}
        close={() => setEditing(null)}
        saved={() => {
          setEditing(null);
          setNotice(`${kind === "venue" ? "Venue" : "Organizer"} saved.`);
          setAttempt((value) => value + 1);
        }}
        canUseMedia={canUseMedia}
      />
    );
  const visible = rows.filter((row) =>
    `${row.name} ${row.slug}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="event-manager" aria-label={`${kind} directory`}>
      <h2>{kind === "venue" ? "Venues" : "Organizers"}</h2>
      <div className="event-actions">
        <button disabled={deleting} onClick={close}>
          Back to events
        </button>
        <button disabled={busy || deleting} onClick={() => setEditing("new")}>
          Create {kind}
        </button>
        <button
          disabled={busy || deleting}
          onClick={() => setAttempt((value) => value + 1)}
        >
          Refresh {kind === "venue" ? "venues" : "organizers"}
        </button>
      </div>
      {notice && <p role="status">{notice}</p>}
      <label>
        Search {kind === "venue" ? "venues" : "organizers"}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Loading {kind} records…</p>}
      {!busy && (
        <div className="event-grid">
          {visible.map((entry) => (
            <article key={entry.id}>
              <h3>{entry.name}</h3>
              <p>{entry.slug}</p>
              <div className="event-actions">
                <button disabled={deleting} onClick={() => setEditing(entry)}>
                  Edit {entry.name}
                </button>
                <button disabled={deleting} onClick={() => void remove(entry)}>
                  Delete {entry.name}
                </button>
              </div>
            </article>
          ))}
          {!error && !visible.length && <p>No matching {kind} records.</p>}
        </div>
      )}
    </section>
  );
}
