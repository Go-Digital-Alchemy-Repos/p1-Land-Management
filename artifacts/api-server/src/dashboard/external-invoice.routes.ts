import { Router } from "express";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { actor } from "./access";
import { transaction } from "./database";
import { requireOperationalChild } from "./operational-property";
import { HttpError, requireCapability } from "./policy";

export const externalInvoiceApi = Router();
const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value,
  "Invalid invoice date",
);
const recordInput = z.object({
  operationId: uuid,
  expectedVersion: z.number().int().positive(),
  expectedAmountCents: z.number().int().positive(),
  reference: z.string().trim().min(1).max(120).nullable().optional(),
  invoicedOn: date,
  note: z.string().max(2000).nullable().optional(),
});
const voidInput = z.object({
  operationId: uuid,
  reason: z.string().trim().min(1).max(2000),
});
const fingerprint = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const publicRecord = (row: any) => ({
  id: row.id,
  billingDraftId: row.billing_draft_id,
  reference: row.reference,
  invoicedOn: String(row.invoiced_on).slice(0, 10),
  note: row.note,
  recordedBy: row.recorded_by,
  recordedAt: row.recorded_at,
  voidedBy: row.voided_by,
  voidedAt: row.voided_at,
  voidReason: row.void_reason,
});

externalInvoiceApi.post("/billing/:id/external-invoice", async (req, res) => {
  const a = await actor(req);
  requireCapability(a, "revenue.billing");
  const draftId = uuid.parse(req.params.id);
  const input = recordInput.parse(req.body);
  const normalized = { ...input, reference: input.reference || null, note: input.note || null };
  const hash = fingerprint(normalized);
  const result = await transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", ["external-invoice:" + input.operationId]);
    const previous = (await c.query("SELECT * FROM billing_draft_external_invoice WHERE operation_id=$1", [input.operationId])).rows[0];
    if (previous) {
      if (previous.billing_draft_id !== draftId || previous.recorded_by !== a.id || previous.operation_fingerprint !== hash)
        throw new HttpError(409, "operation_id_conflict");
      return { row: previous, created: false };
    }
    await requireOperationalChild(c, "billing_draft", draftId);
    const draft = (await c.query("SELECT id,amount_cents,version,status,posting_request_id FROM billing_draft WHERE id=$1 FOR UPDATE", [draftId])).rows[0];
    if (!draft) throw new HttpError(404, "Billing draft not found");
    if (draft.status === "posted") throw new HttpError(409, "already_posted");
    if (draft.posting_request_id) throw new HttpError(409, "posting_outcome_requires_review");
    if (draft.version !== input.expectedVersion || Number(draft.amount_cents) !== input.expectedAmountCents)
      throw new HttpError(409, "billing_draft_changed");
    if ((await c.query("SELECT 1 FROM billing_draft_external_invoice WHERE billing_draft_id=$1 AND voided_at IS NULL", [draftId])).rowCount)
      throw new HttpError(409, "already_invoiced_externally");
    const row = (await c.query(
      "INSERT INTO billing_draft_external_invoice(id,billing_draft_id,reference,invoiced_on,note,recorded_by,operation_id,operation_fingerprint) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
      [randomUUID(), draftId, normalized.reference, input.invoicedOn, normalized.note, a.id, input.operationId, hash],
    )).rows[0];
    await c.query("INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'billing.external_invoice.recorded',$3,$4)",
      [randomUUID(), a.id, draftId, { amountCents: Number(draft.amount_cents), reference: normalized.reference, externalInvoiceId: row.id }]);
    return { row, created: true };
  });
  res.status(result.created ? 201 : 200).json(publicRecord(result.row));
});

externalInvoiceApi.post("/billing/:id/external-invoice/void", async (req, res) => {
  const a = await actor(req);
  requireCapability(a, "revenue.billing");
  const draftId = uuid.parse(req.params.id);
  const input = voidInput.parse(req.body);
  const row = await transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", ["external-invoice-void:" + input.operationId]);
    await requireOperationalChild(c, "billing_draft", draftId);
    const draft = (await c.query("SELECT id,amount_cents FROM billing_draft WHERE id=$1 FOR UPDATE", [draftId])).rows[0];
    if (!draft) throw new HttpError(404, "Billing draft not found");
    const priorOperation = (await c.query("SELECT * FROM billing_draft_external_invoice WHERE void_operation_id=$1", [input.operationId])).rows[0];
    if (priorOperation) {
      if (priorOperation.billing_draft_id !== draftId || priorOperation.void_reason !== input.reason || priorOperation.voided_by !== a.id)
        throw new HttpError(409, "operation_id_conflict");
      return priorOperation;
    }
    const active = (await c.query("SELECT * FROM billing_draft_external_invoice WHERE billing_draft_id=$1 AND voided_at IS NULL FOR UPDATE", [draftId])).rows[0];
    if (!active) throw new HttpError(409, "already_voided");
    const changed = (await c.query(
      "UPDATE billing_draft_external_invoice SET voided_by=$2,voided_at=now(),void_reason=$3,void_operation_id=$4 WHERE id=$1 AND voided_at IS NULL RETURNING *",
      [active.id, a.id, input.reason, input.operationId],
    )).rows[0];
    if (!changed) {
      const current = (await c.query("SELECT * FROM billing_draft_external_invoice WHERE id=$1", [active.id])).rows[0];
      if (current?.void_operation_id === input.operationId) return current;
      throw new HttpError(409, "already_voided");
    }
    await c.query("INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'billing.external_invoice.voided',$3,$4)",
      [randomUUID(), a.id, draftId, { amountCents: Number(draft.amount_cents), reference: active.reference, externalInvoiceId: active.id, reason: input.reason }]);
    return changed;
  });
  res.json(publicRecord(row));
});
