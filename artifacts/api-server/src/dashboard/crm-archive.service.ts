import { z } from "zod";
import { pool } from "./database";
import { HttpError } from "./policy";
const sourceId = z.string().regex(/^[A-Za-z0-9_-]{1,200}$/);
const identity = z
  .object({
    sourceInstanceId: sourceId,
    collection: z.enum([
      "leads",
      "clients",
      "leadNotes",
      "clientNotes",
      "leadTasks",
      "clientTasks",
    ]),
    sourceId,
  })
  .strict();
const cursorSchema = identity
  .extend({ kind: z.enum(["lead", "client"]), parentId: z.string().uuid() })
  .strict();
const querySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().max(2000).optional(),
  })
  .strict();
type Kind = "lead" | "client";
const projection = `source_instance_id AS "sourceInstanceId",source_table AS collection,source_id AS "sourceId",source_sha256 AS "sourceSha256",to_char(imported_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "importedAt"`;
async function parentExists(kind: Kind, id: string) {
  if (
    !(
      await pool.query(
        `SELECT id FROM ${kind === "lead" ? "lead" : "client"} WHERE id=$1`,
        [id],
      )
    ).rowCount
  )
    throw new HttpError(404, "Record not found");
}
export async function listCrmArchive(
  kind: Kind,
  parentId: string,
  input: unknown,
) {
  const query = querySchema.parse(input);
  let cursor: z.infer<typeof cursorSchema> | undefined;
  if (query.cursor) {
    try {
      cursor = cursorSchema.parse(
        JSON.parse(Buffer.from(query.cursor, "base64url").toString()),
      );
      if (cursor.kind !== kind || cursor.parentId !== parentId) throw Error();
    } catch {
      throw new HttpError(400, "Invalid CRM history cursor");
    }
  }
  await parentExists(kind, parentId);
  const rows = (
    await pool.query(
      `SELECT ${projection} FROM crm_source_record WHERE ${kind}_id=$1 AND ($2::text IS NULL OR (source_instance_id,source_table,source_id)>($2,$3,$4)) ORDER BY source_instance_id,source_table,source_id LIMIT $5`,
      [
        parentId,
        cursor?.sourceInstanceId || null,
        cursor?.collection || null,
        cursor?.sourceId || null,
        query.limit + 1,
      ],
    )
  ).rows;
  const items = rows.slice(0, query.limit),
    last = items.at(-1);
  return {
    items,
    nextCursor:
      rows.length > query.limit && last
        ? Buffer.from(
            JSON.stringify({
              kind,
              parentId,
              sourceInstanceId: last.sourceInstanceId,
              collection: last.collection,
              sourceId: last.sourceId,
            }),
          ).toString("base64url")
        : null,
  };
}
export async function getCrmArchive(
  kind: Kind,
  parentId: string,
  input: unknown,
) {
  const key = identity.parse(input);
  await parentExists(kind, parentId);
  const record = (
    await pool.query(
      `SELECT ${projection},jsonb_pretty(source_payload) AS "sourceJson" FROM crm_source_record WHERE ${kind}_id=$1 AND source_instance_id=$2 AND source_table=$3 AND source_id=$4`,
      [parentId, key.sourceInstanceId, key.collection, key.sourceId],
    )
  ).rows[0];
  if (!record) throw new HttpError(404, "Imported record not found");
  // Return JSON as text: client-side number parsing must not round preserved values.
  return record;
}
