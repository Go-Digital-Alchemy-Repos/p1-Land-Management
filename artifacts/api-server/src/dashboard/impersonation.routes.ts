import { randomUUID } from "node:crypto";
import { Router, type Request } from "express";
import { z } from "zod";
import { suggestedLegacyCapabilities } from "@workspace/api-zod/business-access";
import { activeImpersonation, originalIdentity } from "./access";
import { pool, transaction } from "./database";
import { HttpError } from "./policy";

export const impersonationApi = Router();
const targetInput = z.object({ targetId: z.string().min(1).max(120) }).strict();
const demoRoles = ["manager", "dispatch", "sales", "finance", "crew", "client"] as const;
const demoPeople = [
  { role: "manager", first: "Aurelia", last: "Vale" },
  { role: "dispatch", first: "Cassian", last: "Reed" },
  { role: "sales", first: "Livia", last: "Marsh" },
  { role: "finance", first: "Felix", last: "Stone" },
  { role: "crew", first: "Nico", last: "Fields" },
  { role: "client", first: "Clara", last: "Grove" },
] as const;
const demoClientId = "503a1367-78b7-4d9f-8e90-ef52bcdac001";
const demoPropertyId = "503a1367-78b7-4d9f-8e90-ef52bcdac002";
const demoWorkId = "503a1367-78b7-4d9f-8e90-ef52bcdac003";

async function ownerSession(req: Request) {
  if (req.headers.authorization)
    throw new HttpError(403, "Owner impersonation is available in the browser only");
  const session = await originalIdentity(req);
  const profile = await pool.query(
    `SELECT p.role,p.active,p.mfa_required,
            EXISTS(SELECT 1 FROM session_assurance WHERE session_id=$2) AS assured
     FROM staff_profile p WHERE p.user_id=$1`,
    [session.user.id, session.session.id],
  );
  const p = profile.rows[0];
  if (!p || p.role !== "owner" || !p.active ||
      (p.mfa_required && (!session.user.twoFactorEnabled || !p.assured)))
    throw new HttpError(403, "An authenticated Owner session is required");
  return session;
}

async function audit(c: { query: (sql: string, values: unknown[]) => Promise<unknown> }, ownerId: string,
  action: string, targetId: string, details: object = {}) {
  await c.query(
    "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,$3,$4,$5)",
    [randomUUID(), ownerId, action, targetId, details],
  );
}

impersonationApi.get("/impersonation/targets", async (req, res) => {
  const session = await ownerSession(req);
  const result = await pool.query(
    `SELECT u.id,u.name,u.email,p.role,(d.user_id IS NOT NULL) AS demo
     FROM "user" u JOIN staff_profile p ON p.user_id=u.id
     LEFT JOIN dashboard_demo_persona d ON d.user_id=u.id
     LEFT JOIN account_retirement r ON r.user_id=u.id AND r.restored_at IS NULL
     WHERE p.active=true AND p.role<>'owner' AND u."emailVerified"=true
       AND r.user_id IS NULL AND u.id<>$1
     ORDER BY (d.user_id IS NULL),p.role,u.name,u.id`,
    [session.user.id],
  );
  res.json({ items: result.rows });
});

impersonationApi.post("/impersonation", async (req, res) => {
  const session = await ownerSession(req);
  const { targetId } = targetInput.parse(req.body);
  const result = await transaction(async (c) => {
    const target = (await c.query(
      `SELECT u.id,u.name,p.role,p.active,u."emailVerified" AS verified,r.user_id AS retired
       FROM "user" u JOIN staff_profile p ON p.user_id=u.id
       LEFT JOIN account_retirement r ON r.user_id=u.id AND r.restored_at IS NULL
       WHERE u.id=$1 FOR SHARE OF u,p`,
      [targetId],
    )).rows[0];
    if (!target || !target.active || !target.verified || target.retired ||
        target.role === "owner" || target.id === session.user.id)
      throw new HttpError(404, "Active impersonation target not found");
    const previous = (await c.query(
      "SELECT target_id FROM dashboard_impersonation WHERE session_id=$1 FOR UPDATE",
      [session.session.id],
    )).rows[0];
    const switched = await c.query(
      `INSERT INTO dashboard_impersonation(session_id,owner_id,target_id,expires_at)
       VALUES($1,$2,$3,LEAST(now()+interval '30 minutes',$4::timestamptz))
       ON CONFLICT(session_id) DO UPDATE SET target_id=EXCLUDED.target_id,
         started_at=now(),expires_at=EXCLUDED.expires_at
       RETURNING expires_at AS "expiresAt"`,
      [session.session.id, session.user.id, targetId, session.session.expiresAt],
    );
    await audit(c, session.user.id, "impersonation.started", targetId,
      { previousTargetId: previous?.target_id ?? null, role: target.role });
    return { id: target.id, name: target.name, role: target.role,
      expiresAt: switched.rows[0].expiresAt };
  });
  res.status(201).json(result);
});

