import type { getSchedule } from "@workspace/api-client-react/dashboard";
import { useEffect, useState } from "react";
import {
  scheduleDate,
  scheduleDays,
  shiftScheduleDate,
  scheduleTime,
} from "./schedule-dates";
import "./schedule-calendar.css";
export type ScheduledWork = Awaited<
  ReturnType<typeof getSchedule>
>["items"][number];
export function ScheduleCalendar({
  work,
  staff,
  canManage,
  onSelect,
  request,
  onChanged,
}: {
  work: ScheduledWork[];
  staff: { id: string; name: string }[];
  canManage: boolean;
  onSelect: (id: string) => void;
  request?: (path: string, body?: unknown) => Promise<any>;
  onChanged?: () => Promise<void>;
}) {
  const [mode, setMode] = useState<"day" | "week">("week"),
    [selected, setSelected] = useState(() => scheduleDate(new Date())),
    [assigned, setAssigned] = useState("all"),
    [includeClosed, setIncludeClosed] = useState(false);
  const days = scheduleDays(selected, mode);
  const [remote, setRemote] = useState<ScheduledWork[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0),
    [chosen, setChosen] = useState<ScheduledWork | null>(null),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!request) return;
    let active = true;
    setLoading(true);
    setError("");
    setRemote([]);
    setChosen(null);
    async function pages(unscheduled: boolean) {
      const result: ScheduledWork[] = [];
      let cursor: string | null = null;
      let count = 0;
      do {
        const q = new URLSearchParams({
          from: days[0],
          through: days[days.length - 1],
          unscheduled: String(unscheduled),
        });
        if (cursor) q.set("cursor", cursor);
        const page = await request!("/schedule?" + q.toString());
        result.push(...page.items);
        cursor = page.nextCursor;
        if (++count >= 100 && cursor)
          throw new Error(
            "Too many visits for this view. Select a smaller date range.",
          );
      } while (cursor && active);
      return result;
    }
    void Promise.all([
      pages(false),
      canManage ? pages(true) : Promise.resolve([]),
    ])
      .then((groups) => {
        if (active) setRemote(groups.flat());
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selected, mode, request, canManage, reload]);
  const visible = (request ? remote : work).filter(
    (w) =>
      (includeClosed ||
        !["reviewed", "cancelled", "skipped"].includes(w.status)) &&
      (!canManage ||
        assigned === "all" ||
        (assigned === "unassigned"
          ? !w.assigned_to
          : w.assigned_to === assigned)),
  );
  const title = (day: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date(day + "T12:00:00Z"));
  function card(w: ScheduledWork) {
    return (
      <button
        className={"calendar-job " + w.status}
        key={w.id}
        onClick={() => {
          setChosen(w);
          if (!request) onSelect(w.id);
        }}
        aria-label={`${w.scheduled_at ? scheduleTime(w.scheduled_at) : "Unscheduled"} ${w.title}, ${w.property_name}, ${w.status.replaceAll("_", " ")}`}
      >
        <strong>
          {w.scheduled_at ? scheduleTime(w.scheduled_at) : "Unscheduled"} · {w.property_name}
        </strong>
        <span className="calendar-job-title">{w.title}</span>
        <span>
          {w.status.replaceAll("_", " ")}
          {canManage
            ? " · " +
              (w.assigned_to
                ? staff.find((s) => s.id === w.assigned_to)?.name ||
                  "Assigned person"
                : "Unassigned")
            : ""}
        </span>
      </button>
    );
  }
  return (
    <section className="panel schedule-calendar" aria-label="Job schedule">
      <div className="panel-heading">
        <h2>Work calendar</h2>
        <span>America/New_York</span>
      </div>
      <div className="calendar-toolbar">
        <div role="group" aria-label="Calendar view">
          <button aria-pressed={mode === "day"} onClick={() => setMode("day")}>
            Day
          </button>
          <button
            aria-pressed={mode === "week"}
            onClick={() => setMode("week")}
          >
            Week
          </button>
        </div>
        <button
          aria-label={"Previous " + mode}
          onClick={() =>
            setSelected(shiftScheduleDate(selected, mode === "day" ? -1 : -7))
          }
        >
          Previous
        </button>
        <button onClick={() => setSelected(scheduleDate(new Date()))}>
          Today
        </button>
        <button
          aria-label={"Next " + mode}
          onClick={() =>
            setSelected(shiftScheduleDate(selected, mode === "day" ? 1 : 7))
          }
        >
          Next
        </button>
        <label>
          Calendar date
          <input
            type="date"
            required
            value={selected}
            onChange={(e) => {
              if (e.target.value) setSelected(e.target.value);
            }}
          />
        </label>
        {canManage && (
          <label>
            Assigned person
            <select
              value={assigned}
              onChange={(e) => setAssigned(e.target.value)}
            >
              <option value="all">All assignments</option>
              <option value="unassigned">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="calendar-checkbox">
          <input
            type="checkbox"
            checked={includeClosed}
            onChange={(e) => setIncludeClosed(e.target.checked)}
          />
          Include closed visits
        </label>
      </div>
      <p className="muted">
        Select a visit to view details or adjust its schedule. Calendar dates
        use New York time.
      </p>
      {loading && <p role="status">Loading appointments…</p>}
      {error && (
        <p role="alert" className="error">
          {error}{" "}
          <button onClick={() => setReload((v) => v + 1)}>
            Reload schedule
          </button>
        </p>
      )}
      {chosen && (
        <section className="panel" aria-label="Selected visit">
          <h3>{chosen.title}</h3>
          <p>
            {chosen.property_name} · {chosen.status.replaceAll("_", " ")}
          </p>
          {chosen.scope && <p>{chosen.scope}</p>}
          {
            <button onClick={() => onSelect(chosen.id)}>
              Open existing work details
            </button>
          }
          <button onClick={() => setChosen(null)}>Close visit</button>
          {canManage &&
            request &&
            chosen.version &&
            ["draft", "scheduled", "delayed"].includes(chosen.status) && (
              <form
                key={chosen.id + ":" + chosen.version}
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  setSaving(true);
                  setError("");
                  void request("/work-orders/" + chosen.id + "/reschedule", {
                    scheduledAt: new Date(
                      String(data.get("start")),
                    ).toISOString(),
                    assignedTo: data.get("assigned") || null,
                    reason: data.get("reason"),
                    version: chosen.version,
                  })
                    .then(async () => {
                      setChosen(null);
                      setReload((v) => v + 1);
                      await onChanged?.();
                    })
                    .catch((e) => setError(e.message))
                    .finally(() => setSaving(false));
                }}
              >
                <fieldset disabled={saving}>
                  <legend>Adjust this visit</legend>
                  <p>
                    Enter the planned start in this device's timezone (
                    {Intl.DateTimeFormat().resolvedOptions().timeZone}). Moving
                    this visit does not change its recurring schedule.
                  </p>
                  <label>
                    Planned start
                    <input
                      name="start"
                      type="datetime-local"
                      required
                      defaultValue={
                        chosen.scheduled_at
                          ? new Date(
                              Date.parse(chosen.scheduled_at) -
                                new Date(
                                  chosen.scheduled_at,
                                ).getTimezoneOffset() *
                                  60000,
                            )
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                    />
                  </label>
                  <label>
                    Assign to
                    <select
                      name="assigned"
                      defaultValue={chosen.assigned_to || ""}
                    >
                      <option value="">Unassigned</option>
                      {staff.map((s) => (
                        <option value={s.id} key={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Reason
                    <input name="reason" required maxLength={1000} />
                  </label>
                  <button className="primary">Save schedule change</button>
                </fieldset>
              </form>
            )}
        </section>
      )}
      <div className={"calendar-days " + mode}>
        {days.map((day) => {
          const entries = visible
            .filter(
              (w) => w.scheduled_at && scheduleDate(w.scheduled_at) === day,
            )
            .sort(
              (a, b) =>
                Date.parse(a.scheduled_at!) - Date.parse(b.scheduled_at!),
            );
          return (
            <section
              key={day}
              className={
                day === scheduleDate(new Date())
                  ? "calendar-day today"
                  : "calendar-day"
              }
              aria-label={title(day)}
            >
              <h3>
                {title(day)}{" "}
                <small>
                  {entries.length} {entries.length === 1 ? "visit" : "visits"}
                </small>
              </h3>
              {entries.length ? (
                entries.map(card)
              ) : (
                <p className="empty">No visits</p>
              )}
            </section>
          );
        })}
      </div>
      {canManage && (
        <details>
          <summary>
            Unscheduled Jobs ({visible.filter((w) => !w.scheduled_at).length})
          </summary>
          <div className="calendar-unscheduled">
            {visible.filter((w) => !w.scheduled_at).map(card)}
          </div>
        </details>
      )}
    </section>
  );
}
