import { Router } from "express";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { actor, propertyAccess, type Actor } from "./access";
import { pool, transaction } from "./database";
import { HttpError, requireRole } from "./policy";
import { requireOperationalProperty } from "./operational-property";
import { assessActivation } from "./service-agreement.activation";
import { agreementAudit, lockedAgreement } from "./service-agreement.persistence";
import { notifyClientContacts, notifyStaff } from "./job-notifications";

const id = z.string().uuid();
const text = z.string().trim().min(1).max(10_000);
const cents = z.number().int().min(0).max(10_000_000_000);
const lineItem = z.object({
  description: z.string().trim().min(1).max(2_000),
  unit: z.string().trim().max(100).optional(),
  quantity: z.number().positive().max(1_000_000),
  unitPriceCents: cents,
});
const fixedPeriod = z.object({ startsOn: z.string().date(), endsOn: z.string().date(), amountCents: z.number().int().positive().max(10_000_000_000) });
const recurringConfig = z.object({
  cadence: z.enum(["weekly", "monthly"]),
  intervalCount: z.number().int().min(1).max(52),
  startsOn: z.string().date(),
  endsOn: z.string().date(),
  localTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("08:00"),
  billingMode: z.enum(["fixed_monthly", "per_visit"]),
  unitAmountCents: z.number().int().positive().max(10_000_000_000).nullable(),
  periods: z.array(fixedPeriod).max(120),
}).superRefine((value, ctx) => {
  if (value.endsOn < value.startsOn) ctx.addIssue({ code: "custom", message: "Agreement end must follow its start", path: ["endsOn"] });
  if (value.billingMode === "per_visit" && (value.unitAmountCents === null || value.periods.length)) ctx.addIssue({ code: "custom", message: "Per-visit agreements require a rate and no monthly periods" });
  if (value.billingMode === "fixed_monthly" && (value.unitAmountCents !== null || !value.periods.length)) ctx.addIssue({ code: "custom", message: "Monthly agreements require explicit monthly periods" });
});
const lifecycleEstimateInput = z.object({
  propertyId: id,
  title: text,
  scope: text,
  terms: z.string().trim().max(50_000).default(""),
  lineItems: z.array(lineItem).min(1).max(100),
  kind: z.enum(["one_time", "recurring"]).default("one_time"),
  projectId: id.optional(),
  recurring: recurringConfig.optional(),
  agreementTemplateId: id.optional(),
}).superRefine((value, ctx) => {
  if (value.kind === "recurring" && (!value.recurring || !value.agreementTemplateId)) ctx.addIssue({ code: "custom", message: "Recurring estimates require a schedule and agreement template" });
  if (value.kind === "one_time" && (value.recurring || value.agreementTemplateId)) ctx.addIssue({ code: "custom", message: "One-time estimates cannot include recurring agreement details" });
});
// The prior dashboard contract created a one-time estimate from a single
// amount. Keep it accepted while new callers supply itemized scope.
const legacyEstimateInput = z.object({
  propertyId: id,
  title: text,
  scope: text,
  amountCents: z.number().int().positive().max(10_000_000_000),
}).transform((value) => ({
  propertyId: value.propertyId,
  title: value.title,
  scope: value.scope,
  terms: "",
  lineItems: [{ description: value.title, unit: undefined, quantity: 1, unitPriceCents: value.amountCents }],
  kind: "one_time" as const,
  projectId: undefined,
  recurring: undefined,
  agreementTemplateId: undefined,
}));
const estimateInput = z.union([lifecycleEstimateInput, legacyEstimateInput]);
const offices = ["owner", "manager", "sales"] as const;
const dispatch = ["owner", "manager", "dispatch"] as const;
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const total = (items: z.infer<typeof lineItem>[]) => {
  const value = items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPriceCents), 0);
  if (!Number.isSafeInteger(value) || value <= 0) throw new HttpError(400, "Estimate total must be greater than zero");
  return value;
};
async function audit(c: any, userId: string | null, action: string, entityId: string, details: unknown = {}) {
  await c.query("INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,$3,$4,$5)", [randomUUID(), userId, action, entityId, details]);
}
async function requestEvent(
  c: any,
  requestId: string,
  actorId: string,
  eventType: "transitioned" | "converted",
  priorVersion: number,
  resultingVersion: number,
  fromStatus: string,
  toStatus: string,
  details: unknown = {},
) {
  await c.query(
    "INSERT INTO service_request_event(id,service_request_id,actor_id,event_type,prior_version,resulting_version,from_status,to_status,details) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [randomUUID(), requestId, actorId, eventType, priorVersion, resultingVersion, fromStatus, toStatus, JSON.stringify(details)],
  );
}
async function templateSnapshot(c: any, templateId: string | undefined) {
  if (!templateId) return null;
  const template = (await c.query("SELECT id,version,body FROM agreement_template WHERE id=$1 AND active=true FOR SHARE", [templateId])).rows[0];
  if (!template) throw new HttpError(409, "Choose an active agreement template");
  return template;
}

