import type {
  ServiceAgreement,
  ServiceAgreementFinancial,
  AgreementActivationPreview,
  AgreementChargeHistory,
} from "../../../lib/api-client-react/src/dashboard/models";
import { useState, useRef } from "react";
import {
  previewServiceAgreementActivation,
  activateServiceAgreement,
  cancelServiceAgreement,
  listAgreementCharges,
} from "@workspace/api-client-react/dashboard";
import { agreementMoney } from "./agreement-ui";
export function AgreementDetail({
  agreement,
  manage,
  onChanged,
  onEdit,
  onRenew,
  onReload,
  onBusy,
}: {
  agreement: ServiceAgreement;
  manage: boolean;
  onChanged: (a: ServiceAgreementFinancial) => void;
  onEdit: (a: ServiceAgreementFinancial) => void;
  onRenew: (a: ServiceAgreementFinancial) => void;
  onReload: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const [preview, setPreview] = useState<AgreementActivationPreview | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [cancelDate, setCancelDate] = useState(""),
    [reason, setReason] = useState(""),
    [chargeHistory, setChargeHistory] = useState<AgreementChargeHistory | null>(
      null,
    ),
    [chargeCursor, setChargeCursor] = useState<string | null>(null);
  const pending = useRef(false);
  const financial = "version" in agreement;
  async function action(fn: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    onBusy(true);
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(
        (e as Error).message +
          " Your inputs are retained; reload only when you are ready to discard them.",
      );
    } finally {
      pending.current = false;
      onBusy(false);
      setBusy(false);
    }
  }
  async function loadChargeHistory(more = false) {
    if (more && !chargeCursor) return;
    await action(async () => {
      const page = await listAgreementCharges(agreement.id, {
        limit: 25,
        ...(more && chargeCursor ? { after: chargeCursor } : {}),
      });
      setChargeHistory((current) =>
        more && current
          ? {
              ...page,
              items: [
                ...current.items,
                ...page.items.filter(
                  (item) =>
                    !current.items.some(
                      (existing) => existing.chargeId === item.chargeId,
                    ),
                ),
              ],
            }
          : page,
      );
      setChargeCursor(page.nextCursor);
    });
  }
  return (
    <article
      className="agreement-detail"
      aria-label="Selected service agreement"
    >
      <div className="panel-heading">
        <h3>{agreement.title}</h3>
        <span>{agreement.status}</span>
      </div>
      <p>
        {agreement.startsOn} through {agreement.endsOn}
      </p>
      <h4>Approved scope</h4>
      <p className="agreement-scope">{agreement.scope}</p>
      {agreement.cancellationEffectiveOn && (
        <p>
          Cancellation effective {agreement.cancellationEffectiveOn}. Existing
          charges are preserved for financial review.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="button" disabled={busy} onClick={onReload}>
        Reload agreement and discard edits
      </button>
      {financial && (
        <>
          <p>
            {agreement.billingMode === "per_visit"
              ? agreementMoney(agreement.unitAmountCents || 0) +
                " per reviewed visit"
              : "Explicit monthly charge periods"}{" "}
            · approved estimate revision {agreement.estimateRevision}
          </p>
          {!!agreement.periods.length && (
            <table>
              <caption>Saved charge periods</caption>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {agreement.periods.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.startsOn} — {p.endsOn}
                    </td>
                    <td>{agreementMoney(p.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="agreement-actions">
            {manage && agreement.status === "draft" && (
              <button disabled={busy} onClick={() => onEdit(agreement)}>
                Edit draft terms
              </button>
            )}
            {manage && agreement.status !== "draft" && (
              <button disabled={busy} onClick={() => onRenew(agreement)}>
                Create successor with new approval
              </button>
            )}
            {agreement.status === "draft" && (
              <button
                disabled={busy}
                onClick={() =>
                  void action(async () =>
                    setPreview(
                      await previewServiceAgreementActivation(agreement.id, {
                        version: agreement.version,
                      }),
                    ),
                  )
                }
              >
                Review activation plan
              </button>
            )}
            <button disabled={busy} onClick={() => void loadChargeHistory()}>
              View prepared charge history
            </button>
          </div>
          {chargeHistory && (
            <section
              className="agreement-plan"
              aria-label="Prepared charge history"
            >
              <h4>Prepared charge history</h4>
              {!chargeHistory.items.length && (
                <p>No charges have been prepared for this agreement.</p>
              )}
              {!!chargeHistory.items.length && (
                <table>
                  <caption>
                    Charge history remains available after a keep-due review.
                  </caption>
                  <thead>
                    <tr>
                      <th>Prepared</th>
                      <th>Source</th>
                      <th>Amount</th>
                      <th>Review state</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chargeHistory.items.map((item) => (
                      <tr key={item.chargeId}>
                        <td>{new Date(item.createdAt).toLocaleString()}</td>
                        <td>{item.sourceKey}</td>
                        <td>{agreementMoney(item.amountCents)}</td>
                        <td>
                          {item.reviewState.replaceAll("_", " ")}
                          {item.latestReceipt && (
                            <small>
                              {" "}
                              ·{" "}
                              {item.latestReceipt.outcome.replaceAll(
                                "_",
                                " ",
                              )}{" "}
                              review {item.latestReceipt.reviewVersion}
                            </small>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {chargeCursor && (
                <button
                  disabled={busy}
                  onClick={() => void loadChargeHistory(true)}
                >
                  Load more prepared charges
                </button>
              )}
            </section>
          )}
          {preview && (
            <section aria-label="Activation plan" className="agreement-plan">
              <h4>Review before activation</h4>
              <dl>
                <dt>Approved amount</dt>
                <dd>{agreementMoney(preview.approvedCents)}</dd>
                <dt>Already billed, all statuses</dt>
                <dd>{agreementMoney(preview.billedCents)}</dd>
                <dt>Remaining authorization</dt>
                <dd>{agreementMoney(preview.remainingCents)}</dd>
                <dt>
                  {preview.plannedCents === null
                    ? "Per reviewed visit"
                    : "Planned fixed charges"}
                </dt>
                <dd>
                  {agreementMoney(
                    preview.plannedCents ?? preview.perVisitCents ?? 0,
                  )}
                </dd>
              </dl>
              {preview.plannedCents === null && (
                <p>
                  The number of future visits is not assumed. Every charge
                  remains subject to the approved cap.
                </p>
              )}
              {!!preview.periods.length && (
                <table>
                  <caption>Full dated activation plan</caption>
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>Through</th>
                      <th>Charge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.periods.map((p) => (
                      <tr key={p.id}>
                        <td>{p.startsOn}</td>
                        <td>{p.endsOn}</td>
                        <td>{agreementMoney(p.amountCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {preview.blockedReasons.map((r) => (
                <p key={r} role="status">
                  {r}
                </p>
              ))}
              {manage && (
                <button
                  className="primary"
                  disabled={
                    busy ||
                    !preview.canActivate ||
                    preview.version !== agreement.version
                  }
                  onClick={() =>
                    void action(async () =>
                      onChanged(
                        await activateServiceAgreement(agreement.id, {
                          version: agreement.version,
                        }),
                      ),
                    )
                  }
                >
                  Activate reviewed agreement
                </button>
              )}
            </section>
          )}
          {manage && agreement.status === "active" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void action(async () =>
                  onChanged(
                    await cancelServiceAgreement(agreement.id, {
                      version: agreement.version,
                      effectiveOn: cancelDate,
                      reason,
                    }),
                  ),
                );
              }}
            >
              <fieldset disabled={busy}>
                <legend>Cancel future eligibility</legend>
                <p>
                  Prepared drafts and posted invoices remain unchanged. Affected
                  periods and visits require financial review.
                </p>
                <label>
                  Effective date
                  <input
                    required
                    type="date"
                    value={cancelDate}
                    onChange={(e) => setCancelDate(e.target.value)}
                  />
                </label>
                <label>
                  Cancellation reason
                  <textarea
                    required
                    maxLength={1000}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <button disabled={busy}>Record cancellation</button>
              </fieldset>
            </form>
          )}
        </>
      )}
    </article>
  );
}
