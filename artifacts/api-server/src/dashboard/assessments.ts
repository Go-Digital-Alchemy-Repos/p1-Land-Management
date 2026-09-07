import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool, transaction } from "./database";
import { HttpError } from "./policy";
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const minutes = (v: string) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3));
export const availabilityInput = z
  .object({
    version: z.number().int().positive(),
    durationMinutes: z.number().int().min(15).max(240),
    bufferBefore: z.number().int().min(0).max(120),
    bufferAfter: z.number().int().min(0).max(120),
    windows: z
      .array(
        z.object({
          day: z.number().int().min(0).max(6),
          start: time,
          end: time,
        }),
      )
      .max(14),
  })
  .superRefine((v, ctx) => {
    for (const [i, w] of v.windows.entries()) {
      if (
        minutes(w.end) - minutes(w.start) <
        v.durationMinutes + v.bufferBefore + v.bufferAfter
      )
        ctx.addIssue({
          code: "custom",
          message: "Each window must fit an appointment and its travel buffers",
          path: ["windows", i],
        });
      if (
        v.windows.some(
          (other, j) =>
            j < i &&
            other.day === w.day &&
            other.start < w.end &&
            other.end > w.start,
        )
      )
        ctx.addIssue({
          code: "custom",
          message: "Weekly windows cannot overlap",
          path: ["windows", i],
        });
    }
  });
export async function readAvailability() {
  const config = (
    await pool.query("SELECT * FROM assessment_availability WHERE id=true")
  ).rows[0];
  const blackouts = (
    await pool.query(
      "SELECT * FROM assessment_blackout WHERE archived=false ORDER BY starts_at",
    )
  ).rows;
  return { config, blackouts, timeZone: "America/New_York" };
}
export async function saveAvailability(userId: string, input: unknown) {
  const b = availabilityInput.parse(input);
  return transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(918278)");
    const r = await c.query(
      "UPDATE assessment_availability SET version=version+1,duration_minutes=$2,buffer_before=$3,buffer_after=$4,windows=$5 WHERE id=true AND version=$1 RETURNING *",
      [
        b.version,
        b.durationMinutes,
        b.bufferBefore,
        b.bufferAfter,
        JSON.stringify(b.windows),
      ],
    );
    if (!r.rowCount)
      throw new HttpError(409, "Availability changed; reload before saving");
    await c.query(
      "UPDATE assessment_slot SET cancelled=true WHERE managed=true AND property_id IS NULL AND starts_at>now()",
    );
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id) VALUES($1,$2,$3,$4)",
      [randomUUID(), userId, "assessment.availability.updated", "calendar"],
    );
    return r.rows[0];
  });
}
export async function addBlackout(
  userId: string,
  startsAt: string,
  endsAt: string,
  reason: string,
) {
  if (
    !Number.isFinite(Date.parse(startsAt)) ||
    !Number.isFinite(Date.parse(endsAt)) ||
    Date.parse(endsAt) <= Date.parse(startsAt)
  )
    throw new HttpError(400, "Blackout end must follow start");
  return transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(918278)");
    const conflict = await c.query(
      "SELECT 1 FROM assessment_slot WHERE property_id IS NOT NULL AND cancelled=false AND starts_at-buffer_before*interval '1 minute'<$2 AND ends_at+buffer_after*interval '1 minute'>$1",
      [startsAt, endsAt],
    );
    if (conflict.rowCount)
      throw new HttpError(
        409,
        "Blackout overlaps a booked assessment; resolve the booking first",
      );
    const id = randomUUID();
    await c.query(
      "INSERT INTO assessment_blackout(id,starts_at,ends_at,reason) VALUES($1,$2,$3,$4)",
      [id, startsAt, endsAt, reason],
    );
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id) VALUES($1,$2,$3,$4)",
      [randomUUID(), userId, "assessment.blackout.created", id],
    );
    return { id };
  });
}
export async function removeBlackout(userId: string, id: string) {
  return transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(918278)");
    const r = await c.query(
      "UPDATE assessment_blackout SET archived=true WHERE id=$1 AND archived=false RETURNING id",
      [id],
    );
    if (!r.rowCount) throw new HttpError(404, "Active blackout not found");
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id) VALUES($1,$2,$3,$4)",
      [randomUUID(), userId, "assessment.blackout.archived", id],
    );
  });
}
export async function availableSlots() {
  return (
    await pool.query(
      "SELECT s.id,s.starts_at,s.ends_at FROM assessment_slot s WHERE s.property_id IS NULL AND s.cancelled=false AND s.starts_at>now() AND NOT EXISTS(SELECT 1 FROM assessment_blackout b WHERE b.archived=false AND b.starts_at<s.ends_at+s.buffer_after*interval '1 minute' AND b.ends_at>s.starts_at-s.buffer_before*interval '1 minute') ORDER BY s.starts_at LIMIT 100",
    )
  ).rows;
}
export async function bookAssessment(
  id: string,
  propertyId: string,
  userId: string,
) {
  return transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(918278)");
    const r = await c.query(
      "UPDATE assessment_slot s SET property_id=$2,booked_by=$3 WHERE s.id=$1 AND s.property_id IS NULL AND s.cancelled=false AND s.starts_at>now() AND NOT EXISTS(SELECT 1 FROM assessment_blackout b WHERE b.archived=false AND b.starts_at<s.ends_at+s.buffer_after*interval '1 minute' AND b.ends_at>s.starts_at-s.buffer_before*interval '1 minute') RETURNING id",
      [id, propertyId, userId],
    );
    if (!r.rowCount)
      throw new HttpError(409, "This appointment is no longer available");
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id) VALUES($1,$2,$3,$4)",
      [randomUUID(), userId, "assessment.booked", id],
    );
  });
}
export async function generateAvailability(
  userId: string,
  from: string,
  through: string,
) {
  const dateInput = z.string().date();
  dateInput.parse(from);
  dateInput.parse(through);
  const span = (Date.parse(through) - Date.parse(from)) / 86400000;
  if (span < 0 || span >= 90)
    throw new HttpError(400, "Generate between 1 and 90 days");
  return transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(918278)");
    const config = (
      await c.query("SELECT * FROM assessment_availability WHERE id=true")
    ).rows[0];
    const days = (
      await c.query(
        "SELECT to_char(d,'YYYY-MM-DD') AS day,extract(dow from d)::int AS dow FROM generate_series($1::date,$2::date,interval '1 day') d",
        [from, through],
      )
    ).rows;
    if (days.length < 1 || days.length > 90)
      throw new HttpError(400, "Generate between 1 and 90 days");
    let created = 0;
    for (const d of days)
      for (const w of config.windows as {
        day: number;
        start: string;
        end: string;
      }[]) {
        if (w.day !== d.dow) continue;
        const step =
          config.duration_minutes + config.buffer_before + config.buffer_after;
        for (
          let m = minutes(w.start) + config.buffer_before;
          m + config.duration_minutes + config.buffer_after <= minutes(w.end);
          m += step
        ) {
          const local =
            d.day +
            " " +
            String(Math.floor(m / 60)).padStart(2, "0") +
            ":" +
            String(m % 60).padStart(2, "0");
          const r = await c.query(
            `WITH candidate AS (
     SELECT $1::timestamp AT TIME ZONE 'America/New_York' AS start
    ), bounds AS (
     SELECT start,start+$2*interval '1 minute' AS finish,start-$3*interval '1 minute' AS occupied_start,start+($2+$4)*interval '1 minute' AS occupied_end FROM candidate
    ) INSERT INTO assessment_slot(id,starts_at,ends_at,buffer_before,buffer_after,managed)
    SELECT $5,start,finish,$3,$4,true FROM bounds
    WHERE start>now() AND to_char(start AT TIME ZONE 'America/New_York','YYYY-MM-DD HH24:MI')=to_char($1::timestamp,'YYYY-MM-DD HH24:MI')
    AND to_char(finish AT TIME ZONE 'America/New_York','YYYY-MM-DD HH24:MI')=to_char($1::timestamp+$2*interval '1 minute','YYYY-MM-DD HH24:MI')
    AND NOT EXISTS(SELECT 1 FROM assessment_blackout b WHERE b.archived=false AND b.starts_at<occupied_end AND b.ends_at>occupied_start)
    AND NOT EXISTS(SELECT 1 FROM assessment_slot s WHERE s.cancelled=false AND s.starts_at-s.buffer_before*interval '1 minute'<occupied_end AND s.ends_at+s.buffer_after*interval '1 minute'>occupied_start)
    ON CONFLICT(starts_at) DO UPDATE SET ends_at=excluded.ends_at,buffer_before=excluded.buffer_before,buffer_after=excluded.buffer_after,cancelled=false,managed=true WHERE assessment_slot.cancelled=true AND assessment_slot.property_id IS NULL RETURNING id`,
            [
              local,
              config.duration_minutes,
              config.buffer_before,
              config.buffer_after,
              randomUUID(),
            ],
          );
          created += r.rowCount || 0;
        }
      }
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id) VALUES($1,$2,$3,$4)",
      [randomUUID(), userId, "assessment.availability.generated", "calendar"],
    );
    return { created };
  });
}

