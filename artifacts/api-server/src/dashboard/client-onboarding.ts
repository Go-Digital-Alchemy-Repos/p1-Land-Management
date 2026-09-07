import { randomUUID } from "node:crypto";
import { transaction } from "./database";
import { HttpError } from "./policy";

export type ClientOnboardingInput = {
  name: string;
  address: string;
  phone: string;
  primaryContact: {
    firstName: string;
    lastName: string;
    email: string;
    position: string;
    phone: string;
  };
};

const audit = (client: { query: (...args: any[]) => Promise<any> }, userId: string, action: string, entityId: string) =>
  client.query(
    "INSERT INTO audit_event(id,user_id,action,entity_id) VALUES($1,$2,$3,$4)",
    [randomUUID(), userId, action, entityId],
  );

export async function onboardClient(userId: string, input: ClientOnboardingInput) {
  return transaction(async (client) => {
    const clientId = randomUUID();
    const contactId = randomUUID();
    const contactName = `${input.primaryContact.firstName} ${input.primaryContact.lastName}`;
    await client.query(
      "INSERT INTO client(id,name,phone,billing_address) VALUES($1,$2,$3,$4)",
      [clientId, input.name, input.phone, input.address],
    );
    await client.query(
      "INSERT INTO contact(id,client_id,name,first_name,last_name,email,phone,position,kind) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'primary')",
      [
        contactId,
        clientId,
        contactName,
        input.primaryContact.firstName,
        input.primaryContact.lastName,
        input.primaryContact.email,
        input.primaryContact.phone,
        input.primaryContact.position,
      ],
    );
    await audit(client, userId, "client.created", clientId);
    await audit(client, userId, "contact.created", contactId);
    return { id: clientId, primaryContactId: contactId, version: 1 };
  });
}

export async function updateClient(
  userId: string,
  id: string,
  input: ClientOnboardingInput & { email: string | null; version: number },
) {
  return transaction(async (client) => {
    const changed = await client.query(
      "UPDATE client SET name=$2,billing_address=$3,phone=$4,email=$5,version=version+1 WHERE id=$1 AND archived=false AND version=$6 RETURNING id,name,email,phone,billing_address,version",
      [id, input.name, input.address, input.phone, input.email, input.version],
    );
    if (!changed.rowCount)
      throw new HttpError(409, "Client changed or is unavailable; refresh before saving");
    await audit(client, userId, "client.updated", id);
    const existingPrimary = await client.query(
      "SELECT id FROM contact WHERE client_id=$1 AND kind='primary' AND archived=false ORDER BY id LIMIT 1 FOR UPDATE",
      [id],
    );
    const contactName = `${input.primaryContact.firstName} ${input.primaryContact.lastName}`;
    let contactId: string;
    if (existingPrimary.rowCount) {
      contactId = existingPrimary.rows[0].id;
      await client.query(
        "UPDATE contact SET name=$2,first_name=$3,last_name=$4,email=$5,phone=$6,position=$7,version=version+1 WHERE id=$1",
        [
          contactId,
          contactName,
          input.primaryContact.firstName,
          input.primaryContact.lastName,
          input.primaryContact.email,
          input.primaryContact.phone,
          input.primaryContact.position,
        ],
      );
      await audit(client, userId, "contact.updated", contactId);
    } else {
      contactId = randomUUID();
      await client.query(
        "INSERT INTO contact(id,client_id,name,first_name,last_name,email,phone,position,kind) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'primary')",
        [
          contactId,
          id,
          contactName,
          input.primaryContact.firstName,
          input.primaryContact.lastName,
          input.primaryContact.email,
          input.primaryContact.phone,
          input.primaryContact.position,
        ],
      );
      await audit(client, userId, "contact.created", contactId);
    }
    return changed.rows[0];
  });
}