async function createEstimate(a: Actor, raw: unknown, requestId?: string) {
  requireRole(a.role, [...offices]);
  const b = estimateInput.parse(raw);
  await propertyAccess(a, b.propertyId);
  const amountCents = total(b.lineItems);
  const key = randomUUID();
  await transaction(async (c) => {
    await requireOperationalProperty(c, b.propertyId);
    if (requestId) {
      const request = (await c.query("SELECT * FROM service_request WHERE id=$1 AND property_id=$2 FOR UPDATE", [requestId, b.propertyId])).rows[0];
      if (!request || ["closed", "cancelled", "converted"].includes(request.status)) throw new HttpError(409, "Request is not available for an estimate");
    }
    if (b.projectId && !(await c.query("SELECT 1 FROM project_property WHERE project_id=$1 AND property_id=$2 FOR SHARE", [b.projectId, b.propertyId])).rowCount)
      throw new HttpError(400, "Choose a Project that includes this property");
    const template = await templateSnapshot(c, b.agreementTemplateId);
    await c.query(
      `INSERT INTO estimate(id,property_id,title,scope,amount_cents,request_id,created_by,project_id,kind,terms,recurring_config,agreement_template_id,agreement_template_version,agreement_template_snapshot)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [key, b.propertyId, b.title, b.scope, amountCents, requestId || null, a.id, b.projectId || null, b.kind, b.terms, b.recurring ? JSON.stringify(b.recurring) : null, template?.id || null, template?.version || null, template?.body || null],
    );
    for (const [position, item] of b.lineItems.entries())
      await c.query("INSERT INTO estimate_line_item(id,estimate_id,position,description,unit,quantity,unit_price_cents) VALUES($1,$2,$3,$4,$5,$6,$7)", [randomUUID(), key, position, item.description, item.unit || null, item.quantity, item.unitPriceCents]);
    if (requestId) {
      const request = (await c.query("SELECT status,version FROM service_request WHERE id=$1 FOR UPDATE", [requestId])).rows[0];
      if (request.status === "new") {
        const nextVersion = Number(request.version) + 1;
        await c.query("UPDATE service_request SET status='triaged',version=$2,updated_at=now() WHERE id=$1", [requestId, nextVersion]);
        await requestEvent(c, requestId, a.id, "transitioned", Number(request.version), nextVersion, "new", "triaged", { estimateId: key, stage: "estimate_draft" });
      }
    }
    await audit(c, a.id, "estimate.created", key, { requestId: requestId || null, kind: b.kind });
  });
  return { id: key };
}

async function estimateDocument(c: any, estimateId: string) {
  const estimate = (await c.query(`SELECT e.*,p.name AS property_name,p.address,c.name AS client_name
    FROM estimate e JOIN property p ON p.id=e.property_id JOIN client c ON c.id=p.client_id WHERE e.id=$1`, [estimateId])).rows[0];
  if (!estimate) throw new HttpError(404, "Estimate not found");
  const lines = (await c.query("SELECT description,unit,quantity,unit_price_cents,position FROM estimate_line_item WHERE estimate_id=$1 ORDER BY position", [estimateId])).rows;
  return { ...estimate, line_items: lines };
}

async function convertApprovedEstimate(c: any, estimate: any, actorId: string | null, contactId: string | null) {
  if (estimate.status !== "sent") throw new HttpError(409, "Estimate is no longer awaiting a decision");
  if (!estimate.is_current || new Date(estimate.expires_at).getTime() <= Date.now()) throw new HttpError(409, "Estimate has expired or been revised");
  await c.query("UPDATE estimate SET status='approved',approved_by=$2,approved_at=now() WHERE id=$1", [estimate.id, actorId]);
  let jobId: string;
  const eventActorId = estimate.created_by || actorId;
  if (!eventActorId) throw new HttpError(409, "Estimate is missing its staff owner");
  if (estimate.kind === "recurring") {
    const config = recurringConfig.parse(estimate.recurring_config);
    const recurringId = randomUUID(), agreementId = randomUUID();
    await c.query("INSERT INTO recurring_service(id,property_id,title,scope,cadence,interval_count,next_date,local_time,billing_mode,paused,anchor_day,estimate_id,project_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,true,extract(day from $7::date),$10,$11)", [recurringId, estimate.property_id, estimate.title, estimate.scope, config.cadence, config.intervalCount, config.startsOn, config.localTime, config.billingMode, estimate.id, estimate.project_id]);
    await c.query(`INSERT INTO service_agreement(id,property_id,recurring_service_id,estimate_id,title,starts_on,ends_on,billing_mode,unit_amount_cents,scope_snapshot,estimate_revision,created_by,creation_fingerprint,template_id,template_version,template_snapshot,accepted_at,accepted_by_contact_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now(),$17)`, [agreementId, estimate.property_id, recurringId, estimate.id, estimate.title, config.startsOn, config.endsOn, config.billingMode, config.unitAmountCents, estimate.scope, estimate.revision, estimate.created_by || actorId, sha(JSON.stringify({ estimateId: estimate.id, recurringId, agreementId })), estimate.agreement_template_id, estimate.agreement_template_version, estimate.agreement_template_snapshot, contactId]);
    await c.query("UPDATE recurring_service SET agreement_id=$2 WHERE id=$1", [recurringId, agreementId]);
    for (const period of config.periods) await c.query("INSERT INTO fixed_charge_period(id,agreement_id,starts_on,ends_on,amount_cents) VALUES($1,$2,$3,$4,$5)", [randomUUID(), agreementId, period.startsOn, period.endsOn, period.amountCents]);
    jobId = recurringId;
    await audit(c, actorId, "recurring_job.accepted", recurringId, { estimateId: estimate.id, agreementId });
  } else {
    jobId = randomUUID();
    await c.query("INSERT INTO work_order(id,property_id,title,scope,estimate_id,request_id,project_id,job_kind) VALUES($1,$2,$3,$4,$5,$6,$7,'one_time')", [jobId, estimate.property_id, estimate.title, estimate.scope, estimate.id, estimate.request_id, estimate.project_id]);
    await audit(c, actorId, "job.created_from_estimate", jobId, { estimateId: estimate.id });
  }
  if (estimate.request_id && estimate.kind === "one_time") {
    const request = (await c.query("SELECT status,version FROM service_request WHERE id=$1 FOR UPDATE", [estimate.request_id])).rows[0];
    if (!request || !["triaged", "scheduled"].includes(request.status)) throw new HttpError(409, "Request is not ready for Job conversion");
    const nextVersion = Number(request.version) + 1;
    const operationId = randomUUID();
    await c.query(
      "INSERT INTO service_request_conversion(operation_id,service_request_id,work_order_id,actor_id,expected_request_version,fingerprint) VALUES($1,$2,$3,$4,$5,$6)",
      [operationId, estimate.request_id, jobId, eventActorId, request.version, sha(JSON.stringify({ estimateId: estimate.id, jobId }))],
    );
    await c.query("UPDATE service_request SET status='converted',version=$2,updated_at=now() WHERE id=$1", [estimate.request_id, nextVersion]);
    await requestEvent(c, estimate.request_id, eventActorId, "converted", Number(request.version), nextVersion, request.status, "converted", { estimateId: estimate.id, jobId, operationId });
  }
  await audit(c, actorId, "estimate.approved", estimate.id, { jobId, contactId });
  return { jobId, recurring: estimate.kind === "recurring" };
}

async function decideEstimate(estimateId: string, status: "approved" | "declined", actorId: string | null, contactId: string | null) {
  return transaction(async (c) => {
    const estimate = (await c.query("SELECT * FROM estimate WHERE id=$1 FOR UPDATE", [estimateId])).rows[0];
    if (!estimate) throw new HttpError(404, "Estimate not found");
    if (status === "declined") {
      if (estimate.status !== "sent") throw new HttpError(409, "Estimate is no longer awaiting a decision");
      await c.query("UPDATE estimate SET status='declined' WHERE id=$1", [estimateId]);
      await audit(c, actorId, "estimate.declined", estimateId, { contactId });
      await notifyStaff(c, estimate.created_by, "Estimate declined", `${estimate.title} was declined by the client.`, `estimate-declined:${estimateId}`);
      return { ok: true, declined: true };
    }
    const result = await convertApprovedEstimate(c, estimate, actorId, contactId);
    await notifyStaff(c, estimate.created_by, "Estimate approved", `${estimate.title} is approved and ready for dispatch.`, `estimate-approved:${estimateId}`);
    await notifyClientContacts(c, estimate.property_id, "Estimate approved", `${estimate.title} has been approved. P1 will schedule your Job.`, `estimate-approved-client:${estimateId}`);
    return { ok: true, ...result };
  });
}

export const jobsLifecycleApi = Router();
jobsLifecycleApi.get("/agreement-templates", async (req, res) => {
  const a = await actor(req); requireRole(a.role, ["owner", "manager", "sales"]);
  res.json((await pool.query("SELECT id,name,version,body,active,created_at,updated_at FROM agreement_template WHERE active=true ORDER BY name,version DESC")).rows);
});
jobsLifecycleApi.post("/agreement-templates", async (req, res) => {
  const a = await actor(req); requireRole(a.role, ["owner", "manager"]);
  const b = z.object({ name: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(50_000) }).parse(req.body);
  const key = randomUUID();
  await pool.query("INSERT INTO agreement_template(id,name,body,created_by) VALUES($1,$2,$3,$4)", [key, b.name, b.body, a.id]);
  res.status(201).json({ id: key });
});
jobsLifecycleApi.post("/agreement-templates/:id/revise", async (req, res) => {
  const a = await actor(req); requireRole(a.role, ["owner", "manager"]);
  const b = z.object({ body: z.string().trim().min(1).max(50_000) }).parse(req.body); const oldId = id.parse(req.params.id), key = randomUUID();
  await transaction(async c => { const old = (await c.query("SELECT * FROM agreement_template WHERE id=$1 FOR UPDATE", [oldId])).rows[0]; if (!old) throw new HttpError(404, "Agreement template not found"); await c.query("UPDATE agreement_template SET active=false,updated_at=now() WHERE id=$1", [oldId]); await c.query("INSERT INTO agreement_template(id,name,version,body,created_by) VALUES($1,$2,$3,$4,$5)", [key, old.name, old.version + 1, b.body, a.id]); });
  res.status(201).json({ id: key });
});
jobsLifecycleApi.post("/estimates", async (req, res) => res.status(201).json(await createEstimate(await actor(req), req.body)));
jobsLifecycleApi.post("/requests/:id/estimates", async (req, res) => res.status(201).json(await createEstimate(await actor(req), req.body, id.parse(req.params.id))));
jobsLifecycleApi.get("/estimates/:id/document", async (req, res) => {
  const a = await actor(req); const key = id.parse(req.params.id); const doc = await estimateDocument(pool, key); await propertyAccess(a, doc.property_id); if (a.role === "client" && doc.status === "draft") throw new HttpError(404, "Estimate not found");
  if (a.role === "client") {
    const { id: estimateId, property_id, property_name, client_name, title, revision, amount_cents, scope, status, approved_at, created_at, is_current, kind, terms, expires_at, line_items } = doc;
    res.json({ id: estimateId, property_id, property_name, client_name, title, revision, amount_cents, scope, status, approved_at, created_at, is_current, kind, terms, expires_at, line_items });
    return;
  }
  res.json(doc);
});
jobsLifecycleApi.get("/estimates/:id/recipient-options", async (req, res) => {
  const a = await actor(req); requireRole(a.role, [...offices]); const key = id.parse(req.params.id);
  const estimate = await estimateDocument(pool, key); await propertyAccess(a, estimate.property_id);
  res.json((await pool.query(`SELECT c.id,c.name,c.email,COALESCE(p.email_enabled,true) AS email_enabled
    FROM contact c JOIN property pr ON pr.client_id=c.client_id LEFT JOIN contact_notification_preference p ON p.contact_id=c.id
    WHERE pr.id=$1 AND c.archived=false ORDER BY c.kind='primary' DESC,c.name`, [estimate.property_id])).rows);
});
jobsLifecycleApi.post("/estimates/:id/send", async (req, res) => {
  const a = await actor(req); requireRole(a.role, [...offices]); const estimateId = id.parse(req.params.id); const b = z.object({ recipientContactIds: z.array(id).min(1).max(20) }).parse(req.body);
  await transaction(async c => {
    const estimate = (await c.query("SELECT * FROM estimate WHERE id=$1 FOR UPDATE", [estimateId])).rows[0]; if (!estimate || estimate.status !== "draft" || !estimate.is_current) throw new HttpError(409, "Only the current draft estimate can be sent");
    const contacts = (await c.query("SELECT c.id,c.email,COALESCE(p.email_enabled,true) AS email_enabled FROM contact c LEFT JOIN contact_notification_preference p ON p.contact_id=c.id JOIN property pr ON pr.client_id=c.client_id WHERE c.id=ANY($1::uuid[]) AND pr.id=$2 AND c.archived=false", [b.recipientContactIds, estimate.property_id])).rows;
    if (contacts.length !== b.recipientContactIds.length || contacts.some(contact => !contact.email || !contact.email_enabled)) throw new HttpError(409, "Each recipient must be an active property contact with email notifications enabled");
    await c.query("UPDATE estimate SET status='sent' WHERE id=$1", [estimateId]);
    for (const contact of contacts) { const token = randomBytes(32).toString("base64url"); await c.query("INSERT INTO estimate_recipient(id,estimate_id,contact_id,email,token_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6)", [randomUUID(), estimateId, contact.id, contact.email, sha(token), estimate.expires_at]); await c.query("INSERT INTO outbox(id,kind,payload,dedup_key) VALUES($1,'email',$2,$3)", [randomUUID(), { to: contact.email, subject: `Estimate ready: ${estimate.title}`, text: `Your P1 estimate is ready to review and approve: ${process.env.DASHBOARD_ORIGIN || ""}/estimate-approval/${token}` }, `estimate:${estimateId}:${contact.id}:v${estimate.revision}`]); }
    await audit(c, a.id, "estimate.sent", estimateId, { recipients: b.recipientContactIds });
  });
  res.json({ ok: true });
});
jobsLifecycleApi.post("/estimates/:id/decision", async (req, res) => {
  const a = await actor(req); const key = id.parse(req.params.id); const b = z.object({ status: z.enum(["sent", "approved", "declined"]), revision: z.number().int().positive() }).parse(req.body);
  const estimate = await estimateDocument(pool, key); await propertyAccess(a, estimate.property_id); if (estimate.revision !== b.revision) throw new HttpError(409, "Estimate changed; refresh and retry");
  if (b.status === "sent") {
    requireRole(a.role, [...offices]);
    await transaction(async (c) => {
      const current = (await c.query("SELECT status,is_current,revision FROM estimate WHERE id=$1 FOR UPDATE", [key])).rows[0];
      if (!current || !current.is_current || current.revision !== b.revision || current.status !== "draft") throw new HttpError(409, "Estimate changed or decision already recorded");
      await c.query("UPDATE estimate SET status='sent' WHERE id=$1", [key]);
      await audit(c, a.id, "estimate.sent_legacy", key);
    });
    res.json({ ok: true });
    return;
  }
  requireRole(a.role, ["client"]);
  res.json(await decideEstimate(key, b.status, a.id, null));
});
jobsLifecycleApi.post("/jobs/internal", async (req, res) => {
  const a = await actor(req); requireRole(a.role, [...dispatch]); const b = z.object({ propertyId: id, title: text, scope: z.string().max(10_000).default(""), reason: z.string().trim().min(1).max(1_000), assignedTo: z.string().optional(), scheduledAt: z.string().datetime().optional() }).parse(req.body); await propertyAccess(a,b.propertyId); const key=randomUUID(); await transaction(async c=>{ await requireOperationalProperty(c,b.propertyId); await c.query("INSERT INTO work_order(id,property_id,title,scope,assigned_to,scheduled_at,job_kind,internal_reason) VALUES($1,$2,$3,$4,$5,$6,'internal',$7)",[key,b.propertyId,b.title,b.scope,b.assignedTo||null,b.scheduledAt||null,b.reason]); await audit(c,a.id,"job.internal_created",key,{reason:b.reason}); }); res.status(201).json({id:key});
});
jobsLifecycleApi.get("/recurring-jobs", async (req,res) => { const a=await actor(req); requireRole(a.role,[...dispatch]); res.json((await pool.query(`SELECT r.*,p.name AS property_name,c.name AS client_name,a.status AS agreement_status,COUNT(w.id)::int AS visit_count,MIN(w.scheduled_at) FILTER (WHERE w.scheduled_at>=now()) AS next_visit FROM recurring_service r JOIN property p ON p.id=r.property_id JOIN client c ON c.id=p.client_id LEFT JOIN service_agreement a ON a.id=r.agreement_id LEFT JOIN work_order w ON w.recurring_service_id=r.id WHERE p.lifecycle='operational' GROUP BY r.id,p.name,c.name,a.status ORDER BY r.next_date`)).rows); });
jobsLifecycleApi.post("/recurring-jobs/:id/activate", async (req, res) => {
  const a = await actor(req); requireRole(a.role, [...dispatch]);
  const key = id.parse(req.params.id);
  const b = z.object({ assignedTo: z.string().min(1), nextDate: z.string().date(), localTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }).parse(req.body);
  await transaction(async (c) => {
    const recurring = (await c.query("SELECT * FROM recurring_service WHERE id=$1 FOR UPDATE", [key])).rows[0];
    if (!recurring?.agreement_id) throw new HttpError(404, "Recurring Job not found");
    if (!recurring.paused) throw new HttpError(409, "Recurring Job is already active");
    const staff = await c.query("SELECT 1 FROM staff_profile WHERE user_id=$1 AND active=true AND role<>'client'", [b.assignedTo]);
    if (!staff.rowCount) throw new HttpError(400, "Choose an active team member");
    const context = await lockedAgreement(c, recurring.agreement_id);
    if (!context.agreement.accepted_at || context.agreement.status !== "draft") throw new HttpError(409, "Accepted agreement is not ready for activation");
    const { preview, periods, today } = await assessActivation(c, context);
    if (!preview.canActivate) throw new HttpError(409, preview.blockedReasons[0]);
    await c.query("UPDATE recurring_service SET assigned_to=$2,next_date=$3,local_time=$4,paused=false,anchor_day=extract(day from $3::date) WHERE id=$1", [key, b.assignedTo, b.nextDate, b.localTime]);
    await c.query("UPDATE service_agreement SET status='active',activated_by=$2,activated_on=$3,activated_at=now(),version=version+1,updated_at=now() WHERE id=$1", [recurring.agreement_id, a.id, today]);
    await agreementAudit(c, a.id, "agreement.activated", recurring.agreement_id, { version: context.agreement.version, plannedCents: preview.plannedCents, perVisitCents: preview.perVisitCents, periods, clientAcceptedAt: context.agreement.accepted_at });
    await audit(c, a.id, "recurring_job.activated", key, { agreementId: recurring.agreement_id, nextDate: b.nextDate });
  });
  res.json({ ok: true });
});

const publicHits = new Map<string, { count: number; reset: number }>();
function publicThrottle(token: string) { const key=sha(token), now=Date.now(), prior=publicHits.get(key); const current=!prior||prior.reset<now?{count:0,reset:now+60_000}:prior; current.count++; publicHits.set(key,current); if(current.count>20) throw new HttpError(429,"Please wait before trying again"); return key; }
function pdf(lines: string[]) { const body = lines.flatMap(line => line.match(/.{1,88}/g) || [""]).map(line => `(${line.replace(/[\\()]/g,"\\$&")}) Tj 0 -14 Td`).join("\n"); const objects=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R] /Count 1 >>","<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",`<< /Length ${Buffer.byteLength("BT\n/F1 10 Tf\n50 760 Td\n"+body+"\nET")} >>\nstream\nBT\n/F1 10 Tf\n50 760 Td\n${body}\nET\nendstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]; let result="%PDF-1.4\n", offsets=[0]; objects.forEach((object,index)=>{ offsets.push(Buffer.byteLength(result)); result += `${index+1} 0 obj\n${object}\nendobj\n`; }); const start=Buffer.byteLength(result); result += `xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(offset=>String(offset).padStart(10,"0")+" 00000 n \n").join("")+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`; return Buffer.from(result); }
export const estimatePublicApi = Router();
async function publicRecipient(token: string) { const hash=publicThrottle(token); const row=(await pool.query("SELECT r.*,e.id AS estimate_id,e.status,e.is_current,e.expires_at FROM estimate_recipient r JOIN estimate e ON e.id=r.estimate_id WHERE r.token_hash=$1",[hash])).rows[0]; if(!row || row.status!=="sent" || row.decision || !row.is_current || new Date(row.expires_at).getTime()<=Date.now()) throw new HttpError(404,"Estimate link is no longer available"); return row; }
estimatePublicApi.get("/estimates/:token", async(req,res)=>{ const recipient=await publicRecipient(req.params.token); await pool.query("UPDATE estimate_recipient SET viewed_at=COALESCE(viewed_at,now()) WHERE id=$1",[recipient.id]); const doc=await estimateDocument(pool,recipient.estimate_id); const { id: estimateId, property_id, property_name, client_name, title, revision, amount_cents, scope, status, approved_at, created_at, is_current, kind, terms, expires_at, line_items }=doc; res.json({ id: estimateId, property_id, property_name, client_name, title, revision, amount_cents, scope, status, approved_at, created_at, is_current, kind, terms, expires_at, line_items }); });
estimatePublicApi.get("/estimates/:token/pdf", async(req,res)=>{ const recipient=await publicRecipient(req.params.token); const doc=await estimateDocument(pool,recipient.estimate_id); const lines=["P1 Land Management Estimate",doc.title,`${doc.client_name} · ${doc.property_name}`,doc.address,"",doc.scope,"",...doc.line_items.map((item:any)=>`${item.description}  ${item.quantity} ${item.unit||""} × $${(Number(item.unit_price_cents)/100).toFixed(2)}`),"",`Total: $${(Number(doc.amount_cents)/100).toFixed(2)}`,`Valid through: ${new Date(doc.expires_at).toLocaleDateString("en-US")}`,"",doc.terms].filter(Boolean); res.type("application/pdf").attachment("estimate.pdf").send(pdf(lines)); });
estimatePublicApi.post("/estimates/:token/decision", async(req,res)=>{ const recipient=await publicRecipient(req.params.token); const b=z.object({status:z.enum(["approved","declined"])}).parse(req.body); const result=await decideEstimate(recipient.estimate_id,b.status,null,recipient.contact_id); await pool.query("UPDATE estimate_recipient SET decision=$2,decided_at=now() WHERE id=$1",[recipient.id,b.status]); await pool.query("UPDATE estimate_recipient SET decision='revoked' WHERE estimate_id=$1 AND id<>$2 AND decision IS NULL",[recipient.estimate_id,recipient.id]); res.json(result); });
