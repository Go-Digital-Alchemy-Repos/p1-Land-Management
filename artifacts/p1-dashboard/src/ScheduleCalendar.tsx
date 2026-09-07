import { useState } from "react";
import {
  scheduleDate,
  scheduleDays,
  shiftScheduleDate,
  scheduleTime,
} from "./schedule-dates";
import "./schedule-calendar.css";
export type ScheduledWork = {
  id: string;
  title: string;
  property_name: string;
  scheduled_at: string | null;
  assigned_to?: string | null;
  status: string;
};
export function ScheduleCalendar({
  work,
  staff,
  canManage,
  onSelect,
}: {
  work: ScheduledWork[];
  staff: { id: string; name: string }[];
  canManage: boolean;
  onSelect: (id: string) => void;
}) {
  const [mode, setMode] = useState<"day" | "week">("week"),
    [selected, setSelected] = useState(() => scheduleDate(new Date())),
    [assigned, setAssigned] = useState("all"),
    [includeClosed, setIncludeClosed] = useState(false);
  const days = scheduleDays(selected, mode);
  const visible = work.filter(
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
        onClick={() => onSelect(w.id)}
        aria-label={`${w.scheduled_at ? scheduleTime(w.scheduled_at) : "Unscheduled"} ${w.title}, ${w.property_name}, ${w.status.replaceAll("_", " ")}`}
      >
        <strong>
          {w.scheduled_at ? scheduleTime(w.scheduled_at) : "Unscheduled"} ·{" "}
          {w.title}
        </strong>
        <span>{w.property_name}</span>
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
    <section className="panel schedule-calendar" aria-label="Work calendar">
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
        Select a visit to open its work details. Counts reflect the work orders
        currently loaded.
      </p>
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
            Unscheduled work ({visible.filter((w) => !w.scheduled_at).length})
          </summary>
          <div className="calendar-unscheduled">
            {visible.filter((w) => !w.scheduled_at).map(card)}
          </div>
        </details>
      )}
    </section>
  );
}
