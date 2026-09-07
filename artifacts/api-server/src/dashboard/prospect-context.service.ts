import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { pool, transaction } from "./database";
import { type Actor } from "./access";
import { HttpError, requireRole } from "./policy";
const id = z.string().uuid(),
  text = z.string().trim().min(1).max(500);
const email = z.string().trim().email().max(254).nullable();
const phone = z
  .string()
  .trim()
  .max(50)
  .regex(/^\+?[0-9() .-]+$/)
  .refine((v) => /^[0-9]{7,15}$/.test(v.replace(/\D/g, "")))
  .nullable();
const contactFields = z
  .object({ name: text, email, phone, source: text })
  .strict()
  .refine((v) => v.email || v.phone, "A contact channel is required");
const choice = <T extends z.ZodTypeAny>(create: T) =>
  z.union([
    z.object({ existingId: id }).strict(),
    z.object({ create }).strict(),
  ]);
export const contextInput = z
  .object({
    operationId: id,
    expectedVersion: z.number().int().positive(),
    organization: choice(
      z
        .object({
          displayName: text,
          legalName: text.nullable().optional(),
          clientId: id.nullable().optional(),
        })
        .strict(),
    ),
    contact: choice(contactFields),
    contactRole: z.enum([
      "requester",
      "site_manager",
      "facilities",
      "procurement",
      "owner_representative",
      "other",
    ]),
    title: text.nullable(),
    source: text,
    property: z.union([
      z.null(),
      choice(
        z
          .object({
            name: text,
            address: text,
            locationPrecision: z.enum(["region", "approximate", "confirmed"]),
            acreage: z.number().nonnegative().max(1e9).nullable(),
          })
          .strict(),
      ),
    ]),
    propertyRole: z.enum([
      "reported_owner",
      "operator",
      "manager",
      "developer",
      "prospective_customer",
      "other",
    ]),
  })
  .strict();
