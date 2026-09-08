import { Router } from "express";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { projectPhaseBillingIntentSchema, projectPhaseDetailsSchema, projectPhasePublicationSchema, projectPhaseTransitionSchema } from "@workspace/api-zod/dashboard";
import { actor, propertyAccess, type Actor } from "./access";
import { pool, transaction } from "./database";
import { requireOperationalProperty } from "./operational-property";
import { HttpError, requireRole } from "./policy";

export const projectPhaseApi = Router();

const id = z.string().uuid();
const text = z.string().trim().min(1).max(10000);
const phaseDetails = projectPhaseDetailsSchema;
const office = ["owner", "manager", "dispatch", "finance"] as const;
const transitions: Record<string, readonly string[]> = {
  planned: ["ready", "blocked", "cancelled", "archived"],
  ready: ["in_progress", "blocked", "cancelled"],
  in_progress: ["manager_review", "blocked"],
  manager_review: ["accepted", "in_progress", "blocked"],
  accepted: ["archived"],
  blocked: ["planned", "ready", "in_progress", "cancelled", "archived"],
  cancelled: ["archived"],
  archived: [],
};

function checkDates(start: string | null | undefined, end: string | null | undefined) {
  if (start && end && start > end)
    throw new HttpError(400, "Planned end must not precede planned start");
}

async function audit(c: { query: Function }, userId: string, action: string, entityId: string, details: unknown) {
  await c.query(
    "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,$3,$4,$5)",
    [randomUUID(), userId, action, entityId, JSON.stringify(details)],
  );
}

async function phaseEvent(
  c: { query: Function },
  input: {
    phaseId: string; actorId: string; eventType: "created" | "updated" | "transitioned" | "published" | "billing_intent_created";
    priorVersion: number | null; resultingVersion: number; fromStatus?: string | null; toStatus?: string | null;
    reason?: string | null; details?: unknown;
  },
) {
  await c.query(
    "INSERT INTO project_phase_event(id,phase_id,actor_id,event_type,prior_version,resulting_version,from_status,to_status,reason,details) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
    [randomUUID(), input.phaseId, input.actorId, input.eventType, input.priorVersion, input.resultingVersion, input.fromStatus || null, input.toStatus || null, input.reason || null, JSON.stringify(input.details || {})],
  );
}

async function operationalProject(c: { query: Function }, projectId: string, lock = false) {
  const row = (
    await c.query(
      `SELECT j.id,j.property_id,j.name,j.scope,j.status FROM project j JOIN property p ON p.id=j.property_id AND p.lifecycle='operational' AND p.client_id IS NOT NULL WHERE j.id=$1${lock ? " FOR UPDATE OF j" : ""}`,
      [projectId],
    )
  ).rows[0];
  if (!row) throw new HttpError(404, "Operational project not found");
  return row;
}

async function lockedPhase(c: { query: Function }, phaseId: string) {
  const row = (
    await c.query(
      "SELECT ph.*,j.property_id,j.name AS project_name FROM project_phase ph JOIN project j ON j.id=ph.project_id JOIN property p ON p.id=j.property_id AND p.lifecycle='operational' AND p.client_id IS NOT NULL WHERE ph.id=$1 FOR UPDATE OF ph,j",
      [phaseId],
    )
  ).rows[0];
  if (!row) throw new HttpError(404, "Operational project phase not found");
  return row;
}

function requirePhaseOffice(a: Actor) {
  requireRole(a.role, [...office]);
}

projectPhaseApi.get("/projects/:projectId/phases", async (req, res) => {
  const a = await actor(req);
  const projectId = id.parse(req.params.projectId);
  if (a.role === "client" || a.role === "crew") {
    const project = (await pool.query("SELECT property_id FROM project WHERE id=$1", [projectId])).rows[0];
    if (!project) throw new HttpError(404, "Project not found");
    await propertyAccess(a, project.property_id);
  } else requirePhaseOffice(a);
  const publicFields = "ph.id,ph.project_id,ph.position,ph.title,ph.status,ph.planned_start,ph.planned_end,ph.published_summary,ph.published_at";
  const crewFields = "ph.id,ph.project_id,ph.position,ph.title,ph.scope,ph.status,ph.planned_start,ph.planned_end,ph.prerequisites";
  const fields = a.role === "client" ? publicFields : a.role === "crew" ? crewFields : "ph.*";
  const clauses = ["j.id=$1", "p.lifecycle='operational'", "p.client_id IS NOT NULL"];
  const values: unknown[] = [projectId];
  if (a.role === "client") clauses.push("ph.published_at IS NOT NULL");
  if (a.role === "crew") {
    values.push(a.id);
    clauses.push("EXISTS(SELECT 1 FROM work_order w WHERE w.project_phase_id=ph.id AND w.assigned_to=$2 AND w.status NOT IN ('cancelled','skipped','reviewed'))");
  }
  const rows = await pool.query(
    `SELECT ${fields},j.name AS project_name,p.name AS property_name FROM project_phase ph JOIN project j ON j.id=ph.project_id JOIN property p ON p.id=j.property_id WHERE ${clauses.join(" AND ")} ORDER BY ph.position`,
    values,
  );
  res.json(rows.rows);
});

