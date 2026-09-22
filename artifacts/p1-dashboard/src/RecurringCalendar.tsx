import type { RecurringJob } from "../../../lib/api-client-react/src/dashboard/models";
import { useState } from "react";
import {
  scheduleDate,
  scheduleDays,
  shiftScheduleMonth,
} from "./schedule-dates";
import "./schedule-calendar.css";

type RecurringCalendarJob = RecurringJob & {
  client_name?: string | null;
  property_name?: string | null;
};

function localTime(value: string) {
  const [hour = "0", minute = "00"] = value.split(":");
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(`2000-01-01T${hour.padStart(2, "0")}:${minute}:00Z`));
}

function dayTitle(day: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(day + "T12:00:00Z"));
}

export function RecurringCalendar({ jobs }: { jobs: RecurringCalendarJob[] }) {
  const [selected, setSelected] = useState(() => scheduleDate(new Date()));
  const days = scheduleDays(selected, "month");
  const planned = jobs.filter((job) => job.next_date && !job.paused);
  const hasVisibleVisit = planned.some((job) => days.includes(job.next_date!));

  return (
    <section className="panel schedule-calendar recurring-calendar" aria-label="Recurring calendar">
      <div className="panel-heading">
        <h2>Recurring calendar</h2>
        <span>America/New_York</span>
      </div>
      <div className="calendar-toolbar">
        <div className="calendar-period-actions">
          <button aria-label="Previous month" onClick={() => setSelected(shiftScheduleMonth(selected, -1))}>
            Previous
          </button>
          <button onClick={() => setSelected(scheduleDate(new Date()))}>Today</button>
          <button aria-label="Next month" onClick={() => setSelected(shiftScheduleMonth(selected, 1))}>
            Next
          </button>
        </div>
        <label>
          Calendar date
          <input
            type="date"
            value={selected}
            onChange={(event) => event.target.value && setSelected(event.target.value)}
          />
        </label>
      </div>
      <p className="muted">
        Each service appears on its next planned visit. The date advances after its next occurrence is generated or rescheduled.
      </p>
      {hasVisibleVisit ? <div className="calendar-days month recurring-calendar-days">
        {days.map((day) => {
          const entries = planned.filter((job) => job.next_date === day);
          return (
            <section
              key={day}
              className={[
                "calendar-day",
                day === scheduleDate(new Date()) && "today",
                day.slice(0, 7) !== selected.slice(0, 7) && "outside-month",
              ].filter(Boolean).join(" ")}
              aria-label={dayTitle(day)}
            >
              <h3>
                {dayTitle(day)}
                <small>{entries.length ? `${entries.length} ${entries.length === 1 ? "service" : "services"}` : "No next visits"}</small>
              </h3>
              {entries.map((job) => (
                <article className="recurring-calendar-job" key={job.id}>
                  <strong>{localTime(job.local_time)} · {job.title}</strong>
                  <span>{job.property_name || "Property"}{job.client_name ? ` · ${job.client_name}` : ""}</span>
                  <small>{job.generation_status || job.cadence}</small>
                </article>
              ))}
            </section>
          );
        })}
      </div> : <p className="recurring-calendar-empty">No recurring visits are planned for this month. Choose another month to review upcoming work.</p>}
      {jobs.some((job) => job.paused) && (
        <p className="muted">Paused services are listed below and are not placed on the calendar.</p>
      )}
    </section>
  );
}
