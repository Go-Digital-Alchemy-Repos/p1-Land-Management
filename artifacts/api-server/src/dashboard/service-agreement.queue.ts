import { z } from "zod";
import type { Actor } from "./access";
import { pool } from "./database";
import { HttpError, requireRole } from "./policy";
import { previewAgreementCharge } from "./service-agreement.billing";
const query = z
  .object({
    after: z
      .string()
      .regex(/^(period|work|prepared-work):[0-9a-f-]{36}$/)
      .optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();
const item = z
  .object({
    key: z.string(),
    propertyId: z.string().uuid(),
    agreementId: z.string().uuid().nullable(),
    periodStart: z.string().date().nullable(),
    workOrderId: z.string().uuid().nullable(),
    state: z.enum(["ready", "review_required", "unmatched", "unavailable"]),
    reason: z.string().nullable(),
    amountCents: z.number().int().positive().nullable(),
    billingDraftId: z.string().uuid().nullable(),
  })
  .strict();
export const agreementQueuePage = z
  .object({ items: z.array(item), nextCursor: z.string().nullable() })
  .strict();
// Sources remain visible when capped or partly cancelled; financial eligibility
// is recalculated through the same locked preview used by draft preparation.
export async function listAgreementChargeQueue(a: Actor, input: unknown) {
  requireRole(a.role, ["owner", "manager", "finance"]);
  const b = query.parse(input);
  const rows = (
    await pool.query(
      `WITH sources AS (
 SELECT 'period:'||f.id::text AS key,a.property_id,a.id AS agreement_id,f.starts_on::text AS period_start,NULL::uuid AS work_order_id,
 (ch.id IS NOT NULL AND a.cancellation_effective_on IS NOT NULL AND f.ends_on>=a.cancellation_effective_on) AS prepared_cancellation
 FROM fixed_charge_period f JOIN service_agreement a ON a.id=f.agreement_id JOIN property p ON p.id=a.property_id LEFT JOIN agreement_charge ch ON ch.fixed_period_id=f.id
 WHERE p.lifecycle='operational' AND p.client_id IS NOT NULL AND f.active=true AND a.status IN('active','cancelled') AND f.starts_on<=(now() AT TIME ZONE 'America/New_York')::date
 AND ((ch.id IS NULL AND (a.cancellation_effective_on IS NULL OR f.starts_on<a.cancellation_effective_on)) OR (ch.id IS NOT NULL AND a.cancellation_effective_on IS NOT NULL AND f.ends_on>=a.cancellation_effective_on))
 UNION ALL
 SELECT 'work:'||w.id::text,w.property_id,a.id,NULL::text,w.id,false
 FROM work_order w JOIN property p ON p.id=w.property_id
 LEFT JOIN LATERAL (SELECT a.id,a.billing_mode FROM service_agreement a WHERE a.recurring_service_id=w.recurring_service_id AND a.status IN('active','cancelled') AND w.occurrence_date BETWEEN a.starts_on AND a.ends_on AND w.occurrence_date>=a.activated_on AND (a.cancellation_effective_on IS NULL OR w.occurrence_date<a.cancellation_effective_on) ORDER BY a.id LIMIT 1) a ON true
 WHERE p.lifecycle='operational' AND p.client_id IS NOT NULL AND w.recurring_service_id IS NOT NULL AND w.status='reviewed' AND (a.id IS NULL OR a.billing_mode='per_visit')
 AND NOT EXISTS(SELECT 1 FROM agreement_charge ch WHERE ch.work_order_id=w.id)
 UNION ALL
 SELECT 'prepared-work:'||ch.id::text,w.property_id,a.id,NULL::text,w.id,true
 FROM agreement_charge ch JOIN service_agreement a ON a.id=ch.agreement_id JOIN work_order w ON w.id=ch.work_order_id JOIN property p ON p.id=w.property_id
 WHERE p.lifecycle='operational' AND p.client_id IS NOT NULL AND a.billing_mode='per_visit' AND a.status='cancelled' AND w.occurrence_date>=a.cancellation_effective_on
 ) SELECT * FROM sources WHERE ($1::text IS NULL OR key>$1) ORDER BY key LIMIT $2`,
      [b.after || null, b.limit + 1],
    )
  ).rows;
  const entries = [];
  for (const row of rows.slice(0, b.limit)) {
    const base = {
      key: row.key,
      propertyId: row.property_id,
      agreementId: row.agreement_id,
      periodStart: row.period_start,
      workOrderId: row.work_order_id,
      amountCents: null,
      billingDraftId: null,
    };
    if (!row.agreement_id) {
      entries.push(
        item.parse({
          ...base,
          state: "unmatched",
          reason:
            "Reviewed recurring work has no active agreement for its occurrence. Review and associate approved terms; no charge was created.",
        }),
      );
      continue;
    }
    try {
      const preview = await previewAgreementCharge(
        a,
        row.agreement_id,
        row.period_start
          ? { periodStart: row.period_start }
          : { workOrderId: row.work_order_id },
      );
      entries.push(
        item.parse({
          ...base,
          state: row.prepared_cancellation ? "review_required" : "ready",
          reason: row.prepared_cancellation
            ? "A prepared charge is affected by cancellation. Existing draft or posted history is preserved; explicit financial review is required."
            : null,
          amountCents: preview.amountCents,
          billingDraftId: preview.billingDraftId,
        }),
      );
    } catch (error) {
      if (!(error instanceof HttpError) || ![404, 409].includes(error.status))
        throw error;
      entries.push(
        item.parse({
          ...base,
          state: error.status === 404 ? "unavailable" : "review_required",
          reason: error.message,
        }),
      );
    }
  }
  return agreementQueuePage.parse({
    items: entries,
    nextCursor: rows.length > b.limit ? rows[b.limit - 1].key : null,
  });
}
