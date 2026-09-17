import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool, transaction } from "./database";
import { HttpError } from "./policy";
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => v || null);
const fields = z.object({
  name: z.string().trim().min(1).max(200),
  email: z
    .union([z.string().trim().email().max(320), z.literal(""), z.null()])
    .transform((v) => v || null),
  phone: optionalText(100),
  location: z.string().trim().max(2000),
  description: z.string().trim().max(10000),
  reported_company_name: optionalText(300),
});
const updateInput = fields
  .extend({ expectedVersion: z.number().int().positive() })
  .strict();
const projection =
  "id,version,name,email,phone,location,description,reported_company_name";
export async function getLeadDetails(id: string) {
  const row = (
    await pool.query(`SELECT ${projection} FROM lead WHERE id=$1`, [id])
  ).rows[0];
  if (!row) throw new HttpError(404, "Inquiry not found");
  return row;
}
export async function updateLeadDetails(
  id: string,
  actorId: string,
  input: unknown,
) {
  const body = updateInput.parse(input);
  return transaction(async (c) => {
    const existing = (
      await c.query(`SELECT ${projection} FROM lead WHERE id=$1 FOR UPDATE`, [
        id,
      ])
    ).rows[0];
    if (!existing) throw new HttpError(404, "Inquiry not found");
    if (existing.version !== body.expectedVersion)
      throw new HttpError(409, "Inquiry changed; reload before saving");
    const keys = [
      "name",
      "email",
      "phone",
      "location",
      "description",
      "reported_company_name",
    ] as const;
    const changed = keys.filter((key) => existing[key] !== body[key]);
    if (!changed.length) return existing;
    await c.query("SELECT set_config('p1.lead_detail_actor',$1,true)", [
      actorId,
    ]);
    const row = (
      await c.query(
        `UPDATE lead SET name=$2,email=$3,phone=$4,location=$5,description=$6,reported_company_name=$7,version=version+1,last_activity_at=now() WHERE id=$1 RETURNING ${projection}`,
        [id, ...keys.map((key) => body[key])],
      )
    ).rows[0];
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'lead.details_updated',$3,$4)",
      [
        randomUUID(),
        actorId,
        id,
        { version: row.version, changedFields: changed },
      ],
    );
    return row;
  });
}
export async function getLeadDetailHistory(id: string, input: unknown) {
  const query = z
    .object({
      beforeVersion: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(30),
    })
    .strict()
    .parse(input);
  await getLeadDetails(id);
  const rows = (
    await pool.query(
      `SELECT r.version,r.kind,r.fields,r.recorded_at,u.name AS actor_name FROM lead_detail_revision r LEFT JOIN "user" u ON u.id=r.actor_id WHERE r.lead_id=$1 AND ($2::integer IS NULL OR r.version<$2) ORDER BY r.version DESC LIMIT $3`,
      [id, query.beforeVersion ?? null, query.limit + 1],
    )
  ).rows;
  const items = rows.slice(0, query.limit);
  return {
    items,
    nextBeforeVersion: rows.length > query.limit ? items.at(-1)!.version : null,
  };
}