projectPhaseApi.get("/project-phases/:id", async (req, res) => {
  const a = await actor(req);
  const phaseId = id.parse(req.params.id);
  const row = (
    await pool.query(
      "SELECT ph.*,j.property_id,j.name AS project_name,p.name AS property_name FROM project_phase ph JOIN project j ON j.id=ph.project_id JOIN property p ON p.id=j.property_id AND p.lifecycle='operational' AND p.client_id IS NOT NULL WHERE ph.id=$1",
      [phaseId],
    )
  ).rows[0];
  if (!row) throw new HttpError(404, "Project phase not found");
  if (a.role === "client" || a.role === "crew") await propertyAccess(a, row.property_id);
  else requirePhaseOffice(a);
  if (a.role === "client") {
    if (!row.published_at) throw new HttpError(404, "Project phase not found");
    res.json({ id: row.id, project_id: row.project_id, position: row.position, title: row.title, status: row.status, planned_start: row.planned_start, planned_end: row.planned_end, published_summary: row.published_summary, published_at: row.published_at, project_name: row.project_name, property_name: row.property_name });
    return;
  }
  if (a.role === "crew") {
    const assigned = await pool.query("SELECT 1 FROM work_order WHERE project_phase_id=$1 AND assigned_to=$2 AND status NOT IN ('cancelled','skipped','reviewed')", [phaseId, a.id]);
    if (!assigned.rowCount) throw new HttpError(404, "Project phase not found");
    res.json({ id: row.id, project_id: row.project_id, position: row.position, title: row.title, scope: row.scope, status: row.status, planned_start: row.planned_start, planned_end: row.planned_end, prerequisites: row.prerequisites, project_name: row.project_name, property_name: row.property_name });
    return;
  }
  res.json(row);
});

projectPhaseApi.post("/projects/:projectId/phases", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager"]);
  const projectId = id.parse(req.params.projectId);
  const b = phaseDetails.extend({ position: z.number().int().min(0).max(10000).optional() }).parse(req.body);
  checkDates(b.plannedStart, b.plannedEnd);
  const phaseId = randomUUID();
  const result = await transaction(async (c) => {
    const project = await operationalProject(c, projectId, true);
    await requireOperationalProperty(c, project.property_id);
    const next = b.position ?? Number((await c.query("SELECT COALESCE(max(position)+1,0) AS n FROM project_phase WHERE project_id=$1", [projectId])).rows[0].n);
    if (b.position !== undefined && (await c.query("SELECT 1 FROM project_phase WHERE project_id=$1 AND position=$2", [projectId, next])).rowCount)
      throw new HttpError(409, "Project phase position is already in use");
    await c.query("INSERT INTO project_phase(id,project_id,position,title,scope,planned_start,planned_end,prerequisites) VALUES($1,$2,$3,$4,$5,$6,$7,$8)", [phaseId, projectId, next, b.title, b.scope, b.plannedStart || null, b.plannedEnd || null, JSON.stringify(b.prerequisites)]);
    await phaseEvent(c, { phaseId, actorId: a.id, eventType: "created", priorVersion: null, resultingVersion: 1, toStatus: "planned", details: { position: next } });
    await audit(c, a.id, "project_phase.created", phaseId, { projectId, position: next });
    return { id: phaseId, version: 1, position: next };
  });
  res.status(201).json(result);
});

