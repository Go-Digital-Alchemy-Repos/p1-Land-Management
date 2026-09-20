import { useEffect, useRef, useState } from "react";
import {
  listMarketingFormDeliveryJobs,
  retryMarketingFormDeliveryJob,
} from "@workspace/api-client-react/dashboard";
import type {
  MarketingFormDeliveryJob,
  ListMarketingFormDeliveryJobsStatus,
} from "../../../../lib/api-client-react/src/dashboard/models";
const message = (error: unknown) =>
  (error as { data?: { message?: string; error?: string } }).data?.message ||
  (error as { data?: { error?: string } }).data?.error ||
  (error as Error).message ||
  "Delivery request failed";
const labels: Record<string, string> = {
  commercial_dashboard_intake: "Commercial inquiry handoff",
  estimate_dashboard_intake: "Estimate inquiry handoff",
  dashboard_form_notification: "Team notification",
  dashboard_form_notification_dispatch: "Team notification distribution",
  admin_notification: "Website notification",
  crm_lead: "CRM lead",
  contact_message: "Contact message",
  mailchimp_subscribe: "Mailchimp subscription",
};
const time = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "Not recorded";
function Queue({ status }: { status: ListMarketingFormDeliveryJobsStatus }) {
  const [rows, setRows] = useState<MarketingFormDeliveryJob[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [retrying, setRetrying] = useState<string | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const controller = useRef<AbortController | null>(null),
    alive = useRef(true),
    gate = useRef(false),
    sequence = useRef(0);
  async function load(after?: string) {
    const current = ++sequence.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError("");
    try {
      const result = await listMarketingFormDeliveryJobs(
        { status, limit: 50, ...(after ? { cursor: after } : {}) },
        { signal: abort.signal },
      );
      if (
        !alive.current ||
        current !== sequence.current ||
        abort.signal.aborted
      )
        return;
      setRows((old) =>
        after
          ? [
              ...old,
              ...result.items.filter(
                (item) => !old.some((existing) => existing.id === item.id),
              ),
            ]
          : result.items,
      );
      setCursor(result.nextCursor);
    } catch (error) {
      if (
        alive.current &&
        current === sequence.current &&
        !abort.signal.aborted
      )
        setError(message(error));
    } finally {
      if (
        alive.current &&
        current === sequence.current &&
        !abort.signal.aborted
      )
        setBusy(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);
  async function retry(job: MarketingFormDeliveryJob) {
    if (gate.current || busy) return;
    if (
      !window.confirm(
        "Retry this failed delivery? It may send a notification or deliver the inquiry to its destination.",
      )
    )
      return;
    gate.current = true;
    setRetrying(job.id);
    setError("");
    setNotice("");
    try {
      await retryMarketingFormDeliveryJob(job.id);
      if (!alive.current) return;
      setRows((old) =>
        old.map((item) =>
          item.id === job.id
            ? { ...item, status: "queued", attemptCount: 0 }
            : item,
        ),
      );
      setNotice(
        "Delivery queued for retry. Queued does not mean delivered; refresh to check its status.",
      );
      await load();
    } catch (error) {
      if (alive.current) setError(message(error));
    } finally {
      gate.current = false;
      if (alive.current) setRetrying(null);
    }
  }
  return (
    <div className="form-manager">
      <button disabled={busy || !!retrying} onClick={() => void load()}>
        Refresh deliveries
      </button>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Loading deliveries…</p>}
      <p>{rows.length} deliveries shown, newest first.</p>
      {!busy && !error && !rows.length && <p>No matching deliveries.</p>}
      {rows.map((job) => (
        <article key={job.id}>
          <h3>{labels[job.kind] || job.kind}</h3>
          <p>
            <strong>{job.status}</strong> · {job.attemptCount} attempts
          </p>
          <dl>
            <div>
              <dt>Submission reference</dt>
              <dd>{job.submissionId}</dd>
            </div>
            <div>
              <dt>Delivery reference</dt>
              <dd>{job.id}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{time(job.createdAt)}</dd>
            </div>
            {job.lastErrorCode && (
              <div>
                <dt>Last error</dt>
                <dd>{job.lastErrorCode}</dd>
              </div>
            )}
            {job.status === "queued" && job.nextAttemptAt && (
              <div>
                <dt>Next attempt</dt>
                <dd>{time(job.nextAttemptAt)}</dd>
              </div>
            )}
            {typeof job.deliveryResult?.leadId === "string" && (
              <div>
                <dt>Dashboard lead reference</dt>
                <dd>{job.deliveryResult.leadId}</dd>
              </div>
            )}
          </dl>
          {job.status === "failed" && (
            <button
              disabled={busy || !!retrying}
              onClick={() => void retry(job)}
            >
              {retrying === job.id ? "Queueing retry…" : "Retry delivery"}
            </button>
          )}
        </article>
      ))}
      {cursor && (
        <button disabled={busy || !!retrying} onClick={() => void load(cursor)}>
          Load more deliveries
        </button>
      )}
    </div>
  );
}
export function FormDeliveryQueue({ close }: { close: () => void }) {
  const [status, setStatus] =
    useState<ListMarketingFormDeliveryJobsStatus>("actionable");
  return (
    <section className="form-manager" aria-label="Form delivery monitoring">
      <h2>Form delivery monitoring</h2>
      <p>
        Review website inquiry handoffs and failed delivery jobs. Accepted
        submissions remain saved while delivery is retried.
      </p>
      <button onClick={close}>Back to forms</button>
      <label>
        Delivery status
        <select
          aria-label="Delivery status"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as ListMarketingFormDeliveryJobsStatus)
          }
        >
          <option value="actionable">
            Pending inquiry handoffs and failed deliveries
          </option>
          <option value="completed">Completed commercial handoffs</option>
          <option value="all">All monitored deliveries</option>
        </select>
      </label>
      <Queue key={status} status={status} />
    </section>
  );
}
