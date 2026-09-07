import type pg from "pg";
import { z } from "zod";
import type { Actor } from "./access";
import { transaction } from "./database";
import { HttpError, requireRole } from "./policy";
import {
  activateAgreementInput,
  fixedPeriodInput,
} from "./service-agreement.contract";
import {
  lockedAgreement,
  activePeriods,
  billedTotal,
  localToday,
} from "./service-agreement.persistence";
export const activationPreview = z
  .object({
    agreementId: z.string().uuid(),
    version: z.number().int().positive(),
    startsOn: z.string().date(),
    endsOn: z.string().date(),
    billingMode: z.enum(["fixed_monthly", "per_visit"]),
    approvedCents: z.number().int().nonnegative(),
    billedCents: z.number().int().nonnegative(),
    remainingCents: z.number().int().nonnegative(),
    plannedCents: z.number().int().nonnegative().nullable(),
    perVisitCents: z.number().int().positive().nullable(),
    periods: z.array(
      fixedPeriodInput.extend({ id: z.string().uuid() }).strict(),
    ),
    canActivate: z.boolean(),
    blockedReasons: z.array(z.string()),
  })
  .strict();
// Caller already holds agreement identity/property/estimate/recurrence locks.
export async function assessActivation(
  c: pg.PoolClient,
  context: Awaited<ReturnType<typeof lockedAgreement>>,
) {
  const { agreement, estimate, recurrence } = context,
    id = agreement.id;
  const today = await localToday(c),
    blockedReasons: string[] = [];
  if (agreement.status !== "draft")
    blockedReasons.push("Only a draft agreement can activate");
  if (agreement.starts_on < today)
    blockedReasons.push(
      "Activation cannot authorize retroactive charges; revise the term",
    );
  if (agreement.billing_mode !== recurrence.billing_mode)
    blockedReasons.push(
      "Recurring service billing mode must match the reviewed agreement",
    );
  if (
    agreement.scope_snapshot !== estimate.scope ||
    agreement.estimate_revision !== estimate.revision
  )
    blockedReasons.push("Approved scope changed; create a new agreement");
  const overlap = await c.query(
    "SELECT id FROM service_agreement WHERE recurring_service_id=$1 AND id<>$2 AND status IN ('active','cancelled') AND LEAST(ends_on,COALESCE(cancellation_effective_on-1,ends_on)) >= starts_on AND starts_on<=$4::date AND LEAST(ends_on,COALESCE(cancellation_effective_on-1,ends_on)) >= $3::date",
    [
      agreement.recurring_service_id,
      id,
      agreement.starts_on,
      agreement.ends_on,
    ],
  );
  if (overlap.rowCount)
    blockedReasons.push(
      "An effective agreement already covers this recurring term",
    );
  if (agreement.predecessor_id) {
    const old = (
      await c.query(
        "SELECT ends_on::text,cancellation_effective_on::text FROM service_agreement WHERE id=$1 FOR UPDATE",
        [agreement.predecessor_id],
      )
    ).rows[0];
    if (
      old.cancellation_effective_on
        ? agreement.starts_on < old.cancellation_effective_on
        : agreement.starts_on <= old.ends_on
    )
      blockedReasons.push("Renewal term overlaps its predecessor");
  }
  const periods = await activePeriods(c, id),
    fixed = agreement.billing_mode === "fixed_monthly";
  const minimum = fixed
    ? periods.reduce((n, p) => n + Number(p.amount_cents), 0)
    : Number(agreement.unit_amount_cents);
  const billed = await billedTotal(c, estimate.id),
    approved = Number(estimate.amount_cents);
  if (!minimum || minimum + billed > approved)
    blockedReasons.push("Charge plan exceeds the remaining approved estimate");
  const preview = activationPreview.parse({
    agreementId: id,
    version: agreement.version,
    startsOn: agreement.starts_on,
    endsOn: agreement.ends_on,
    billingMode: agreement.billing_mode,
    approvedCents: approved,
    billedCents: billed,
    remainingCents: Math.max(0, approved - billed),
    plannedCents: fixed ? minimum : null,
    perVisitCents: fixed ? null : minimum,
    periods: periods.map((p) => ({
      id: p.id,
      startsOn: p.starts_on,
      endsOn: p.ends_on,
      amountCents: Number(p.amount_cents),
    })),
    canActivate: blockedReasons.length === 0,
    blockedReasons,
  });
  return { preview, periods, today };
}
export async function previewServiceAgreementActivation(
  a: Actor,
  id: string,
  input: unknown,
) {
  requireRole(a.role, ["owner", "manager", "finance"]);
  const b = activateAgreementInput.parse(input);
  return transaction(async (c) => {
    const context = await lockedAgreement(c, id);
    if (context.agreement.version !== b.version)
      throw new HttpError(409, "Agreement changed; reload before previewing");
    return (await assessActivation(c, context)).preview;
  });
}