projectPhaseApi.patch("/project-phases/:id", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager"]);
  const phaseId = id.parse(req.params.id);
  const b = phaseDetails.extend({ expectedVersion: z.number().int().positive(), reason: text }).parse(req.body);
  checkDates(b.plannedStart, b.plannedEnd);
  const result = await transaction(async (c) => {
    const ph = await lockedPhase(c, phaseId);
    await requireOperationalProperty(c, ph.property_id);
    if (["accepted", "cancelled", "archived"].includes(ph.status)) throw new HttpError(409, "Historical project phase cannot be edited");
    if (Number(ph.version) !== b.expectedVersion) throw new HttpError(409, "Project phase changed");
    const version = Number(ph.version) + 1;
    await c.query("UPDATE project_phase SET title=$2,scope=$3,planned_start=$4,planned_end=$5,prerequisites=$6,version=$7 WHERE id=$1", [phaseId, b.title, b.scope, b.plannedStart || null, b.plannedEnd || null, JSON.stringify(b.prerequisites), version]);
    await phaseEvent(c, { phaseId, actorId: a.id, eventType: "updated", priorVersion: Number(ph.version), resultingVersion: version, fromStatus: ph.status, toStatus: ph.status, reason: b.reason, details: { fields: ["title", "scope", "plannedStart", "plannedEnd", "prerequisites"] } });
    await audit(c, a.id, "project_phase.updated", phaseId, { reason: b.reason, priorVersion: Number(ph.version), version });
    return { id: phaseId, version };
  });
  res.json(result);
});

projectPhaseApi.post("/project-phases/:id/transitions", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager"]);
  const phaseId = id.parse(req.params.id);
  const b = projectPhaseTransitionSchema.parse(req.body);
  const result = await transaction(async (c) => {
    const ph = await lockedPhase(c, phaseId);
    await requireOperationalProperty(c, ph.property_id);
    if (Number(ph.version) !== b.expectedVersion) throw new HttpError(409, "Project phase changed");
    if (!transitions[ph.status]?.includes(b.status)) throw new HttpError(409, "Invalid project phase transition");
    const unmet = Array.isArray(ph.prerequisites) && ph.prerequisites.some((item: any) => !item?.done);
    if (["ready", "in_progress"].includes(b.status) && unmet && !b.overrideReason) throw new HttpError(409, "Unmet prerequisites block phase progress");
    if (b.status === "accepted") {
      const unresolved = await c.query("SELECT 1 FROM work_order WHERE project_phase_id=$1 AND status NOT IN ('reviewed','cancelled','skipped') LIMIT 1", [phaseId]);
      if (unresolved.rowCount) throw new HttpError(409, "Linked work must be reviewed before phase acceptance");
    }
    const version = Number(ph.version) + 1;
    const actualStart = b.status === "in_progress" && !ph.actual_start ? new Date().toISOString().slice(0, 10) : ph.actual_start;
    const actualEnd = b.status === "accepted" ? new Date().toISOString().slice(0, 10) : ph.actual_end;
    await c.query("UPDATE project_phase SET status=$2,version=$3,override_reason=$4,actual_start=$5,actual_end=$6 WHERE id=$1", [phaseId, b.status, version, b.overrideReason || null, actualStart || null, actualEnd || null]);
    await phaseEvent(c, { phaseId, actorId: a.id, eventType: "transitioned", priorVersion: Number(ph.version), resultingVersion: version, fromStatus: ph.status, toStatus: b.status, reason: b.reason, details: { overrideReason: b.overrideReason || null } });
    await audit(c, a.id, "project_phase.transitioned", phaseId, { reason: b.reason, from: ph.status, to: b.status, version, overrideReason: b.overrideReason || null });
    return { id: phaseId, status: b.status, version };
  });
  res.json(result);
});

projectPhaseApi.post("/project-phases/:id/publish", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager"]);
  const phaseId = id.parse(req.params.id);
  const b = projectPhasePublicationSchema.parse(req.body);
  const result = await transaction(async (c) => {
    const ph = await lockedPhase(c, phaseId);
    await requireOperationalProperty(c, ph.property_id);
    if (!["manager_review", "accepted"].includes(ph.status)) throw new HttpError(409, "Only reviewed phase material can be published");
    if (Number(ph.version) !== b.expectedVersion) throw new HttpError(409, "Project phase changed");
    const version = Number(ph.version) + 1;
    await c.query("UPDATE project_phase SET published_summary=$2,published_at=now(),published_by=$3,version=$4 WHERE id=$1", [phaseId, b.summary, a.id, version]);
    await phaseEvent(c, { phaseId, actorId: a.id, eventType: "published", priorVersion: Number(ph.version), resultingVersion: version, fromStatus: ph.status, toStatus: ph.status, reason: null, details: { summaryLength: b.summary.length } });
    await audit(c, a.id, "project_phase.published", phaseId, { priorVersion: Number(ph.version), version });
    return { id: phaseId, version };
  });
  res.json(result);
});

