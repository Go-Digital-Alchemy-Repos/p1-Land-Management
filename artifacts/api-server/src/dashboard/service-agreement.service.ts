import { assessActivation } from "./service-agreement.activation";
import { createHash } from "node:crypto";
import type { Actor } from "./access";
import { transaction } from "./database";
import { HttpError, requireRole } from "./policy";
import {
  createAgreementInput,
  editAgreementInput,
  activateAgreementInput,
  cancelAgreementInput,
} from "./service-agreement.contract";
import {
  agreementLock,
  contextLock,
  lockedAgreement,
  activePeriods,
  storePeriods,
  localToday,
  agreementAudit,
  agreementDto,
} from "./service-agreement.persistence";
const managers = ["owner", "manager"] as const;
function management(a: Actor) {
  requireRole(a.role, [...managers]);
}
function version(row: { version: number }, expected: number) {
  if (row.version !== expected)
    throw new HttpError(409, "Agreement changed; reload before saving");
}
export async function createServiceAgreement(a: Actor, input: unknown) {
  management(a);
  const b = createAgreementInput.parse(input);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(b))
    .digest("hex");
  return transaction(async (c) => {
    await agreementLock(c, b.id);
    const prior = (
      await c.query("SELECT * FROM service_agreement WHERE id=$1", [b.id])
    ).rows[0];
    if (prior) {
      if (
        prior.created_by !== a.id ||
        prior.creation_fingerprint !== fingerprint
      )
        throw new HttpError(409, "Agreement creation ID conflict");
      const { agreement } = await lockedAgreement(c, b.id);
      return agreementDto(agreement, await activePeriods(c, b.id), true);
    }
    const { estimate } = await contextLock(
      c,
      b.propertyId,
      b.estimateId,
      b.recurringServiceId,
    );
    if (b.predecessorId) {
      const predecessor = (
        await c.query(
          "SELECT *,ends_on::text,cancellation_effective_on::text FROM service_agreement WHERE id=$1 FOR UPDATE",
          [b.predecessorId],
        )
      ).rows[0];
      if (
        !predecessor ||
        predecessor.property_id !== b.propertyId ||
        predecessor.recurring_service_id !== b.recurringServiceId ||
        predecessor.status === "draft" ||
        predecessor.estimate_id === b.estimateId
      )
        throw new HttpError(
          409,
          "Renewal requires the same property and recurrence with a new approved estimate",
        );
      const cutoff = predecessor.cancellation_effective_on;
      if (
        cutoff
          ? b.terms.startsOn < cutoff
          : b.terms.startsOn <= predecessor.ends_on
      )
        throw new HttpError(
          409,
          "Renewal must follow the prior effective term",
        );
      if (
        (
          await c.query(
            "SELECT 1 FROM service_agreement WHERE predecessor_id=$1",
            [b.predecessorId],
          )
        ).rowCount
      )
        throw new HttpError(409, "A successor agreement already exists");
    }
    const t = b.terms;
    await c.query(
      `INSERT INTO service_agreement(id,property_id,recurring_service_id,estimate_id,predecessor_id,title,starts_on,ends_on,billing_mode,unit_amount_cents,scope_snapshot,estimate_revision,created_by,creation_fingerprint) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        b.id,
        b.propertyId,
        b.recurringServiceId,
        b.estimateId,
        b.predecessorId,
        t.title,
        t.startsOn,
        t.endsOn,
        t.billingMode,
        t.unitAmountCents,
        estimate.scope,
        estimate.revision,
        a.id,
        fingerprint,
      ],
    );
    await storePeriods(c, b.id, t.periods);
    await agreementAudit(c, a.id, "agreement.created", b.id, {
      ...b,
      scope: estimate.scope,
      estimateRevision: estimate.revision,
    });
    const { agreement } = await lockedAgreement(c, b.id);
    return agreementDto(agreement, await activePeriods(c, b.id), true);
  });
}
export async function editServiceAgreement(
  a: Actor,
  id: string,
  input: unknown,
) {
  management(a);
  const b = editAgreementInput.parse(input);
  return transaction(async (c) => {
    const { agreement } = await lockedAgreement(c, id);
    version(agreement, b.version);
    if (agreement.status !== "draft")
      throw new HttpError(
        409,
        "Active terms are immutable; create an approved successor",
      );
    const before = agreementDto(agreement, await activePeriods(c, id), true),
      t = b.terms;
    await c.query(
      "UPDATE service_agreement SET title=$2,starts_on=$3,ends_on=$4,billing_mode=$5,unit_amount_cents=$6,version=version+1,updated_at=now() WHERE id=$1",
      [id, t.title, t.startsOn, t.endsOn, t.billingMode, t.unitAmountCents],
    );
    await storePeriods(c, id, t.periods);
    const { agreement: after } = await lockedAgreement(c, id);
    const result = agreementDto(after, await activePeriods(c, id), true);
    await agreementAudit(c, a.id, "agreement.edited", id, {
      before,
      after: result,
    });
    return result;
  });
}
export async function activateServiceAgreement(
  a: Actor,
  id: string,
  input: unknown,
) {
  management(a);
  const b = activateAgreementInput.parse(input);
  return transaction(async (c) => {
    const context = await lockedAgreement(c, id);
    version(context.agreement, b.version);
    const { preview, periods, today } = await assessActivation(c, context);
    if (!preview.canActivate)
      throw new HttpError(409, preview.blockedReasons[0]);
    await c.query(
      "UPDATE service_agreement SET status='active',activated_by=$2,activated_on=$3,activated_at=now(),version=version+1,updated_at=now() WHERE id=$1",
      [id, a.id, today],
    );
    await agreementAudit(c, a.id, "agreement.activated", id, {
      version: b.version,
      plannedCents: preview.plannedCents,
      perVisitCents: preview.perVisitCents,
      alreadyBilledCents: preview.billedCents,
      periods,
    });
    const { agreement: result } = await lockedAgreement(c, id);
    return agreementDto(result, periods, true);
  });
}
export async function cancelServiceAgreement(
  a: Actor,
  id: string,
  input: unknown,
) {
  management(a);
  const b = cancelAgreementInput.parse(input);
  return transaction(async (c) => {
    const { agreement } = await lockedAgreement(c, id);
    version(agreement, b.version);
    if (agreement.status !== "active")
      throw new HttpError(409, "Only an active agreement can be cancelled");
    const today = await localToday(c);
    if (
      b.effectiveOn < today ||
      b.effectiveOn < agreement.starts_on ||
      b.effectiveOn > agreement.ends_on
    )
      throw new HttpError(
        409,
        "Cancellation must be within the term and cannot be retroactive",
      );
    await c.query(
      "UPDATE service_agreement SET status='cancelled',cancellation_effective_on=$2,cancellation_reason=$3,version=version+1,updated_at=now() WHERE id=$1",
      [id, b.effectiveOn, b.reason],
    );
    await agreementAudit(c, a.id, "agreement.cancelled", id, {
      effectiveOn: b.effectiveOn,
      reason: b.reason,
      existingChargesPreserved: true,
    });
    const { agreement: result } = await lockedAgreement(c, id);
    return agreementDto(result, await activePeriods(c, id), true);
  });
}
