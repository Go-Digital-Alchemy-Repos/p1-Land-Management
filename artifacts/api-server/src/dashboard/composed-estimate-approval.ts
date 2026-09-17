import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { composedEstimateDocument } from "./composed-estimate-document";
import {
  estimateAllocations,
  allocationTermsMismatch,
} from "./estimate-allocation";
import { agreementTerms } from "./service-agreement.contract";
import { HttpError } from "./policy";

/** Called inside the decision transaction after locking the parent estimate. */
export async function validateComposedDecisionParty(
  c: PoolClient,
  estimate: any,
  actorId: string | null,
  contactId: string | null,
) {
  const { party } = composedEstimateDocument(estimate.composition_snapshot);
  const eligible = await c.query(
    "SELECT 1 FROM property p JOIN client cl ON cl.id=p.client_id WHERE p.id=$1 AND p.client_id=$2 AND p.lifecycle='operational' AND p.archived=false AND cl.archived=false FOR SHARE OF p,cl",
    [estimate.property_id, party.clientId],
  );
  if (!eligible.rowCount)
    throw new HttpError(
      409,
      "The agreement client or property changed. Contact P1 before making a decision.",
    );
  if (contactId) {
    if (
      !(
        await c.query(
          "SELECT 1 FROM contact WHERE id=$1 AND client_id=$2 AND archived=false FOR SHARE",
          [contactId, party.clientId],
        )
      ).rowCount
    )
      throw new HttpError(404, "Estimate link is no longer available");
  } else if (actorId) {
    if (
      !(
        await c.query(
          "SELECT 1 FROM client_access WHERE user_id=$1 AND client_id=$2 FOR SHARE",
          [actorId, party.clientId],
        )
      ).rowCount
    )
      throw new HttpError(404, "Estimate not found");
  } else
    throw new HttpError(403, "An authorized agreement decision is required");
}

