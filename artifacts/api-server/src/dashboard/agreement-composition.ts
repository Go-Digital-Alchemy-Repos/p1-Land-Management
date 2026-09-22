import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { actor, propertyAccess, type Actor } from "./access";
import { pool, transaction } from "./database";
import { HttpError, requireRole } from "./policy";
import { standardAgreementTemplates } from "./agreement-standard-templates";

const officeRoles = ["owner", "manager", "sales"] as const;
const managerRoles = ["owner", "manager"] as const;
const uuid = z.string().uuid();
const lineItem = z.object({
  description: z.string().trim().min(1).max(2_000),
  unit: z.string().trim().min(1).max(100).optional(),
  quantity: z.number().positive().max(1_000_000),
  unitPriceCents: z.number().int().min(0).max(10_000_000_000),
}).strict();
const draftCreate = z.object({
  templateId: uuid,
  clientId: uuid,
  propertyId: uuid.optional(),
  title: z.string().trim().min(1).max(500).optional(),
}).strict();
const draftUpdate = z.object({
  expectedVersion: z.number().int().positive(),
  title: z.string().trim().min(1).max(500).optional(),
  body: z.string().trim().min(1).max(50_000).optional(),
  propertyId: uuid.nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 1, "Provide an editable draft field");
const lineItemUpdate = lineItem.extend({ expectedVersion: z.number().int().positive() }).strict();
const versionInput = z.object({ expectedVersion: z.number().int().positive() }).strict();

function office(actor: Actor) { requireRole(actor.role, [...officeRoles]); }
function manager(actor: Actor) { requireRole(actor.role, [...managerRoles]); }
async function event(c: any, draftId: string, actorId: string, action: string, priorVersion: number | null, resultingVersion: number, details: unknown = {}) {
  await c.query(
    "INSERT INTO agreement_composition_event(id,draft_id,actor_id,action,prior_version,resulting_version,details) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [randomUUID(), draftId, actorId, action, priorVersion, resultingVersion, JSON.stringify(details)],
  );
  await c.query(
    "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,$3,$4,$5)",
    [randomUUID(), actorId, `agreement_composition.${action}`, draftId, JSON.stringify(details)],
  );
}
async function assertPropertyForClient(c: any, actor: Actor, clientId: string, propertyId: string | null) {
  if (!propertyId) return;
  await propertyAccess(actor, propertyId);
  const property = (await c.query("SELECT 1 FROM property WHERE id=$1 AND client_id=$2 FOR SHARE", [propertyId, clientId])).rows[0];
  if (!property) throw new HttpError(400, "Choose a property that belongs to this client account");
}
async function readDraft(c: any, draftId: string, lock = false) {
  const draft = (await c.query(
    `SELECT d.*,c.name AS client_name,p.name AS property_name,t.name AS template_name
       FROM agreement_composition_draft d
       JOIN client c ON c.id=d.client_id
       LEFT JOIN property p ON p.id=d.property_id
       JOIN agreement_template t ON t.id=d.template_id
       WHERE d.id=$1 ${lock ? "FOR UPDATE OF d" : ""}`,
    [draftId],
  )).rows[0];
  if (!draft) throw new HttpError(404, "Agreement draft not found");
  const lines = (await c.query(
    "SELECT id,position,description,unit,quantity,unit_price_cents FROM agreement_composition_line_item WHERE draft_id=$1 ORDER BY position,id",
    [draftId],
  )).rows;
  return { ...draft, line_items: lines };
}
function publicDraft(draft: any) {
  return {
    id: draft.id, clientId: draft.client_id, clientName: draft.client_name,
    propertyId: draft.property_id, propertyName: draft.property_name,
    templateId: draft.template_id, templateName: draft.template_name,
    templateVersion: Number(draft.template_version), templateSnapshot: draft.template_snapshot,
    title: draft.title, body: draft.body, version: Number(draft.version), status: draft.status,
    createdAt: draft.created_at, updatedAt: draft.updated_at,
    lineItems: draft.line_items.map((line: any) => ({
      id: line.id, position: Number(line.position), description: line.description, unit: line.unit,
      quantity: Number(line.quantity), unitPriceCents: Number(line.unit_price_cents),
    })),
  };
}
export async function createAgreementCompositionDraft(a: Actor, input: unknown) {
  office(a);
  const body = draftCreate.parse(input);
  return transaction(async (c) => {
    const client = (await c.query("SELECT id,name FROM client WHERE id=$1 AND archived=false FOR SHARE", [body.clientId])).rows[0];
    if (!client) throw new HttpError(404, "Active client account not found");
    await assertPropertyForClient(c, a, body.clientId, body.propertyId || null);
    const template = (await c.query("SELECT id,name,version,body FROM agreement_template WHERE id=$1 AND active=true FOR SHARE", [body.templateId])).rows[0];
    if (!template) throw new HttpError(409, "Choose an active agreement template");
    const id = randomUUID();
    const title = body.title || `${template.name} · ${client.name}`;
    await c.query(
      `INSERT INTO agreement_composition_draft(id,client_id,property_id,template_id,template_version,template_snapshot,title,body,created_by,updated_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$6,$8,$8)`,
      [id, body.clientId, body.propertyId || null, template.id, template.version, template.body, title, a.id],
    );
    await event(c, id, a.id, "created", null, 1, { templateId: template.id, templateVersion: template.version, clientId: client.id, propertyId: body.propertyId || null });
    return publicDraft(await readDraft(c, id));
  });
}
export async function updateAgreementCompositionDraft(a: Actor, draftId: string, input: unknown) {
  office(a);
  const body = draftUpdate.parse(input);
  return transaction(async (c) => {
    const draft = await readDraft(c, draftId, true);
    if (draft.status !== "draft") throw new HttpError(409, "Archived agreement drafts cannot be edited");
    if (Number(draft.version) !== body.expectedVersion) throw new HttpError(409, "Agreement draft changed; reload before saving");
    const propertyId = body.propertyId === undefined ? draft.property_id : body.propertyId;
    await assertPropertyForClient(c, a, draft.client_id, propertyId);
    const next = Number(draft.version) + 1;
    await c.query(
      "UPDATE agreement_composition_draft SET title=$2,body=$3,property_id=$4,version=$5,updated_by=$6,updated_at=now() WHERE id=$1",
      [draftId, body.title ?? draft.title, body.body ?? draft.body, propertyId, next, a.id],
    );
    await event(c, draftId, a.id, "updated", Number(draft.version), next, { changed: Object.keys(body).filter((key) => key !== "expectedVersion") });
    return publicDraft(await readDraft(c, draftId));
  });
}
export async function addAgreementCompositionLineItem(a: Actor, draftId: string, input: unknown) {
  office(a);
  const body = lineItemUpdate.parse(input);
  return transaction(async (c) => {
    const draft = await readDraft(c, draftId, true);
    if (draft.status !== "draft") throw new HttpError(409, "Archived agreement drafts cannot be edited");
    if (Number(draft.version) !== body.expectedVersion) throw new HttpError(409, "Agreement draft changed; reload before adding a line item");
    if (draft.line_items.length >= 100) throw new HttpError(400, "An agreement draft may have at most 100 line items");
    const position = draft.line_items.length ? Math.max(...draft.line_items.map((line: any) => Number(line.position))) + 1 : 0;
    const lineId = randomUUID(), next = Number(draft.version) + 1;
    await c.query("INSERT INTO agreement_composition_line_item(id,draft_id,position,description,unit,quantity,unit_price_cents) VALUES($1,$2,$3,$4,$5,$6,$7)", [lineId, draftId, position, body.description, body.unit || null, body.quantity, body.unitPriceCents]);
    await c.query("UPDATE agreement_composition_draft SET version=$2,updated_by=$3,updated_at=now() WHERE id=$1", [draftId, next, a.id]);
    await event(c, draftId, a.id, "line_item_added", Number(draft.version), next, { lineItemId: lineId });
    return publicDraft(await readDraft(c, draftId));
  });
}
export async function updateAgreementCompositionLineItem(a: Actor, draftId: string, lineId: string, input: unknown) {
  office(a);
  const body = lineItemUpdate.parse(input);
  return transaction(async (c) => {
    const draft = await readDraft(c, draftId, true);
    if (draft.status !== "draft") throw new HttpError(409, "Archived agreement drafts cannot be edited");
    if (Number(draft.version) !== body.expectedVersion) throw new HttpError(409, "Agreement draft changed; reload before updating a line item");
    const updated = await c.query("UPDATE agreement_composition_line_item SET description=$3,unit=$4,quantity=$5,unit_price_cents=$6 WHERE id=$1 AND draft_id=$2", [lineId, draftId, body.description, body.unit || null, body.quantity, body.unitPriceCents]);
    if (!updated.rowCount) throw new HttpError(404, "Agreement line item not found");
    const next = Number(draft.version) + 1;
    await c.query("UPDATE agreement_composition_draft SET version=$2,updated_by=$3,updated_at=now() WHERE id=$1", [draftId, next, a.id]);
    await event(c, draftId, a.id, "line_item_updated", Number(draft.version), next, { lineItemId: lineId });
    return publicDraft(await readDraft(c, draftId));
  });
}
export async function removeAgreementCompositionLineItem(a: Actor, draftId: string, lineId: string, input: unknown) {
  office(a);
  const body = versionInput.parse(input);
  return transaction(async (c) => {
    const draft = await readDraft(c, draftId, true);
    if (draft.status !== "draft") throw new HttpError(409, "Archived agreement drafts cannot be edited");
    if (Number(draft.version) !== body.expectedVersion) throw new HttpError(409, "Agreement draft changed; reload before removing a line item");
    const deleted = await c.query("DELETE FROM agreement_composition_line_item WHERE id=$1 AND draft_id=$2", [lineId, draftId]);
    if (!deleted.rowCount) throw new HttpError(404, "Agreement line item not found");
    const next = Number(draft.version) + 1;
    await c.query("UPDATE agreement_composition_draft SET version=$2,updated_by=$3,updated_at=now() WHERE id=$1", [draftId, next, a.id]);
    await event(c, draftId, a.id, "line_item_removed", Number(draft.version), next, { lineItemId: lineId });
    return publicDraft(await readDraft(c, draftId));
  });
}
export async function archiveAgreementCompositionDraft(a: Actor, draftId: string, input: unknown) {
  office(a);
  const body = versionInput.parse(input);
  return transaction(async (c) => {
    const draft = await readDraft(c, draftId, true);
    if (draft.status !== "draft") throw new HttpError(409, "Agreement draft is already archived");
    if (Number(draft.version) !== body.expectedVersion) throw new HttpError(409, "Agreement draft changed; reload before archiving");
    const next = Number(draft.version) + 1;
    await c.query("UPDATE agreement_composition_draft SET status='archived',version=$2,updated_by=$3,updated_at=now() WHERE id=$1", [draftId, next, a.id]);
    await event(c, draftId, a.id, "archived", Number(draft.version), next);
    return publicDraft(await readDraft(c, draftId));
  });
}

export async function installStandardAgreementTemplate(a: Actor, slug: string) {
  manager(a);
  const source = standardAgreementTemplates.find((candidate) => candidate.slug === slug);
  if (!source) throw new HttpError(404, "Standard agreement template source not found");
  return transaction(async (c) => {
    const existing = (await c.query("SELECT id FROM agreement_template WHERE source_slug=$1 FOR UPDATE", [source.slug])).rows[0];
    if (existing) return { id: existing.id, created: false };
    const id = randomUUID();
    await c.query("INSERT INTO agreement_template(id,name,body,source_slug,created_by) VALUES($1,$2,$3,$4,$5)", [id, source.name, source.body, source.slug, a.id]);
    await c.query("INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'agreement_template.standard_installed',$3,$4)", [randomUUID(), a.id, id, JSON.stringify({ sourceSlug: source.slug })]);
    return { id, created: true };
  });
}

export const agreementCompositionApi = Router();
agreementCompositionApi.get("/agreement-template-sources", async (req, res) => {
  manager(await actor(req));
  res.json(standardAgreementTemplates.map(({ slug, name }) => ({ slug, name })));
});
agreementCompositionApi.post("/agreement-template-sources/:slug/install", async (req, res) => {
  const result = await installStandardAgreementTemplate(await actor(req), req.params.slug);
  res.status(result.created ? 201 : 200).json(result);
});
agreementCompositionApi.get("/agreement-drafts", async (req, res) => {
  const a = await actor(req); office(a);
  const status = z.enum(["draft", "archived"]).optional().parse(req.query.status);
  const rows = (await pool.query(
    `SELECT d.*,c.name AS client_name,p.name AS property_name,t.name AS template_name
       FROM agreement_composition_draft d JOIN client c ON c.id=d.client_id
       LEFT JOIN property p ON p.id=d.property_id JOIN agreement_template t ON t.id=d.template_id
       WHERE ($1::text IS NULL OR d.status=$1) ORDER BY d.updated_at DESC,d.id DESC LIMIT 100`, [status || null],
  )).rows;
  const items = [];
  for (const row of rows) items.push(publicDraft(await readDraft(pool, row.id)));
  res.json(items);
});
agreementCompositionApi.post("/agreement-drafts", async (req, res) =>
  res.status(201).json(await createAgreementCompositionDraft(await actor(req), req.body)),
);
agreementCompositionApi.get("/agreement-drafts/:id", async (req, res) => {
  const a = await actor(req); office(a);
  res.json(publicDraft(await readDraft(pool, uuid.parse(req.params.id))));
});
agreementCompositionApi.patch("/agreement-drafts/:id", async (req, res) =>
  res.json(await updateAgreementCompositionDraft(await actor(req), uuid.parse(req.params.id), req.body)),
);
agreementCompositionApi.post("/agreement-drafts/:id/line-items", async (req, res) =>
  res.status(201).json(await addAgreementCompositionLineItem(await actor(req), uuid.parse(req.params.id), req.body)),
);
agreementCompositionApi.patch("/agreement-drafts/:id/line-items/:lineId", async (req, res) =>
  res.json(await updateAgreementCompositionLineItem(await actor(req), uuid.parse(req.params.id), uuid.parse(req.params.lineId), req.body)),
);
agreementCompositionApi.delete("/agreement-drafts/:id/line-items/:lineId", async (req, res) =>
  res.json(await removeAgreementCompositionLineItem(await actor(req), uuid.parse(req.params.id), uuid.parse(req.params.lineId), req.body)),
);
agreementCompositionApi.post("/agreement-drafts/:id/archive", async (req, res) =>
  res.json(await archiveAgreementCompositionDraft(await actor(req), uuid.parse(req.params.id), req.body)),
);
