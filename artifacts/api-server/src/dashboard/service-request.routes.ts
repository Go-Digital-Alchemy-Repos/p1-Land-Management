import { Router } from "express";
import { createHash, randomUUID } from "node:crypto";
import {
  serviceRequestConversionSchema,
  serviceRequestTransitionSchema,
} from "@workspace/api-zod/dashboard";
import { z } from "zod";
import { actor, propertyAccess, type Actor } from "./access";
import { pool, transaction } from "./database";
import { HttpError, requireRole } from "./policy";

export const serviceRequestApi = Router();

const id = z.string().uuid();
const office = ["owner", "manager", "dispatch", "sales", "finance"] as const;
const mutators = ["owner", "manager", "dispatch"] as const;
const clientStatus: Record<string, string> = {
  new: "received",
  triaged: "under_review",
  scheduled: "service_planning",
  converted: "work_planning",
  closed: "closed",
  cancelled: "cancelled",
};
const transitions: Record<string, readonly string[]> = {
  new: ["triaged", "closed", "cancelled"],
  triaged: ["scheduled", "closed", "cancelled"],
  scheduled: ["triaged", "closed", "cancelled"],
  converted: [],
  closed: [],
  cancelled: [],
};

function requireOfficeRead(a: Actor) {
  requireRole(a.role, [...office]);
}

function requireMutator(a: Actor) {
  requireRole(a.role, [...mutators]);
}

async function requestRow(requestId: string) {
  const row = (
    await pool.query(
      "SELECT r.*,p.name AS property_name,p.client_id FROM service_request r JOIN property p ON p.id=r.property_id AND p.lifecycle='operational' AND p.client_id IS NOT NULL WHERE r.id=$1",
      [requestId],
    )
  ).rows[0];
  if (!row) throw new HttpError(404, "Service request not found");
  return row;
}

async function lockedRequest(c: { query: Function }, requestId: string) {
  const row = (
    await c.query(
      "SELECT r.*,p.name AS property_name,p.client_id FROM service_request r JOIN property p ON p.id=r.property_id AND p.lifecycle='operational' AND p.client_id IS NOT NULL WHERE r.id=$1 FOR UPDATE OF r,p",
      [requestId],
    )
  ).rows[0];
  if (!row) throw new HttpError(404, "Service request not found");
  return row;
}

