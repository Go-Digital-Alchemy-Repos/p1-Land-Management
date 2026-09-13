import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { type Actor } from "./access";
import { pool, transaction } from "./database";
import { HttpError, requireRole } from "./policy";

const id = z.string().uuid();
const sales = (a: Actor) => requireRole(a.role, ["owner", "manager", "sales"]);
const optionalText = (max: number) => z.string().trim().min(1).max(max).nullable().optional();
const priority = z.enum(["low", "medium", "high"]).nullable().optional();
const category = z.enum([
  "grounds_vegetation",
  "stormwater_drainage",
  "grading_erosion",
  "tree_land",
  "roads_access",
  "emergency_corrective",
  "recurring_site_management",
  "other",
]);
const finding = z.object({
  category,
  conditionLabel: optionalText(200),
  observation: z.string().trim().min(1).max(4000),
  priority,
}).strict();
const recommendation = z.object({
  findingIndex: z.number().int().nonnegative().nullable(),
  recommendation: z.string().trim().min(1).max(4000),
  priority,
}).strict();
const createInput = z.object({
  operationId: id,
  expectedLeadVersion: z.number().int().positive(),
  propertyId: id.nullable().optional(),
  title: z.string().trim().min(1).max(200),
  scopeNote: optionalText(4000),
}).strict();
const saveInput = z.object({
  expectedVersion: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  scopeNote: optionalText(4000),
  findings: z.array(finding).max(50),
  recommendations: z.array(recommendation).max(50),
}).strict().superRefine((value, ctx) => {
  for (const [index, item] of value.recommendations.entries())
    if (item.findingIndex !== null && item.findingIndex >= value.findings.length)
      ctx.addIssue({ code: "custom", path: ["recommendations", index, "findingIndex"], message: "Finding reference is not available" });
});
const archiveInput = z.object({
  expectedVersion: z.number().int().positive(),
  reason: z.string().trim().min(1).max(2000),
}).strict();
const cancelAppointmentInput = z.object({
  operationId: id,
  expectedAppointmentVersion: z.number().int().positive(),
  reason: z.string().trim().min(1).max(2000),
}).strict();

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
async function commercialLead(c: { query: typeof pool.query }, leadId: string, lock = false) {
  const result = await c.query(
    `SELECT id,version,property_id FROM lead WHERE id=$1 AND inquiry_type='commercial_site_assessment'${lock ? " FOR UPDATE" : ""}`,
    [leadId],
  );
  if (!result.rowCount) throw new HttpError(404, "Commercial inquiry not found");
  return result.rows[0] as { id: string; version: number; property_id: string | null };
}
async function assessment(c: { query: typeof pool.query }, leadId: string, assessmentId: string, lock = false) {
  const result = await c.query(
    `SELECT * FROM commercial_assessment WHERE id=$1 AND lead_id=$2${lock ? " FOR UPDATE" : ""}`,
    [assessmentId, leadId],
  );
  if (!result.rowCount) throw new HttpError(404, "Assessment baseline not found");
  return result.rows[0] as Record<string, unknown> & { id: string; version: number; status: string };
}
async function detail(c: { query: typeof pool.query }, leadId: string, assessmentId: string) {
  const item = await assessment(c, leadId, assessmentId);
  // A transaction client carries one PostgreSQL connection. Keep these reads
  // serial so pg never overlaps client.query calls on that connection.
  const findings = await c.query(
    "SELECT id,position,category,condition_label,observation,priority,created_at,updated_at FROM commercial_assessment_finding WHERE assessment_id=$1 ORDER BY position",
    [assessmentId],
  );
  const recommendations = await c.query(
    "SELECT id,position,finding_id,recommendation,priority,created_at,updated_at FROM commercial_assessment_recommendation WHERE assessment_id=$1 ORDER BY position",
    [assessmentId],
  );
  const reviews = await c.query(
    "SELECT id,assessment_version,snapshot_sha256,reviewed_by,created_at FROM commercial_assessment_review WHERE assessment_id=$1 ORDER BY assessment_version DESC",
    [assessmentId],
  );
  const appointments = await c.query(
    "SELECT id,slot_id,property_id,status,version,created_by,cancelled_by,cancelled_at,cancellation_reason,created_at,updated_at FROM commercial_assessment_appointment WHERE assessment_id=$1 ORDER BY created_at DESC",
    [assessmentId],
  );
  return { ...item, findings: findings.rows, recommendations: recommendations.rows, reviews: reviews.rows, appointments: appointments.rows };
}

