import { useEffect, useRef, useState } from "react";
import {
  reviewAgreementDraftPricing,
  saveAgreementDraftPricing,
} from "@workspace/api-client-react/dashboard";
import type {
  AgreementDraft,
  AgreementDraftPricingReview,
  ReviewAgreementDraftPricing,
} from "../../../../lib/api-client-react/src/dashboard/models";
import {
  agreementCents,
  agreementMoney,
  agreementMonths,
} from "../agreement-ui";
import { message } from "./template-draft";
import { basisLabels } from "./AgreementDraftPreview";
type Basis = keyof typeof basisLabels;
export default function AgreementPricingReview({
  row,
  close,
  changed,
}: {
  row: AgreementDraft;
  close: () => void;
  changed: (row: AgreementDraft) => void;
}) {
  const bases = (Object.keys(basisLabels) as Basis[]).filter((basis) =>
    row.content.costs.items.some((item) => item.basis === basis),
  );
  const savedPlan = row.pricing_plan;
  const savedMonthly = savedPlan?.allocations.find(
    (allocation) => allocation.basis === "fixed_monthly",
  );
  const savedVisits = savedPlan?.allocations.find(
    (allocation) => allocation.basis === "per_visit",
  );
  const [reviewedInput, setReviewedInput] =
    useState<ReviewAgreementDraftPricing | null>(null);
  const [scope, setScope] = useState<Record<Basis, string[]>>({
    one_time:
      savedPlan?.allocations.find(
        (allocation) => allocation.basis === "one_time",
      )?.scopeRowIds || [],
    fixed_monthly: savedMonthly?.scopeRowIds || [],
    per_visit: savedVisits?.scopeRowIds || [],
  });
  const [visits, setVisits] = useState(
    savedVisits?.basis === "per_visit" ? String(savedVisits.maximumVisits) : "",
  );
  const [calendar] = useState(() => {
    try {
      return {
        periods: agreementMonths(
          row.dates.startsOn || "",
          row.dates.endsOn || "",
        ),
        error: "",
      };
    } catch (error) {
      return { periods: [], error: message(error) };
    }
  });
  const [periods, setPeriods] = useState(() =>
    calendar.periods.map((period) => {
      const saved =
        savedMonthly?.basis === "fixed_monthly"
          ? savedMonthly.periods.find(
              (item) =>
                item.startsOn === period.startsOn &&
                item.endsOn === period.endsOn,
            )
          : undefined;
      return {
        ...period,
        amount: saved ? (saved.amountCents / 100).toFixed(2) : "",
        reviewReason: saved?.reviewReason || "",
      };
    }),
  );
  const [result, setResult] = useState<AgreementDraftPricingReview | null>(
    savedPlan?.review || null,
  );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [touched, setTouched] = useState(false);
  const gate = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  function invalidate() {
    setResult(null);
    setReviewedInput(null);
    setError("");
    setTouched(true);
  }
  async function review() {
    if (gate.current) return;
    setResult(null);
    setReviewedInput(null);
    setError("");
    gate.current = true;
    setBusy(true);
    try {
      const allocations: ReviewAgreementDraftPricing["allocations"] = bases.map(
        (basis) => {
          if (!scope[basis].length)
            throw Error(`Select scope for ${basisLabels[basis]}.`);
          if (basis === "one_time") return { basis, scopeRowIds: scope[basis] };
          if (basis === "fixed_monthly")
            return {
              basis,
              scopeRowIds: scope[basis],
              periods: periods.map(({ amount, ...period }) => ({
                ...period,
                amountCents: agreementCents(amount),
              })),
            };
          if (!/^[1-9]\d*$/.test(visits) || Number(visits) > 10000)
            throw Error("Enter a maximum of 1 to 10,000 visits.");
          return {
            basis,
            scopeRowIds: scope[basis],
            maximumVisits: Number(visits),
          };
        },
      );
      const input = { expectedVersion: row.version, allocations };
      const reviewed = await reviewAgreementDraftPricing(row.id, input);
      if (alive.current) {
        setResult(reviewed);
        setReviewedInput(input);
      }
    } catch (error) {
      if (alive.current) setError(message(error));
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function save() {
    if (gate.current || !reviewedInput || !result?.pricingValid) return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      const updated = await saveAgreementDraftPricing(row.id, reviewedInput);
      if (alive.current) changed(updated);
    } catch (error) {
      if (alive.current) {
        setError(message(error));
        setResult(null);
        setReviewedInput(null);
      }
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="template-library" aria-label="Agreement pricing review">
      <h2>Review agreement pricing</h2>
      <p>
        Saved draft version {row.version}. Assign scope to each billing basis
        and set finite charge limits. Shared scope must be selected in each
        applicable group.
      </p>
      <p>
        Calculate and review the amounts, then save the pricing plan to this
        private draft. Closing discards unsaved review inputs. Saving agreement
        content or context changes invalidates the saved plan. This does not
        prepare or send a proposal.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void review();
        }}
      >
        <fieldset disabled={busy}>
          <legend>Pricing allocations</legend>
          {bases.map((basis) => (
            <section
              key={basis}
              aria-label={`${basisLabels[basis]} allocation`}
            >
              <h3>
                {basisLabels[basis]} ·{" "}
                {agreementMoney(row.preview.totalsByBasis[basis])}
                {basis === "fixed_monthly"
                  ? " per month"
                  : basis === "per_visit"
                    ? " per visit"
                    : " total"}
              </h3>
              <ul>
                {row.preview.content.costs.items
                  .filter((item) => item.basis === basis)
                  .map((item) => (
                    <li key={item.id}>
                      {item.description} · {agreementMoney(item.totalCents)}
                    </li>
                  ))}
              </ul>
              <fieldset>
                <legend>Included scope</legend>
                {row.content.scope.items.map((item) => (
                  <label key={item.id}>
                    <input
                      type="checkbox"
                      checked={scope[basis].includes(item.id)}
                      onChange={(event) => {
                        invalidate();
                        setScope({
                          ...scope,
                          [basis]: event.target.checked
                            ? [...scope[basis], item.id]
                            : scope[basis].filter((id) => id !== item.id),
                        });
                      }}
                    />
                    {item.title}
                  </label>
                ))}
              </fieldset>
              {basis === "per_visit" && (
                <label>
                  Maximum authorized visits
                  <input
                    required
                    inputMode="numeric"
                    pattern="[1-9][0-9]*"
                    value={visits}
                    onChange={(event) => {
                      invalidate();
                      setVisits(event.target.value);
                    }}
                  />
                  <span>
                    A financial allowance, not a scheduled visit count.
                    Additional visits need new authorization.
                  </span>
                </label>
              )}
              {basis === "fixed_monthly" && (
                <>
                  <p>
                    Enter an explicit USD amount for each calendar period.
                    Explain partial periods and any amount that differs from the
                    monthly rate.
                  </p>
                  {(calendar.error || !periods.length) && (
                    <p role="alert">
                      {calendar.error ||
                        "Save a start and end date on the agreement to enter monthly periods."}
                    </p>
                  )}
                  {periods.map((period, index) => (
                    <fieldset key={period.startsOn}>
                      <legend>
                        {period.startsOn} through {period.endsOn}
                      </legend>
                      <label>
                        Period amount (USD)
                        <input
                          required
                          inputMode="decimal"
                          value={period.amount}
                          onChange={(event) => {
                            invalidate();
                            setPeriods(
                              periods.map((value, i) =>
                                i === index
                                  ? { ...value, amount: event.target.value }
                                  : value,
                              ),
                            );
                          }}
                        />
                      </label>
                      <label>
                        Charge review explanation
                        <textarea
                          maxLength={1000}
                          value={period.reviewReason}
                          onChange={(event) => {
                            invalidate();
                            setPeriods(
                              periods.map((value, i) =>
                                i === index
                                  ? {
                                      ...value,
                                      reviewReason: event.target.value,
                                    }
                                  : value,
                              ),
                            );
                          }}
                        />
                      </label>
                    </fieldset>
                  ))}
                </>
              )}
            </section>
          ))}
          {!bases.length && <p>Add cost rows to the saved draft first.</p>}
          <button disabled={!bases.length}>
            {busy ? "Reviewing pricing…" : "Calculate authorized amounts"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                !touched ||
                window.confirm(
                  "Discard these pricing review inputs and return to the saved draft?",
                )
              )
                close();
            }}
          >
            Back to agreement draft
          </button>
        </fieldset>
      </form>
      {error && <p role="alert">{error} Review inputs have been kept.</p>}
      {result && (
        <section aria-label="Pricing review result">
          <h3>
            {result.pricingValid
              ? "Pricing review passed"
              : "Pricing needs attention"}
          </h3>
          {result.blockers.length > 0 && (
            <ul>
              {result.blockers.map((blocker, i) => (
                <li key={i}>
                  {blocker.basis ? `${basisLabels[blocker.basis]}: ` : ""}
                  {blocker.message}
                </li>
              ))}
            </ul>
          )}
          <dl>
            {result.allocations.map((allocation) => (
              <div key={allocation.basis}>
                <dt>{basisLabels[allocation.basis]} authorized maximum</dt>
                <dd>
                  {allocation.authorizedAmountCents === null
                    ? "Cannot calculate a supported amount"
                    : agreementMoney(allocation.authorizedAmountCents)}
                </dd>
              </div>
            ))}
          </dl>
          {result.authorizedAmountCents !== null && (
            <p>
              <strong>
                Combined authorized maximum:{" "}
                {agreementMoney(result.authorizedAmountCents)}
              </strong>
            </p>
          )}
          {result.pricingValid && reviewedInput && (
            <button disabled={busy} onClick={() => void save()}>
              {busy ? "Saving pricing…" : "Save reviewed pricing plan"}
            </button>
          )}
          <p>
            These are proposed limits. Client/property eligibility, scheduling,
            recipients and approval must still be checked before work or billing
            is authorized.
          </p>
        </section>
      )}
    </section>
  );
}