const sales = (a: Actor) => requireRole(a.role, ["owner", "manager", "sales"]);
export async function readProspectContext(a: Actor, leadId: string) {
  sales(a);
  id.parse(leadId);
  const lead = (
    await pool.query(
      "SELECT id,status,version,organization_id,contact_id,property_id FROM lead WHERE id=$1 AND inquiry_type='commercial_site_assessment'",
      [leadId],
    )
  ).rows[0];
  if (!lead) throw new HttpError(404, "Inquiry not found");
  const intake = (
    await pool.query(
      "SELECT submission_id,raw_intake FROM commercial_intake_receipt WHERE lead_id=$1",
      [leadId],
    )
  ).rows[0];
  const organization = lead.organization_id
    ? (
        await pool.query(
          "SELECT id,display_name,legal_name,client_id,archived,version FROM business_organization WHERE id=$1",
          [lead.organization_id],
        )
      ).rows[0]
    : null;
  const contact = lead.contact_id
    ? (
        await pool.query(
          "SELECT id,client_id,name,email,phone,archived,version,reviewed_by,reviewed_at,channel_source FROM contact WHERE id=$1",
          [lead.contact_id],
        )
      ).rows[0]
    : null;
  const property = lead.property_id
    ? (
        await pool.query(
          "SELECT id,name,address,acreage,client_id,lifecycle,location_precision,archived,version FROM property WHERE id=$1",
          [lead.property_id],
        )
      ).rows[0]
    : null;
  return { lead, intake, organization, contact, property };
}
export async function saveProspectContext(
  a: Actor,
  leadId: string,
  input: unknown,
) {
  sales(a);
  id.parse(leadId);
  const b = contextInput.parse(input);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ leadId, ...b }))
    .digest("hex");
  return transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      "commercial-context:" + b.operationId,
    ]);
    const prior = (
      await c.query("SELECT * FROM commercial_context_operation WHERE id=$1", [
        b.operationId,
      ])
    ).rows[0];
    if (prior) {
      if (
        prior.actor_id !== a.id ||
        prior.lead_id !== leadId ||
        prior.fingerprint !== fingerprint
      )
        throw new HttpError(409, "Operation conflict");
      return prior.result;
    }
    const lead = (
      await c.query(
        "SELECT * FROM lead WHERE id=$1 AND inquiry_type='commercial_site_assessment' FOR UPDATE",
        [leadId],
      )
    ).rows[0];
    if (!lead) throw new HttpError(404, "Inquiry not found");
    if (lead.version !== b.expectedVersion || lead.converted_property_id)
      throw new HttpError(409, "Inquiry changed or already converted");
    let organizationId: string;
    if ("existingId" in b.organization)
      organizationId = b.organization.existingId;
    else {
      const v = b.organization.create;
      if (
        v.clientId &&
        !(
          await c.query(
            "SELECT id FROM client WHERE id=$1 AND archived=false FOR SHARE",
            [v.clientId],
          )
        ).rowCount
      )
        throw new HttpError(404, "Active client not found");
      organizationId = randomUUID();
      await c.query(
        "INSERT INTO business_organization(id,display_name,legal_name,client_id,owner_id) VALUES($1,$2,$3,$4,$5)",
        [
          organizationId,
          v.displayName,
          v.legalName || null,
          v.clientId || null,
          a.id,
        ],
      );
    }
    const organization = (
      await c.query(
        "SELECT * FROM business_organization WHERE id=$1 AND archived=false FOR SHARE",
        [organizationId],
      )
    ).rows[0];
    if (!organization) throw new HttpError(404, "Organization unavailable");
    if (
      organization.client_id &&
      !(
        await c.query(
          "SELECT id FROM client WHERE id=$1 AND archived=false FOR SHARE",
          [organization.client_id],
        )
      ).rowCount
    )
      throw new HttpError(404, "Organization customer unavailable");
    let contactId: string;
    if ("existingId" in b.contact) contactId = b.contact.existingId;
    else {
      const v = b.contact.create;
      contactId = randomUUID();
      await c.query(
        "INSERT INTO contact(id,name,email,phone,kind,reviewed_by,reviewed_at,channel_source) VALUES($1,$2,$3,$4,'other',$5,now(),$6)",
        [contactId, v.name, v.email, v.phone, a.id, v.source],
      );
    }
    const contact = (
      await c.query(
        "SELECT * FROM contact WHERE id=$1 AND archived=false FOR SHARE",
        [contactId],
      )
    ).rows[0];
    if (
      !contact ||
      (!contact.email && !contact.phone) ||
      (contact.client_id && contact.client_id !== organization.client_id)
    )
      throw new HttpError(
        409,
        "Contact does not match organization customer context",
      );
    await c.query(
      "INSERT INTO organization_contact(organization_id,contact_id,role,title,source) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
      [organizationId, contactId, b.contactRole, b.title, b.source],
    );
    let propertyId: string | null = null;
    if (b.property) {
      if ("existingId" in b.property) propertyId = b.property.existingId;
      else {
        const v = b.property.create;
        propertyId = randomUUID();
        await c.query(
          "INSERT INTO property(id,name,address,acreage,lifecycle,location_precision,sales_owner_id) VALUES($1,$2,$3,$4,'prospect',$5,$6)",
          [propertyId, v.name, v.address, v.acreage, v.locationPrecision, a.id],
        );
      }
      const property = (
        await c.query(
          "SELECT * FROM property WHERE id=$1 AND archived=false FOR SHARE",
          [propertyId],
        )
      ).rows[0];
      if (
        !property ||
        (property.lifecycle === "operational" &&
          property.client_id !== organization.client_id)
      )
        throw new HttpError(
          409,
          "Property does not match organization customer context",
        );
      await c.query(
        "INSERT INTO property_organization(property_id,organization_id,role,source) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
        [propertyId, organizationId, b.propertyRole, b.source],
      );
    }
    const result = {
      leadId,
      organizationId,
      contactId,
      propertyId,
      version: lead.version + 1,
    };
    await c.query(
      "UPDATE lead SET organization_id=$2,contact_id=$3,property_id=$4,version=version+1,last_activity_at=now() WHERE id=$1",
      [leadId, organizationId, contactId, propertyId],
    );
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'commercial.context_linked',$3,$4)",
      [randomUUID(), a.id, leadId, JSON.stringify(result)],
    );
    await c.query(
      "INSERT INTO commercial_context_operation(id,actor_id,lead_id,fingerprint,result) VALUES($1,$2,$3,$4,$5)",
      [b.operationId, a.id, leadId, fingerprint, JSON.stringify(result)],
    );
    return result;
  }).catch((error: unknown) => {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505" &&
      "constraint" in error &&
      error.constraint === "business_organization_client_id_key"
    )
      throw new HttpError(
        409,
        "This customer already has an organization; link the existing organization",
      );
    throw error;
  });
}
export async function reviewProspectContact(
  a: Actor,
  leadId: string,
  input: unknown,
) {
  sales(a);
  id.parse(leadId);
  const b = z
    .object({
      expectedVersion: z.number().int().positive(),
      contactVersion: z.number().int().positive(),
      contact: contactFields,
    })
    .strict()
    .parse(input);
  return transaction(async (c) => {
    const lead = (
      await c.query(
        "SELECT * FROM lead WHERE id=$1 AND inquiry_type='commercial_site_assessment' FOR UPDATE",
        [leadId],
      )
    ).rows[0];
    if (!lead || lead.version !== b.expectedVersion || !lead.contact_id)
      throw new HttpError(409, "Inquiry changed or contact not linked");
    const changed = await c.query(
      "UPDATE contact SET name=$2,email=$3,phone=$4,channel_source=$5,reviewed_by=$6,reviewed_at=now(),version=version+1 WHERE id=$1 AND client_id IS NULL AND archived=false AND version=$7 RETURNING id,version",
      [
        lead.contact_id,
        b.contact.name,
        b.contact.email,
        b.contact.phone,
        b.contact.source,
        a.id,
        b.contactVersion,
      ],
    );
    if (!changed.rowCount)
      throw new HttpError(
        409,
        "Contact changed or requires customer contact workflow",
      );
    await c.query(
      "UPDATE lead SET version=version+1,last_activity_at=now() WHERE id=$1",
      [leadId],
    );
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'commercial.contact_reviewed',$3,$4)",
      [
        randomUUID(),
        a.id,
        leadId,
        JSON.stringify({
          contactId: lead.contact_id,
          source: b.contact.source,
        }),
      ],
    );
    return {
      leadId,
      version: lead.version + 1,
      contactId: lead.contact_id,
      contactVersion: changed.rows[0].version,
    };
  });
}
export async function searchProspectContext(a: Actor, input: unknown) {
  sales(a);
  const q = z
    .object({
      kind: z.enum(["organizations", "contacts", "properties"]),
      q: z.string().trim().max(100).default(""),
      after: id.optional(),
      limit: z.coerce.number().int().min(1).max(100).default(25),
    })
    .strict()
    .parse(input);
  const config = {
    organizations: {
      table: "business_organization",
      name: "display_name",
      columns: "id,display_name,legal_name,client_id,version",
    },
    contacts: {
      table: "contact",
      name: "name",
      columns: "id,name,email,phone,client_id,version",
    },
    properties: {
      table: "property",
      name: "name",
      columns: "id,name,address,lifecycle,client_id,location_precision,version",
    },
  }[q.kind];
  const rows = (
    await pool.query(
      `SELECT ${config.columns} FROM ${config.table} WHERE archived=false AND ${config.name} ILIKE $1 AND ($2::uuid IS NULL OR id>$2) ORDER BY id LIMIT $3`,
      ["%" + q.q + "%", q.after || null, q.limit + 1],
    )
  ).rows;
  return {
    items: rows.slice(0, q.limit),
    nextCursor: rows.length > q.limit ? rows[q.limit - 1].id : null,
  };
}
