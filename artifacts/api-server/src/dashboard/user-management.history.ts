import { z } from "zod";
import { pool } from "./database";
import { HttpError } from "./policy";
const queryInput = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().max(2000).optional(),
  })
  .strict();
const cursorInput = z
  .object({
    accountId: z.string().min(1),
    at: z.string().datetime(),
    id: z.string().uuid(),
  })
  .strict();
export async function listManagedAccountHistory(
  accountId: string,
  input: unknown,
) {
  const query = queryInput.parse(input);
  let cursor: z.infer<typeof cursorInput> | undefined;
  if (query.cursor) {
    try {
      cursor = cursorInput.parse(
        JSON.parse(Buffer.from(query.cursor, "base64url").toString()),
      );
      if (cursor.accountId !== accountId) throw new Error("Account mismatch");
    } catch {
      throw new HttpError(400, "Invalid account history cursor");
    }
  }
  const result = await pool.query(
    `SELECT id,user_id AS "actorId",action,details,created_at AS "createdAt",
    to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_at
    FROM audit_event WHERE entity_id=$1 AND action LIKE 'account.%'
    AND ($2::timestamptz IS NULL OR (created_at,id)<($2::timestamptz,$3::uuid))
    ORDER BY created_at DESC,id DESC LIMIT $4`,
    [accountId, cursor?.at || null, cursor?.id || null, query.limit + 1],
  );
  const page = result.rows.slice(0, query.limit),
    last = page.at(-1);
  return {
    items: page.map(({ cursor_at, ...row }) => row),
    nextCursor:
      result.rows.length > query.limit && last
        ? Buffer.from(
            JSON.stringify({ accountId, at: last.cursor_at, id: last.id }),
          ).toString("base64url")
        : null,
  };
}
