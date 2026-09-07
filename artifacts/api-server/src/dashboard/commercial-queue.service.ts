import { z } from "zod";
import { pool } from "./database";
import { HttpError } from "./policy";
const statuses = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const;
const querySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    cursor: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .max(1024)
      .optional(),
    status: z.enum(statuses).optional(),
    ownerId: z.string().min(1).max(200).optional(),
    overdue: z.enum(["true"]).optional(),
  })
  .strict();
const cursorSchema = z
  .object({
    time: z.string().datetime({ precision: 6 }),
    id: z.string().uuid(),
    filter: z.string().max(500),
  })
  .strict();
// Recent intake ordering is stable across follow-up edits. Due-date triage uses the explicit overdue filter.
export async function listCommercialInquiries(input: unknown) {
  const query = querySchema.parse(input);
  const filter = JSON.stringify({
    status: query.status,
    ownerId: query.ownerId,
    overdue: query.overdue,
  });
  let cursor: z.infer<typeof cursorSchema> | undefined;
  if (query.cursor) {
    try {
      cursor = cursorSchema.parse(
        JSON.parse(Buffer.from(query.cursor, "base64url").toString("utf8")),
      );
    } catch {
      throw new HttpError(400, "Invalid inquiry cursor");
    }
    if (cursor.filter !== filter)
      throw new HttpError(400, "Reset cursor when filters change");
  }
  const values: unknown[] = [];
  const add = (value: unknown) => {
    values.push(value);
    return "$" + values.length;
  };
  const conditions = ["l.inquiry_type='commercial_site_assessment'"];
  if (query.status) conditions.push(`l.status=${add(query.status)}`);
  if (query.ownerId)
    conditions.push(
      query.ownerId === "unassigned"
        ? "l.owner_id IS NULL"
        : `l.owner_id=${add(query.ownerId)}`,
    );
  if (query.overdue)
    conditions.push(
      "l.next_action_due_at<now() AND l.status NOT IN ('won','lost')",
    );
  if (cursor)
    conditions.push(
      `(l.created_at,l.id)<(${add(cursor.time)}::timestamptz,${add(cursor.id)}::uuid)`,
    );
  const rows = (
    await pool.query(
      `SELECT l.*,r.submission_id,r.received_at,to_char(l.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_time FROM lead l JOIN commercial_intake_receipt r ON r.lead_id=l.id WHERE ${conditions.join(" AND ")} ORDER BY l.created_at DESC,l.id DESC LIMIT ${add(query.limit + 1)}`,
      values,
    )
  ).rows;
  const more = rows.length > query.limit,
    page = rows.slice(0, query.limit),
    last = page.at(-1);
  // PostgreSQL supplies all six fractional digits; never round-trip the cursor timestamp through JS Date.
  const nextCursor =
    more && last
      ? Buffer.from(
          JSON.stringify({ time: last.cursor_time, id: last.id, filter }),
        ).toString("base64url")
      : null;
  return { items: page.map(({ cursor_time: _, ...row }) => row), nextCursor };
}
