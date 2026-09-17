import { z } from "zod";
import type { Actor } from "./access";
import { transaction } from "./database";
import { HttpError, requireCapability } from "./policy";
import { assessActivation } from "./service-agreement.activation";
import {
  agreementAudit,
  lockedAgreement,
} from "./service-agreement.persistence";

const activationInput = z.object({
  assignedTo: z.string().min(1),
  nextDate: z.string().date(),
  localTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});
export async function activateRecurringJob(
  a: Actor,
  key: string,
  input: unknown,
) {
  requireCapability(a, "operations.recurring");
  const b = activationInput.parse(input);
  await transaction(async (c) => {
    const identity = (
      await c.query("SELECT agreement_id FROM recurring_service WHERE id=$1", [
        key,
      ])
    ).rows[0];
    if (!identity?.agreement_id)
      throw new HttpError(404, "Recurring Job not found");
    // Use the shared agreement -> property -> estimate -> recurrence lock order.
    const context = await lockedAgreement(c, identity.agreement_id);
    const recurring = context.recurrence;
    if (
      recurring.id !== key ||
      recurring.agreement_id !== identity.agreement_id
    )
      throw new HttpError(
        409,
        "Recurring agreement changed; reload before activation",
      );
    if (!recurring.paused)
      throw new HttpError(409, "Recurring Job is already active");
    const staff = await c.query(
      "SELECT 1 FROM staff_profile WHERE user_id=$1 AND active=true AND role<>'client'",
      [b.assignedTo],
    );
    if (!staff.rowCount)
      throw new HttpError(400, "Choose an active team member");
    if (!context.agreement.accepted_at || context.agreement.status !== "draft")
      throw new HttpError(
        409,
        "Accepted agreement is not ready for activation",
      );
    const { preview, periods, today } = await assessActivation(c, context);
    if (!preview.canActivate)
      throw new HttpError(409, preview.blockedReasons[0]);
    if (
      b.nextDate < context.agreement.starts_on ||
      b.nextDate > context.agreement.ends_on
    )
      throw new HttpError(
        409,
        "First visit must be within the accepted agreement term",
      );
    if (
      context.allocation &&
      (b.nextDate !== context.allocation.configuration?.firstVisitOn ||
        b.localTime !== context.allocation.configuration?.localTime)
    )
      throw new HttpError(
        409,
        "Activation must retain the approved first visit and local time; prepare a revised authorization to change them",
      );
    await c.query(
      "UPDATE recurring_service SET assigned_to=$2,next_date=$3,local_time=$4,paused=false,anchor_day=extract(day from $3::date) WHERE id=$1",
      [key, b.assignedTo, b.nextDate, b.localTime],
    );
    await c.query(
      "UPDATE service_agreement SET status='active',activated_by=$2,activated_on=$3,activated_at=now(),version=version+1,updated_at=now() WHERE id=$1",
      [recurring.agreement_id, a.id, today],
    );
    await agreementAudit(
      c,
      a.id,
      "agreement.activated",
      recurring.agreement_id,
      {
        version: context.agreement.version,
        plannedCents: preview.plannedCents,
        perVisitCents: preview.perVisitCents,
        periods,
        clientAcceptedAt: context.agreement.accepted_at,
      },
    );
    await agreementAudit(c, a.id, "recurring_job.activated", key, {
      agreementId: recurring.agreement_id,
      nextDate: b.nextDate,
    });
  });
  return { ok: true };
}
