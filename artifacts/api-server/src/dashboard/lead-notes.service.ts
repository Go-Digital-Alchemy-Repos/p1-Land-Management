import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool, transaction } from "./database";
import { HttpError } from "./policy";
const uuid = z.string().uuid();
const queryInput = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(30),
    cursor: z.string().max(2000).optional(),
  })
  .strict();
const cursorInput = z
  .object({ leadId: uuid, at: z.string().datetime(), id: uuid })
  .strict();
const createInput = z
  .object({ id: uuid, body: z.string().trim().min(1).max(10000) })
  .strict();

export async function listLeadNotes(leadId: string, input: unknown) {
  const query = queryInput.parse(input);
  let cursor: z.infer<typeof cursorInput> | undefined;
  if (query.cursor) {
    try {
      cursor = cursorInput.parse(
        JSON.parse(Buffer.from(query.cursor, "base64url").toString()),
      );
      if (cursor.leadId !== leadId) throw Error("Different inquiry");
    } catch {
      throw new HttpError(400, "Invalid inquiry notes cursor");
    }
  }
  if (!(await pool.query("SELECT id FROM lead WHERE id=$1", [leadId])).rowCount)
    throw new HttpError(404, "Inquiry not found");
  const result = await pool.query(
    `SELECT n.id,n.body,n.created_at AS "createdAt",u.name AS "authorName",
    (n.source_note_id IS NOT NULL) AS imported,
    to_char(n.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_at
    FROM lead_note n LEFT JOIN "user" u ON u.id=n.author_id
    WHERE n.lead_id=$1 AND ($2::timestamptz IS NULL OR (n.created_at,n.id)<($2::timestamptz,$3::uuid))
    ORDER BY n.created_at DESC,n.id DESC LIMIT $4`,
    [leadId, cursor?.at || null, cursor?.id || null, query.limit + 1],
  );
  const items = result.rows.slice(0, query.limit),
    last = items.at(-1);
  return {
    items: items.map(({ cursor_at, ...row }) => row),
    nextCursor:
      result.rows.length > query.limit && last
        ? Buffer.from(
            JSON.stringify({ leadId, at: last.cursor_at, id: last.id }),
          ).toString("base64url")
        : null,
  };
}

export async function createLeadNote(
  leadId: string,
  authorId: string,
  input: unknown,
) {
  const note = createInput.parse(input);
  return transaction(async (c) => {
    // Serialize against lead deletion, and keep note/audit writes atomic.
    if (
      !(
        await c.query("SELECT id FROM lead WHERE id=$1 FOR KEY SHARE", [leadId])
      ).rowCount
    )
      throw new HttpError(404, "Inquiry not found");
    const result = await c.query(
      "INSERT INTO lead_note(id,lead_id,author_id,body) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING RETURNING id",
      [note.id, leadId, authorId, note.body],
    );
    if (!result.rowCount) {
      const old = (
        await c.query(
          "SELECT lead_id,author_id,body,source_note_id FROM lead_note WHERE id=$1",
          [note.id],
        )
      ).rows[0];
      if (
        !old ||
        old.lead_id !== leadId ||
        old.author_id !== authorId ||
        old.body !== note.body ||
        old.source_note_id !== null
      )
        throw new HttpError(
          409,
          "Note ID already used; reload before adding another note",
        );
      return { id: note.id, replayed: true };
    }
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id) VALUES($1,$2,'lead_note.created',$3)",
      [randomUUID(), authorId, note.id],
    );
    return { id: note.id, replayed: false };
  });
}