projectPhaseApi.get("/project-phases/:id/history", async (req, res) => {
  const a = await actor(req);
  requirePhaseOffice(a);
  const phaseId = id.parse(req.params.id);
  const r = await pool.query("SELECT e.* FROM project_phase_event e JOIN project_phase ph ON ph.id=e.phase_id JOIN project j ON j.id=ph.project_id JOIN property p ON p.id=j.property_id AND p.lifecycle='operational' AND p.client_id IS NOT NULL WHERE e.phase_id=$1 ORDER BY e.created_at DESC", [phaseId]);
  res.json(r.rows);
});

projectPhaseApi.get("/project-phases/:id/billing-intents", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "finance"]);
  const phaseId = id.parse(req.params.id);
  const r = await pool.query("SELECT i.operation_id,i.expected_phase_version,i.kind,i.created_at,b.id AS billing_draft_id,b.title,b.amount_cents,b.status,b.quickbooks_id FROM project_phase_billing_intent i JOIN billing_draft b ON b.id=i.billing_draft_id JOIN project_phase ph ON ph.id=i.phase_id JOIN project j ON j.id=ph.project_id JOIN property p ON p.id=j.property_id AND p.lifecycle='operational' AND p.client_id IS NOT NULL WHERE i.phase_id=$1 ORDER BY i.created_at DESC", [phaseId]);
  res.json(r.rows);
});

projectPhaseApi.post("/project-phases/:id/billing-intents", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "finance"]);
  const phaseId = id.parse(req.params.id);
  const b = projectPhaseBillingIntentSchema.parse(req.body);
  const fingerprint = createHash("sha256").update(JSON.stringify({ phaseId, ...b })).digest("hex");
  const result = await transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", ["project-phase-billing:" + b.operationId]);
    const previous = (await c.query("SELECT operation_id,actor_id,fingerprint,billing_draft_id FROM project_phase_billing_intent WHERE operation_id=$1", [b.operationId])).rows[0];
    if (previous) {
      if (previous.actor_id !== a.id || previous.fingerprint !== fingerprint) throw new HttpError(409, "Project phase billing operation ID conflict");
      return { id: previous.billing_draft_id, operationId: previous.operation_id, created: false };
    }
    const ph = await lockedPhase(c, phaseId);
    await requireOperationalProperty(c, ph.property_id);
    if (ph.status !== "accepted") throw new HttpError(409, "Only accepted phases can prepare billing");
    if (Number(ph.version) !== b.expectedPhaseVersion) throw new HttpError(409, "Project phase changed");
    const estimate = (await c.query("SELECT * FROM estimate WHERE id=$1 AND property_id=$2 AND status='approved' FOR UPDATE", [b.estimateId, ph.property_id])).rows[0];
    if (!estimate) throw new HttpError(409, "An approved estimate is required");
    const total = Number((await c.query("SELECT COALESCE(sum(amount_cents),0) AS total FROM billing_draft WHERE estimate_id=$1", [estimate.id])).rows[0].total);
    if (total + b.amountCents > Number(estimate.amount_cents)) throw new HttpError(409, "Billing exceeds the approved estimate");
    const draftId = randomUUID();
    await c.query("INSERT INTO billing_draft(id,property_id,estimate_id,title,amount_cents,kind) VALUES($1,$2,$3,$4,$5,$6)", [draftId, ph.property_id, estimate.id, b.title, b.amountCents, b.kind]);
    await c.query("INSERT INTO project_phase_billing_intent(operation_id,phase_id,billing_draft_id,actor_id,expected_phase_version,fingerprint,kind) VALUES($1,$2,$3,$4,$5,$6,$7)", [b.operationId, phaseId, draftId, a.id, b.expectedPhaseVersion, fingerprint, b.kind]);
    await phaseEvent(c, { phaseId, actorId: a.id, eventType: "billing_intent_created", priorVersion: Number(ph.version), resultingVersion: Number(ph.version), fromStatus: ph.status, toStatus: ph.status, details: { operationId: b.operationId, billingDraftId: draftId, kind: b.kind, amountCents: b.amountCents } });
    await audit(c, a.id, "project_phase.billing_intent_created", phaseId, { operationId: b.operationId, billingDraftId: draftId, kind: b.kind, amountCents: b.amountCents });
    return { id: draftId, operationId: b.operationId, created: true };
  });
  res.status(result.created ? 201 : 200).json(result);
});