function projection(a: Actor, row: any) {
  if (a.role === "client")
    return {
      id: row.id,
      property_id: row.property_id,
      property_name: row.property_name,
      description: row.description,
      status: clientStatus[row.status] || "under_review",
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  return row;
}

async function event(
  c: { query: Function },
  input: {
    requestId: string;
    actorId: string;
    eventType: "created" | "transitioned" | "converted";
    priorVersion: number | null;
    resultingVersion: number;
    fromStatus?: string | null;
    toStatus?: string | null;
    reason?: string | null;
    details?: unknown;
  },
) {
  await c.query(
    "INSERT INTO service_request_event(id,service_request_id,actor_id,event_type,prior_version,resulting_version,from_status,to_status,reason,details) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
    [
      randomUUID(),
      input.requestId,
      input.actorId,
      input.eventType,
      input.priorVersion,
      input.resultingVersion,
      input.fromStatus || null,
      input.toStatus || null,
      input.reason || null,
      JSON.stringify(input.details || {}),
    ],
  );
}

async function audit(
  c: { query: Function },
  actorId: string,
  action: string,
  entityId: string,
  details: unknown,
) {
  await c.query(
    "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,$3,$4,$5)",
    [randomUUID(), actorId, action, entityId, JSON.stringify(details)],
  );
}

serviceRequestApi.get("/service-requests", async (req, res) => {
  const a = await actor(req);
  if (a.role === "client") {
    const rows = await pool.query(
      "SELECT r.*,p.name AS property_name FROM service_request r JOIN property p ON p.id=r.property_id AND p.lifecycle='operational' JOIN client_access ca ON ca.client_id=p.client_id AND ca.user_id=$1 ORDER BY r.created_at DESC",
      [a.id],
    );
    res.json(rows.rows.map((row) => projection(a, row)));
    return;
  }
  requireOfficeRead(a);
  const rows = await pool.query(
    "SELECT r.*,p.name AS property_name FROM service_request r JOIN property p ON p.id=r.property_id AND p.lifecycle='operational' AND p.client_id IS NOT NULL ORDER BY r.created_at DESC",
  );
  res.json(rows.rows);
});

serviceRequestApi.get("/service-requests/:id", async (req, res) => {
  const a = await actor(req);
  const row = await requestRow(id.parse(req.params.id));
  if (a.role === "client") await propertyAccess(a, row.property_id);
  else requireOfficeRead(a);
  res.json(projection(a, row));
});

serviceRequestApi.post(
  "/service-requests/:id/transitions",
  async (req, res) => {
    const a = await actor(req);
    requireMutator(a);
    const requestId = id.parse(req.params.id);
    const b = serviceRequestTransitionSchema.parse(req.body);
    const result = await transaction(async (c) => {
      const row = await lockedRequest(c, requestId);
      if (Number(row.version) !== b.expectedVersion)
        throw new HttpError(409, "Service request changed");
      if (!transitions[row.status]?.includes(b.status))
        throw new HttpError(
          409,
          "This service request transition is not allowed",
        );
      const version = Number(row.version) + 1;
      await c.query(
        "UPDATE service_request SET status=$2,version=$3,updated_at=now() WHERE id=$1",
        [requestId, b.status, version],
      );
      await event(c, {
        requestId,
        actorId: a.id,
        eventType: "transitioned",
        priorVersion: Number(row.version),
        resultingVersion: version,
        fromStatus: row.status,
        toStatus: b.status,
        reason: b.reason,
      });
      await audit(c, a.id, "service_request.transitioned", requestId, {
        from: row.status,
        to: b.status,
        priorVersion: Number(row.version),
        version,
        reason: b.reason,
      });
      return { id: requestId, status: b.status, version };
    });
    res.json(result);
  },
);

serviceRequestApi.get("/service-requests/:id/history", async (req, res) => {
  const a = await actor(req);
  requireOfficeRead(a);
  const requestId = id.parse(req.params.id);
  await requestRow(requestId);
  const rows = await pool.query(
    "SELECT e.* FROM service_request_event e JOIN service_request r ON r.id=e.service_request_id JOIN property p ON p.id=r.property_id AND p.lifecycle='operational' AND p.client_id IS NOT NULL WHERE e.service_request_id=$1 ORDER BY e.created_at DESC",
    [requestId],
  );
  res.json(rows.rows);
});

serviceRequestApi.post(
  "/service-requests/:id/conversion-preview",
  async (req, res) => {
    const a = await actor(req);
    requireMutator(a);
    const requestId = id.parse(req.params.id);
    const b = serviceRequestConversionSchema
      .omit({ operationId: true, expectedRequestVersion: true })
      .parse(req.body);
    const row = await requestRow(requestId);
    if (!["triaged", "scheduled"].includes(row.status))
      throw new HttpError(
        409,
        "Only triaged requests can be prepared for conversion",
      );
    res.json({
      request: projection(a, row),
      workOrder: {
        propertyId: row.property_id,
        title: b.title,
        scope: b.scope,
        checklist: b.checklist,
        prerequisites: b.prerequisites,
        status: "draft",
        assignedTo: null,
        scheduledAt: null,
      },
      providerActions: [],
    });
  },
);

serviceRequestApi.post(
  "/service-requests/:id/conversions",
  async (req, res) => {
    const a = await actor(req);
    requireMutator(a);
    const requestId = id.parse(req.params.id);
    const b = serviceRequestConversionSchema.parse(req.body);
    const fingerprint = createHash("sha256")
      .update(JSON.stringify({ requestId, ...b }))
      .digest("hex");
    const result = await transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        "service-request-conversion:" + b.operationId,
      ]);
      const prior = (
        await c.query(
          "SELECT operation_id,actor_id,fingerprint,work_order_id FROM service_request_conversion WHERE operation_id=$1",
          [b.operationId],
        )
      ).rows[0];
      if (prior) {
        if (prior.actor_id !== a.id || prior.fingerprint !== fingerprint)
          throw new HttpError(
            409,
            "Service request conversion operation ID conflict",
          );
        return {
          id: prior.work_order_id,
          operationId: prior.operation_id,
          created: false,
        };
      }
      const row = await lockedRequest(c, requestId);
      if (Number(row.version) !== b.expectedRequestVersion)
        throw new HttpError(409, "Service request changed");
      if (!["triaged", "scheduled"].includes(row.status))
        throw new HttpError(409, "Only triaged requests can be converted");
      const workOrderId = randomUUID();
      const version = Number(row.version) + 1;
      // Conversion records a planning draft only. It never assigns a crew, sets a
      // date, queues a provider call, posts billing, or publishes client material.
      await c.query(
        "INSERT INTO work_order(id,property_id,title,scope,checklist,prerequisites,status) VALUES($1,$2,$3,$4,$5,$6,'draft')",
        [
          workOrderId,
          row.property_id,
          b.title,
          b.scope,
          JSON.stringify(b.checklist),
          JSON.stringify(b.prerequisites),
        ],
      );
      await c.query(
        "INSERT INTO service_request_conversion(operation_id,service_request_id,work_order_id,actor_id,expected_request_version,fingerprint) VALUES($1,$2,$3,$4,$5,$6)",
        [
          b.operationId,
          requestId,
          workOrderId,
          a.id,
          b.expectedRequestVersion,
          fingerprint,
        ],
      );
      await c.query(
        "UPDATE service_request SET status='converted',version=$2,updated_at=now() WHERE id=$1",
        [requestId, version],
      );
      await event(c, {
        requestId,
        actorId: a.id,
        eventType: "converted",
        priorVersion: Number(row.version),
        resultingVersion: version,
        fromStatus: row.status,
        toStatus: "converted",
        details: { operationId: b.operationId, workOrderId },
      });
      await audit(c, a.id, "service_request.converted", requestId, {
        operationId: b.operationId,
        workOrderId,
        priorVersion: Number(row.version),
        version,
      });
      await audit(c, a.id, "work.created_from_service_request", workOrderId, {
        serviceRequestId: requestId,
        operationId: b.operationId,
      });
      return { id: workOrderId, operationId: b.operationId, created: true };
    });
    res.status(result.created ? 201 : 200).json(result);
  },
);
