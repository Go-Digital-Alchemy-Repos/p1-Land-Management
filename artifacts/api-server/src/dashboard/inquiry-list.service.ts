import { createHash } from "node:crypto";
import { z } from "zod";
import { pool } from "./database";
import { HttpError } from "./policy";
const queryInput = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(30),
    cursor: z.string().max(1024).optional(),
    q: z.string().trim().min(1).max(200).optional(),
    status: z
      .enum(["new", "contacted", "qualified", "proposal", "won", "lost"])
      .optional(),
    ownerId: z.string().min(1).max(200).optional(),
    kind: z.enum(["all", "general", "commercial"]).default("all"),
    overdue: z.enum(["true"]).optional(),
  })
  .strict();
const cursorInput = z
  .object({
    at: z.string().datetime({ precision: 6 }),
    id: z.string().uuid(),
    filter: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export async function listSalesInquiries(input: unknown) {
  const query = queryInput.parse(input);
  const filter = createHash("sha256")
    .update(
      JSON.stringify({
        q: query.q,
        status: query.status,
        ownerId: query.ownerId,
        kind: query.kind,
        overdue: query.overdue,
      }),
    )
    .digest("hex");
  let cursor: z.infer<typeof cursorInput> | undefined;
  if (query.cursor) {
    try {
      cursor = cursorInput.parse(
        JSON.parse(Buffer.from(query.cursor, "base64url").toString()),
      );
      if (cursor.filter !== filter) throw Error("Changed filters");
    } catch {
      throw new HttpError(
        400,
        "Invalid inquiry cursor; reset the list when filters change",
      );
    }
  }
  const values: unknown[] = [];
  const add = (value: unknown) => {
    values.push(value);
    return "$" + values.length;
  };
  const where: string[] = [];
  if (query.q) {
    const q = add("%" + query.q.replace(/[\\%_]/g, "\\$&") + "%");
    where.push(
      `(l.name ILIKE ${q} OR l.email ILIKE ${q} OR l.phone ILIKE ${q} OR l.location ILIKE ${q} OR l.reported_company_name ILIKE ${q} OR u.name ILIKE ${q})`,
    );
  }
  if (query.status) where.push(`l.status=${add(query.status)}`);
  if (query.ownerId)
    where.push(
      query.ownerId === "unassigned"
        ? "l.owner_id IS NULL"
        : `l.owner_id=${add(query.ownerId)}`,
    );
  if (query.kind === "commercial")
    where.push("l.inquiry_type='commercial_site_assessment'");
  if (query.kind === "general")
    where.push("l.inquiry_type IS DISTINCT FROM 'commercial_site_assessment'");
  if (query.overdue)
    where.push("l.next_action_due_at<now() AND l.status NOT IN ('won','lost')");
  if (cursor)
    where.push(
      `(l.created_at,l.id)<(${add(cursor.at)}::timestamptz,${add(cursor.id)}::uuid)`,
    );
  const result = await pool.query(
    `SELECT l.id,l.name,l.email,l.phone,l.location,l.description,l.status,l.source,l.inquiry_type,l.owner_id,u.name AS owner_name,l.next_action,l.next_action_due_at,l.created_at,l.version,l.converted_client_id,l.converted_property_id,l.reported_company_name,
 to_char(l.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_at
 FROM lead l LEFT JOIN "user" u ON u.id=l.owner_id ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY l.created_at DESC,l.id DESC LIMIT ${add(query.limit + 1)}`,
    values,
  );
  const items = result.rows.slice(0, query.limit),
    last = items.at(-1);
  return {
    items: items.map(({ cursor_at, ...row }) => row),
    nextCursor:
      result.rows.length > query.limit && last
        ? Buffer.from(
            JSON.stringify({ at: last.cursor_at, id: last.id, filter }),
          ).toString("base64url")
        : null,
  };
}
