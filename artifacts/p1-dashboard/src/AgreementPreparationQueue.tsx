import type {
  AgreementPreparationJob,
  AgreementPreparationRetryPreview,
} from "../../../lib/api-client-react/src/dashboard/models";
import { useEffect, useRef, useState } from "react";
import { RichTextEditor } from "./RichTextEditor";
import {
  listAgreementPreparationJobs,
  previewAgreementPreparationRetry,
  retryAgreementPreparation,
} from "@workspace/api-client-react/dashboard";

function sourceLabel(job: AgreementPreparationJob) {
  if (!job.source) return "Stored source requires review";
  return "periodStart" in job.source
    ? "Period starting " + job.source.periodStart
    : "Reviewed visit";
}

export function AgreementPreparationQueue({
  onOpen,
  revision,
}: {
  onOpen: (agreementId: string) => void;
  revision: number;
}) {
  const [items, setItems] = useState<AgreementPreparationJob[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [selected, setSelected] = useState<AgreementPreparationJob | null>(null),
    [preview, setPreview] = useState<AgreementPreparationRetryPreview | null>(
      null,
    ),
    [reason, setReason] = useState(""),
    [operationId, setOperationId] = useState<string | null>(null);
  const pending = useRef(false),
    generation = useRef(0);

  async function load(more = false) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const request = ++generation.current;
    try {
      const page = await listAgreementPreparationJobs({
        status: "failed",
        limit: 25,
        ...(more && cursor ? { after: cursor } : {}),
      });
      if (request !== generation.current) return;
      setItems((old) =>
        more
          ? [
              ...old,
              ...page.items.filter(
                (item) => !old.some((current) => current.jobId === item.jobId),
              ),
            ]
          : page.items,
      );
      setCursor(page.nextCursor);
    } catch (cause) {
      if (request === generation.current) setError((cause as Error).message);
    } finally {
      if (request === generation.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }

  useEffect(() => {
    setSelected(null);
    setPreview(null);
    setReason("");
    setOperationId(null);
    void load();
    return () => {
      generation.current++;
      pending.current = false;
    };
  }, [revision]);

  async function inspect(job: AgreementPreparationJob) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    setSelected(job);
    setPreview(null);
    setReason("");
    setOperationId(null);
    const request = ++generation.current;
    try {
      const result = await previewAgreementPreparationRetry(job.jobId, {
        expectedRevision: job.revision,
      });
      if (request === generation.current) setPreview(result);
    } catch (cause) {
      if (request === generation.current) setError((cause as Error).message);
    } finally {
      if (request === generation.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }

  async function retry() {
    if (
      pending.current ||
      !selected ||
      !preview ||
      !preview.eligible ||
      preview.alreadyPrepared ||
      !reason.trim()
    )
      return;
    pending.current = true;
    setBusy(true);
    setError("");
    const request = ++generation.current;
    const id = operationId || crypto.randomUUID();
    if (!operationId) setOperationId(id);
    try {
      const receipt = await retryAgreementPreparation(selected.jobId, {
        operationId: id,
        expectedRevision: preview.revision,
        eligibilityFingerprint: preview.eligibilityFingerprint,
        reason: reason.trim(),
      });
      if (request !== generation.current) return;
      setMessage(
        receipt.created
          ? "Retry requested. The worker will prepare a draft after it rechecks the agreement."
          : "This retry request was already recorded. The worker will continue from its durable state.",
      );
      setSelected(null);
      setPreview(null);
      setReason("");
      setOperationId(null);
      setItems((jobs) => jobs.filter((job) => job.jobId !== selected.jobId));
    } catch (cause) {
      if (request === generation.current) setError((cause as Error).message);
    } finally {
      if (request === generation.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }

  return (
    <section
      className="agreement-queue agreement-preparation-queue"
      aria-label="Failed automatic billing preparation"
    >
      <div className="panel-heading">
        <h3>Automatic billing preparation</h3>
        <button disabled={busy} onClick={() => void load()}>
          Refresh preparation jobs
        </button>
      </div>
      <p>
        Failed jobs stay visible for finance review. A retry only queues a
        billing-draft check; it never posts an invoice, sends a message, or
        collects payment.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {!busy && !items.length && (
        <p>No automatic billing preparation jobs currently need review.</p>
      )}
      <ul>
        {items.map((job) => (
          <li key={job.jobId}>
            <strong>{sourceLabel(job)}</strong>
            <span>Agreement preparation failed</span>
            <p>{job.failureCode || "The worker could not classify the failure."}</p>
            <p>
              Attempt {job.attempts} · retry cycle {job.retryEpoch}
            </p>
            <div className="agreement-actions">
              {job.agreementId && (
                <button disabled={busy} onClick={() => onOpen(job.agreementId!)}>
                  Open agreement
                </button>
              )}
              <button disabled={busy} onClick={() => void inspect(job)}>
                Check retry eligibility
              </button>
            </div>
          </li>
        ))}
      </ul>
      {cursor && (
        <button disabled={busy} onClick={() => void load(true)}>
          Load more preparation jobs
        </button>
      )}
      {selected && preview && (
        <section className="agreement-plan" aria-label="Preparation retry review">
          <h4>Preparation retry review</h4>
          <p>{sourceLabel(selected)}</p>
          {preview.alreadyPrepared ? (
            <p>
              A billing draft already exists for this source. The duplicate will
              not be charged again.
            </p>
          ) : preview.eligible ? (
            <>
              <p>
                The current agreement is eligible. Record why this failed job
                should be retried before returning it to the worker.
              </p>
              <label>
                Retry reason
                <RichTextEditor value={reason} maxLength={2000} disabled={busy} ariaLabel="Retry reason" placeholder="Explain why this work should be retried." onChange={(value) => { setReason(value); setOperationId(null); }} />
              </label>
              <div className="agreement-actions">
                <button
                  className="primary"
                  disabled={busy || !reason.trim()}
                  onClick={() => void retry()}
                >
                  Record retry request
                </button>
              </div>
            </>
          ) : (
            <p>
              The agreement is still ineligible. Correct the underlying
              agreement, approval, or work record, then check eligibility again.
            </p>
          )}
        </section>
      )}
    </section>
  );
}