export async function convertComposedEstimate(
  c: PoolClient,
  estimate: any,
  actorId: string | null,
  contactId: string | null,
) {
  if (
    estimate.kind !== "composed" ||
    estimate.status !== "sent" ||
    !estimate.is_current ||
    new Date(estimate.expires_at).getTime() <= Date.now()
  )
    throw new HttpError(409, "Estimate is no longer awaiting a decision");
  if (!estimate.created_by)
    throw new HttpError(409, "Estimate is missing its staff owner");
  const { document } = composedEstimateDocument(estimate.composition_snapshot);
  const allocations = await estimateAllocations(c, estimate.id);
  if (
    allocations.length !== document.components.length ||
    allocations.reduce((sum, row) => sum + Number(row.amount_cents), 0) !==
      Number(estimate.amount_cents)
  )
    throw new HttpError(
      409,
      "Estimate allocations require reconciliation before approval",
    );
  for (const allocation of allocations) {
    const approved = estimate.composition_snapshot.allocations.find(
      (row: any) => row.id === allocation.id,
    );
    if (
      !approved ||
      approved.basis !== allocation.basis ||
      approved.scope !== allocation.scope ||
      approved.authorizedAmountCents !== Number(allocation.amount_cents) ||
      !isDeepStrictEqual(approved.configuration, allocation.configuration)
    )
      throw new HttpError(
        409,
        "Operational allocation differs from the customer-approved document",
      );
  }
  await c.query(
    "UPDATE estimate SET status='approved',approved_by=$2,approved_at=now() WHERE id=$1",
    [estimate.id, actorId],
  );
  const components: {
    allocationId: string;
    basis: string;
    jobId?: string;
    recurringServiceId?: string;
    agreementId?: string;
  }[] = [];
  for (const allocation of allocations) {
    const title = `${estimate.title} — ${allocation.title}`;
    if (allocation.basis === "one_time") {
      const jobId = randomUUID();
      await c.query(
        "INSERT INTO work_order(id,property_id,title,scope,estimate_id,estimate_allocation_id,project_id,job_kind) VALUES($1,$2,$3,$4,$5,$6,$7,'one_time')",
        [
          jobId,
          estimate.property_id,
          title,
          allocation.scope,
          estimate.id,
          allocation.id,
          estimate.project_id,
        ],
      );
      components.push({
        allocationId: allocation.id,
        basis: allocation.basis,
        jobId,
      });
      await audit(c, actorId, "job.created_from_estimate", jobId, {
        estimateId: estimate.id,
        allocationId: allocation.id,
      });
      continue;
    }
    const config = allocation.configuration;
    if (!config)
      throw new HttpError(
        409,
        "Recurring component has no reviewed configuration",
      );
    const terms = agreementTerms.parse({
      title,
      startsOn: config.startsOn,
      endsOn: config.endsOn,
      billingMode: config.billingMode,
      unitAmountCents: config.unitAmountCents,
      periods: config.periods,
    });
    if (allocationTermsMismatch(allocation, terms))
      throw new HttpError(
        409,
        "Recurring component terms differ from the approved allocation",
      );
    const schedule = z
      .object({
        cadence: z.enum(["weekly", "monthly"]),
        intervalCount: z.number().int().min(1).max(52),
        localTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        firstVisitOn: z.string().date(),
      })
      .parse(config);
    if (
      schedule.firstVisitOn < terms.startsOn ||
      schedule.firstVisitOn > terms.endsOn
    )
      throw new HttpError(409, "First visit falls outside the agreement term");
    const recurringId = randomUUID(),
      agreementId = randomUUID();
    await c.query(
      "INSERT INTO recurring_service(id,property_id,title,scope,cadence,interval_count,next_date,local_time,billing_mode,paused,anchor_day,estimate_id,estimate_allocation_id,project_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,true,extract(day from $7::date),$10,$11,$12)",
      [
        recurringId,
        estimate.property_id,
        title,
        allocation.scope,
        schedule.cadence,
        schedule.intervalCount,
        schedule.firstVisitOn,
        schedule.localTime,
        terms.billingMode,
        estimate.id,
        allocation.id,
        estimate.project_id,
      ],
    );
    await c.query(
      "INSERT INTO service_agreement(id,property_id,recurring_service_id,estimate_id,estimate_allocation_id,title,starts_on,ends_on,billing_mode,unit_amount_cents,scope_snapshot,estimate_revision,created_by,creation_fingerprint,template_snapshot,accepted_at,accepted_by_contact_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now(),$16)",
      [
        agreementId,
        estimate.property_id,
        recurringId,
        estimate.id,
        allocation.id,
        title,
        terms.startsOn,
        terms.endsOn,
        terms.billingMode,
        terms.unitAmountCents,
        allocation.scope,
        estimate.revision,
        estimate.created_by,
        createHash("sha256")
          .update(
            JSON.stringify({
              estimateId: estimate.id,
              allocationId: allocation.id,
            }),
          )
          .digest("hex"),
        document.terms,
        contactId,
      ],
    );
    await c.query("UPDATE recurring_service SET agreement_id=$2 WHERE id=$1", [
      recurringId,
      agreementId,
    ]);
    for (const period of terms.periods)
      await c.query(
        "INSERT INTO fixed_charge_period(id,agreement_id,starts_on,ends_on,amount_cents) VALUES($1,$2,$3,$4,$5)",
        [
          randomUUID(),
          agreementId,
          period.startsOn,
          period.endsOn,
          period.amountCents,
        ],
      );
    components.push({
      allocationId: allocation.id,
      basis: allocation.basis,
      recurringServiceId: recurringId,
      agreementId,
    });
    await audit(c, actorId, "recurring_job.accepted", recurringId, {
      estimateId: estimate.id,
      allocationId: allocation.id,
      agreementId,
    });
  }
  await audit(c, actorId, "estimate.approved", estimate.id, {
    contactId,
    components,
  });
  return {
    jobId:
      components.find((row) => row.jobId)?.jobId ??
      components[0].recurringServiceId!,
    recurring: components.some((row) => row.recurringServiceId),
    components,
  };
}
async function audit(
  c: PoolClient,
  userId: string | null,
  action: string,
  entityId: string,
  details: unknown,
) {
  await c.query(
    "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,$3,$4,$5)",
    [randomUUID(), userId, action, entityId, details],
  );
}
