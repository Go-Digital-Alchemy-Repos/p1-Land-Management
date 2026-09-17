import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool, transaction } from "./database";
import { HttpError } from "./policy";
const uuid = z.string().uuid();
const pageInput = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(30),
    cursor: z.string().max(2000).optional(),
  })
  .strict();
const cursorInput = z
  .object({ clientId: uuid, at: z.string().datetime(), id: uuid })
  .strict();
const createInput = z
  .object({
    id: uuid.optional(),
    body: z.string().trim().min(1).max(10000),
    propertyId: uuid.optional(),
  })
  .strict();
export async function listClientNotes(clientId: string, input: unknown) {
  const query = pageInput.parse(input);
  let cursor: z.infer<typeof cursorInput> | undefined;
  if (query.cursor) {
    try {
      cursor = cursorInput.parse(
        JSON.parse(Buffer.from(query.cursor, "base64url").toString()),
      );
      if (cursor.clientId !== clientId) throw Error("Wrong client");
    } catch {
      throw new HttpError(400, "Invalid customer notes cursor");
    }
  }
  if (
    !(
      await pool.query("SELECT id FROM client WHERE id=$1 AND archived=false", [
        clientId,
      ])
    ).rowCount
  )
    throw new HttpError(404, "Client not found");
  const result = await pool.query(
    `SELECT n.id,n.property_id,n.body,n.created_at,u.name AS author_name,p.name AS property_name,(n.source_note_id IS NOT NULL) AS imported,
 to_char(n.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_at
 FROM client_note n LEFT JOIN "user" u ON u.id=n.author_id LEFT JOIN property p ON p.id=n.property_id
 WHERE n.client_id=$1 AND ($2::timestamptz IS NULL OR (n.created_at,n.id)<($2::timestamptz,$3::uuid)) ORDER BY n.created_at DESC,n.id DESC LIMIT $4`,
    [clientId, cursor?.at || null, cursor?.id || null, query.limit + 1],
  );
  const items = result.rows.slice(0, query.limit),
    last = items.at(-1);
  return {
    items: items.map(({ cursor_at, ...row }) => row),
    nextCursor:
      result.rows.length > query.limit && last
        ? Buffer.from(
            JSON.stringify({ clientId, at: last.cursor_at, id: last.id }),
          ).toString("base64url")
        : null,
  };
}
export async function createClientNote(
  clientId: string,
  actorId: string,
  input: unknown,
) {
  const note = createInput.parse(input),
    id = note.id || randomUUID();
  return transaction(async (c) => {
    if (
      !(
        await c.query(
          "SELECT id FROM client WHERE id=$1 AND archived=false FOR SHARE",
          [clientId],
        )
      ).rowCount
    )
      throw new HttpError(404, "Client not found");
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      "client-note:" + id,
    ]);
    const old = (
      await c.query(
        "SELECT client_id,property_id,author_id,body,source_note_id FROM client_note WHERE id=$1",
        [id],
      )
    ).rows[0];
    if (old) {
      if (
        old.client_id !== clientId ||
        old.property_id !== (note.propertyId || null) ||
        old.author_id !== actorId ||
        old.body !== note.body ||
        old.source_note_id !== null
      )
        throw new HttpError(
          409,
          "Note ID already used; reload the saved history",
        );
      return { id, replayed: true };
    }
    if (
      note.propertyId &&
      !(
        await c.query(
          "SELECT id FROM property WHERE id=$1 AND client_id=$2 AND archived=false AND lifecycle='operational' FOR SHARE",
          [note.propertyId, clientId],
        )
      ).rowCount
    )
      throw new HttpError(400, "Property does not belong to this client");
    await c.query(
      "INSERT INTO client_note(id,client_id,property_id,author_id,body) VALUES($1,$2,$3,$4,$5)",
      [id, clientId, note.propertyId || null, actorId, note.body],
    );
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id) VALUES($1,$2,'client_note.created',$3)",
      [randomUUID(), actorId, id],
    );
    return { id, replayed: false };
  });
}
