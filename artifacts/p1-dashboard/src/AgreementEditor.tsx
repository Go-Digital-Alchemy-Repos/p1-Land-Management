import type {
  ServiceAgreementFinancial,
  ServiceAgreementTerms,
  DashboardProperty,
  AgreementRecurrenceOption,
  AgreementEstimateOption,
} from "../../../lib/api-client-react/src/dashboard/models";
import { useState } from "react";
import {
  getServiceAgreement,
  createServiceAgreement,
  updateServiceAgreement,
} from "@workspace/api-client-react/dashboard";
import {
  agreementCents,
  agreementMoney,
  agreementMonths,
} from "./agreement-ui";
export function AgreementEditor({
  existing,
  predecessor,
  properties,
  recurrences,
  estimates,
  onSaved,
  onCancel,
}: {
  existing?: ServiceAgreementFinancial;
  predecessor?: ServiceAgreementFinancial;
  properties: DashboardProperty[];
  recurrences: AgreementRecurrenceOption[];
  estimates: AgreementEstimateOption[];
  onSaved: (a: ServiceAgreementFinancial) => void;
  onCancel: () => void;
}) {
  const [version, setVersion] = useState(existing?.version || 1);
  const [conflicted, setConflicted] = useState(false);
  const [latest, setLatest] = useState<ServiceAgreementFinancial | null>(null);
  const [creationId] = useState(() => crypto.randomUUID());
  const source = existing || predecessor;
  const [propertyId, setProperty] = useState(source?.propertyId || ""),
    [recurrenceId, setRecurrence] = useState(source?.recurringServiceId || ""),
    [estimateId, setEstimate] = useState(existing?.estimateId || "");
  const [title, setTitle] = useState(
      existing?.title || (predecessor ? "Renewal · " + predecessor.title : ""),
    ),
    [start, setStart] = useState(existing?.startsOn || ""),
    [end, setEnd] = useState(existing?.endsOn || "");
  const [mode, setMode] = useState<ServiceAgreementTerms["billingMode"]>(
    source?.billingMode || "fixed_monthly",
  );
  const [rate, setRate] = useState(
    existing?.unitAmountCents ? String(existing.unitAmountCents / 100) : "",
  );
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (existing?.periods || []).map((p) => [
        p.startsOn + ":" + p.endsOn,
        String(p.amountCents / 100),
      ]),
    ),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  let periods: ReturnType<typeof agreementMonths> = [],
    periodError = "";
  try {
    periods = agreementMonths(start, end);
  } catch (e) {
    periodError = (e as Error).message;
  }
  const approved = estimates.filter(
    (e) =>
      e.property_id === propertyId &&
      e.status === "approved" &&
      e.id !== predecessor?.estimateId,
  );
  const estimate = approved.find((e) => e.id === estimateId);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy || conflicted) return;
    setBusy(true);
    setError("");
    try {
      if (periodError) throw Error(periodError);
      if (!periods.length) throw Error("Choose a valid finite term.");
      const terms: ServiceAgreementTerms = {
        title,
        startsOn: start,
        endsOn: end,
        billingMode: mode,
        unitAmountCents: mode === "per_visit" ? agreementCents(rate) : null,
        periods:
          mode === "fixed_monthly"
            ? periods.map((p) => ({
                ...p,
                amountCents: agreementCents(
                  amounts[p.startsOn + ":" + p.endsOn] || "",
                ),
              }))
            : [],
      };
      const result = existing
        ? await updateServiceAgreement(existing.id, {
            version,
            terms,
          })
        : await createServiceAgreement({
            id: creationId,
            propertyId,
            recurringServiceId: recurrenceId,
            estimateId,
            predecessorId: predecessor?.id || null,
            terms,
          });
      onSaved(result);
    } catch (e) {
      if (existing && (e as { status?: number }).status === 409) {
        setConflicted(true);
        setLatest(null);
      }
      setError(
        (e as Error).message +
          " Your entries are retained. If a response was lost, retry unchanged before starting another draft.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function compareSaved() {
    if (busy || !existing) return;
    setBusy(true);
    setError("");
    try {
      const row = await getServiceAgreement(existing.id);
      if (!("estimateId" in row))
        throw Error("Financial access is no longer available.");
      setLatest(row);
    } catch (e) {
      setError((e as Error).message + " Your entries are retained.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="agreement-editor" onSubmit={save}>
      <h3>
        {existing
          ? "Edit draft terms"
          : predecessor
            ? "Create successor agreement"
            : "New service agreement"}
      </h3>
      <p>
        Use approved customer scope and enter every charge explicitly. Saving
        creates a draft for review.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {conflicted && (
        <section className="agreement-plan" aria-label="Saved terms comparison">
          <h4>Review concurrent changes</h4>
          <p>
            Your entries remain in the form. Compare the current saved terms
            before choosing a version for your next save. This does not merge
            changes.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void compareSaved()}
          >
            Compare current saved terms
          </button>
          {latest && (
            <>
              <p>
                Current saved version {latest.version} · {latest.status}. Your
                original editing version: {version}.
              </p>
              <div className="agreement-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Currently saved</th>
                      <th>Your entries</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th>Title</th>
                      <td>{latest.title}</td>
                      <td>{title}</td>
                    </tr>
                    <tr>
                      <th>Term</th>
                      <td>
                        {latest.startsOn} through {latest.endsOn}
                      </td>
                      <td>
                        {start} through {end}
                      </td>
                    </tr>
                    <tr>
                      <th>Billing basis</th>
                      <td>{latest.billingMode}</td>
                      <td>{mode}</td>
                    </tr>
                    <tr>
                      <th>Per-visit rate</th>
                      <td>
                        {latest.unitAmountCents === null
                          ? "Not applicable"
                          : agreementMoney(latest.unitAmountCents)}
                      </td>
                      <td>
                        {mode === "per_visit"
                          ? rate + " USD"
                          : "Not applicable"}
                      </td>
                    </tr>
                    <tr>
                      <th>Charge periods</th>
                      <td>
                        {latest.periods.map((p) => (
                          <p key={p.id}>
                            {p.startsOn} through {p.endsOn}:{" "}
                            {agreementMoney(p.amountCents)}
                          </p>
                        ))}
                      </td>
                      <td>
                        {mode === "fixed_monthly"
                          ? periods.map((p) => (
                              <p key={p.startsOn}>
                                {p.startsOn} through {p.endsOn}:{" "}
                                {amounts[p.startsOn + ":" + p.endsOn] ||
                                  "Not entered"}{" "}
                                USD
                              </p>
                            ))
                          : "Not applicable"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                Current approved scope (revision {latest.estimateRevision}):{" "}
                {latest.scope}
              </p>
              {latest.status === "draft" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setVersion(latest.version);
                    setConflicted(false);
                    setLatest(null);
                    setError("");
                  }}
                >
                  Use reviewed version for next save
                </button>
              ) : (
                <p>
                  This agreement can no longer be edited as a draft. Cancel
                  editing to return to its saved history.
                </p>
              )}
            </>
          )}
        </section>
      )}
      <fieldset disabled={busy}>
        <div className="agreement-grid">
          <label>
            Property
            <select
              required
              value={propertyId}
              disabled={!!source}
              onChange={(e) => {
                setProperty(e.target.value);
                setRecurrence("");
                setEstimate("");
              }}
            >
              <option value="">Choose property</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Recurring service
            <select
              required
              value={recurrenceId}
              disabled={!!source}
              onChange={(e) => {
                setRecurrence(e.target.value);
                const r = recurrences.find((r) => r.id === e.target.value);
                if (r) setMode(r.billing_mode);
              }}
            >
              <option value="">Choose service</option>
              {recurrences
                .filter((r) => r.property_id === propertyId)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Approved estimate
            <select
              required
              value={estimateId}
              disabled={!!existing}
              onChange={(e) => setEstimate(e.target.value)}
            >
              <option value="">Choose approved revision</option>
              {approved.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} · revision {e.revision} ·{" "}
                  {agreementMoney(Number(e.amount_cents))}
                </option>
              ))}
            </select>
          </label>
          <label>
            Agreement title
            <input
              required
              maxLength={500}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            Term starts
            <input
              required
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Term ends
            <input
              required
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <label>
            Billing basis
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
            >
              <option value="fixed_monthly">Explicit monthly periods</option>
              <option value="per_visit">Per reviewed visit</option>
            </select>
          </label>
        </div>
        {estimate && (
          <details>
            <summary>Approved scope</summary>
            <p>{estimate.scope}</p>
          </details>
        )}
        {periodError && <p role="alert">{periodError}</p>}
        {mode === "per_visit" ? (
          <label>
            Price per reviewed visit (USD)
            <input
              required
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </label>
        ) : (
          <div className="agreement-periods">
            <h4>Dated charge plan</h4>
            <p>
              Enter each period amount, including partial months. No automatic
              proration applies.
            </p>
            {periods.map((p) => {
              const key = p.startsOn + ":" + p.endsOn;
              return (
                <label key={key}>
                  {p.startsOn} through {p.endsOn} (USD)
                  <input
                    required
                    inputMode="decimal"
                    value={amounts[key] || ""}
                    onChange={(e) =>
                      setAmounts({ ...amounts, [key]: e.target.value })
                    }
                  />
                </label>
              );
            })}
          </div>
        )}
        <div className="agreement-actions">
          <button className="primary" disabled={busy || conflicted}>
            {busy ? "Saving…" : "Save draft for review"}
          </button>
          <button type="button" disabled={busy} onClick={onCancel}>
            Cancel editing
          </button>
        </div>
      </fieldset>
    </form>
  );
}
