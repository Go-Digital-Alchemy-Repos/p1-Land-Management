import { operationalQuery, operationalChildQuery } from "./operational-property";
import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { pool, transaction } from "./database";
import { actor, propertyAccess } from "./access";
import { requireRole, HttpError } from "./policy";
import { contactsApi } from "./contact-routes";
import { assessmentApi } from "./assessment-routes";
import { scheduleApi } from "./schedule-routes";
export const operationsApi = Router();
operationsApi.use(scheduleApi);
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
        "SELECT r.*,p.name AS property_name FROM recurring_service r JOIN property p ON p.id=r.property_id AND p.lifecycle='operational' ORDER BY r.next_date",
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
  await operationalQuery(b.propertyId,
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
  await operationalChildQuery("recurring_service",id.parse(req.params.id),"UPDATE recurring_service SET paused=$2 WHERE id=$1", [
    id.parse(req.params.id),
    b.paused,
  ]);
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
  await operationalQuery(key,
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
        "SELECT j.*,p.name AS property_name FROM project j JOIN property p ON p.id=j.property_id AND p.lifecycle='operational' ORDER BY j.created_at DESC",
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
  await operationalQuery(b.propertyId,
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
        "SELECT e.*,p.name AS property_name FROM expense e JOIN property p ON p.id=e.property_id AND p.lifecycle='operational' ORDER BY incurred_on DESC",
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
  await operationalQuery(b.propertyId,
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
  requireRole(a.role, ["owner", "manager", "dispatch", "client"]);
  const clientView = a.role === "client";
  res.json(
    (
      await pool.query(
        clientView
          ? "SELECT i.id,i.property_id,i.title,i.findings,i.published,i.created_at,p.name AS property_name FROM inspection i JOIN property p ON p.id=i.property_id AND p.lifecycle='operational' WHERE i.published=true AND EXISTS(SELECT 1 FROM client_access ca WHERE ca.client_id=p.client_id AND ca.user_id=$1) ORDER BY i.created_at DESC"
          : "SELECT i.*,p.name AS property_name FROM inspection i JOIN property p ON p.id=i.property_id AND p.lifecycle='operational' ORDER BY i.created_at DESC",
        clientView ? [a.id] : [],
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
          }).strict(),
        )
        .max(100),
    })
    .strict()
    .parse(req.body);
  await propertyAccess(a, b.propertyId);
  const key = randomUUID();
  await operationalQuery(b.propertyId,
    "INSERT INTO inspection(id,property_id,user_id,title,findings) VALUES($1,$2,$3,$4,$5)",
    [key, b.propertyId, a.id, b.title, JSON.stringify(b.findings)],
  );
  res.status(201).json({ id: key });
});
operationsApi.post("/inspections/:id/publish", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager"]);
  const key = id.parse(req.params.id);
  await transaction(async (c) => {
    const inspection = (
      await c.query(
        "SELECT i.published FROM inspection i JOIN property p ON p.id=i.property_id AND p.lifecycle='operational' WHERE i.id=$1 FOR UPDATE OF i",
        [key],
      )
    ).rows[0];
    if (!inspection) throw new HttpError(404, "Inspection not found");
    if (inspection.published) return;
    await c.query("UPDATE inspection SET published=true WHERE id=$1", [key]);
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id) VALUES($1,$2,'inspection.published',$3)",
      [randomUUID(), a.id, key],
    );
  });
  res.json({ ok: true });
});
