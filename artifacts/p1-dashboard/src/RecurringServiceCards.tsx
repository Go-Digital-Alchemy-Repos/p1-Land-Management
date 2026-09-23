import type { RecurringJob } from "../../../lib/api-client-react/src/dashboard/models";
import { scheduleDateTime } from "./schedule-dates";

type Service = RecurringJob & { client_name?: string | null; property_name?: string | null };

export function RecurringServiceCards({
  jobs,
  canActivate,
  onActivate,
}: {
  jobs: Service[];
  canActivate: boolean;
  onActivate: (job: Service) => void;
}) {
  return <div className="recurring-mobile-list" aria-label="Recurring services">
    {jobs.map((job) => <article className="recurring-service-card" key={job.id}>
      <details>
        <summary><strong>{job.title}</strong><span>{job.paused ? "Paused" : job.generation_status || "Scheduled"}</span><small>{job.next_visit ? scheduleDateTime(job.next_visit) : "Next visit not scheduled"}</small></summary>
        <dl>
          <div><dt>Property</dt><dd>{job.property_name || "—"}</dd></div>
          <div><dt>Client</dt><dd>{job.client_name || "—"}</dd></div>
          <div><dt>Cadence</dt><dd>{job.cadence || "—"}</dd></div>
          <div><dt>Agreement</dt><dd>{job.agreement_status || "—"}</dd></div>
          <div><dt>Visits remaining</dt><dd>{job.visits_remaining ?? "—"}</dd></div>
          <div><dt>Allowance / reserved</dt><dd>{job.visit_allowance ?? "—"} / {job.visits_reserved ?? "—"}</dd></div>
        </dl>
        {canActivate && job.paused && job.agreement_status === "draft" && <button type="button" onClick={() => onActivate(job)}>Schedule and activate</button>}
      </details>
    </article>)}
  </div>;
}
