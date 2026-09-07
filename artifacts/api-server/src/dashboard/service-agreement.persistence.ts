import type pg from "pg";
import { randomUUID } from "node:crypto";
import { requireOperationalProperty } from "./operational-property";
import { HttpError } from "./policy";
import type { z } from "zod";
import {
  agreementTerms,
  agreementOperational,
  agreementFinancial,
} from "./service-agreement.contract";
export type AgreementTerms = z.infer<typeof agreementTerms>;
export async function agreementLock(c: pg.PoolClient, id: string) {
  await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    "agreement:" + id,
  ]);
}
export async function contextLock(
  c: pg.PoolClient,
  propertyId: string,
  estimateId: string,
  recurrenceId: string,
) {
  await requireOperationalProperty(c, propertyId);
  const estimate = (
    await c.query(
      "SELECT * FROM estimate WHERE id=$1 AND property_id=$2 AND status='approved' FOR UPDATE",
      [estimateId, propertyId],
    )
  ).rows[0];
  if (!estimate)
    throw new HttpError(
      409,
      "An approved estimate for this property is required",
    );
  const recurrence = (
    await c.query(
      "SELECT * FROM recurring_service WHERE id=$1 AND property_id=$2 FOR UPDATE",
      [recurrenceId, propertyId],
    )
  ).rows[0];
  if (!recurrence)
    throw new HttpError(404, "Recurring service not found for this property");
  return { estimate, recurrence };
}
export async function lockedAgreement(c: pg.PoolClient, id: string) {
  await agreementLock(c, id);
  const identity = (
    await c.query(
      "SELECT property_id,estimate_id,recurring_service_id FROM service_agreement WHERE id=$1",
      [id],
    )
  ).rows[0];
  if (!identity) throw new HttpError(404, "Service agreement not found");
  const context = await contextLock(
    c,
    identity.property_id,
    identity.estimate_id,
    identity.recurring_service_id,
  );
  const agreement = (
    await c.query(
      "SELECT *,starts_on::text,ends_on::text,activated_on::text,cancellation_effective_on::text FROM service_agreement WHERE id=$1 FOR UPDATE",
      [id],
    )
  ).rows[0];
  return { ...context, agreement };
}
export async function activePeriods(c: pg.PoolClient, id: string) {
  return (
    await c.query(
      "SELECT id,starts_on::text,ends_on::text,amount_cents FROM fixed_charge_period WHERE agreement_id=$1 AND active=true ORDER BY starts_on",
      [id],
    )
  ).rows;
}
export async function storePeriods(
  c: pg.PoolClient,
  id: string,
  periods: AgreementTerms["periods"],
) {
  // Draft replacements retain rows and stable IDs; all edits are separately audited.
  await c.query(
    "UPDATE fixed_charge_period SET active=false WHERE agreement_id=$1",
    [id],
  );
  for (const p of periods)
    await c.query(
      "INSERT INTO fixed_charge_period(id,agreement_id,starts_on,ends_on,amount_cents) VALUES($1,$2,$3,$4,$5) ON CONFLICT(agreement_id,starts_on) DO UPDATE SET ends_on=excluded.ends_on,amount_cents=excluded.amount_cents,active=true",
      [randomUUID(), id, p.startsOn, p.endsOn, p.amountCents],
    );
}
export async function billedTotal(c: pg.PoolClient, estimateId: string) {
  const value = Number(
    (
      await c.query(
        "SELECT COALESCE(sum(amount_cents),0) AS total FROM billing_draft WHERE estimate_id=$1",
        [estimateId],
      )
    ).rows[0].total,
  );
  if (!Number.isSafeInteger(value) || value < 0)
    throw new HttpError(409, "Billing total requires review");
  return value;
}
export async function localToday(c: pg.PoolClient) {
  return (
    await c.query(
      "SELECT (now() AT TIME ZONE 'America/New_York')::date::text AS today",
    )
  ).rows[0].today as string;
}
export async function agreementAudit(
  c: pg.PoolClient,
  userId: string | null,
  action: string,
  id: string,
  details: unknown,
) {
  await c.query(
    "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,$3,$4,$5)",
    [randomUUID(), userId, action, id, details],
  );
}
export function agreementDto(
  row: Record<string, any>,
  periods: Record<string, any>[],
  financial: boolean,
) {
  const operational = {
    id: row.id,
    propertyId: row.property_id,
    recurringServiceId: row.recurring_service_id,
    title: row.title,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    status: row.status,
    scope: row.scope_snapshot,
    cancellationEffectiveOn: row.cancellation_effective_on,
  };
  return financial
    ? agreementFinancial.parse({
        ...operational,
        version: row.version,
        estimateId: row.estimate_id,
        estimateRevision: row.estimate_revision,
        predecessorId: row.predecessor_id,
        billingMode: row.billing_mode,
        unitAmountCents:
          row.unit_amount_cents === null ? null : Number(row.unit_amount_cents),
        activatedOn: row.activated_on,
        cancellationReason: row.cancellation_reason,
        periods: periods.map((p) => ({
          id: p.id,
          startsOn: p.starts_on,
          endsOn: p.ends_on,
          amountCents: Number(p.amount_cents),
        })),
      })
    : agreementOperational.parse(operational);
}
