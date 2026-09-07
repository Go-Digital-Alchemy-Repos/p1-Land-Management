import { requireOperationalProperty, requireOperationalChild, operationalQuery } from "./operational-property";
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
  type Role,
} from "./policy";
import {
  availableSlots,
  bookAssessment,
  createManualAssessment,
} from "./assessments";
import { onboardClient, updateClient } from "./client-onboarding";
import { agreementPreparationHealth } from "./agreement-preparation";
export const api = Router();
const office: Role[] = ["owner", "manager", "dispatch", "sales", "finance"];
const operations: Role[] = ["owner", "manager", "dispatch"];
const managers: Role[] = ["owner", "manager"];
const id = z.string().uuid();
const text = z.string().trim().min(1).max(10000);
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
      throw new HttpError(409, "Multi-factor authentication is required for owners");
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
    p.rows[0]?.active &&
    p.rows[0].mfa_required &&
    (!s.user.twoFactorEnabled || !p.rows[0].assured)
  );
  res.json({
    id: s.user.id,
    name: s.user.name,
    email: s.user.email,
    twoFactorEnabled: s.user.twoFactorEnabled,
    mfaRequired,
    // Deprecated compatibility alias for existing native clients.
    ownerMfaRequired: mfaRequired,
    role: p.rows[0]?.active ? p.rows[0].role : null,
  });
});
api.get("/staff", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, office);
  res.json(
    (
      await pool.query(
        "SELECT u.id,u.name,p.role,p.mfa_required AS \"mfaRequired\" FROM \"user\" u JOIN staff_profile p ON p.user_id=u.id WHERE p.active=true AND p.role<>'client' ORDER BY u.name",
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
        "SELECT u.id,u.name,u.email,p.role,p.mfa_required AS \"mfaRequired\" FROM \"user\" u JOIN staff_profile p ON p.user_id=u.id WHERE p.active=true ORDER BY u.name,u.email",
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
  requireRole(a.role, managers);
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
      "SELECT * FROM invitation WHERE token_hash=$1 AND email=$2 AND accepted_at IS NULL AND expires_at>now() FOR UPDATE",
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
    if (existing.rowCount && existing.rows[0].role !== v.role)
      throw new HttpError(409, "Account already has a different role");
    await c.query(
      "INSERT INTO staff_profile(user_id,role) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING",
      [s.user.id, v.role],
    );
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
  requireRole(a.role, [...office, "client"]);
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
  requireRole(a.role, office);
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
  requireRole(a.role, office);
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
  let sql = "SELECT p.id,p.client_id,p.name,p.address,p.acreage,p.access_instructions,p.notes,p.archived,p.created_at FROM property p WHERE p.archived=false AND p.lifecycle='operational'";
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
    rows.map((p) =>
      a.role === "client"
        ? {
            id: p.id,
            client_id: p.client_id,
            name: p.name,
            address: p.address,
            acreage: p.acreage,
          }
        : p,
    ),
  );
});
api.post("/properties", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, office);
  const b = z
    .object({
      clientId: id,
      name: text,
      address: text,
      acreage: z.number().nonnegative().optional(),
      accessInstructions: z.string().max(10000).default(""),
    })
    .parse(req.body);
  const key = randomUUID();
  await transaction(async (c) => {
    await c.query(
      "INSERT INTO property(id,client_id,name,address,acreage,access_instructions) VALUES($1,$2,$3,$4,$5,$6)",
      [
        key,
        b.clientId,
        b.name,
        b.address,
        b.acreage ?? null,
        b.accessInstructions,
      ],
    );
    await audit(c, a.id, "property.created", key);
  });
  res.status(201).json({ id: key });
});
api.get("/work-orders", async (req, res) => {
  const a = await actor(req);
  let sql =
    "SELECT w.*,p.name AS property_name,p.address,p.access_instructions FROM work_order w JOIN property p ON p.id=w.property_id AND p.lifecycle='operational'";
  const args: string[] = [];
  if (a.role === "crew") {
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
  requireRole(a.role, operations);
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
    await requireOperationalProperty(c,b.propertyId);
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
  requireRole(a.role, operations);
  const key = id.parse(req.params.id);
  const b = z
    .object({
      status: text,
      version: z.number().int().positive(),
      overrideReason: z.string().max(1000).optional(),
    })
    .parse(req.body);
  if (b.overrideReason) requireRole(a.role, managers);
  await transaction(async (c) => {
    await requireOperationalChild(c,"work_order",key);
    const w = (
      await c.query("SELECT * FROM work_order WHERE id=$1 FOR UPDATE", [key])
    ).rows[0];
    if (!w) throw new HttpError(404, "Work order not found");
    if (w.version !== b.version)
      throw new HttpError(409, "Work order changed; refresh and retry");
    transition(
      w.status,
      b.status,
      a.role,
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
  requireRole(a.role, managers);
  const key = id.parse(req.params.id);
  await transaction(async (c) => {
    await requireOperationalChild(c,"work_order",key);
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
  requireRole(a.role, [...operations, "crew"]);
  const events = z.array(fieldEventSchema).max(100).parse(req.body.events);
  const results = [];
  for (const e of events) {
    const result = await transaction(async (c) => {
      await requireOperationalChild(c,"work_order",e.workOrderId);
      const w = (
        await c.query("SELECT * FROM work_order WHERE id=$1 FOR UPDATE", [
          e.workOrderId,
        ])
      ).rows[0];
      if (!w) throw new HttpError(404, "Work order not found");
      if (a.role === "crew" && w.assigned_to !== a.id)
        throw new HttpError(
          403,
          "Assignment changed; retain this submission for office review",
        );
      const old = (
        await c.query(
          "SELECT user_id,conflict,work_order_id FROM field_event WHERE id=$1",
          [e.id],
        )
      ).rows[0];
      if (old) {
        if (old.user_id !== a.id || old.work_order_id !== w.id)
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
  const key = id.parse(req.params.id);
  await propertyAccess(a, key);
  const fieldRows = await pool.query(
    `SELECT f.id,f.kind,f.payload,f.conflict,f.published,f.captured_at,w.title FROM field_event f JOIN work_order w ON w.id=f.work_order_id WHERE w.property_id=$1 ${a.role === "client" ? "AND f.published=true AND w.published=true" : a.role === "crew" ? "AND w.assigned_to=$2" : ""} ORDER BY f.captured_at DESC LIMIT 200`,
    a.role === "crew" ? [key, a.id] : [key],
  );
  const inspectionRows =
    a.role === "crew"
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
  requireRole(a.role, office);
  res.json(
    (await pool.query("SELECT * FROM lead WHERE ($1::boolean OR inquiry_type IS DISTINCT FROM 'commercial_site_assessment') ORDER BY created_at DESC LIMIT 200", [["owner", "manager", "sales"].includes(a.role)]))
      .rows,
  );
});
api.post("/leads", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, office);
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
  requireRole(a.role, [...office, "client"]);
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
  requireRole(a.role, ["owner", "manager", "sales"]);
  const b = z
    .object({
      propertyId: id,
      title: text,
      scope: text,
      amountCents: z.number().int().positive().max(1e10),
    })
    .parse(req.body);
  const key = randomUUID();
  await operationalQuery(b.propertyId,
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
    await requireOperationalChild(c,"estimate",key);
    const e = (
      await c.query("SELECT * FROM estimate WHERE id=$1 FOR UPDATE", [key])
    ).rows[0];
    if (!e) throw new HttpError(404, "Estimate not found");
    await propertyAccess(a, e.property_id);
    if (b.status === "sent") requireRole(a.role, ["owner", "manager", "sales"]);
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
  requireRole(a.role, ["owner", "manager", "finance", "client"]);
  res.json(
    (
      await pool.query(
        `SELECT b.*,p.name AS property_name FROM billing_draft b JOIN property p ON p.id=b.property_id AND p.lifecycle='operational' ${a.role === "client" ? "WHERE b.status='posted' AND b.ownership_verified=true AND EXISTS(SELECT 1 FROM client_access ca WHERE ca.client_id=p.client_id AND ca.user_id=$1)" : ""} ORDER BY b.created_at DESC`,
        a.role === "client" ? [a.id] : [],
      )
    ).rows,
  );
});
api.post("/billing", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "finance"]);
  const b = z
    .object({
      operationId: id,
      propertyId: id,
      estimateId: id,
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
    await requireOperationalProperty(c,b.propertyId);
    const key = randomUUID();
    const e = (
      await c.query(
        "SELECT * FROM estimate WHERE id=$1 AND property_id=$2 AND status='approved' FOR UPDATE",
        [b.estimateId, b.propertyId],
      )
    ).rows[0];
    if (!e) throw new HttpError(409, "An approved estimate is required");
    const sum = (
      await c.query(
        "SELECT COALESCE(sum(amount_cents),0) AS total FROM billing_draft WHERE estimate_id=$1",
        [e.id],
      )
    ).rows[0].total;
    if (Number(sum) + b.amountCents > Number(e.amount_cents))
      throw new HttpError(409, "Billing exceeds the approved estimate");
    await c.query(
      "INSERT INTO billing_draft(id,property_id,estimate_id,title,amount_cents,kind) VALUES($1,$2,$3,$4,$5,$6)",
      [key, b.propertyId, b.estimateId, b.title, b.amountCents, b.kind],
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
  requireRole(a.role, [...office, "client"]);
  res.json(
    (
      await pool.query(
        `SELECT r.*,p.name AS property_name FROM service_request r JOIN property p ON p.id=r.property_id AND p.lifecycle='operational' ${a.role === "client" ? "WHERE EXISTS(SELECT 1 FROM client_access ca WHERE ca.client_id=p.client_id AND ca.user_id=$1)" : ""} ORDER BY r.created_at DESC`,
        a.role === "client" ? [a.id] : [],
      )
    ).rows,
  );
});
api.post("/requests", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, [...office, "client"]);
  const b = z.object({ propertyId: id, description: text }).parse(req.body);
  await propertyAccess(a, b.propertyId);
  const key = randomUUID();
  await operationalQuery(b.propertyId,
    "INSERT INTO service_request(id,property_id,user_id,description) VALUES($1,$2,$3,$4)",
    [key, b.propertyId, a.id, b.description],
  );
  res.status(201).json({ id: key });
});
api.get("/assessment-slots", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, [...office, "client"]);
  res.json(await availableSlots());
});
api.post("/assessment-slots", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, operations);
  const b = z
    .object({ startsAt: z.string().datetime(), endsAt: z.string().datetime() })
    .parse(req.body);
  res
    .status(201)
    .json(await createManualAssessment(a.id, b.startsAt, b.endsAt));
});
api.post("/assessment-slots/:id/book", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, [...operations, "client"]);
  const key = id.parse(req.params.id);
  const b = z.object({ propertyId: id }).parse(req.body);
  await propertyAccess(a, b.propertyId);
  await bookAssessment(key, b.propertyId, a.id);
  res.json({ ok: true });
});
api.get("/integrations", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, managers);
  const r = await pool.query(
    "SELECT id,kind,status,attempts,last_error,created_at FROM outbox WHERE status<>'sent' ORDER BY created_at DESC LIMIT 50",
  );
  res.json({
    quickbooks: {
      configured: Boolean(
        (
          await pool.query(
            "SELECT 1 FROM integration_connection WHERE provider='quickbooks'",
          )
        ).rowCount,
      ),
      status: "Connection requires sandbox verification",
    },
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