impersonationApi.post("/impersonation/stop", async (req, res) => {
  const session = await ownerSession(req);
  await transaction(async (c) => {
    const stopped = await c.query(
      "DELETE FROM dashboard_impersonation WHERE session_id=$1 AND owner_id=$2 RETURNING target_id",
      [session.session.id, session.user.id],
    );
    if (stopped.rowCount)
      await audit(c, session.user.id, "impersonation.stopped", stopped.rows[0].target_id);
  });
  res.json({ ok: true });
});

/** Idempotent sample users have no password and cannot receive sign-in mail. */
impersonationApi.post("/impersonation/demo-personas", async (req, res) => {
  const session = await ownerSession(req);
  const result = await transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended('p1-dashboard-demo-personas',0))");
    const people: Array<{ id: string; role: string; name: string }> = [];
    for (const person of demoPeople) {
      const existing = (await c.query("SELECT user_id FROM dashboard_demo_persona WHERE role=$1", [person.role])).rows[0];
      const userId = existing?.user_id || randomUUID();
      if (!existing) {
        await c.query(
          `INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)`,
          [userId, `${person.first} ${person.last} · Demo ${person.role}`,
            `p1-demo-${person.role}@example.test`],
        );
        await c.query("INSERT INTO staff_profile(user_id,role,active,mfa_required) VALUES($1,$2,true,false)",
          [userId, person.role]);
        await c.query(
          `INSERT INTO business_account_access(user_id,first_name,last_name,capabilities,reviewed_at,reviewed_by)
           VALUES($1,$2,$3,$4,now(),$5)`,
          [userId, person.first, person.last, suggestedLegacyCapabilities(person.role), session.user.id],
        );
        await c.query("INSERT INTO dashboard_demo_persona(user_id,role) VALUES($1,$2)", [userId, person.role]);
      }
      people.push({ id: userId, role: person.role,
        name: `${person.first} ${person.last} · Demo ${person.role}` });
    }
    await c.query(
      `INSERT INTO client(id,name,email,phone,billing_address)
       VALUES($1,'P1 Demo · Lorem Estates','client@example.test','(202) 555-0110',
         '123 Example Lane, Sample, NC 28105') ON CONFLICT(id) DO NOTHING`,
      [demoClientId],
    );
    await c.query(
      `INSERT INTO property(id,client_id,name,address,acreage,access_instructions,notes)
       VALUES($1,$2,'Demo Grounds · Lorem Acre','123 Example Lane, Sample, NC 28105',4,
         'Synthetic property; no physical access.',
         'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Demo data only.')
       ON CONFLICT(id) DO NOTHING`,
      [demoPropertyId, demoClientId],
    );
    const clientId = people.find((person) => person.role === "client")!.id;
    const crewId = people.find((person) => person.role === "crew")!.id;
    await c.query("INSERT INTO client_access(user_id,client_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [clientId, demoClientId]);
    await c.query(
      `INSERT INTO work_order(id,property_id,title,scope,assigned_to,scheduled_at,status,published)
       VALUES($1,$2,'Demo Grounds Visit',
         'Lorem ipsum dolor sit amet. Synthetic assignment; do not dispatch.',
         $3,now()+interval '2 days','scheduled',true) ON CONFLICT(id) DO NOTHING`,
      [demoWorkId, demoPropertyId, crewId],
    );
    await audit(c, session.user.id, "impersonation.demo_personas.seeded", demoClientId,
      { roles: [...demoRoles] });
    return people;
  });
  res.status(201).json({ items: result });
});

/** Audit the true Owner before any write performed under an impersonated identity. */
export async function auditImpersonatedMutation(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) ||
      req.path.startsWith("/impersonation")) return;
  let context;
  try {
    context = await activeImpersonation(req);
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) return;
    throw error;
  }
  if (!context) return;
  await pool.query(
    "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'impersonation.request',$3,$4)",
    [randomUUID(), context.ownerId, context.targetId,
      { method: req.method, path: req.path, targetRole: context.targetRole }],
  );
}
