import type {
  AgreementChargeQueueItem,
  AgreementChargePreview,
  AgreementChargeReview,
  AgreementChargeReviewPreview,
  DashboardProperty,
} from "../../../lib/api-client-react/src/dashboard/models";
import { useEffect, useRef, useState } from "react";
import {
  listAgreementChargeQueue,
  getAgreementChargeReview,
  previewAgreementChargeReview,
  previewAgreementCharge,
  prepareAgreementCharge,
  recordAgreementChargeReview,
} from "@workspace/api-client-react/dashboard";
import { agreementMoney } from "./agreement-ui";
export function AgreementQueue({
  properties,
  onOpen,
  revision,
}: {
  properties: DashboardProperty[];
  onOpen: (id: string) => void;
  revision: number;
}) {
  const [items, setItems] = useState<AgreementChargeQueueItem[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<AgreementChargeQueueItem | null>(null),
    [preview, setPreview] = useState<AgreementChargePreview | null>(null),
    [cancellationReview, setCancellationReview] =
      useState<AgreementChargeReview | null>(null),
    [cancellationPreview, setCancellationPreview] =
      useState<AgreementChargeReviewPreview | null>(null),
    [reviewOutcome, setReviewOutcome] = useState<
      "keep_due" | "correction_required"
    >("keep_due"),
    [reviewReason, setReviewReason] = useState(""),
    [reviewOperationId, setReviewOperationId] = useState<string | null>(null),
    [message, setMessage] = useState("");
  const pending = useRef(false),
    generation = useRef(0);
  async function load(more = false) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const n = ++generation.current;
    try {
      const page = await listAgreementChargeQueue({
        limit: 25,
        ...(more && cursor ? { after: cursor } : {}),
      });
      if (n === generation.current) {
        setItems((old) =>
          more
            ? [
                ...old,
                ...page.items.filter((p) => !old.some((i) => i.key === p.key)),
              ]
            : page.items,
        );
        setCursor(page.nextCursor);
      }
    } catch (e) {
      if (n === generation.current) setError((e as Error).message);
    } finally {
      if (n === generation.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  useEffect(() => {
    setPreview(null);
    setSelected(null);
    setCancellationReview(null);
    setCancellationPreview(null);
    setReviewOperationId(null);
    void load();
    return () => {
      generation.current++;
      pending.current = false;
    };
  }, [revision]);
  function source(row: AgreementChargeQueueItem) {
    return row.periodStart
      ? { periodStart: row.periodStart }
      : { workOrderId: row.workOrderId! };
  }
  async function review(row: AgreementChargeQueueItem) {
    if (pending.current || !row.agreementId) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const n = ++generation.current;
    setSelected(row);
    setPreview(null);
    try {
      const result = await previewAgreementCharge(row.agreementId, source(row));
      if (n === generation.current) setPreview(result);
    } catch (e) {
      if (n === generation.current)
        setError(
          (e as Error).message + " The queue item is retained for review.",
        );
    } finally {
      if (n === generation.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  async function prepare() {
    if (
      pending.current ||
      !selected?.agreementId ||
      !preview ||
      preview.alreadyPrepared
    )
      return;
    pending.current = true;
    setBusy(true);
    setError("");
    const n = ++generation.current;
    try {
      const result = await prepareAgreementCharge(
        selected.agreementId,
        source(selected),
      );
      if (n !== generation.current) return;
      setItems((rows) => rows.filter((row) => row.key !== selected.key));
      setMessage(
        "Billing draft prepared. Staff review is required before posting.",
      );
      setPreview({
        ...preview,
        alreadyPrepared: true,
        billingDraftId: result.billingDraftId,
      });
    } catch (e) {
      if (n === generation.current)
        setError(
          (e as Error).message +
            " Refresh eligibility before retrying; no automatic posting occurs.",
        );
    } finally {
      if (n === generation.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  async function openCancellationReview(row: AgreementChargeQueueItem) {
    if (pending.current || !row.chargeId) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    setSelected(row);
    setPreview(null);
    setCancellationPreview(null);
    const n = ++generation.current;
    try {
      const current = await getAgreementChargeReview(row.chargeId);
      if (n !== generation.current) return;
      setCancellationReview(current);
      setReviewOutcome(
        current.allowedOutcomes.includes("keep_due")
          ? "keep_due"
          : "correction_required",
      );
      setReviewReason("");
      setReviewOperationId(null);
    } catch (e) {
      if (n === generation.current) setError((e as Error).message);
    } finally {
      if (n === generation.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  function reviewInput(current: AgreementChargeReview) {
    return {
      expectedReviewVersion: current.reviewVersion,
      cancellationVersion: current.cancellationVersion,
      snapshotSha256: current.snapshotSha256,
      outcome: reviewOutcome,
      reason: reviewReason.trim(),
    };
  }
  async function previewCancellationReview() {
    if (
      pending.current ||
      !cancellationReview ||
      !reviewReason.trim() ||
      !selected?.chargeId
    )
      return;
    pending.current = true;
    setBusy(true);
    setError("");
    const n = ++generation.current;
    try {
      const result = await previewAgreementChargeReview(
        selected.chargeId,
        reviewInput(cancellationReview),
      );
      if (n === generation.current) {
        setCancellationPreview(result);
        setCancellationReview(result.current);
      }
    } catch (e) {
      if (n === generation.current) {
        setCancellationPreview(null);
        setError((e as Error).message);
      }
    } finally {
      if (n === generation.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  async function recordCancellationReview() {
    if (
      pending.current ||
      !cancellationReview ||
      !cancellationPreview ||
      !selected?.chargeId
    )
      return;
    pending.current = true;
    setBusy(true);
    setError("");
    const n = ++generation.current;
    const operationId = reviewOperationId || crypto.randomUUID();
    if (!reviewOperationId) setReviewOperationId(operationId);
    try {
      const receipt = await recordAgreementChargeReview(selected.chargeId, {
        ...reviewInput(cancellationReview),
        operationId,
      });
      if (n !== generation.current) return;
      setMessage(
        receipt.outcome === "keep_due"
          ? "The current cancellation snapshot was kept due. The draft remains subject to ordinary billing review."
          : "Correction was recorded. Posting remains blocked until finance resolves it in QuickBooks and records a new review.",
      );
      setCancellationPreview(null);
      setCancellationReview(null);
      setReviewOperationId(null);
      if (receipt.outcome === "keep_due") {
        setItems((rows) => rows.filter((row) => row.key !== selected.key));
      } else {
        setItems((rows) =>
          rows.map((row) =>
            row.key === selected.key
              ? {
                  ...row,
                  reviewVersion: receipt.reviewVersion,
                  reviewState: "correction_required",
                  latestReviewReceipt: receipt,
                }
              : row,
          ),
        );
      }
    } catch (e) {
      if (n === generation.current) setError((e as Error).message);
    } finally {
      if (n === generation.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <section
      className="agreement-queue"
      aria-label="Agreement billing action queue"
    >
      <div className="panel-heading">
        <h3>Billing preparation & review</h3>
        <button disabled={busy} onClick={() => void load()}>
          Refresh billing queue
        </button>
      </div>
      <p>
        Review unmatched work, approval limits, and cancellation effects.
        Prepared charges remain part of business history.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {!busy && !items.length && (
        <p>No agreement charges currently need preparation or review.</p>
      )}
      <ul>
        {items.map((row) => (
          <li key={row.key}>
            <strong>
              {properties.find((p) => p.id === row.propertyId)?.name ||
                "Property"}{" "}
              ·{" "}
              {row.periodStart
                ? "Period starting " + row.periodStart
                : "Reviewed visit"}
            </strong>
            <span>{row.state.replaceAll("_", " ")}</span>
            {row.reason && <p>{row.reason}</p>}
            {row.amountCents !== null && (
              <p>{agreementMoney(row.amountCents)}</p>
            )}
            {row.billingDraftId && (
              <p>
                Existing billing draft: <code>{row.billingDraftId}</code>
              </p>
            )}
            <div className="agreement-actions">
              {row.agreementId && (
                <button
                  disabled={busy}
                  onClick={() => onOpen(row.agreementId!)}
                >
                  Open agreement
                </button>
              )}
              {row.agreementId && !row.billingDraftId && (
                <button disabled={busy} onClick={() => void review(row)}>
                  Review charge eligibility
                </button>
              )}
              {row.chargeId && row.state === "review_required" && (
                <button
                  disabled={busy}
                  onClick={() => void openCancellationReview(row)}
                >
                  Review cancellation impact
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {cursor && (
        <button disabled={busy} onClick={() => void load(true)}>
          Load more billing items
        </button>
      )}
      {preview && selected && (
        <section
          className="agreement-plan"
          aria-label="Charge eligibility preview"
        >
          <h4>Charge review</h4>
          <p>
            {properties.find((p) => p.id === selected.propertyId)?.name ||
              "Property"}{" "}
            ·{" "}
            {selected.periodStart
              ? "Period starting " + selected.periodStart
              : "Reviewed visit"}
          </p>
          <p>
            Charge: {agreementMoney(preview.amountCents)} · remaining approved
            amount before preparation: {agreementMoney(preview.remainingCents)}
          </p>
          {preview.alreadyPrepared ? (
            <p>
              This source already has a billing draft. It will not be charged
              again.
            </p>
          ) : (
            <button
              className="primary"
              disabled={busy}
              onClick={() => void prepare()}
            >
              Prepare billing draft
            </button>
          )}
        </section>
      )}
      {cancellationReview && selected?.chargeId && (
        <section
          className="agreement-plan"
          aria-label="Cancellation impact review"
        >
          <h4>Cancellation impact review</h4>
          <p>
            This records a finance decision against the current draft snapshot.
            It does not post, credit, amend, send, or collect a payment.
          </p>
          <dl>
            <dt>Draft status</dt>
            <dd>{cancellationReview.snapshot.draft.status}</dd>
            <dt>Draft amount</dt>
            <dd>
              {agreementMoney(cancellationReview.snapshot.draft.amountCents)}
            </dd>
            <dt>Current balance</dt>
            <dd>
              {cancellationReview.snapshot.draft.balanceCents === null
                ? "Not available"
                : agreementMoney(
                    cancellationReview.snapshot.draft.balanceCents,
                  )}
            </dd>
            <dt>Decision state</dt>
            <dd>{cancellationReview.reviewState.replaceAll("_", " ")}</dd>
          </dl>
          <label>
            Decision
            <select
              value={reviewOutcome}
              disabled={busy}
              onChange={(event) => {
                setReviewOutcome(
                  event.target.value as "keep_due" | "correction_required",
                );
                setCancellationPreview(null);
                setReviewOperationId(null);
              }}
            >
              {cancellationReview.allowedOutcomes.map((outcome) => (
                <option key={outcome} value={outcome}>
                  {outcome === "keep_due"
                    ? "Keep this draft due"
                    : "Correction required"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Reason for this decision
            <textarea
              value={reviewReason}
              maxLength={2000}
              disabled={busy}
              onChange={(event) => {
                setReviewReason(event.target.value);
                setCancellationPreview(null);
                setReviewOperationId(null);
              }}
            />
          </label>
          <div className="agreement-actions">
            <button
              disabled={busy || !reviewReason.trim()}
              onClick={() => void previewCancellationReview()}
            >
              Compare current snapshot
            </button>
            {cancellationPreview && (
              <button
                className="primary"
                disabled={busy}
                onClick={() => void recordCancellationReview()}
              >
                Record immutable decision
              </button>
            )}
          </div>
          {cancellationPreview && (
            <p role="status">
              {cancellationPreview.postingWouldRemainBlocked
                ? "This decision keeps posting blocked."
                : "This exact snapshot may proceed through the existing billing-review workflow; posting is still a separate action."}
            </p>
          )}
        </section>
      )}
    </section>
  );
}
