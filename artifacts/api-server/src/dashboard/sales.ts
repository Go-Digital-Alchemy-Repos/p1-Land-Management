import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { actor } from "./access";
import { transaction } from "./database";
import { requireRole, HttpError } from "./policy";
export const salesApi = Router();
const id = z.string().uuid(),
  text = z.string().trim().min(1).max(10000);
salesApi.post("/leads/:id/convert", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "sales"]);
  const key = id.parse(req.params.id);
  const b = z
    .object({ clientId: id.optional(), propertyName: text, address: text })
    .parse(req.body);
  const result = await transaction(async (c) => {
    const lead = (
      await c.query("SELECT * FROM lead WHERE id=$1 FOR UPDATE", [key])
    ).rows[0];
    if (!lead) throw new HttpError(404, "Inquiry not found");
    if (lead.converted_property_id)
      return {
        clientId: lead.converted_client_id,
        propertyId: lead.converted_property_id,
      };
    if (lead.inquiry_type === "commercial_site_assessment" && !lead.email)
      throw new HttpError(409, "Record a verified contact email before converting this commercial inquiry");
    let clientId = b.clientId;
    if (!clientId) {
      clientId = randomUUID();
      await c.query(
        "INSERT INTO client(id,name,email,phone) VALUES($1,$2,$3,$4)",
        [clientId, lead.name, lead.email, lead.phone],
      );
    }
    const propertyId = randomUUID();
    await c.query(
      "INSERT INTO property(id,client_id,name,address) VALUES($1,$2,$3,$4)",
      [propertyId, clientId, b.propertyName, b.address],
    );
    await c.query(
      "UPDATE lead SET converted_client_id=$2,converted_property_id=$3,status='qualified',version=version+1,last_activity_at=now() WHERE id=$1",
      [key, clientId, propertyId],
    );
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id) VALUES($1,$2,$3,$4)",
      [randomUUID(), a.id, "lead.converted", key],
    );
    return { clientId, propertyId };
  });
  res.json(result);
});
salesApi.post("/estimates/:id/revise", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "sales"]);
  const key = id.parse(req.params.id);
  const b = z
    .object({
      revision: z.number().int().positive(),
      title: text,
      scope: text,
      amountCents: z.number().int().positive().max(1e10),
    })
    .parse(req.body);
  const result = await transaction(async (c) => {
    const e = (
      await c.query("SELECT * FROM estimate WHERE id=$1 FOR UPDATE", [key])
    ).rows[0];
    if (!e || !e.is_current || e.revision !== b.revision)
      throw new HttpError(409, "Estimate changed; refresh before revising");
    if (e.status === "approved")
      throw new HttpError(
        409,
        "Approved scope is immutable; create a change order",
      );
    await c.query("UPDATE estimate SET is_current=false WHERE id=$1", [key]);
    const next = randomUUID();
    await c.query(
      "INSERT INTO estimate(id,property_id,title,scope,amount_cents,revision,series_id,change_order_for) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        next,
        e.property_id,
        b.title,
        b.scope,
        b.amountCents,
        e.revision + 1,
        e.series_id,
        e.change_order_for,
      ],
    );
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id) VALUES($1,$2,$3,$4)",
      [randomUUID(), a.id, "estimate.revised", next],
    );
    return { id: next };
  });
  res.status(201).json(result);
});
salesApi.post("/estimates/:id/change-order", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "sales"]);
  const key = id.parse(req.params.id);
  const b = z
    .object({
      title: text,
      scope: text,
      amountCents: z.number().int().positive().max(1e10),
    })
    .parse(req.body);
  const next = randomUUID();
  await transaction(async (c) => {
    const e = (
      await c.query(
        "SELECT property_id FROM estimate WHERE id=$1 AND status='approved' FOR UPDATE",
        [key],
      )
    ).rows[0];
    if (!e) throw new HttpError(409, "An approved estimate is required");
    await c.query(
      "INSERT INTO estimate(id,property_id,title,scope,amount_cents,change_order_for) VALUES($1,$2,$3,$4,$5,$6)",
      [next, e.property_id, b.title, b.scope, b.amountCents, key],
    );
  });
  res.status(201).json({ id: next });
});