export async function listCommercialAssessmentBaselines(a: Actor, leadId: string) {
  sales(a); id.parse(leadId); await commercialLead(pool, leadId);
  return (await pool.query(
    "SELECT id,lead_id,property_id,title,status,version,created_by,updated_by,reviewed_by,reviewed_at,archived_by,archived_at,created_at,updated_at FROM commercial_assessment WHERE lead_id=$1 ORDER BY created_at DESC",
    [leadId],
  )).rows;
}
export async function readCommercialAssessmentBaseline(a: Actor, leadId: string, assessmentId: string) {
  sales(a); id.parse(leadId); id.parse(assessmentId); await commercialLead(pool, leadId);
  return detail(pool, leadId, assessmentId);
}
export async function createCommercialAssessmentBaseline(a: Actor, leadId: string, input: unknown) {
  sales(a); id.parse(leadId); const body = createInput.parse(input);
  const fingerprint = digest({ leadId, ...body });
  return transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", ["commercial-assessment:" + body.operationId]);
    const previous = (await c.query("SELECT * FROM commercial_assessment_create_operation WHERE id=$1", [body.operationId])).rows[0];
    if (previous) {
      if (previous.actor_id !== a.id || previous.lead_id !== leadId || previous.fingerprint !== fingerprint) throw new HttpError(409, "Operation conflict");
      return previous.result;
    }
    const lead = await commercialLead(c, leadId, true);
    if (lead.version !== body.expectedLeadVersion) throw new HttpError(409, "Inquiry changed; refresh before creating an assessment");
    if (body.propertyId !== undefined && body.propertyId !== lead.property_id) throw new HttpError(409, "Assessment property must match the linked inquiry property");
    if (lead.property_id && !(await c.query("SELECT id FROM property WHERE id=$1 AND archived=false FOR SHARE", [lead.property_id])).rowCount)
      throw new HttpError(409, "Linked inquiry property is unavailable");
    const active = await c.query("SELECT id FROM commercial_assessment WHERE lead_id=$1 AND status <> 'archived' FOR UPDATE", [leadId]);
    if (active.rowCount) throw new HttpError(409, "Archive the active assessment baseline before creating another");
    const assessmentId = randomUUID();
    await c.query(
      "INSERT INTO commercial_assessment(id,lead_id,property_id,title,scope_note,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$6)",
      [assessmentId, leadId, lead.property_id, body.title, body.scopeNote || null, a.id],
    );
    const result = { assessmentId, leadId, version: 1, leadVersion: lead.version + 1, propertyId: lead.property_id };
    await c.query("UPDATE lead SET version=version+1,last_activity_at=now() WHERE id=$1", [leadId]);
    await c.query("INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'commercial.assessment_created',$3,$4)", [randomUUID(), a.id, assessmentId, { leadId, propertyId: lead.property_id }]);
    await c.query("INSERT INTO commercial_assessment_create_operation(id,actor_id,lead_id,fingerprint,result) VALUES($1,$2,$3,$4,$5)", [body.operationId, a.id, leadId, fingerprint, result]);
    return result;
  });
}
export async function saveCommercialAssessmentBaseline(a: Actor, leadId: string, assessmentId: string, input: unknown) {
  sales(a); id.parse(leadId); id.parse(assessmentId); const body = saveInput.parse(input);
  return transaction(async (c) => {
    await commercialLead(c, leadId, true);
    const current = await assessment(c, leadId, assessmentId, true);
    if (current.status !== "draft") throw new HttpError(409, "Only draft assessment baselines can be edited");
    if (current.version !== body.expectedVersion) throw new HttpError(409, "Assessment changed; refresh before saving");
    const findingIds = body.findings.map(() => randomUUID());
    await c.query("DELETE FROM commercial_assessment_recommendation WHERE assessment_id=$1", [assessmentId]);
    await c.query("DELETE FROM commercial_assessment_finding WHERE assessment_id=$1", [assessmentId]);
    for (const [position, item] of body.findings.entries()) await c.query(
      "INSERT INTO commercial_assessment_finding(id,assessment_id,position,category,condition_label,observation,priority) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [findingIds[position], assessmentId, position, item.category, item.conditionLabel || null, item.observation, item.priority || null],
    );
    for (const [position, item] of body.recommendations.entries()) await c.query(
      "INSERT INTO commercial_assessment_recommendation(id,assessment_id,finding_id,position,recommendation,priority) VALUES($1,$2,$3,$4,$5,$6)",
      [randomUUID(), assessmentId, item.findingIndex === null ? null : findingIds[item.findingIndex], position, item.recommendation, item.priority || null],
    );
    const updated = (await c.query("UPDATE commercial_assessment SET title=$2,scope_note=$3,version=version+1,updated_by=$4,updated_at=now() WHERE id=$1 RETURNING version", [assessmentId, body.title, body.scopeNote || null, a.id])).rows[0];
    await c.query("INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'commercial.assessment_updated',$3,$4)", [randomUUID(), a.id, assessmentId, { leadId, version: updated.version, findings: body.findings.length, recommendations: body.recommendations.length }]);
    return detail(c, leadId, assessmentId);
  });
}
export async function reviewCommercialAssessmentBaseline(a: Actor, leadId: string, assessmentId: string, input: unknown) {
  sales(a); id.parse(leadId); id.parse(assessmentId); const body = z.object({ expectedVersion: z.number().int().positive() }).strict().parse(input);
  return transaction(async (c) => {
    await commercialLead(c, leadId, true); const current = await assessment(c, leadId, assessmentId, true);
    if (current.status !== "draft" || current.version !== body.expectedVersion) throw new HttpError(409, "Assessment changed; refresh before review");
    const snapshot = await detail(c, leadId, assessmentId), version = current.version + 1, snapshotValue = { ...snapshot, version, status: "reviewed" }, hash = digest(snapshotValue);
    await c.query("INSERT INTO commercial_assessment_review(id,assessment_id,assessment_version,snapshot_sha256,snapshot,reviewed_by) VALUES($1,$2,$3,$4,$5,$6)", [randomUUID(), assessmentId, version, hash, snapshotValue, a.id]);
    await c.query("UPDATE commercial_assessment SET status='reviewed',version=$2,updated_by=$3,updated_at=now(),reviewed_by=$3,reviewed_at=now() WHERE id=$1", [assessmentId, version, a.id]);
    await c.query("INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'commercial.assessment_reviewed',$3,$4)", [randomUUID(), a.id, assessmentId, { leadId, version, snapshotSha256: hash }]);
    return detail(c, leadId, assessmentId);
  });
}
export async function archiveCommercialAssessmentBaseline(a: Actor, leadId: string, assessmentId: string, input: unknown) {
  sales(a); id.parse(leadId); id.parse(assessmentId); const body = archiveInput.parse(input);
  return transaction(async (c) => {
    await commercialLead(c, leadId, true); const current = await assessment(c, leadId, assessmentId, true);
    if (current.status === "archived" || current.version !== body.expectedVersion) throw new HttpError(409, "Assessment changed; refresh before archiving");
    if ((await c.query("SELECT id FROM commercial_assessment_appointment WHERE assessment_id=$1 AND status='confirmed' FOR UPDATE", [assessmentId])).rowCount)
      throw new HttpError(409, "Cancel the confirmed appointment before archiving this assessment");
    const updated = (await c.query("UPDATE commercial_assessment SET status='archived',version=version+1,updated_by=$2,updated_at=now(),archived_by=$2,archived_at=now(),archive_reason=$3 WHERE id=$1 RETURNING version", [assessmentId, a.id, body.reason])).rows[0];
    await c.query("INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'commercial.assessment_archived',$3,$4)", [randomUUID(), a.id, assessmentId, { leadId, version: updated.version }]);
    return detail(c, leadId, assessmentId);
  });
}

