import { randomUUID } from "node:crypto";
import { pool, transaction } from "./database";
import { HttpError } from "./policy";
export type ContactInput = {
  name: string;
  email: string | null;
  phone: string | null;
  position?: string | null;
  kind: "site" | "billing" | "primary" | "other";
};
export async function listContacts(clientId: string) {
  const client = await pool.query("SELECT id FROM client WHERE id=$1", [
    clientId,
  ]);
  if (!client.rowCount) throw new HttpError(404, "Client not found");
  return (
    await pool.query(
      "SELECT id,client_id,name,first_name,last_name,email,phone,position,kind,archived,version FROM contact WHERE client_id=$1 ORDER BY archived,name",
      [clientId],
    )
  ).rows;
}
export async function saveContact(
  userId: string,
  clientId: string,
  input: ContactInput,
  existing?: { id: string; version: number; archived: boolean },
) {
  return transaction(async (c) => {
    const client = await c.query(
      "SELECT id FROM client WHERE id=$1 AND archived=false FOR SHARE",
      [clientId],
    );
    if (!client.rowCount) throw new HttpError(404, "Active client not found");
    const id = existing?.id || randomUUID();
    if (existing) {
      const changed = await c.query(
        "UPDATE contact SET name=$3,email=$4,phone=$5,kind=$6,archived=$7,position=$8,version=version+1 WHERE id=$1 AND client_id=$2 AND version=$9 RETURNING id",
        [
          id,
          clientId,
          input.name,
          input.email,
          input.phone,
          input.kind,
          existing.archived,
          input.position,
          existing.version,
        ],
      );
      if (!changed.rowCount)
        throw new HttpError(
          409,
          "Contact changed or is unavailable; refresh before saving",
        );
    } else
      await c.query(
        "INSERT INTO contact(id,client_id,name,email,phone,position,kind) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          id,
          clientId,
          input.name,
          input.email,
          input.phone,
          input.position,
          input.kind,
        ],
      );
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id) VALUES($1,$2,$3,$4)",
      [
        randomUUID(),
        userId,
        existing ? "contact.updated" : "contact.created",
        id,
      ],
    );
    return (
      await c.query(
        "SELECT id,client_id,name,first_name,last_name,email,phone,position,kind,archived,version FROM contact WHERE id=$1",
        [id],
      )
    ).rows[0];
  });
}
