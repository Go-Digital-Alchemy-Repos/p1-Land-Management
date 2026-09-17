import { agreementTerms } from "./service-agreement.contract";
import type { PoolClient } from "pg";
import { HttpError } from "./policy";
export type EstimateAllocation = {
  id: string;
  estimate_id: string;
  basis: "one_time" | "fixed_monthly" | "per_visit";
  title: string;
  scope: string;
  amount_cents: string;
  configuration: Record<string, any> | null;
};
/** Call only after locking the approved parent estimate. */
export async function estimateAllocations(c: PoolClient, estimateId: string) {
  return (
    await c.query<EstimateAllocation>(
      "SELECT * FROM estimate_allocation WHERE estimate_id=$1 ORDER BY basis,id",
      [estimateId],
    )
  ).rows;
}
export async function selectedEstimateAllocation(
  c: PoolClient,
  estimateId: string,
  allocationId?: string | null,
) {
  const rows = await estimateAllocations(c, estimateId);
  if (!rows.length && !allocationId) return null;
  if (!allocationId)
    throw new HttpError(409, "Choose an authorized estimate allocation");
  const row = rows.find((row) => row.id === allocationId);
  if (!row)
    throw new HttpError(409, "Allocation does not belong to this estimate");
  return row;
}
/** Both caps count every existing draft, including failed postings. The database
 * enforces the same limits for writers that do not use this helper. */
export async function allocatedBillingCapacity(
  c: PoolClient,
  estimate: { id: string; amount_cents: string | number },
  allocation: EstimateAllocation | null,
) {
  const totals = (
    await c.query(
      "SELECT COALESCE(sum(amount_cents),0) AS total,COALESCE(sum(amount_cents) FILTER(WHERE estimate_allocation_id=$2),0) AS component FROM billing_draft WHERE estimate_id=$1",
      [estimate.id, allocation?.id || null],
    )
  ).rows[0];
  const globalBilled = Number(totals.total),
    globalApproved = Number(estimate.amount_cents);
  const billed = allocation ? Number(totals.component) : globalBilled;
  const approved = allocation
    ? Number(allocation.amount_cents)
    : globalApproved;
  if (
    ![globalBilled, globalApproved, billed, approved].every(
      (value) => Number.isSafeInteger(value) && value >= 0,
    )
  )
    throw new HttpError(409, "Billing authorization requires review");
  return {
    approved,
    billed,
    remaining: Math.max(
      0,
      Math.min(approved - billed, globalApproved - globalBilled),
    ),
  };
}

/** Financial terms must remain the terms actually approved for this component.
 * An operational title may change; dates, rates and period charges may not. */
export function allocationTermsMismatch(
  allocation: EstimateAllocation | null,
  terms: {
    startsOn: string;
    endsOn: string;
    billingMode: string;
    unitAmountCents: number | null;
    periods: { startsOn: string; endsOn: string; amountCents: number }[];
  },
) {
  if (!allocation) return false;
  const config = allocation.configuration;
  if (!config || config.billingMode !== allocation.basis) return true;
  const parsed = agreementTerms.safeParse({
    title: allocation.title,
    startsOn: config.startsOn,
    endsOn: config.endsOn,
    billingMode: config.billingMode,
    unitAmountCents: config.unitAmountCents,
    periods: config.periods,
  });
  if (!parsed.success) return true;
  const { title, ...approved } = parsed.data;
  const normalized = {
    startsOn: terms.startsOn,
    endsOn: terms.endsOn,
    billingMode: terms.billingMode,
    unitAmountCents: terms.unitAmountCents,
    periods: terms.periods.map(({ startsOn, endsOn, amountCents }) => ({
      startsOn,
      endsOn,
      amountCents,
    })),
  };
  if (JSON.stringify(approved) !== JSON.stringify(normalized)) return true;
  if (allocation.basis === "fixed_monthly")
    return (
      approved.periods.reduce((sum, period) => sum + period.amountCents, 0) !==
      Number(allocation.amount_cents)
    );
  return (
    !Number.isInteger(config.maximumVisits) ||
    config.maximumVisits < 1 ||
    config.maximumVisits > 10000 ||
    approved.unitAmountCents! * config.maximumVisits !==
      Number(allocation.amount_cents)
  );
}
