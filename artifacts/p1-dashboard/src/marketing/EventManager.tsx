import { useEffect, useRef, useState } from "react";
import {
  listMarketingEvents,
  getMarketingEvent,
  createMarketingEvent,
  updateMarketingEvent,
  duplicateMarketingEvent,
} from "@workspace/api-client-react/dashboard";
import type {
  MarketingEvent,
  MarketingEventInput,
} from "../../../../lib/api-client-react/src/dashboard/models";
import {
  MarketingEventInputEventType,
  MarketingEventInputCategory,
  MarketingEventInputAudience,
  MarketingEventInputFormat,
  MarketingEventInputDeliveryMode,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { CmsRichTextEditor } from "./CmsRichTextEditor";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
import "./event-manager.css";
const message = (error: unknown) =>
  (error as { data?: { message?: string; error?: string } }).data?.message ||
  (error as { data?: { error?: string } }).data?.error ||
  (error as Error).message ||
  "Event request failed";
function localDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19);
}
function eventSchedule(event: MarketingEvent) {
  const date = new Date(event.date);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  const zone =
    event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    return `${date.toLocaleString(undefined, { timeZone: zone })} · ${zone}`;
  } catch {
    return `${date.toLocaleString()} · ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
  }
}
function draft(event: MarketingEvent | "new"): MarketingEventInput {
  if (event === "new")
    return {
      title: "",
      date: "",
      status: "draft",
      visibility: "public",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      registrationEnabled: false,
    };
  const { id, createdAt, ...values } = event;
  return structuredClone(values);
}
function Editor({
  event,
  close,
  saved,
  canUseMedia,
}: {
  event: MarketingEvent | "new";
  close: () => void;
  saved: () => void;
  canUseMedia: boolean;
}) {
  const [value, setValue] = useState(() => draft(event)),
    [baseline] = useState(() => JSON.stringify(draft(event))),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const gate = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const dirty = JSON.stringify(value) !== baseline;
  useCmsUnsavedChanges(dirty);
  const patch = (change: Partial<MarketingEventInput>) =>
    setValue((old) => ({ ...old, ...change }));
  async function save() {
    if (gate.current) return;
    if (
      !value.title.trim() ||
      !value.date ||
      Number.isNaN(Date.parse(value.date))
    ) {
      setError("A title and valid start date are required.");
      return;
    }
    if (value.endDate && Date.parse(value.endDate) < Date.parse(value.date)) {
      setError("End date must not precede start date.");
      return;
    }
    if (
      value.status === "published" &&
      !window.confirm(
        "Save this published event? Its details will be visible according to its audience settings.",
      )
    )
      return;
    if (
      event !== "new" &&
      event.status === "published" &&
      value.status !== "published" &&
      !window.confirm(
        "Remove this event from published listings? Existing registrations will remain saved.",
      )
    )
      return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      if (event === "new") await createMarketingEvent(value);
      else await updateMarketingEvent(event.id, value);
      if (alive.current) saved();
    } catch (error) {
      if (alive.current) setError(message(error));
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const selects: [keyof MarketingEventInput, string, Record<string, string>][] =
    [
      ["eventType", "Event type", MarketingEventInputEventType],
      ["category", "Category", MarketingEventInputCategory],
      ["audience", "Audience", MarketingEventInputAudience],
      ["format", "Format", MarketingEventInputFormat],
      ["deliveryMode", "Delivery mode", MarketingEventInputDeliveryMode],
    ];
  return (
    <section className="event-editor" aria-label="Website event editor">
      <h2>{event === "new" ? "Create event" : `Edit ${event.title}`}</h2>
      {error && <p role="alert">{error}</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={busy}>
          <legend>Event details</legend>
          <label>
            Title
            <input
              required
              value={value.title}
              onChange={(event) => patch({ title: event.target.value })}
            />
          </label>
          <label>
            Slug
            <input
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              value={value.slug || ""}
              onChange={(event) => patch({ slug: event.target.value })}
            />
          </label>
          <p>
            Leave the slug blank for a new event to generate it from the title.
          </p>
          <CmsRichTextEditor
            label="Event description"
            value={value.description || ""}
            onChange={(description) => patch({ description })}
            disabled={busy}
            canUseMedia={canUseMedia}
          />
          <label>
            Status
            <select
              aria-label="Status"
              value={value.status || ""}
              disabled={event !== "new" && event.status === "canceled"}
              onChange={(event) =>
                patch({
                  status: event.target.value as MarketingEventInput["status"],
                })
              }
            >
              {!value.status && <option value="">Not set</option>}
              {[
                "draft",
                "published",
                "completed",
                "archived",
                ...(value.status === "canceled" ? ["canceled"] : []),
              ].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          {value.status === "canceled" && (
            <p>
              This event is canceled. Editing its details does not reactivate
              registrations.
            </p>
          )}
          <label>
            Visibility
            <select
              aria-label="Visibility"
              value={value.visibility || ""}
              onChange={(event) =>
                patch({ visibility: event.target.value || null })
              }
            >
              <option value="">Not set</option>
              {["public", "members_only", "counselors_only", "admins_only"].map(
                (option) => (
                  <option key={option} value={option}>
                    {option.replaceAll("_", " ")}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="event-check">
            <input
              type="checkbox"
              checked={!!value.memberOnly}
              onChange={(event) => patch({ memberOnly: event.target.checked })}
            />
            Website membership restriction
          </label>
          <p>
            Website audience rules are separate from dashboard staff
            permissions.
          </p>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>Schedule</legend>
          <p>
            Enter dates in your device time zone:{" "}
            {Intl.DateTimeFormat().resolvedOptions().timeZone}. The event time
            zone controls its published schedule context.
          </p>
          {(
            [
              ["date", "Start date"],
              ["endDate", "End date"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                type="datetime-local"
                step="1"
                aria-label={label}
                required={key === "date"}
                value={localDate(value[key])}
                onChange={(event) =>
                  patch({
                    [key]: event.target.value
                      ? new Date(event.target.value).toISOString()
                      : key === "date"
                        ? ""
                        : null,
                  })
                }
              />
            </label>
          ))}
          <label>
            Event time zone
            <input
              value={value.timezone || ""}
              onChange={(event) =>
                patch({ timezone: event.target.value || null })
              }
            />
          </label>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>Classification and location</legend>
          {selects.map(([key, label, options]) => (
            <label key={key}>
              {label}
              <select
                aria-label={label}
                value={String(value[key] || "")}
                onChange={(event) =>
                  patch({ [key]: event.target.value || null })
                }
              >
                <option value="">Not set</option>
                {Object.values(options).map((option) => (
                  <option key={option} value={option}>
                    {option.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {(
            [
              ["location", "Location summary"],
              ["locationName", "Location name"],
              ["locationAddress", "Location address"],
              ["speakerName", "Speaker name"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                value={value[key] || ""}
                onChange={(event) =>
                  patch({ [key]: event.target.value || null })
                }
              />
            </label>
          ))}
          <label className="event-check">
            <input
              type="checkbox"
              checked={!!value.isVirtual}
              onChange={(event) => patch({ isVirtual: event.target.checked })}
            />
            Virtual event
          </label>
          <label>
            Virtual join URL
            <input
              type="url"
              value={value.virtualJoinUrl || ""}
              onChange={(event) =>
                patch({ virtualJoinUrl: event.target.value || null })
              }
            />
          </label>
          <label>
            Dial-in information
            <textarea
              aria-label="Dial-in information"
              value={value.virtualDialInInfo || ""}
              onChange={(event) =>
                patch({ virtualDialInInfo: event.target.value || null })
              }
            />
          </label>
        </fieldset>
        <div className="event-actions">
          <button disabled={busy} type="submit">
            {busy ? "Saving…" : "Save event"}
          </button>
          <button
            disabled={busy}
            type="button"
            onClick={() => {
              if (
                !dirty ||
                window.confirm("Discard your unsaved event changes?")
              )
                close();
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
function EventDetail({
  id,
  close,
  saved,
  canUseMedia,
}: {
  id: string;
  close: () => void;
  saved: () => void;
  canUseMedia: boolean;
}) {
  const [event, setEvent] = useState<MarketingEvent | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setEvent(null);
    void getMarketingEvent(id, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setEvent(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(message(error));
      });
    return () => controller.abort();
  }, [id, attempt]);
  if (event)
    return (
      <Editor
        event={event}
        close={close}
        saved={saved}
        canUseMedia={canUseMedia}
      />
    );
  return (
    <section>
      {error ? (
        <p role="alert">
          {error}{" "}
          <button onClick={() => setAttempt((value) => value + 1)}>
            Retry event
          </button>
        </p>
      ) : (
        <p role="status">Loading event…</p>
      )}
      <button onClick={close}>Back to events</button>
    </section>
  );
}
export default function EventManager({
  canUseMedia = false,
}: {
  canUseMedia?: boolean;
}) {
  const [rows, setRows] = useState<MarketingEvent[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [attempt, setAttempt] = useState(0),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [duplicating, setDuplicating] = useState(false);
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
    void listMarketingEvents({ signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setRows(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(message(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [attempt]);
  const saved = () => {
    setSelected(null);
    setNotice("Event saved.");
    setAttempt((value) => value + 1);
  };
  async function duplicate(event: MarketingEvent) {
    if (
      gate.current ||
      !window.confirm(
        `Create a draft copy of ${event.title}? Review the copied date and settings before publishing.`,
      )
    )
      return;
    gate.current = true;
    setDuplicating(true);
    setError("");
    try {
      const copy = await duplicateMarketingEvent(event.id);
      if (alive.current) {
        setSelected(copy.id);
        setAttempt((value) => value + 1);
        setNotice("Draft copy created.");
      }
    } catch (error) {
      if (alive.current) setError(message(error));
    } finally {
      gate.current = false;
      if (alive.current) setDuplicating(false);
    }
  }
  if (selected === "new")
    return (
      <Editor
        event="new"
        close={() => setSelected(null)}
        saved={saved}
        canUseMedia={canUseMedia}
      />
    );
  if (selected)
    return (
      <EventDetail
        key={selected}
        id={selected}
        close={() => setSelected(null)}
        saved={saved}
        canUseMedia={canUseMedia}
      />
    );
  const visible = rows.filter(
    (row) =>
      (status === "all" || row.status === status) &&
      `${row.title} ${row.slug} ${row.locationName || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <section className="event-manager" aria-label="Website events">
      <p>Manage website event details and publication.</p>
      {notice && <p role="status">{notice}</p>}
      <div className="event-actions">
        <button
          disabled={busy || duplicating}
          onClick={() => setSelected("new")}
        >
          Create event
        </button>
        <button
          disabled={busy || duplicating}
          onClick={() => setAttempt((value) => value + 1)}
        >
          Refresh events
        </button>
      </div>
      <label>
        Search events
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <label>
        Filter status
        <select
          aria-label="Filter status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {[
            "all",
            "draft",
            "published",
            "completed",
            "archived",
            "canceled",
          ].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Loading events…</p>}
      {!busy && (
        <div className="event-grid">
          {visible.map((event) => (
            <article key={event.id}>
              <h2>{event.title}</h2>
              <p>
                {eventSchedule(event)}
              </p>
              <p>
                {event.status || "Not set"} ·{" "}
                {event.visibility || "Visibility not set"}
              </p>
              <div className="event-actions">
                <button
                  disabled={duplicating}
                  onClick={() => setSelected(event.id)}
                >
                  Edit {event.title}
                </button>
                <button
                  disabled={duplicating}
                  onClick={() => void duplicate(event)}
                >
                  Duplicate {event.title}
                </button>
              </div>
            </article>
          ))}
          {!error && !visible.length && <p>No matching events.</p>}
        </div>
      )}
    </section>
  );
}
