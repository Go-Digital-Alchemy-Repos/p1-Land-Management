import { useEffect, useRef, useState } from "react";
import {
  prepareAgreementDraft,
  getAgreementDraft,
} from "@workspace/api-client-react/dashboard";
import type {
  AgreementDraft,
  AgreementPreparationInput,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { message } from "./template-draft";
import AgreementDraftPreview from "./AgreementDraftPreview";
import { useCmsUnsavedChanges } from "../marketing/useCmsUnsavedChanges";
export default function AgreementPreparation({
  row,
  changed,
  close,
}: {
  row: AgreementDraft;
  changed: (row: AgreementDraft) => void;
  close: () => void;
}) {
  const [days, setDays] = useState(30);
  const [schedules, setSchedules] = useState<
    AgreementPreparationInput["schedules"]
  >(() =>
    (row.pricing_plan?.review.allocations || [])
      .filter((item) => item.basis !== "one_time")
      .map((item) => ({
        basis: item.basis as "fixed_monthly" | "per_visit",
        cadence: "weekly",
        intervalCount: 1,
        localTime: "08:00",
        firstVisitOn: "",
      })),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState<AgreementPreparationInput | null>(null);
  const gate = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useCmsUnsavedChanges(
    true,
    "Leave preparation? Reload this draft to check whether a proposal was created before trying different choices.",
  );
  const valid =
    row.status === "draft" &&
    row.pricing_plan?.sourceVersion === row.version &&
    row.pricing_plan.review.pricingValid;
  async function prepare() {
    if (gate.current || !valid) return;
    const body = attempt || {
      expectedVersion: row.version,
      validForDays: days,
      schedules,
    };
    gate.current = true;
    setBusy(true);
    setError("");
    setAttempt(structuredClone(body));
    try {
      const result = await prepareAgreementDraft(row.id, body);
      if (alive.current) changed(result.draft);
    } catch (error) {
      if (alive.current) setError(message(error));
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section
      className="template-library"
      aria-label="Prepare agreement proposal"
    >
      <h2>Prepare proposal</h2>
      <p>
        Review the saved agreement and choose the service schedules. Preparation
        freezes this version and places the proposal in Sales for recipient
        selection and sending.
      </p>
      {row.revises_estimate_id && (
        <p>
          This replaces the current unapproved proposal. Its old approval link
          becomes unavailable only after preparation succeeds.
        </p>
      )}
      {row.change_order_estimate_id && (
        <p>
          This creates a separate authorization for additional work. The
          original approved agreement stays in effect.
        </p>
      )}
      {!valid && (
        <p role="alert">
          Save a pricing review for the current draft before preparing.
        </p>
      )}
      {error && (
        <p role="alert">
          {error} Your submitted choices have been kept. Retry the same request
          or reload the draft to check its status.
        </p>
      )}
      <AgreementDraftPreview row={row} dirty={false} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void prepare();
        }}
      >
        <fieldset disabled={busy || Boolean(attempt) || !valid}>
          <legend>Proposal validity and service schedules</legend>
          <label>
            Valid for days
            <input
              type="number"
              min={1}
              max={90}
              required
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            />
          </label>
          {schedules.map((schedule, index) => (
            <section key={schedule.basis}>
              <h3>
                {schedule.basis === "fixed_monthly"
                  ? "Monthly services"
                  : "Per-visit services"}
              </h3>
              <p>
                Scheduling frequency is separate from the reviewed monthly
                charges or maximum visit allowance.
              </p>
              <label>
                Cadence
                <select
                  value={schedule.cadence}
                  onChange={(event) =>
                    setSchedules((rows) =>
                      rows.map((row, i) =>
                        i === index
                          ? {
                              ...row,
                              cadence: event.target.value as
                                | "weekly"
                                | "monthly",
                            }
                          : row,
                      ),
                    )
                  }
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label>
                Every
                <input
                  type="number"
                  min={1}
                  max={52}
                  required
                  value={schedule.intervalCount}
                  onChange={(event) =>
                    setSchedules((rows) =>
                      rows.map((row, i) =>
                        i === index
                          ? {
                              ...row,
                              intervalCount: Number(event.target.value),
                            }
                          : row,
                      ),
                    )
                  }
                />
              </label>
              <label>
                First visit
                <input
                  type="date"
                  required
                  min={row.dates.startsOn || undefined}
                  max={row.dates.endsOn || undefined}
                  value={schedule.firstVisitOn}
                  onChange={(event) =>
                    setSchedules((rows) =>
                      rows.map((row, i) =>
                        i === index
                          ? { ...row, firstVisitOn: event.target.value }
                          : row,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Local time (Eastern)
                <input
                  type="time"
                  required
                  value={schedule.localTime}
                  onChange={(event) =>
                    setSchedules((rows) =>
                      rows.map((row, i) =>
                        i === index
                          ? { ...row, localTime: event.target.value }
                          : row,
                      ),
                    )
                  }
                />
              </label>
            </section>
          ))}
        </fieldset>
        <button disabled={busy || !valid}>
          {busy
            ? "Preparing…"
            : attempt
              ? "Retry same preparation"
              : "Prepare proposal"}
        </button>
        {attempt && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (gate.current) return;
              gate.current = true;
              setBusy(true);
              try {
                const saved = await getAgreementDraft(row.id);
                if (alive.current) changed(saved);
              } catch (error) {
                if (alive.current) setError(message(error));
              } finally {
                gate.current = false;
                if (alive.current) setBusy(false);
              }
            }}
          >
            Reload draft status
          </button>
        )}
        <button
          type="button"
          disabled={busy || Boolean(attempt)}
          onClick={close}
        >
          Back to draft
        </button>
      </form>
    </section>
  );
}
