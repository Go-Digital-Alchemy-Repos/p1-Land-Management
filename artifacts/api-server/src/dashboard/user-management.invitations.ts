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
    kind: z.literal("invitations"),
    at: z.string().datetime(),
    id: z.string().uuid(),
  })
  .strict();
export async function listManagedInvitationPage(input: unknown) {
  const query = queryInput.parse(input);
  let cursor: z.infer<typeof cursorInput> | undefined;
  if (query.cursor)
    try {
      cursor = cursorInput.parse(
        JSON.parse(Buffer.from(query.cursor, "base64url").toString()),
      );
    } catch {
      throw new HttpError(400, "Invalid invitation cursor");
    }
  const result = await pool.query(
    `SELECT id,email,role,first_name AS "firstName",last_name AS "lastName",capabilities,
 expires_at AS "expiresAt",accepted_at AS "acceptedAt",revoked_at AS "revokedAt",created_at AS "createdAt",
 to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_at
 FROM invitation WHERE ($1::timestamptz IS NULL OR (created_at,id)<($1::timestamptz,$2::uuid))
 ORDER BY created_at DESC,id DESC LIMIT $3`,
    [cursor?.at || null, cursor?.id || null, query.limit + 1],
  );
  const page = result.rows.slice(0, query.limit),
    last = page.at(-1);
  return {
    items: page.map(({ cursor_at, ...row }) => row),
    nextCursor:
      result.rows.length > query.limit && last
        ? Buffer.from(
            JSON.stringify({
              kind: "invitations",
              at: last.cursor_at,
              id: last.id,
            }),
          ).toString("base64url")
        : null,
  };
}
