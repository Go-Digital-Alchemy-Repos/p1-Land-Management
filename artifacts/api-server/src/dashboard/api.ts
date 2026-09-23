import { selectedEstimateAllocation, allocatedBillingCapacity } from "./estimate-allocation";
import { requireWorkRead, requireFieldWork, assignedWorkOnly } from "./work-access";
import { requireCapability, requireAnyCapability } from "./policy";
import { CAPABILITIES, hasCapability } from "@workspace/api-zod/business-access";
import {
  requireOperationalProperty,
  requireOperationalChild,
  operationalQuery,
} from "./operational-property";
import { Router } from "express";
import { fieldEventSchema } from "@workspace/api-zod/dashboard";
import { z } from "zod";
import { randomUUID, createHash } from "node:crypto";
import { pool, transaction } from "./database";
import { actor, identity, propertyAccess } from "./access";
import {
  HttpError,
  requireRole,
  verifyCode,
  transition,
  canDispatch,
} from "./policy";
import {
  availableSlots,
  bookAssessment,
  createManualAssessment,
} from "./assessments";
import { onboardClient, updateClient } from "./client-onboarding";
import { agreementPreparationHealth } from "./agreement-preparation";
import { features } from "./features";
import { geocodePropertyAddress } from "./property-geocoding";
import { notifyCapability } from "./job-notifications";
import { fieldConflictsApi } from "./field-conflicts.routes";
export const api = Router();
api.use(fieldConflictsApi);
const id = z.string().uuid();
const text = z.string().trim().min(1).max(10000);
const addressLine = z.string().trim().min(1).max(200);
const addressLineOptional = z.string().trim().max(200).optional();
const addressCity = z.string().trim().min(1).max(100);
const addressState = z.string().trim().regex(/^[a-z]{2}$/i, "Use a two-letter state code").transform((value) => value.toUpperCase());
const addressPostalCode = z.string().trim().regex(/^\d{5}(?:-\d{4})?$/, "Use a five- or nine-digit ZIP code");
const propertyAddressInput = z.object({
  // Retained only for existing internal callers while they move to the
  // structured form. New UI always sends the individual address components.
  address: text.optional(),
  addressLine1: addressLine.optional(),
  addressLine2: addressLineOptional,
  city: addressCity.optional(),
  state: addressState.optional(),
  postalCode: addressPostalCode.optional(),
}).superRefine((value, context) => {
  if (value.addressLine1 || value.city || value.state || value.postalCode) {
    if (!value.addressLine1) context.addIssue({ code: z.ZodIssueCode.custom, path: ["addressLine1"], message: "Address line 1 is required" });
    if (!value.city) context.addIssue({ code: z.ZodIssueCode.custom, path: ["city"], message: "City is required" });
    if (!value.state) context.addIssue({ code: z.ZodIssueCode.custom, path: ["state"], message: "State is required" });
    if (!value.postalCode) context.addIssue({ code: z.ZodIssueCode.custom, path: ["postalCode"], message: "ZIP code is required" });
    return;
  }
  if (!value.address) context.addIssue({ code: z.ZodIssueCode.custom, path: ["addressLine1"], message: "A complete address is required" });
});
type PropertyAddressInput = z.infer<typeof propertyAddressInput>;
function normalizePropertyAddress(input: PropertyAddressInput) {
  if (input.addressLine1 && input.city && input.state && input.postalCode) {
    return {
      address: [input.addressLine1, input.addressLine2, `${input.city}, ${input.state} ${input.postalCode}`].filter(Boolean).join(", "),
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2 || null,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
    };
  }
  return {
    address: input.address!,
    addressLine1: null,
    addressLine2: null,
    city: null,
    state: null,
    postalCode: null,
  };
}
const primaryContact = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  position: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(50),
});
const audit = async (c: any, user: string, action: string, entity: string) =>
  c.query(
    "INSERT INTO audit_event(id,user_id,action,entity_id) VALUES($1,$2,$3,$4)",
    [randomUUID(), user, action, entity],
  );
