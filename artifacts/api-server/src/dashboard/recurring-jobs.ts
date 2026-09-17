import { pool } from "./database";
/** Operational visibility only: no prices, billing totals or private terms. */
export async function listRecurringJobs() {
  return (
    await pool.query(`
    WITH programs AS (
      SELECT r.*,p.name AS property_name,c.name AS client_name,a.status AS agreement_status,
        COUNT(w.id)::int AS visit_count,MIN(w.scheduled_at) FILTER (WHERE w.scheduled_at>=now()) AS next_visit
      FROM recurring_service r JOIN property p ON p.id=r.property_id JOIN client c ON c.id=p.client_id
      LEFT JOIN service_agreement a ON a.id=r.agreement_id LEFT JOIN work_order w ON w.recurring_service_id=r.id
      WHERE p.lifecycle='operational' GROUP BY r.id,p.name,c.name,a.status
    )
    SELECT p.*,
      CASE WHEN p.paused AND p.agreement_status='draft' THEN 'Agreement activation required'
        WHEN p.paused THEN 'Paused'
        WHEN NOT allocated_recurrence_governed(p.id,p.next_date) THEN 'Legacy schedule'
        WHEN a.id IS NULL THEN 'No effective agreement for next visit'
        WHEN x.basis='per_visit' AND used.reserved>=(x.configuration->>'maximumVisits')::integer THEN 'Visit allowance exhausted'
        WHEN NOT allocated_visit_available(p.id,p.next_date) THEN 'Agreement or schedule needs review'
        ELSE 'Authorized for next visit' END AS generation_status,
      CASE WHEN x.basis='per_visit' THEN (x.configuration->>'maximumVisits')::integer END AS visit_allowance,
      CASE WHEN x.basis='per_visit' THEN used.reserved END AS visits_reserved,
      CASE WHEN x.basis='per_visit' THEN GREATEST(0,(x.configuration->>'maximumVisits')::integer-used.reserved) END AS visits_remaining
    FROM programs p
    LEFT JOIN service_agreement a ON a.id=allocated_visit_agreement(p.id,p.next_date)
    LEFT JOIN estimate_allocation x ON x.id=a.estimate_allocation_id
    LEFT JOIN LATERAL (
      SELECT count(*)::integer AS reserved FROM work_order w
      WHERE (w.service_agreement_id=a.id OR (w.service_agreement_id IS NULL AND w.recurring_service_id=p.id AND (w.occurrence_date BETWEEN a.starts_on AND a.ends_on OR w.occurrence_date IS NULL)))
      AND (w.status NOT IN ('cancelled','skipped') OR EXISTS(SELECT 1 FROM agreement_charge c WHERE c.work_order_id=w.id))
    ) used ON true ORDER BY p.next_date,p.id
  `)
  ).rows;
}
