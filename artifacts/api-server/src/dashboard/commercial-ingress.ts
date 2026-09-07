import { listCommercialInquiries } from "./commercial-queue.service";
import { Router, raw, type ErrorRequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { receiveCommercialInquiry } from "./commercial-ingress.service";
import { actor } from "./access";
import { pool, transaction } from "./database";
import { HttpError, requireRole } from "./policy";
export const commercialIngress = Router();
const buckets = new Map<string, { expires: number; count: number }>();
commercialIngress.post(
  "/commercial-inquiries",
  (req, res, next) => {
    if (
      req.headers.cookie ||
      req.headers.origin ||
      Object.keys(req.query).length
    )
      return res.status(403).json({ error: "commercial_service_only" });
    const now = Date.now(),
      address = req.socket.remoteAddress || "unknown";
    for (const [key, value] of buckets)
      if (value.expires < now) buckets.delete(key);
    let bucket = buckets.get(address);
    if (!bucket) {
      if (buckets.size >= 1000)
        return res.status(429).json({ error: "commercial_rate_limit" });
      bucket = { expires: now + 60000, count: 0 };
      buckets.set(address, bucket);
    }
    if (++bucket.count > 120) {
      res.setHeader("Retry-After", "60");
      return res.status(429).json({ error: "commercial_rate_limit" });
    }
    return next();
  },
  raw({ type: "application/json", limit: "64kb" }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body))
      throw new HttpError(415, "commercial_json_required");
    const result = await receiveCommercialInquiry(req.body, {
      keyId: req.get("x-p1-key-id"),
      sentAt: req.get("x-p1-sent-at"),
      signature: req.get("x-p1-signature"),
    });
    res.status(result.duplicate ? 200 : 201).json(result);
  },
);
commercialIngress.use(((error, _req, res, next) => {
  if (error?.type === "entity.too.large") {
    res.status(413).json({ error: "commercial_payload_too_large" });
    return;
  }
  next(error);
}) satisfies ErrorRequestHandler);
export const commercialStaffApi = Router();
const salesRoles = ["owner", "manager", "sales"] as const;
commercialStaffApi.get("/commercial-inquiries", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, [...salesRoles]);
  res.json(await listCommercialInquiries(req.query));
});
commercialStaffApi.get("/commercial-inquiries/:id", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, [...salesRoles]);
  const id = z.string().uuid().parse(req.params.id);
  const row = (
    await pool.query(
      "SELECT l.*,r.submission_id,r.received_at,r.raw_intake FROM lead l JOIN commercial_intake_receipt r ON r.lead_id=l.id WHERE l.id=$1",
      [id],
    )
  ).rows[0];
  if (!row) throw new HttpError(404, "Inquiry not found");
  res.json(row);
});
commercialStaffApi.patch(
  "/commercial-inquiries/:id/follow-up",
  async (req, res) => {
    const a = await actor(req);
    requireRole(a.role, [...salesRoles]);
    const id = z.string().uuid().parse(req.params.id);
    const body = z
      .object({
        expectedVersion: z.number().int().positive(),
        ownerId: z.string().min(1).max(200).nullable(),
        nextAction: z.string().trim().min(1).max(2000),
        nextActionDueAt: z.string().datetime().nullable(),
        status: z.enum([
          "new",
          "contacted",
          "qualified",
          "proposal",
          "won",
          "lost",
        ]),
      })
      .strict()
      .parse(req.body);
    const result = await transaction(async (c) => {
      if (
        body.ownerId &&
        !(
          await c.query(
            "SELECT 1 FROM staff_profile WHERE user_id=$1 AND active=true AND role IN ('owner','manager','sales')",
            [body.ownerId],
          )
        ).rowCount
      )
        throw new HttpError(400, "Active sales owner required");
      const row = (
        await c.query(
          "UPDATE lead SET owner_id=$2,next_action=$3,next_action_due_at=$4,status=$5,last_activity_at=now(),version=version+1 WHERE id=$1 AND version=$6 AND inquiry_type='commercial_site_assessment' RETURNING *",
          [
            id,
            body.ownerId,
            body.nextAction,
            body.nextActionDueAt,
            body.status,
            body.expectedVersion,
          ],
        )
      ).rows[0];
      if (!row)
        throw new HttpError(409, "Inquiry changed; refresh before saving");
      await c.query(
        "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'commercial.followup_updated',$3,$4)",
        [
          randomUUID(),
          a.id,
          id,
          { version: row.version, status: row.status, ownerId: body.ownerId },
        ],
      );
      return row;
    });
    res.json(result);
  },
);
commercialStaffApi.get("/commercial-ingress-keys", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner"]);
  res.json(
    (
      await pool.query(
        "SELECT * FROM integration_ingress_key ORDER BY created_at DESC",
      )
    ).rows,
  );
});
commercialStaffApi.post(
  "/commercial-ingress-keys/:id/revoke",
  async (req, res) => {
    const a = await actor(req);
    requireRole(a.role, ["owner"]);
    const id = z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,64}$/)
      .parse(req.params.id);
    await transaction(async (c) => {
      if (
        !(
          await c.query(
            "UPDATE integration_ingress_key SET enabled=false,revoked_at=now() WHERE key_id=$1 RETURNING key_id",
            [id],
          )
        ).rowCount
      )
        throw new HttpError(404, "Integration key not found");
      await c.query(
        "INSERT INTO audit_event(id,user_id,action,entity_id) VALUES($1,$2,'commercial.issuer_revoked',$3)",
        [randomUUID(), a.id, id],
      );
    });
    res.json({ ok: true });
  },
);
