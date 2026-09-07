import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { pool, transaction } from "./database";
import { actor, propertyAccess } from "./access";
import { requireRole, HttpError } from "./policy";
import { contactsApi } from "./contact-routes";
import { assessmentApi } from "./assessment-routes";
export const operationsApi = Router();
operationsApi.use(assessmentApi);
operationsApi.use(contactsApi);
const id = z.string().uuid(),
  text = z.string().trim().min(1).max(10000);
operationsApi.get("/recurring-services", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "dispatch"]);
  res.json(
    (
      await pool.query(
        "SELECT r.*,p.name AS property_name FROM recurring_service r JOIN property p ON p.id=r.property_id ORDER BY r.next_date",
      )
    ).rows,
  );
});
operationsApi.post("/recurring-services", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "dispatch"]);
  const b = z
    .object({
      propertyId: id,
      title: text,
      scope: z.string().max(10000).default(""),
      cadence: z.enum(["weekly", "monthly"]),
      intervalCount: z.number().int().min(1).max(52),
      nextDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      localTime: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .default("08:00"),
      assignedTo: z.string().optional(),
      billingMode: z.enum(["fixed_monthly", "per_visit"]),
    })
    .parse(req.body);
  const key = randomUUID();
  await pool.query(
    "INSERT INTO recurring_service(id,property_id,title,scope,cadence,interval_count,next_date,local_time,assigned_to,billing_mode,anchor_day) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,extract(day from $7::date))",
    [
      key,
      b.propertyId,
      b.title,
      b.scope,
      b.cadence,
      b.intervalCount,
      b.nextDate,
      b.localTime,
      b.assignedTo || null,
      b.billingMode,
    ],
  );
  res.status(201).json({ id: key });
});
operationsApi.post("/recurring-services/:id/pause", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "dispatch"]);
  const b = z.object({ paused: z.boolean() }).parse(req.body);
  await pool.query("UPDATE recurring_service SET paused=$2 WHERE id=$1", [
    id.parse(req.params.id),
    b.paused,
  ]);
  res.json({ ok: true });
});
operationsApi.post("/work-orders/:id/reschedule", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "dispatch"]);
  const b = z
    .object({
      scheduledAt: z.string().datetime(),
      assignedTo: z.string().optional(),
      version: z.number().int().positive(),
      reason: text,
    })
    .parse(req.body);
  await transaction(async (c) => {
    const result = await c.query(
      "UPDATE work_order SET scheduled_at=$2,assigned_to=COALESCE($3,assigned_to),version=version+1 WHERE id=$1 AND version=$4 AND status NOT IN ('reviewed','cancelled','skipped') RETURNING id",
      [id.parse(req.params.id), b.scheduledAt, b.assignedTo || null, b.version],
    );
    if (!result.rowCount)
      throw new HttpError(409, "Work order changed or cannot be rescheduled");
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,$3,$4,$5)",
      [
        randomUUID(),
        a.id,
        "work.rescheduled",
        req.params.id,
        { reason: b.reason },
      ],
    );
  });
  res.json({ ok: true });
});
operationsApi.get("/properties/:id/areas", async (req, res) => {
  const a = await actor(req);
  const key = id.parse(req.params.id);
  await propertyAccess(a, key);
  res.json(
    (
      await pool.query(
        "SELECT * FROM property_area WHERE property_id=$1 ORDER BY name",
        [key],
      )
    ).rows,
  );
});
operationsApi.post("/properties/:id/areas", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "dispatch"]);
  const key = id.parse(req.params.id);
  const b = z
    .object({
      name: text,
      description: z.string().max(10000).default(""),
      acreage: z.number().nonnegative().optional(),
    })
    .parse(req.body);
  const area = randomUUID();
  await pool.query(
    "INSERT INTO property_area(id,property_id,name,description,acreage) VALUES($1,$2,$3,$4,$5)",
    [area, key, b.name, b.description, b.acreage ?? null],
  );
  res.status(201).json({ id: area });
});
operationsApi.get("/projects", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "dispatch"]);
  res.json(
    (
      await pool.query(
        "SELECT j.*,p.name AS property_name FROM project j JOIN property p ON p.id=j.property_id ORDER BY j.created_at DESC",
      )
    ).rows,
  );
});
operationsApi.post("/projects", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager"]);
  const b = z
    .object({
      propertyId: id,
      name: text,
      scope: text,
      phases: z
        .array(z.object({ name: text, complete: z.boolean() }))
        .max(50)
        .default([]),
    })
    .parse(req.body);
  const key = randomUUID();
  await pool.query(
    "INSERT INTO project(id,property_id,name,scope,phases) VALUES($1,$2,$3,$4,$5)",
    [key, b.propertyId, b.name, b.scope, JSON.stringify(b.phases)],
  );
  res.status(201).json({ id: key });
});
operationsApi.get("/expenses", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "finance"]);
  res.json(
    (
      await pool.query(
        "SELECT e.*,p.name AS property_name FROM expense e JOIN property p ON p.id=e.property_id ORDER BY incurred_on DESC",
      )
    ).rows,
  );
});
operationsApi.post("/expenses", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "finance"]);
  const b = z
    .object({
      propertyId: id,
      amountCents: z.number().int().positive().max(1e10),
      category: text,
      description: text,
      incurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .parse(req.body);
  const key = randomUUID();
  await pool.query(
    "INSERT INTO expense(id,property_id,amount_cents,category,description,incurred_on,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [
      key,
      b.propertyId,
      b.amountCents,
      b.category,
      b.description,
      b.incurredOn,
      a.id,
    ],
  );
  res.status(201).json({ id: key });
});
operationsApi.get("/inspections", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "dispatch"]);
  res.json(
    (
      await pool.query(
        "SELECT i.*,p.name AS property_name FROM inspection i JOIN property p ON p.id=i.property_id ORDER BY i.created_at DESC",
      )
    ).rows,
  );
});
operationsApi.post("/inspections", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "dispatch", "crew"]);
  const b = z
    .object({
      propertyId: id,
      title: text,
      findings: z
        .array(
          z.object({
            label: text,
            condition: z.enum([
              "good",
              "monitor",
              "action_required",
              "not_assessed",
            ]),
            note: z.string().max(5000),
          }),
        )
        .max(100),
    })
    .parse(req.body);
  await propertyAccess(a, b.propertyId);
  const key = randomUUID();
  await pool.query(
    "INSERT INTO inspection(id,property_id,user_id,title,findings) VALUES($1,$2,$3,$4,$5)",
    [key, b.propertyId, a.id, b.title, JSON.stringify(b.findings)],
  );
  res.status(201).json({ id: key });
});
