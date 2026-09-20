import { requireFieldWork } from "./work-access";
import { fieldEventSchema } from "@workspace/api-zod/dashboard";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool, transaction } from "./database";
import { HttpError, requireCapability } from "./policy";
import { requireOperationalChild } from "./operational-property";
import type { Actor } from "./access";
export async function listFieldConflicts(a: Actor) {
  requireCapability(a, "operations.schedule");
  const rows = (await pool.query(`SELECT e.id,e.work_order_id,e.kind,e.payload,e.captured_at,e.base_version,
    w.title AS work_title,w.status AS work_status,p.name AS property_name,u.name AS submitted_by
    FROM field_event e JOIN work_order w ON w.id=e.work_order_id
    JOIN property p ON p.id=w.property_id AND p.lifecycle='operational' AND p.client_id IS NOT NULL
    JOIN "user" u ON u.id=e.user_id LEFT JOIN field_event_resolution r ON r.event_id=e.id
    WHERE e.conflict=true AND r.event_id IS NULL ORDER BY e.received_at,e.id LIMIT 101`)).rows;
  return { items: rows.slice(0,100), hasMore: rows.length > 100 };
}
export async function resolveFieldConflict(a: Actor, id: string, input: unknown) {
  requireCapability(a, "operations.schedule");
  const body = z.object({ note: z.string().trim().min(1).max(2000), disposition: z.literal("record_only") }).strict().parse(input);
  return transaction(async c => {
    const event = (await c.query('SELECT work_order_id FROM field_event WHERE id=$1', [id])).rows[0];
    if (!event) throw new HttpError(404, "Field entry not found");
    await requireOperationalChild(c, "work_order", event.work_order_id);
    await c.query('SELECT id FROM work_order WHERE id=$1 FOR UPDATE', [event.work_order_id]);
    const current = (await c.query('SELECT conflict FROM field_event WHERE id=$1 FOR UPDATE', [id])).rows[0];
    if (!current?.conflict) throw new HttpError(409, "Only a conflicting field entry can be resolved");
    const previous = (await c.query('SELECT event_id,resolved_by,note,resolved_at FROM field_event_resolution WHERE event_id=$1', [id])).rows[0];
    if (previous) {
      if (previous.resolved_by !== a.id || previous.note !== body.note)
        throw new HttpError(409, "This entry has already been reviewed; reload the conflict list");
      return { id, status: "resolved" as const };
    }
    await c.query('INSERT INTO field_event_resolution(event_id,resolved_by,note) VALUES($1,$2,$3)', [id,a.id,body.note]);
    await c.query('INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,$3,$4,$5)',
      [randomUUID(),a.id,"field.conflict_resolved",id,{disposition:body.disposition,workOrderId:event.work_order_id}]);
    return { id, status: "resolved" as const };
  });
}

/** A submitting user may reconcile only their exact, office-reviewed receipts.
 * This does not grant access to a reassigned work order or expose review notes. */
export async function fieldResolutionReceipts(a: Actor, input: unknown) {
  requireFieldWork(a);
  const body = z.object({events:z.array(fieldEventSchema).max(100)}).strict().parse(input);
  const results: Array<{id:string;status:"resolved"}> = [];
  for(const event of body.events) {
    const match = await pool.query(`SELECT e.id FROM field_event e
      JOIN field_event_resolution r ON r.event_id=e.id
      WHERE e.id=$1 AND e.user_id=$2 AND e.work_order_id=$3 AND e.kind=$4
      AND e.payload=$5::jsonb AND e.base_version=$6 AND e.captured_at=$7::timestamptz`,
      [event.id,a.id,event.workOrderId,event.kind,JSON.stringify(event.payload),event.baseVersion,event.capturedAt]);
    if(match.rowCount) results.push({id:event.id,status:"resolved"});
  }
  return {results};
}