const appointmentInput = z.object({
  operationId: id,
  expectedAssessmentVersion: z.number().int().positive(),
  slotId: id,
}).strict();

/** Reserve existing availability for a commercial prospect without converting it
 * to an operational property or exposing it through operational appointment APIs. */
export async function bookCommercialAssessmentAppointment(a: Actor, leadId: string, assessmentId: string, input: unknown) {
  sales(a); id.parse(leadId); id.parse(assessmentId); const body = appointmentInput.parse(input);
  const fingerprint = digest({ leadId, assessmentId, ...body });
  return transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(918278)");
    const replay = (await c.query("SELECT * FROM commercial_assessment_appointment_operation WHERE id=$1", [body.operationId])).rows[0];
    if (replay) {
      if (replay.actor_id !== a.id || replay.assessment_id !== assessmentId || replay.fingerprint !== fingerprint) throw new HttpError(409, "Operation conflict");
      return replay.result;
    }
    const lead = await commercialLead(c, leadId, true);
    const current = await assessment(c, leadId, assessmentId, true);
    if (current.version !== body.expectedAssessmentVersion) throw new HttpError(409, "Assessment changed; refresh before booking");
    if (current.status === "archived") throw new HttpError(409, "Archived assessment cannot be booked");
    if (!lead.property_id || current.property_id !== lead.property_id) throw new HttpError(409, "A linked prospect property is required before booking");
    const property = await c.query("SELECT id,lifecycle,archived FROM property WHERE id=$1 FOR SHARE", [lead.property_id]);
    if (!property.rowCount || property.rows[0].archived || property.rows[0].lifecycle !== "prospect") throw new HttpError(409, "A current prospect property is required before booking");
    const existing = await c.query("SELECT id FROM commercial_assessment_appointment WHERE assessment_id=$1 AND status='confirmed' FOR UPDATE", [assessmentId]);
    if (existing.rowCount) throw new HttpError(409, "Assessment already has a confirmed appointment");
    const slot = await c.query(
      "UPDATE assessment_slot s SET commercial_assessment_id=$2 WHERE s.id=$1 AND s.property_id IS NULL AND s.commercial_assessment_id IS NULL AND s.cancelled=false AND s.starts_at>now() AND NOT EXISTS(SELECT 1 FROM assessment_blackout b WHERE b.archived=false AND b.starts_at<s.ends_at+s.buffer_after*interval '1 minute' AND b.ends_at>s.starts_at-s.buffer_before*interval '1 minute') RETURNING id,starts_at,ends_at",
      [body.slotId, assessmentId],
    );
    if (!slot.rowCount) throw new HttpError(409, "This appointment is no longer available");
    const appointmentId = randomUUID(), result = { appointmentId, assessmentId, propertyId: lead.property_id, slotId: body.slotId, startsAt: slot.rows[0].starts_at, endsAt: slot.rows[0].ends_at };
    await c.query("INSERT INTO commercial_assessment_appointment(id,assessment_id,slot_id,property_id,created_by) VALUES($1,$2,$3,$4,$5)", [appointmentId, assessmentId, body.slotId, lead.property_id, a.id]);
    await c.query("INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'commercial.assessment_appointment_booked',$3,$4)", [randomUUID(), a.id, appointmentId, { leadId, assessmentId, slotId: body.slotId }]);
    await c.query("INSERT INTO commercial_assessment_appointment_operation(id,actor_id,assessment_id,fingerprint,result) VALUES($1,$2,$3,$4,$5)", [body.operationId, a.id, assessmentId, fingerprint, result]);
    return result;
  });
}


