import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { pool, transaction } from "./database";
import { HttpError } from "./policy";
const id = z.string().uuid();
const inputSchema = z
  .object({
    operationId: id,
    expectedVersion: z.number().int().positive(),
    customer: z.union([
      z.object({ existingId: id }).strict(),
      z
        .object({
          create: z
            .object({
              name: z.string().trim().min(1).max(300),
              email: z.string().trim().email().max(320).nullable(),
              phone: z.string().trim().min(1).max(100).nullable(),
            })
            .strict(),
        })
        .strict(),
    ]),
  })
  .strict();
export async function getLeadOnboarding(leadId: string) {
  const row = (
    await pool.query(
      `SELECT l.id,l.version,l.status,l.converted_client_id AS "clientId",c.name AS "clientName",c.archived AS "clientArchived" FROM lead l LEFT JOIN client c ON c.id=l.converted_client_id WHERE l.id=$1`,
      [leadId],
    )
  ).rows[0];
  if (!row) throw new HttpError(404, "Inquiry not found");
  return row;
}
export async function onboardLeadCustomer(
  leadId: string,
  actorId: string,
  input: unknown,
) {
  const b = inputSchema.parse(input),
    fingerprint = createHash("sha256")
      .update(JSON.stringify({ leadId, actorId, ...b }))
      .digest("hex");
  return transaction(async (c) => {
    // Serialize operation IDs across inquiries before taking inquiry locks.
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      "lead-onboarding:" + b.operationId,
    ]);
    const lead = (
      await c.query("SELECT * FROM lead WHERE id=$1 FOR UPDATE", [leadId])
    ).rows[0];
    if (!lead) throw new HttpError(404, "Inquiry not found");
    const receipt = (
      await c.query(
        "SELECT * FROM lead_customer_onboarding WHERE operation_id=$1",
        [b.operationId],
      )
    ).rows[0];
    if (receipt) {
      if (
        receipt.fingerprint !== fingerprint ||
        receipt.actor_id !== actorId ||
        receipt.lead_id !== leadId
      )
        throw new HttpError(409, "Onboarding operation already used");
      if (lead.converted_client_id !== receipt.client_id)
        throw new HttpError(
          409,
          "Customer link changed; review the saved inquiry",
        );
      return {
        clientId: receipt.client_id,
        version: receipt.lead_version,
        replayed: true,
      };
    }
    if (
      lead.version !== b.expectedVersion ||
      lead.status !== "won" ||
      lead.converted_client_id ||
      lead.converted_property_id
    )
      throw new HttpError(
        409,
        "Onboarding requires the current, unlinked Won inquiry",
      );
    const requestedId =
      "existingId" in b.customer ? b.customer.existingId : null;
    // Existing prospect associations may remain unassigned, but must never contradict the chosen customer.
    for (const [table, key] of [
      ["business_organization", "organization_id"],
      ["contact", "contact_id"],
      ["property", "property_id"],
    ] as const) {
      if (!lead[key]) continue;
      const related = (
        await c.query(
          `SELECT client_id,archived FROM ${table} WHERE id=$1 FOR UPDATE`,
          [lead[key]],
        )
      ).rows[0];
      if (
        !related ||
        related.archived ||
        (related.client_id && related.client_id !== requestedId)
      )
        throw new HttpError(
          409,
          "Prospect context conflicts with this customer; review the inquiry context first",
        );
    }
    let clientId = requestedId;
    if (clientId) {
      const customer = (
        await c.query(
          "SELECT id FROM client WHERE id=$1 AND NOT archived FOR UPDATE",
          [clientId],
        )
      ).rows[0];
      if (!customer) throw new HttpError(409, "Choose an active customer");
    } else if ("create" in b.customer) {
      const values = b.customer.create;
      // Serialize competing handoffs for the same identity before checking for an
      // active account. The operator can link that account instead of creating a
      // second customer record from another Won inquiry.
      const keys = [
        `customer-name:${values.name.trim().toLocaleLowerCase()}`,
        ...(values.email ? [`customer-email:${values.email.trim().toLocaleLowerCase()}`] : []),
      ].sort();
      for (const key of keys)
        await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [key]);
      const duplicate = (
        await c.query(
          "SELECT id FROM client WHERE NOT archived AND (lower(btrim(name))=lower($1) OR ($2::text IS NOT NULL AND lower(btrim(email))=lower($2))) LIMIT 1",
          [values.name, values.email],
        )
      ).rows[0];
      if (duplicate)
        throw new HttpError(409, "A matching active customer exists; link it instead");
      clientId = randomUUID();
      await c.query(
        "INSERT INTO client(id,name,email,phone) VALUES($1,$2,$3,$4)",
        [clientId, values.name, values.email, values.phone],
      );
    }
    const version = lead.version + 1;
    await c.query(
      "UPDATE lead SET converted_client_id=$2,version=$3,last_activity_at=now() WHERE id=$1",
      [leadId, clientId, version],
    );
    await c.query(
      "INSERT INTO lead_customer_onboarding(operation_id,lead_id,client_id,actor_id,fingerprint,mode,lead_version) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        b.operationId,
        leadId,
        clientId,
        actorId,
        fingerprint,
        requestedId ? "link" : "create",
        version,
      ],
    );
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'lead.customer_onboarded',$3,$4)",
      [
        randomUUID(),
        actorId,
        leadId,
        {
          operationId: b.operationId,
          clientId,
          mode: requestedId ? "link" : "create",
        },
      ],
    );
    return { clientId: clientId!, version, replayed: false };
  });
}
