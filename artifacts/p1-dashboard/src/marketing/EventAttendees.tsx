import { useEffect, useRef, useState } from "react";
import {
  listMarketingEventAttendees,
  setMarketingEventAttendance,
} from "@workspace/api-client-react/dashboard";
import type { MarketingEventAttendee } from "../../../../lib/api-client-react/src/dashboard/models";

const message = (error: unknown) =>
  (error as { data?: { message?: string } }).data?.message ||
  (error as Error).message ||
  "Attendance request failed";
const date = (value: string | null) =>
  value && !Number.isNaN(Date.parse(value))
    ? new Date(value).toLocaleString()
    : "Not recorded";

export function EventAttendees({
  eventId,
  title,
  close,
  embedded = false,
  onBusyChange,
}: {
  embedded?: boolean;
  onBusyChange?: (busy: boolean) => void;
  eventId: string;
  title: string;
  close: () => void;
}) {
  const [rows, setRows] = useState<MarketingEventAttendee[]>([]);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(0),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("all");
  useEffect(() => {
    onBusyChange?.(saving);
    return () => onBusyChange?.(false);
  }, [saving, onBusyChange]);
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
    setLoading(true);
    setError("");
    void listMarketingEventAttendees(eventId, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setRows(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(message(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [eventId, attempt]);
  async function attendance(row: MarketingEventAttendee) {
    if (
      gate.current ||
      !window.confirm(
        `${row.attended ? "Clear attendance for" : "Mark as attended:"} ${row.fullName}? This only updates attendance; registration and payment status stay the same.`,
      )
    )
      return;
    gate.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await setMarketingEventAttendance(eventId, row.id, {
        attended: !row.attended,
      });
      if (alive.current) {
        setRows((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setNotice(`Attendance updated for ${updated.fullName}.`);
      }
    } catch (error) {
      if (alive.current)
        setError(
          `${message(error)}. Refresh attendees to verify the saved attendance before retrying.`,
        );
    } finally {
      gate.current = false;
      if (alive.current) setSaving(false);
    }
  }
  const visible = rows.filter(
    (row) =>
      (status === "all" ||
        (status === "attended" ? row.attended : row.status === status)) &&
      `${row.fullName} ${row.email} ${row.phone || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <section className="event-manager" aria-label="Event attendees">
      <h2>Attendees · {title}</h2>
      <p>
        Attendance is separate from registration and payment status. Dates below
        use your device’s time zone.
      </p>
      <div className="event-actions">
        {!embedded && (
          <button type="button" disabled={saving} onClick={close}>
            Back to events
          </button>
        )}
        <button
          type="button"
          disabled={loading || saving}
          onClick={() => setAttempt((value) => value + 1)}
        >
          Refresh attendees
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <label>
        Search attendees
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <label>
        Attendee status
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {[
            "all",
            "confirmed",
            "pending",
            "waitlisted",
            "canceled",
            "attended",
          ].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      {loading ? (
        <p role="status">Loading attendees…</p>
      ) : (
        <>
          <p>
            {rows.length} registered ·{" "}
            {rows.filter((row) => row.attended).length} marked attended
          </p>
          <div className="event-grid">
            {visible.map((row) => (
              <article key={row.id}>
                <h3>{row.fullName}</h3>
                <p>{row.email}</p>
                {row.phone && <p>{row.phone}</p>}
                <p>Registration: {row.status}</p>
                <p>Payment: {row.paymentStatus || "Not recorded"}</p>
                <p>Registered: {date(row.registeredAt)}</p>
                {row.canceledAt && <p>Canceled: {date(row.canceledAt)}</p>}
                <p>
                  {row.attended
                    ? `Attended · ${date(row.checkedInAt)}`
                    : "Not marked attended"}
                </p>
                {row.notes && (
                  <p style={{ whiteSpace: "pre-wrap" }}>{row.notes}</p>
                )}
                <button
                  type="button"
                  disabled={saving || Boolean(error)}
                  onClick={() => void attendance(row)}
                >
                  {row.attended ? "Clear attendance" : "Mark attended"} ·{" "}
                  {row.fullName}
                </button>
              </article>
            ))}
            {!error && !visible.length && <p>No matching attendees.</p>}
          </div>
        </>
      )}
    </section>
  );
}