export async function cancelCommercialAssessmentAppointment(a: Actor, leadId: string, assessmentId: string, appointmentId: string, input: unknown) {
  sales(a); id.parse(leadId); id.parse(assessmentId); id.parse(appointmentId); const body = cancelAppointmentInput.parse(input);
  const fingerprint = digest({ action: "cancel", leadId, assessmentId, appointmentId, ...body });
  return transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(918278)");
    const replay = (await c.query("SELECT * FROM commercial_assessment_appointment_operation WHERE id=$1", [body.operationId])).rows[0];
    if (replay) {
      if (replay.actor_id !== a.id || replay.assessment_id !== assessmentId || replay.fingerprint !== fingerprint) throw new HttpError(409, "Operation conflict");
      return replay.result;
    }
    await commercialLead(c, leadId, true);
    await assessment(c, leadId, assessmentId, true);
    const appointment = (await c.query(
      "SELECT id,slot_id,status,version FROM commercial_assessment_appointment WHERE id=$1 AND assessment_id=$2 FOR UPDATE",
      [appointmentId, assessmentId],
    )).rows[0] as { id: string; slot_id: string; status: string; version: number } | undefined;
    if (!appointment) throw new HttpError(404, "Commercial assessment appointment not found");
    if (appointment.version !== body.expectedAppointmentVersion) throw new HttpError(409, "Appointment changed; refresh before cancelling");
    if (appointment.status !== "confirmed") throw new HttpError(409, "Only a confirmed appointment can be cancelled");
    const updated = await c.query(
      "UPDATE commercial_assessment_appointment SET status='cancelled',version=version+1,cancelled_by=$2,cancelled_at=now(),cancellation_reason=$3,updated_at=now() WHERE id=$1 AND status='confirmed' RETURNING version",
      [appointmentId, a.id, body.reason],
    );
    if (!updated.rowCount) throw new HttpError(409, "Appointment changed; refresh before cancelling");
    await c.query("UPDATE assessment_slot SET commercial_assessment_id=NULL WHERE id=$1 AND commercial_assessment_id=$2", [appointment.slot_id, assessmentId]);
    const result = { appointmentId, assessmentId, status: "cancelled", version: updated.rows[0].version };
    await c.query("INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'commercial.assessment_appointment_cancelled',$3,$4)", [randomUUID(), a.id, appointmentId, { leadId, assessmentId, slotId: appointment.slot_id, reason: body.reason }]);
    await c.query("INSERT INTO commercial_assessment_appointment_operation(id,actor_id,assessment_id,fingerprint,result) VALUES($1,$2,$3,$4,$5)", [body.operationId, a.id, assessmentId, fingerprint, result]);
    return result;
  });
}