async function updateMfaRequirement(
  actorId: string,
  targetId: string,
  required: boolean,
) {
  return transaction(async (c) => {
    const current = await c.query(
      "SELECT role FROM staff_profile WHERE user_id=$1 AND active=true FOR UPDATE",
      [targetId],
    );
    if (!current.rowCount) throw new HttpError(404, "Account not found");
    if (current.rows[0].role === "owner" && !required)
      throw new HttpError(
        409,
        "Multi-factor authentication is required for owners",
      );
    const result = await c.query(
      "UPDATE staff_profile SET mfa_required=$2 WHERE user_id=$1 RETURNING user_id,mfa_required",
      [targetId, required],
    );
    await audit(c, actorId, "account.mfa_requirement.updated", targetId);
    return { id: targetId, mfaRequired: result.rows[0].mfa_required };
  });
}
api.get("/setup", async (_req, res) => {
  const r = await pool.query(
    "SELECT completed_at FROM installation WHERE id=1",
  );
  res.json({
    initialized: Boolean(r.rows[0]?.completed_at),
    configured: Boolean(
      process.env.BOOTSTRAP_OWNER_EMAIL &&
      process.env.BOOTSTRAP_CODE_HASH &&
      process.env.BOOTSTRAP_EXPIRES_AT,
    ),
  });
});
api.post("/setup/complete", async (req, res) => {
  const s = await identity(req);
  const b = z.object({ code: text }).parse(req.body);
  if (
    s.user.email.toLowerCase() !==
      process.env.BOOTSTRAP_OWNER_EMAIL?.toLowerCase() ||
    !verifyCode(
      b.code,
      process.env.BOOTSTRAP_CODE_HASH,
      process.env.BOOTSTRAP_EXPIRES_AT,
    )
  )
    throw new HttpError(403, "Invalid or expired setup authorization");
  await transaction(async (c) => {
    const r = await c.query(
      "SELECT completed_at FROM installation WHERE id=1 FOR UPDATE",
    );
    if (r.rows[0]?.completed_at)
      throw new HttpError(409, "Setup is already complete");
    await c.query(
      "INSERT INTO staff_profile(user_id,role,mfa_required) VALUES($1,'owner',true)",
      [s.user.id],
    );
    await c.query(
      "UPDATE installation SET owner_id=$1,completed_at=now() WHERE id=1",
      [s.user.id],
    );
    await c.query('DELETE FROM session WHERE "userId"=$1 AND id<>$2', [
      s.user.id,
      s.session.id,
    ]);
    await audit(c, s.user.id, "installation.completed", s.user.id);
  });
  res.status(201).json({ ok: true });
});
api.get("/me", async (req, res) => {
  const s = await identity(req);
  const p = await pool.query(
    "SELECT role,active,mfa_required,EXISTS(SELECT 1 FROM session_assurance WHERE session_id=$2) AS assured FROM staff_profile WHERE user_id=$1",
    [s.user.id, s.session.id],
  );
  const mfaRequired = !!(
    !s.impersonation &&
    p.rows[0]?.active &&
    p.rows[0].mfa_required &&
    (!s.user.twoFactorEnabled || !p.rows[0].assured)
  );
  res.json({
    id: s.user.id,
    name: s.user.name,
    email: s.user.email,
    avatarUrl: (
      await pool.query(
        "SELECT updated_at FROM account_avatar WHERE user_id=$1",
        [s.user.id],
      )
    ).rowCount
      ? "/api/v1/profile/avatar"
      : null,
    twoFactorEnabled: s.user.twoFactorEnabled,
    mfaRequired,
    // Deprecated compatibility alias for existing native clients.
    ownerMfaRequired: mfaRequired,
    role: p.rows[0]?.active ? p.rows[0].role : null,
    features: { quickbooks: features.quickbooks },
    impersonation: s.impersonation ? {
      ownerId: s.impersonation.ownerId,
      ownerName: s.impersonation.ownerName,
      demo: s.impersonation.demo,
      expiresAt: s.impersonation.expiresAt,
    } : null,
    capabilities: !p.rows[0]?.active || mfaRequired || ["client", "crew"].includes(p.rows[0].role) ? [] : p.rows[0].role === "owner" ? [...CAPABILITIES] :
      (await pool.query("SELECT capabilities FROM business_account_access WHERE user_id=$1", [s.user.id])).rows[0]?.capabilities ?? [],
  });
});
api.get("/staff", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner"]);
  res.json(
    (
      await pool.query(
        'SELECT u.id,u.name,p.role,p.mfa_required AS "mfaRequired" FROM "user" u JOIN staff_profile p ON p.user_id=u.id WHERE p.active=true AND p.role<>\'client\' ORDER BY u.name',
      )
    ).rows,
  );
});
api.get("/account-mfa-policies", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner"]);
  res.json(
    (
      await pool.query(
        'SELECT u.id,u.name,u.email,p.role,p.mfa_required AS "mfaRequired" FROM "user" u JOIN staff_profile p ON p.user_id=u.id WHERE p.active=true ORDER BY u.name,u.email',
      )
    ).rows,
  );
});
api.post("/account-mfa-policies/:id", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner"]);
  const targetId = z.string().min(1).parse(req.params.id);
  const required = z.object({ required: z.boolean() }).parse(req.body).required;
  res.json(await updateMfaRequirement(a.id, targetId, required));
});
// Kept for existing dashboard clients while they migrate to the all-account,
// owner-only policy endpoint above.
api.post("/staff/:id/mfa-requirement", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner"]);
  const targetId = z.string().min(1).parse(req.params.id);
  const required = z.object({ required: z.boolean() }).parse(req.body).required;
  res.json(await updateMfaRequirement(a.id, targetId, required));
});
api.post("/invitations", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner"]);
  const b = z
    .object({
      email: z.string().email(),
      role: z.enum([
        "manager",
        "dispatch",
        "sales",
        "finance",
        "crew",
        "client",
      ]),
      clientId: id.optional(),
    })
    .parse(req.body);
  if (b.role === "client" && !b.clientId)
    throw new HttpError(400, "Client access is required");
  const token = randomUUID() + randomUUID();
  const inviteId = randomUUID();
  await transaction(async (c) => {
    await c.query(
      "INSERT INTO invitation(id,email,role,client_id,token_hash,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '7 days')",
      [
        inviteId,
        b.email.toLowerCase(),
        b.role,
        b.clientId || null,
        createHash("sha256").update(token).digest("hex"),
      ],
    );
    await c.query("INSERT INTO outbox(id,kind,payload) VALUES($1,$2,$3)", [
      randomUUID(),
      "email",
      {
        to: b.email,
        subject: "Your P1 dashboard invitation",
        text: `Open ${process.env.DASHBOARD_ORIGIN}/?invitation=${token} to create your account.`,
      },
    ]);
    await audit(c, a.id, "invitation.created", inviteId);
  });
  res.status(201).json({ id: inviteId });
});
api.post("/invitations/accept", async (req, res) => {
  const s = await identity(req);
  const b = z.object({ token: text }).parse(req.body);
  await transaction(async (c) => {
    const r = await c.query(
      "SELECT * FROM invitation WHERE token_hash=$1 AND email=$2 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now() FOR UPDATE",
      [
        createHash("sha256").update(b.token).digest("hex"),
        s.user.email.toLowerCase(),
      ],
    );
    const v = r.rows[0];
    if (!v) throw new HttpError(403, "Invalid invitation");
    const existing = await c.query(
      "SELECT role FROM staff_profile WHERE user_id=$1",
      [s.user.id],
    );
    if (existing.rowCount)
      throw new HttpError(409, "Account already activated; Owner must manage its access");
    await c.query(
      "INSERT INTO staff_profile(user_id,role) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING",
      [s.user.id, v.role],
    );
    await c.query(
      "INSERT INTO business_account_access(user_id,first_name,last_name,capabilities,form_notification_ids,reviewed_by,reviewed_at) VALUES($1,$2,$3,$4,$5,$6,now())",
      [s.user.id,v.first_name,v.last_name,v.capabilities,v.form_notification_ids,v.created_by],
    );
    if (v.first_name && v.last_name) await c.query('UPDATE "user" SET name=$2 WHERE id=$1', [s.user.id, `${v.first_name} ${v.last_name}`]);
    if (v.client_id)
      await c.query(
        "INSERT INTO client_access(user_id,client_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [s.user.id, v.client_id],
      );
    await c.query("UPDATE invitation SET accepted_at=now() WHERE id=$1", [
      v.id,
    ]);
    await audit(c, s.user.id, "invitation.accepted", v.id);
  });
  res.json({ ok: true });
});
api.get("/clients", async (req, res) => {
  const a = await actor(req);
  if (a.role !== "client") requireCapability(a, "customers.clients");
  res.json(
    (
      await pool.query(
        a.role === "client"
          ? "SELECT c.id,c.name FROM client c JOIN client_access ca ON ca.client_id=c.id WHERE ca.user_id=$1"
          : "SELECT c.*,p.name AS primary_contact_name,p.first_name AS primary_contact_first_name,p.last_name AS primary_contact_last_name,p.email AS primary_contact_email,p.phone AS primary_contact_phone,p.position AS primary_contact_position FROM client c LEFT JOIN LATERAL (SELECT name,first_name,last_name,email,phone,position FROM contact WHERE client_id=c.id AND kind='primary' AND archived=false ORDER BY name LIMIT 1) p ON true WHERE c.archived=false ORDER BY c.name",
        a.role === "client" ? [a.id] : [],
      )
    ).rows,
  );
});
api.post("/clients", async (req, res) => {
  const a = await actor(req);
  requireCapability(a, "customers.clients");
  const b = z
    .object({
      name: text,
      email: z.string().email().optional(),
      phone: z.string().max(50).optional(),
      address: text.optional(),
      primaryContact: primaryContact.optional(),
    })
    .parse(req.body);
  if (b.primaryContact) {
    if (!b.address || !b.phone?.trim())
      throw new HttpError(
        400,
        "Business address and phone are required for client onboarding",
      );
    res.status(201).json(
      await onboardClient(a.id, {
        name: b.name,
        address: b.address,
        phone: b.phone,
        primaryContact: b.primaryContact,
      }),
    );
    return;
  }
  const key = randomUUID();
  await transaction(async (c) => {
    await c.query(
      "INSERT INTO client(id,name,email,phone) VALUES($1,$2,$3,$4)",
      [key, b.name, b.email || null, b.phone || null],
    );
    await audit(c, a.id, "client.created", key);
  });
  res.status(201).json({ id: key });
});
api.post("/clients/:id", async (req, res) => {
  const a = await actor(req);
  requireCapability(a, "customers.clients");
  const b = z
    .object({
      name: text,
      address: text,
      phone: z.string().trim().min(1).max(50),
      email: z.string().trim().email().max(254).nullable().default(null),
      version: z.number().int().positive(),
      primaryContact,
    })
    .parse(req.body);
  res.json(await updateClient(a.id, id.parse(req.params.id), b));
});
api.get("/properties", async (req, res) => {
  const a = await actor(req);
  if (!["client", "crew"].includes(a.role)) requireCapability(a, "customers.properties");
  let sql =
    "SELECT p.id,p.client_id,p.name,p.address,p.address_line1,p.address_line2,p.city,p.state,p.postal_code,p.acreage,p.latitude,p.longitude,p.property_type_id,pt.name AS property_type_name,p.access_instructions,p.notes,p.archived,p.created_at FROM property p LEFT JOIN property_type pt ON pt.id=p.property_type_id WHERE p.archived=false AND p.lifecycle='operational'";
  const args: string[] = [];
  if (a.role === "client") {
    sql +=
      " AND EXISTS(SELECT 1 FROM client_access ca WHERE ca.client_id=p.client_id AND ca.user_id=$1)";
    args.push(a.id);
  }
  if (a.role === "crew") {
    sql +=
      " AND EXISTS(SELECT 1 FROM work_order w WHERE w.property_id=p.id AND w.assigned_to=$1 AND w.status NOT IN ('cancelled','skipped','reviewed'))";
    args.push(a.id);
  }
  const rows = (await pool.query(sql + " ORDER BY p.name", args)).rows;
  res.json(
    rows.map((p) => {
      if (a.role === "client" || a.role === "crew") return {
            id: p.id,
            ...(a.role === "client" ? { client_id: p.client_id } : {}),
            name: p.name,
            address: p.address,
            address_line1: p.address_line1,
            address_line2: p.address_line2,
            city: p.city,
            state: p.state,
            postal_code: p.postal_code,
            acreage: p.acreage,
            latitude: p.latitude,
            longitude: p.longitude,
            property_type_id: p.property_type_id,
            property_type_name: p.property_type_name,
          };
      return p;
    }),
  );
});
api.post("/properties", async (req, res) => {
  const a = await actor(req);
  requireCapability(a, "customers.properties");
  const b = z.intersection(
    z.object({
      clientId: id,
      name: text,
      acreage: z.number().nonnegative().optional(),
      accessInstructions: z.string().max(10000).default(""),
      propertyTypeId: id.nullable().optional(),
    }),
    propertyAddressInput,
  ).parse(req.body);
  const address = normalizePropertyAddress(b);
  const key = randomUUID();
  const coordinates = await geocodePropertyAddress(address.address);
  await transaction(async (c) => {
    if (b.propertyTypeId) {
      const propertyType = await c.query("SELECT id FROM property_type WHERE id=$1", [b.propertyTypeId]);
      if (!propertyType.rowCount) throw new HttpError(400, "Property type not found");
    }
    await c.query(
      "INSERT INTO property(id,client_id,name,address,address_line1,address_line2,city,state,postal_code,acreage,access_instructions,property_type_id,latitude,longitude,location_precision) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)",
      [
        key,
        b.clientId,
        b.name,
        address.address,
        address.addressLine1,
        address.addressLine2,
        address.city,
        address.state,
        address.postalCode,
        b.acreage ?? null,
        b.accessInstructions,
        b.propertyTypeId ?? null,
        coordinates?.latitude ?? null,
        coordinates?.longitude ?? null,
        coordinates ? "approximate" : null,
      ],
    );
    await audit(c, a.id, "property.created", key);
  });
  res.status(201).json({ id: key });
});
api.post("/properties/:id", async (req, res) => {
  const a = await actor(req);
  requireCapability(a, "customers.properties");
  const propertyId = id.parse(req.params.id);
  const b = z.intersection(
    z.object({
      name: text,
      acreage: z.number().nonnegative().nullable(),
      accessInstructions: z.string().max(10000).default(""),
      // Existing generated clients do not send this newer optional field.
      // Omission must retain the saved classification rather than clearing it.
      propertyTypeId: id.nullable().optional(),
      version: z.number().int().positive(),
    }),
    propertyAddressInput,
  ).parse(req.body);
  const address = normalizePropertyAddress(b);
  // A property pin represents its saved street address. Resolve a changed
  // address before opening the write transaction so a slow third-party lookup
  // never holds a database connection or row lock. The optimistic version is
  // still checked again by the update below, so a concurrent edit cannot
  // overwrite newer data with this lookup's result.
  const current = await pool.query(
    "SELECT address FROM property WHERE id=$1 AND archived=false AND lifecycle='operational' AND version=$2",
    [propertyId, b.version],
  );
  if (!current.rowCount)
    throw new HttpError(
      409,
      "Property changed or is unavailable; refresh before saving",
    );
  const addressChanged = current.rows[0].address !== address.address;
  const coordinates = addressChanged
    ? await geocodePropertyAddress(address.address)
    : null;
  const result = await transaction(async (c) => {
    if (b.propertyTypeId) {
      const propertyType = await c.query("SELECT id FROM property_type WHERE id=$1", [b.propertyTypeId]);
      if (!propertyType.rowCount) throw new HttpError(400, "Property type not found");
    }
    const changed = await c.query(
      "UPDATE property SET name=$2,address=$3,address_line1=$4,address_line2=$5,city=$6,state=$7,postal_code=$8,acreage=$9,access_instructions=$10,property_type_id=CASE WHEN $11 THEN $12 ELSE property_type_id END,latitude=CASE WHEN $14 THEN $15 ELSE latitude END,longitude=CASE WHEN $14 THEN $16 ELSE longitude END,location_precision=CASE WHEN $14 THEN $17 ELSE location_precision END,version=version+1 WHERE id=$1 AND archived=false AND lifecycle='operational' AND version=$13 RETURNING id,client_id,name,address,address_line1,address_line2,city,state,postal_code,acreage,access_instructions,property_type_id,version",
      [
        propertyId,
        b.name,
        address.address,
        address.addressLine1,
        address.addressLine2,
        address.city,
        address.state,
        address.postalCode,
        b.acreage,
        b.accessInstructions,
        b.propertyTypeId !== undefined,
        b.propertyTypeId ?? null,
        b.version,
        addressChanged,
        coordinates?.latitude ?? null,
        coordinates?.longitude ?? null,
        coordinates ? "approximate" : null,
      ],
    );
    if (!changed.rowCount)
      throw new HttpError(
        409,
        "Property changed or is unavailable; refresh before saving",
      );
    await audit(c, a.id, "property.updated", propertyId);
    return changed.rows[0];
  });
  res.json(result);
});
api.post("/properties/:id/property-type", async (req, res) => {
  const a = await actor(req);
  requireCapability(a, "customers.properties");
  const propertyId = id.parse(req.params.id);
  const b = z
    .object({
      propertyTypeId: id.nullable(),
      expectedVersion: z.number().int().positive(),
    })
    .parse(req.body);
  const result = await transaction(async (c) => {
    let propertyTypeName: string | null = null;
    if (b.propertyTypeId) {
      const propertyType = await c.query(
        "SELECT name FROM property_type WHERE id=$1",
        [b.propertyTypeId],
      );
      if (!propertyType.rowCount) throw new HttpError(400, "Property type not found");
      propertyTypeName = propertyType.rows[0].name;
    }
    const changed = await c.query(
      "UPDATE property SET property_type_id=$2,version=version+1 WHERE id=$1 AND archived=false AND lifecycle='operational' AND version=$3 RETURNING id,property_type_id,version",
      [propertyId, b.propertyTypeId, b.expectedVersion],
    );
    if (!changed.rowCount)
      throw new HttpError(
        409,
        "Property changed or is unavailable; refresh before saving",
      );
    await audit(c, a.id, "property.type.updated", propertyId);
    return { ...changed.rows[0], property_type_name: propertyTypeName };
  });
  res.json(result);
});
api.get("/work-orders", async (req, res) => {
  const a = await actor(req);
  requireWorkRead(a);
  let sql =
    "SELECT w.*,p.name AS property_name,p.address,p.access_instructions FROM work_order w JOIN property p ON p.id=w.property_id AND p.lifecycle='operational'";
  const args: string[] = [];
  if (assignedWorkOnly(a)) {
    sql +=
      " WHERE w.assigned_to=$1 AND w.status NOT IN ('cancelled','skipped','reviewed')";
    args.push(a.id);
  }
  if (a.role === "client") {
    sql +=
      " WHERE w.status<>'draft' AND EXISTS(SELECT 1 FROM client_access ca WHERE ca.client_id=p.client_id AND ca.user_id=$1)";
    args.push(a.id);
  }
  const rows = (
    await pool.query(
      sql + " ORDER BY w.scheduled_at NULLS LAST,w.created_at DESC LIMIT 500",
      args,
    )
  ).rows;
  res.json(
    rows.map((w) =>
      a.role === "client"
        ? {
            id: w.id,
            property_id: w.property_id,
            property_name: w.property_name,
            title: w.title,
            scheduled_at: w.scheduled_at,
            status: w.status === "completed" ? "in_review" : w.status,
          }
        : w,
    ),
  );
});
api.post("/work-orders", async (req, res) => {
  const a = await actor(req);
  requireCapability(a, "operations.schedule");
  const b = z
    .object({
      propertyId: id,
      title: text,
      scope: z.string().max(10000).default(""),
      assignedTo: z.string().optional(),
      scheduledAt: z.string().datetime().optional(),
      checklist: z
        .array(z.object({ label: text, done: z.boolean() }))
        .max(100)
        .default([]),
      prerequisites: z
        .array(z.object({ label: text, done: z.boolean() }))
        .max(50)
        .default([]),
    })
    .parse(req.body);
  await propertyAccess(a, b.propertyId);
  const key = randomUUID();
  await transaction(async (c) => {
    await requireOperationalProperty(c, b.propertyId);
    await c.query(
      "INSERT INTO work_order(id,property_id,title,scope,assigned_to,scheduled_at,checklist,prerequisites) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        key,
        b.propertyId,
        b.title,
        b.scope,
        b.assignedTo || null,
        b.scheduledAt || null,
        JSON.stringify(b.checklist),
        JSON.stringify(b.prerequisites),
      ],
    );
    await audit(c, a.id, "work.created", key);
  });
  res.status(201).json({ id: key });
});
api.post("/work-orders/:id/status", async (req, res) => {
  const a = await actor(req);
  requireCapability(a, "operations.schedule");
  const key = id.parse(req.params.id);
  const b = z
    .object({
      status: text,
      version: z.number().int().positive(),
      overrideReason: z.string().max(1000).optional(),
    })
    .parse(req.body);
  if (b.overrideReason) requireCapability(a, "operations.schedule");
  await transaction(async (c) => {
    await requireOperationalChild(c, "work_order", key);
    const w = (
      await c.query("SELECT * FROM work_order WHERE id=$1 FOR UPDATE", [key])
    ).rows[0];
    if (!w) throw new HttpError(404, "Work order not found");
    if (w.version !== b.version)
      throw new HttpError(409, "Work order changed; refresh and retry");
    transition(
      w.status,
      b.status,
      a,
      w.prerequisites,
      b.overrideReason || w.override_reason,
    );
    await c.query(
      "UPDATE work_order SET status=$2,version=version+1,override_reason=COALESCE($3,override_reason) WHERE id=$1",
      [key, b.status, b.overrideReason || null],
    );
    await audit(c, a.id, "work." + b.status, key);
  });
  res.json({ ok: true });
});
api.post("/work-orders/:id/publish", async (req, res) => {
  const a = await actor(req);
  requireCapability(a, "operations.schedule");
  const key = id.parse(req.params.id);
  await transaction(async (c) => {
    await requireOperationalChild(c, "work_order", key);
    const w = (
      await c.query("SELECT status FROM work_order WHERE id=$1 FOR UPDATE", [
        key,
      ])
    ).rows[0];
    if (w?.status !== "reviewed")
      throw new HttpError(409, "Review this work before publishing");
    await c.query("UPDATE work_order SET published=true WHERE id=$1", [key]);
    await c.query(
      "UPDATE field_event SET published=true WHERE work_order_id=$1 AND conflict=false AND kind IN ('note','checklist','complete')",
      [key],
    );
    await audit(c, a.id, "work.published", key);
  });
  res.json({ ok: true });
});
api.post("/field/sync", async (req, res) => {
  const a = await actor(req);
  requireFieldWork(a);
  const events = z.array(fieldEventSchema).max(100).parse(req.body.events);
  const results = [];
  for (const e of events) {
    const result = await transaction(async (c) => {
      await requireOperationalChild(c, "work_order", e.workOrderId);
      const w = (
        await c.query("SELECT * FROM work_order WHERE id=$1 FOR UPDATE", [
          e.workOrderId,
        ])
      ).rows[0];
      if (!w) throw new HttpError(404, "Work order not found");
      const old = (
        await c.query(
          // Compare database-normalized values: JSON object key order and equivalent
          // timestamp spellings must not turn an exact retry into a conflict.
          `SELECT user_id,conflict,work_order_id,
            EXISTS(SELECT 1 FROM field_event_resolution r WHERE r.event_id=field_event.id) AS resolved,
            (kind=$2 AND payload=$3::jsonb AND base_version=$4 AND captured_at=$5::timestamptz) AS matches
           FROM field_event WHERE id=$1`,
          [e.id, e.kind, JSON.stringify(e.payload), e.baseVersion, e.capturedAt],
        )
      ).rows[0];
      // Exact, already-reviewed receipts belong to their original author even
      // after reassignment. This reveals no new work data and never applies an event.
      if (old?.resolved && old.user_id === a.id && old.work_order_id === w.id && old.matches)
        return { id: e.id, status: "resolved" };
      if (assignedWorkOnly(a) && w.assigned_to !== a.id)
        throw new HttpError(403, "Assignment changed; retain this submission for office review");
      if (old) {
        if (old.user_id !== a.id || old.work_order_id !== w.id || !old.matches)
          throw new HttpError(409, "Operation ID conflict");
        return { id: e.id, status: old.conflict ? "conflict" : "accepted" };
      }
      const conflict =
        w.version !== e.baseVersion ||
        ["cancelled", "skipped", "reviewed"].includes(w.status) ||
        (e.kind === "time" &&
          e.payload.action === "start" &&
          (!["scheduled", "in_progress"].includes(w.status) ||
            !canDispatch(w.prerequisites, w.override_reason)));
      await c.query(
        "INSERT INTO field_event(id,work_order_id,user_id,kind,payload,base_version,conflict,captured_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [
          e.id,
          w.id,
          a.id,
          e.kind,
          e.payload,
          e.baseVersion,
          conflict,
          e.capturedAt,
        ],
      );
      if (e.kind === "complete" && !conflict && w.status !== "in_progress")
        throw new HttpError(
          409,
          "Start the work order before submitting completion",
        );
      if (e.kind === "checklist" && !conflict) {
        if (
          !e.payload.items ||
          e.payload.items.length !== w.checklist.length ||
          !e.payload.items.every(
            (item, index) => item.label === w.checklist[index].label,
          )
        )
          throw new HttpError(409, "Checklist does not match this assignment");
      }
      if (e.kind === "complete" && !conflict && w.checklist.length) {
        const latest = (
          await c.query(
            "SELECT payload FROM field_event WHERE work_order_id=$1 AND kind='checklist' AND conflict=false ORDER BY received_at DESC LIMIT 1",
            [w.id],
          )
        ).rows[0];
        if (
          !latest?.payload.items?.every((item: { done: boolean }) => item.done)
        )
          throw new HttpError(
            409,
            "Complete the job checklist before submitting completion",
          );
      }
      if (
        e.kind === "time" &&
        e.payload.action === "start" &&
        !conflict &&
        w.status === "scheduled"
      ) {
        // Field start preserves the downloaded assignment version so subsequent offline
        // notes/checklists/completion can synchronize against that same assignment.
        await c.query(
          "UPDATE work_order SET status='in_progress' WHERE id=$1",
          [w.id],
        );
      }
      if (e.kind === "complete" && !conflict)
        await c.query(
          "UPDATE work_order SET status='completed',version=version+1 WHERE id=$1",
          [w.id],
        );
      await audit(
        c,
        a.id,
        conflict ? "field.conflict" : "field.received",
        e.id,
      );
      return { id: e.id, status: conflict ? "conflict" : "accepted" };
    });
    results.push(result);
  }
  res.json({ results });
});
api.get("/properties/:id/timeline", async (req, res) => {
  const a = await actor(req);
  if (!["client", "crew"].includes(a.role)) requireCapability(a, "customers.properties");
  const key = id.parse(req.params.id);
  await propertyAccess(a, key);
  const fieldRows = (!["client", "crew"].includes(a.role) && !hasCapability(a, "operations.schedule")) ? { rows: [] } : await pool.query(
    `SELECT f.id,f.kind,f.payload,f.conflict,EXISTS(SELECT 1 FROM field_event_resolution r WHERE r.event_id=f.id) AS resolved,f.published,f.captured_at,w.title FROM field_event f JOIN work_order w ON w.id=f.work_order_id WHERE w.property_id=$1 ${a.role === "client" ? "AND f.published=true AND w.published=true" : a.role === "crew" ? "AND w.assigned_to=$2" : ""} ORDER BY f.captured_at DESC LIMIT 200`,
    a.role === "crew" ? [key, a.id] : [key],
  );
  const inspectionRows =
    (a.role === "crew" || (a.role !== "client" && !hasCapability(a, "operations.inspections")))
      ? []
      : (
          await pool.query(
            `SELECT i.id,'inspection' AS kind,jsonb_build_object('findings',i.findings) AS payload,false AS conflict,i.published,i.created_at AS captured_at,i.title FROM inspection i WHERE i.property_id=$1 ${a.role === "client" ? "AND i.published=true" : ""} ORDER BY i.created_at DESC LIMIT 200`,
            [key],
          )
        ).rows;
  res.json(
    [...fieldRows.rows, ...inspectionRows]
      .sort(
        (left, right) =>
          new Date(right.captured_at).getTime() -
          new Date(left.captured_at).getTime(),
      )
      .slice(0, 200),
  );
});
api.get("/leads", async (req, res) => {
  const a = await actor(req);
  requireCapability(a, "revenue.sales");
  res.json(
    (
      await pool.query(
        "SELECT * FROM lead WHERE ($1::boolean OR inquiry_type IS DISTINCT FROM 'commercial_site_assessment') ORDER BY created_at DESC LIMIT 200",
        [true],
      )
    ).rows,
  );
});
api.post("/leads", async (req, res) => {
  const a = await actor(req);
  requireCapability(a, "revenue.sales");
  const b = z
    .object({
      name: text,
      email: z.string().email(),
      phone: z.string().optional(),
      location: text,
      description: text,
      source: z.string().max(500).optional(),
    })
    .parse(req.body);
  const key = randomUUID();
  await pool.query(
    "INSERT INTO lead(id,name,email,phone,location,description,source) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [
      key,
      b.name,
      b.email,
      b.phone || null,
      b.location,
      b.description,
      b.source || "office",
    ],
  );
  res.status(201).json({ id: key });
});
api.get("/estimates", async (req, res) => {
  const a = await actor(req);
  if (a.role !== "client") requireAnyCapability(a, ["revenue.sales", "revenue.agreements", "revenue.billing"]);
  res.json(
    (
      await pool.query(
        `SELECT e.*,p.name AS property_name FROM estimate e JOIN property p ON p.id=e.property_id AND p.lifecycle='operational' ${a.role === "client" ? "WHERE e.status<>'draft' AND EXISTS(SELECT 1 FROM client_access ca WHERE ca.client_id=p.client_id AND ca.user_id=$1)" : ""} ORDER BY e.created_at DESC`,
        a.role === "client" ? [a.id] : [],
      )
    ).rows,
  );
});
api.post("/estimates", async (req, res) => {
  const a = await actor(req);
  requireCapability(a, "revenue.sales");
  const b = z
    .object({
      propertyId: id,
      title: text,
      scope: text,
      amountCents: z.number().int().positive().max(1e10),
    })
    .parse(req.body);
  const key = randomUUID();
  await operationalQuery(
    b.propertyId,
    "INSERT INTO estimate(id,property_id,title,scope,amount_cents) VALUES($1,$2,$3,$4,$5)",
    [key, b.propertyId, b.title, b.scope, b.amountCents],
  );
  res.status(201).json({ id: key });
});
api.post("/estimates/:id/decision", async (req, res) => {
  const a = await actor(req);
  const key = id.parse(req.params.id);
  const b = z
    .object({
      status: z.enum(["sent", "approved", "declined"]),
      revision: z.number().int().positive(),
    })
    .parse(req.body);
  await transaction(async (c) => {
    await requireOperationalChild(c, "estimate", key);
    const e = (
      await c.query("SELECT * FROM estimate WHERE id=$1 FOR UPDATE", [key])
    ).rows[0];
    if (!e) throw new HttpError(404, "Estimate not found");
    await propertyAccess(a, e.property_id);
    if (b.status === "sent") requireCapability(a, "revenue.sales");
    else requireRole(a.role, ["client"]);
    if (
      !e.is_current ||
      e.revision !== b.revision ||
      e.status !== (b.status === "sent" ? "draft" : "sent")
    )
      throw new HttpError(409, "Estimate changed or decision already recorded");
    await c.query(
      "UPDATE estimate SET status=$2,approved_by=$3,approved_at=$4 WHERE id=$1",
      [
        key,
        b.status,
        b.status === "approved" ? a.id : null,
        b.status === "approved" ? new Date() : null,
      ],
    );
    await audit(c, a.id, "estimate." + b.status, key);
  });
  res.json({ ok: true });
});
api.get("/billing", async (req, res) => {
  const a = await actor(req);
  if (a.role === "client" && !features.quickbooks)
    throw new HttpError(404, "feature_disabled");
  if (a.role !== "client") requireCapability(a, "revenue.billing");
  res.json(
    (
      await pool.query(
        `SELECT b.*,p.name AS property_name,
          CASE WHEN x.id IS NULL THEN NULL ELSE json_build_object(
            'id',x.id,'reference',x.reference,'invoicedOn',x.invoiced_on,
            'recordedBy',x.recorded_by,'recordedAt',x.recorded_at
          ) END AS "externalInvoice"
         FROM billing_draft b
         JOIN property p ON p.id=b.property_id AND p.lifecycle='operational'
         LEFT JOIN LATERAL (
           SELECT id,reference,invoiced_on,recorded_by,recorded_at
           FROM billing_draft_external_invoice
           WHERE billing_draft_id=b.id AND voided_at IS NULL
         ) x ON true
         ${a.role === "client" ? "WHERE b.status='posted' AND b.ownership_verified=true AND EXISTS(SELECT 1 FROM client_access ca WHERE ca.client_id=p.client_id AND ca.user_id=$1)" : ""} ORDER BY b.created_at DESC`,
        a.role === "client" ? [a.id] : [],
      )
    ).rows,
  );
});
api.post("/billing", async (req, res) => {
  const a = await actor(req);
  requireCapability(a, "revenue.billing");
  const b = z
    .object({
      operationId: id,
      propertyId: id,
      estimateId: id,
      estimateAllocationId: id.nullable().optional(),
      title: text,
      amountCents: z.number().int().positive().max(1e10),
      kind: z.enum(["service", "deposit", "progress", "final"]),
    })
    .parse(req.body);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(b))
    .digest("hex");
  const key = await transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      "billing:" + b.operationId,
    ]);
    const previous = (
      await c.query("SELECT * FROM billing_operation WHERE id=$1", [
        b.operationId,
      ])
    ).rows[0];
    if (previous) {
      if (previous.user_id !== a.id || previous.fingerprint !== fingerprint)
        throw new HttpError(409, "Billing operation ID conflict");
      return previous.draft_id;
    }
    await requireOperationalProperty(c, b.propertyId);
    const key = randomUUID();
    const e = (
      await c.query(
        "SELECT * FROM estimate WHERE id=$1 AND property_id=$2 AND status='approved' FOR UPDATE",
        [b.estimateId, b.propertyId],
      )
    ).rows[0];
    if (!e) throw new HttpError(409, "An approved estimate is required");
    const allocation = await selectedEstimateAllocation(c, e.id, b.estimateAllocationId);
    const capacity = await allocatedBillingCapacity(c, e, allocation);
    if (b.amountCents > capacity.remaining) throw new HttpError(409, "Billing exceeds the remaining approved authorization");
    await c.query(
      "INSERT INTO billing_draft(id,property_id,estimate_id,title,amount_cents,kind,estimate_allocation_id) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [key, b.propertyId, b.estimateId, b.title, b.amountCents, b.kind, allocation?.id || null],
    );
    await c.query(
      "INSERT INTO billing_operation(id,user_id,fingerprint,draft_id) VALUES($1,$2,$3,$4)",
      [b.operationId, a.id, fingerprint, key],
    );
    await audit(c, a.id, "billing.created", key);
    return key;
  });
  res.status(201).json({ id: key });
});
api.get("/requests", async (req, res) => {
  const a = await actor(req);
  if (a.role !== "client") requireCapability(a, "customers.requests");
  const fields =
    a.role === "client"
      ? "r.id,r.property_id,r.description,CASE r.status WHEN 'new' THEN 'received' WHEN 'triaged' THEN 'under_review' WHEN 'scheduled' THEN 'service_planning' WHEN 'converted' THEN 'work_planning' WHEN 'closed' THEN 'closed' WHEN 'cancelled' THEN 'cancelled' ELSE 'under_review' END AS status,r.created_at,r.updated_at,p.name AS property_name"
      : "r.*,p.name AS property_name";
  res.json(
    (
      await pool.query(
        `SELECT ${fields} FROM service_request r JOIN property p ON p.id=r.property_id AND p.lifecycle='operational' ${a.role === "client" ? "WHERE EXISTS(SELECT 1 FROM client_access ca WHERE ca.client_id=p.client_id AND ca.user_id=$1)" : ""} ORDER BY r.created_at DESC`,
        a.role === "client" ? [a.id] : [],
      )
    ).rows,
  );
});
api.post("/requests", async (req, res) => {
  const a = await actor(req);
  if (a.role !== "client") requireCapability(a, "customers.requests");
  const b = z.object({ propertyId: id, description: text, requesterContactId: id.optional(), source: z.enum(["portal", "manual"]).optional() }).parse(req.body);
  const source = a.role === "client" ? "portal" : (b.source || "manual");
  await propertyAccess(a, b.propertyId);
  const key = randomUUID();
  await transaction(async (c) => {
    await requireOperationalProperty(c, b.propertyId);
    if (b.requesterContactId) {
      const contact = await c.query("SELECT 1 FROM contact c JOIN property p ON p.client_id=c.client_id WHERE c.id=$1 AND p.id=$2 AND c.archived=false", [b.requesterContactId, b.propertyId]);
      if (!contact.rowCount) throw new HttpError(400, "Choose an active contact for this property");
    }
    await c.query(
      "INSERT INTO service_request(id,property_id,user_id,description,source,requester_contact_id) VALUES($1,$2,$3,$4,$5,$6)",
      [key, b.propertyId, a.id, b.description, source, b.requesterContactId || null],
    );
    await c.query(
      "INSERT INTO service_request_event(id,service_request_id,actor_id,event_type,prior_version,resulting_version,to_status,details) VALUES($1,$2,$3,'created',NULL,1,'new',$4)",
      [randomUUID(), key, a.id, JSON.stringify({ source: "requests" })],
    );
    await audit(c, a.id, "service_request.created", key);
    await notifyCapability(c, "customers.requests", "New service request", `A new ${source} request was received for service review.`, `service-request:${key}`);
  });
  res.status(201).json({ id: key });
});
api.get("/assessment-slots", async (req, res) => {
  const a = await actor(req);
  if (a.role !== "client") requireCapability(a, "operations.schedule");
  res.json(await availableSlots());
});
api.post("/assessment-slots", async (req, res) => {
  const a = await actor(req);
  requireCapability(a, "operations.schedule");
  const b = z
    .object({ startsAt: z.string().datetime(), endsAt: z.string().datetime() })
    .parse(req.body);
  res
    .status(201)
    .json(await createManualAssessment(a.id, b.startsAt, b.endsAt));
});
api.post("/assessment-slots/:id/book", async (req, res) => {
  const a = await actor(req);
  if (a.role !== "client") requireCapability(a, "operations.schedule");
  const key = id.parse(req.params.id);
  const b = z.object({ propertyId: id }).parse(req.body);
  await propertyAccess(a, b.propertyId);
  await bookAssessment(key, b.propertyId, a.id);
  res.json({ ok: true });
});
api.get("/integrations", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner"]);
  const r = await pool.query(
    "SELECT id,kind,status,attempts,CASE WHEN status='failed' THEN 'Needs attention in settings' ELSE NULL END AS last_error,created_at FROM outbox WHERE status<>'sent' AND ($1::boolean OR kind NOT LIKE 'quickbooks.%') ORDER BY created_at DESC LIMIT 50",
    [features.quickbooks],
  );
  res.json({
    features: { quickbooks: features.quickbooks },
    ...(features.quickbooks ? { quickbooks: {
      configured: Boolean(
        (
          await pool.query(
            "SELECT 1 FROM integration_connection WHERE provider='quickbooks'",
          )
        ).rowCount,
      ),
      status: "Connection requires sandbox verification",
    } } : {}),
    email: { configured: Boolean(process.env.MAILGUN_API_KEY) },
    sms: {
      configured: Boolean(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_FROM,
      ),
    },
    jobs: r.rows,
    agreementPreparation: await agreementPreparationHealth(),
  });
});
