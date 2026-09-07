import { requireOperationalChild } from "./operational-property";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool, transaction } from "./database";
import { HttpError } from "./policy";
import type { Actor } from "./access";
export const scheduleQuery = z.object({
  from: z.string().date(),
  through: z.string().date(),
  unscheduled: z.enum(["true", "false"]).default("false"),
  cursor: z.string().max(400).optional(),
});
const cursorSchema = z.object({
  id: z.string().uuid(),
  at: z.string().datetime().nullable(),
});
export async function readSchedule(a: Actor, input: unknown) {
  const b = scheduleQuery.parse(input);
  const span = (Date.parse(b.through) - Date.parse(b.from)) / 86400000;
  if (span < 0 || span > 31)
    throw new HttpError(400, "Choose up to 32 calendar days");
  const unscheduled = b.unscheduled === "true";
  if (unscheduled && a.role === "client")
    throw new HttpError(403, "Unscheduled office work is private");
  let cursor: z.infer<typeof cursorSchema> | undefined;
  if (b.cursor) {
    try {
      cursor = cursorSchema.parse(
        JSON.parse(Buffer.from(b.cursor, "base64url").toString()),
      );
    } catch {
      throw new HttpError(400, "Invalid schedule cursor");
    }
    if ((cursor.at === null) !== unscheduled)
      throw new HttpError(400, "Cursor does not match this view");
  }
  const values: unknown[] = [b.from, b.through];
  const conditions = [
    unscheduled
      ? "w.scheduled_at IS NULL"
      : "w.scheduled_at >= ($1::date::timestamp AT TIME ZONE 'America/New_York') AND w.scheduled_at < (($2::date+1)::timestamp AT TIME ZONE 'America/New_York')",
  ];
  // Keep date parameters typed even in the unscheduled branch.
  if (unscheduled) conditions.push("$1::date <= $2::date");
  if (a.role === "crew") {
    values.push(a.id);
    conditions.push(
      `w.assigned_to=$${values.length} AND w.status NOT IN ('cancelled','skipped','reviewed')`,
    );
  }
  if (a.role === "client") {
    values.push(a.id);
    conditions.push(
      `w.status<>'draft' AND EXISTS(SELECT 1 FROM client_access ca WHERE ca.client_id=p.client_id AND ca.user_id=$${values.length})`,
    );
  }
  if (cursor) {
    values.push(cursor.id);
    const idIndex = values.length;
    if (unscheduled) conditions.push(`w.id>$${idIndex}::uuid`);
    else {
      values.push(cursor.at);
      conditions.push(
        `(w.scheduled_at,w.id)>($${values.length}::timestamptz,$${idIndex}::uuid)`,
      );
    }
  }
  const rows = (
    await pool.query(
      `SELECT w.*,to_char(w.scheduled_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_at,p.name AS property_name FROM work_order w JOIN property p ON p.id=w.property_id AND p.lifecycle='operational' WHERE ${conditions.join(" AND ")} ORDER BY ${unscheduled ? "w.id" : "w.scheduled_at,w.id"} LIMIT 101`,
      values,
    )
  ).rows;
  const page = rows.slice(0, 100),
    last = page.at(-1);
  const nextCursor =
    rows.length > 100
      ? Buffer.from(
          JSON.stringify({
            id: last.id,
            at: last.cursor_at || null,
          }),
        ).toString("base64url")
      : null;
  return {
    items: page.map((w) =>
      a.role === "client"
        ? {
            id: w.id,
            property_id: w.property_id,
            property_name: w.property_name,
            title: w.title,
            scheduled_at: w.scheduled_at,
            status: w.status === "completed" ? "in_review" : w.status,
          }
        : w,
    ),
    nextCursor,
  };
}
export const rescheduleInput = z.object({
  scheduledAt: z.string().datetime(),
  assignedTo: z.string().min(1).nullable().optional(),
  version: z.number().int().positive(),
  reason: z.string().trim().min(1).max(1000),
});
export async function rescheduleWork(
  userId: string,
  id: string,
  input: unknown,
) {
  const b = rescheduleInput.parse(input);
  return transaction(async (c) => {
    await requireOperationalChild(c,"work_order",id);
    const w = (
      await c.query("SELECT * FROM work_order WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (!w) throw new HttpError(404, "Work order not found");
    if (
      w.version !== b.version ||
      !["draft", "scheduled", "delayed"].includes(w.status)
    )
      throw new HttpError(
        409,
        "Work order changed or work has already started; reload before scheduling",
      );
    const assigned = b.assignedTo === undefined ? w.assigned_to : b.assignedTo;
    if (
      assigned &&
      !(
        await c.query(
          "SELECT 1 FROM staff_profile WHERE user_id=$1 AND active=true AND role<>'client' FOR SHARE",
          [assigned],
        )
      ).rowCount
    )
      throw new HttpError(400, "Choose an active staff member");
    const r = await c.query(
      "UPDATE work_order SET scheduled_at=$2,assigned_to=$3,version=version+1 WHERE id=$1 RETURNING id,version",
      [id, b.scheduledAt, assigned],
    );
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,$3,$4,$5)",
      [
        randomUUID(),
        userId,
        "work.rescheduled",
        id,
        {
          reason: b.reason,
          before: { scheduledAt: w.scheduled_at, assignedTo: w.assigned_to },
          after: { scheduledAt: b.scheduledAt, assignedTo: assigned },
        },
      ],
    );
    return r.rows[0];
  });
}

export async function readScheduledWork(a: Actor, id: string) {
  const params: unknown[] = [id];
  let restriction = "";
  if (a.role === "crew") {
    params.push(a.id);
    restriction =
      " AND w.assigned_to=$2 AND w.status NOT IN ('cancelled','skipped','reviewed')";
  }
  if (a.role === "client") {
    params.push(a.id);
    restriction =
      " AND w.status<>'draft' AND EXISTS(SELECT 1 FROM client_access ca WHERE ca.client_id=p.client_id AND ca.user_id=$2)";
  }
  const w = (
    await pool.query(
      "SELECT w.*,p.name AS property_name,p.address,p.access_instructions FROM work_order w JOIN property p ON p.id=w.property_id AND p.lifecycle='operational' WHERE w.id=$1" +
        restriction,
      params,
    )
  ).rows[0];
  if (!w) throw new HttpError(404, "Work order not found");
  return a.role === "client"
    ? {
        id: w.id,
        property_id: w.property_id,
        property_name: w.property_name,
        title: w.title,
        scheduled_at: w.scheduled_at,
        status: w.status === "completed" ? "in_review" : w.status,
      }
    : w;
}
