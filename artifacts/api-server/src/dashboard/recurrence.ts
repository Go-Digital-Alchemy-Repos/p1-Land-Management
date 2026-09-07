import { transaction } from "./database";
import { randomUUID } from "node:crypto";
export async function generateRecurring() {
  return transaction(async (c) => {
    const candidates=(await c.query("SELECT r.id,r.property_id FROM recurring_service r JOIN property p ON p.id=r.property_id AND p.lifecycle='operational' WHERE r.paused=false AND r.next_date<=((now() AT TIME ZONE 'America/New_York')::date+14) ORDER BY r.next_date,r.id LIMIT 50")).rows;
    if(!candidates.length)return;
    await c.query("SELECT id FROM property WHERE id=ANY($1::uuid[]) AND lifecycle='operational' ORDER BY id FOR SHARE",[candidates.map(r=>r.property_id)]);
    const services = await c.query(
      "SELECT *,next_date::text AS occurrence FROM recurring_service WHERE id=ANY($1::uuid[]) AND EXISTS(SELECT 1 FROM property p WHERE p.id=recurring_service.property_id AND p.lifecycle='operational') AND paused=false AND next_date<=((now() AT TIME ZONE 'America/New_York')::date+14) ORDER BY next_date,id FOR UPDATE SKIP LOCKED LIMIT 50",[candidates.map(r=>r.id)]
    );
    for (const s of services.rows) {
      await c.query(
        "INSERT INTO work_order(id,property_id,title,scope,assigned_to,scheduled_at,recurring_service_id,occurrence_date) VALUES($1,$2,$3,$4,$5,($6::date+$7::time) AT TIME ZONE 'America/New_York',$8,$6) ON CONFLICT(recurring_service_id,occurrence_date) DO NOTHING",
        [
          randomUUID(),
          s.property_id,
          s.title,
          s.scope,
          s.assigned_to,
          s.occurrence,
          s.local_time,
          s.id,
        ],
      );
      await c.query(
        "UPDATE recurring_service SET next_date=CASE WHEN cadence='weekly' THEN next_date+interval_count*7 ELSE (date_trunc('month',next_date+make_interval(months=>interval_count))::date + LEAST(COALESCE(anchor_day,extract(day from next_date)::int),extract(day from date_trunc('month',next_date+make_interval(months=>interval_count))+interval '1 month - 1 day')::int)-1) END WHERE id=$1",
        [s.id],
      );
    }
    return services.rowCount;
  });
}