export async function createManualAssessment(
  userId: string,
  startsAt: string,
  endsAt: string,
) {
  if (
    Date.parse(startsAt) <= Date.now() ||
    Date.parse(endsAt) <= Date.parse(startsAt)
  )
    throw new HttpError(
      400,
      "Choose a future appointment with end after start",
    );
  return transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(918278)");
    if (
      (
        await c.query(
          "SELECT 1 FROM assessment_slot WHERE cancelled=false AND starts_at-buffer_before*interval '1 minute'<$2 AND ends_at+buffer_after*interval '1 minute'>$1",
          [startsAt, endsAt],
        )
      ).rowCount
    )
      throw new HttpError(409, "Slot overlaps existing availability");
    if (
      (
        await c.query(
          "SELECT 1 FROM assessment_blackout WHERE archived=false AND starts_at<$2 AND ends_at>$1",
          [startsAt, endsAt],
        )
      ).rowCount
    )
      throw new HttpError(409, "Slot overlaps a blackout");
    const r = await c.query(
      "INSERT INTO assessment_slot(id,starts_at,ends_at) VALUES($1,$2,$3) ON CONFLICT(starts_at) DO UPDATE SET ends_at=excluded.ends_at,cancelled=false,managed=false,buffer_before=0,buffer_after=0 WHERE assessment_slot.cancelled=true AND assessment_slot.property_id IS NULL RETURNING id",
      [randomUUID(), startsAt, endsAt],
    );
    if (!r.rowCount) throw new HttpError(409, "Appointment is unavailable");
    const id = r.rows[0].id;
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id) VALUES($1,$2,$3,$4)",
      [randomUUID(), userId, "assessment.slot.created", id],
    );
    return { id };
  });
}
