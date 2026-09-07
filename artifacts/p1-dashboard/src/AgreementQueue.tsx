import type {
  AgreementChargeQueueItem,
  AgreementChargePreview,
  DashboardProperty,
} from "../../../lib/api-client-react/src/dashboard/models";
import { useEffect, useRef, useState } from "react";
import {
  listAgreementChargeQueue,
  previewAgreementCharge,
  prepareAgreementCharge,
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
    </section>
  );
}
