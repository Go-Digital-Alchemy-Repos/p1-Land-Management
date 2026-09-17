import { useEffect, useRef, useState } from "react";
import { getEstimateBillingAllocations } from "@workspace/api-client-react/dashboard";
import type { EstimateBillingAllocations } from "../../../lib/api-client-react/src/dashboard/models";
import { agreementMoney } from "./agreement-ui";
import { basisLabels } from "./agreements/AgreementDraftPreview";
import { message } from "./agreements/template-draft";
export type BillingAllocationSelection = {
  estimateId: string;
  allocationId: string | null;
  ready: boolean;
};
export function BillingAllocationPicker({
  estimateId,
  onChange,
}: {
  estimateId: string;
  onChange?: (selection: BillingAllocationSelection) => void;
}) {
  const [data, setData] = useState<EstimateBillingAllocations | null>(null);
  const [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [selected, setSelected] = useState("");
  const notify = useRef(onChange);
  notify.current = onChange;
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    setSelected("");
    notify.current?.({ estimateId, allocationId: null, ready: false });
    if (estimateId)
      void getEstimateBillingAllocations(estimateId, {
        signal: controller.signal,
      })
        .then((result) => {
          if (controller.signal.aborted) return;
          setData(result);
          notify.current?.({
            estimateId,
            allocationId: null,
            ready: result.allocations.length === 0 && result.remainingCents > 0,
          });
        })
        .catch((error) => {
          if (!controller.signal.aborted) setError(message(error));
        });
    return () => controller.abort();
  }, [estimateId, attempt]);
  if (!estimateId) return null;
  const current = data?.estimateId === estimateId ? data : null;
  if (!current)
    return (
      <section aria-label="Billing allocation status">
        <label>
          Authorization status
          <select required value="" onChange={() => {}}>
            <option value="">
              {error
                ? "Authorization unavailable — retry required"
                : "Loading approved authorization…"}
            </option>
          </select>
        </label>
        {error && (
          <>
            <p role="alert">
              {error} Billing cannot be prepared until authorization is loaded.
            </p>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Retry authorization
            </button>
          </>
        )}
      </section>
    );
  if (current.remainingCents <= 0)
    return (
      <section aria-label="Billing allocation status">
        <p role="status">This estimate has no remaining approved budget.</p>
        <label>
          Authorization status
          <select required value="" onChange={() => {}}>
            <option value="">New authorization is required</option>
          </select>
        </label>
      </section>
    );
  return (
    <section aria-label="Billing allocation choices">
      <p>Estimate remaining: {agreementMoney(current.remainingCents)}</p>
      {current.allocations.length > 0 && (
        <label>
          Agreement component
          <select
            name="estimateAllocationId"
            required
            value={selected}
            onChange={(event) => {
              const allocationId = event.target.value;
              setSelected(allocationId);
              const allocation = current.allocations.find(
                (row) => row.id === allocationId,
              );
              notify.current?.({
                estimateId,
                allocationId: allocationId || null,
                ready: Boolean(allocation && allocation.remainingCents > 0),
              });
            }}
          >
            <option value="">Choose component</option>
            {current.allocations.map((row) => (
              <option
                key={row.id}
                value={row.id}
                disabled={row.remainingCents <= 0}
              >
                {row.title} · {basisLabels[row.basis]} ·{" "}
                {agreementMoney(row.remainingCents)} remaining
              </option>
            ))}
          </select>
        </label>
      )}
      {selected && (
        <p role="status">
          Component remaining:{" "}
          {agreementMoney(
            current.allocations.find((row) => row.id === selected)
              ?.remainingCents || 0,
          )}
        </p>
      )}
      <p className="muted">
        Remaining amounts are checked again when the draft is prepared.
      </p>
    </section>
  );
}
export default function BillingEstimatePicker({
  estimates,
}: {
  estimates: { id: string; title: string; status: string }[];
}) {
  const [estimateId, setEstimateId] = useState("");
  return (
    <>
      <label>
        Approved estimate
        <select
          name="estimateId"
          required
          value={estimateId}
          onChange={(event) => setEstimateId(event.target.value)}
        >
          <option value="">Choose estimate</option>
          {estimates
            .filter((row) => row.status === "approved")
            .map((row) => (
              <option key={row.id} value={row.id}>
                {row.title}
              </option>
            ))}
        </select>
      </label>
      <BillingAllocationPicker key={estimateId} estimateId={estimateId} />
    </>
  );
}
