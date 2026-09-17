import { hasCapability } from "@workspace/api-zod/business-access";
import { Router } from "express";
import { z } from "zod";
import { actor, propertyAccess } from "./access";
import { pool } from "./database";
import { createClientNote, listClientNotes } from "./client-notes.service";
import { HttpError, requireCapability, type Role } from "./policy";

export const clientWorkspaceApi = Router();

function section(allowed: boolean, sql: string, values: unknown[]) {
  return allowed ? pool.query(sql, values) : Promise.resolve({ rows: [] });
}
const identifier = z.string().uuid();

function propertyVisibility(role: Role, userId: string, alias = "p") {
  if (role === "client")
    return {
      clause: ` AND EXISTS(SELECT 1 FROM client_access ca WHERE ca.client_id=${alias}.client_id AND ca.user_id=$2)`,
      values: [userId],
    };
  if (role === "crew")
    return {
      clause: ` AND EXISTS(SELECT 1 FROM work_order wa WHERE wa.property_id=${alias}.id AND wa.assigned_to=$2 AND wa.status NOT IN ('cancelled','skipped','reviewed'))`,
      values: [userId],
    };
  return { clause: "", values: [] as string[] };
}

async function officeClient(id: string) {
  const result = await pool.query(
    "SELECT id,name,email,phone,billing_address,created_at FROM client WHERE id=$1 AND archived=false",
    [id],
  );
  if (!result.rowCount) throw new HttpError(404, "Client not found");
  return result.rows[0];
}

clientWorkspaceApi.get("/clients/:id/workspace", async (req, res) => {
  const user = await actor(req);
  requireCapability(user, "customers.clients");
  const clientId = identifier.parse(req.params.id);
  const client = await officeClient(clientId);
  const [properties, contacts, agreements, schedule, requests, projects, notes, activity] = await Promise.all([
    section(hasCapability(user, "customers.properties"),
      "SELECT p.id,p.name,p.address,p.address_line1,p.address_line2,p.city,p.state,p.postal_code,p.acreage,p.latitude,p.longitude,p.property_type_id,pt.name AS property_type_name,p.access_instructions,p.version,p.created_at FROM property p LEFT JOIN property_type pt ON pt.id=p.property_type_id WHERE p.client_id=$1 AND p.archived=false AND p.lifecycle='operational' ORDER BY p.name",
      [clientId],
    ),
    section(true,
      "SELECT id,name,email,phone,position,kind,archived FROM contact WHERE client_id=$1 AND archived=false ORDER BY CASE kind WHEN 'primary' THEN 0 ELSE 1 END,name",
      [clientId],
    ),
    section(hasCapability(user, "revenue.agreements") || hasCapability(user, "revenue.billing"),
      "SELECT a.id,a.property_id,a.title,a.status,a.starts_on::text,a.ends_on::text,a.billing_mode,p.name AS property_name FROM service_agreement a JOIN property p ON p.id=a.property_id WHERE p.client_id=$1 AND p.lifecycle='operational' ORDER BY CASE a.status WHEN 'active' THEN 0 ELSE 1 END,a.ends_on DESC",
      [clientId],
    ),
    section(hasCapability(user, "operations.schedule"),
      "SELECT w.id,w.property_id,w.title,w.status,w.scheduled_at,p.name AS property_name FROM work_order w JOIN property p ON p.id=w.property_id WHERE p.client_id=$1 AND p.lifecycle='operational' AND w.status NOT IN ('cancelled','skipped','reviewed') ORDER BY w.scheduled_at NULLS LAST,w.created_at DESC LIMIT 12",
      [clientId],
    ),
    section(hasCapability(user, "customers.requests"),
      "SELECT r.id,r.property_id,r.description,r.status,r.created_at,p.name AS property_name FROM service_request r JOIN property p ON p.id=r.property_id WHERE p.client_id=$1 AND p.lifecycle='operational' ORDER BY CASE r.status WHEN 'new' THEN 0 ELSE 1 END,r.created_at DESC LIMIT 12",
      [clientId],
    ),
    section(hasCapability(user, "operations.projects"),
      "SELECT j.id,j.property_id,j.name,j.scope,j.status,j.version,j.created_at,p.name AS property_name FROM project j JOIN property p ON p.id=j.property_id WHERE p.client_id=$1 AND p.lifecycle='operational' ORDER BY j.created_at DESC LIMIT 12",
      [clientId],
    ),
    section(true,
      "SELECT n.id,n.property_id,n.body,n.created_at,u.name AS author_name,p.name AS property_name,(n.source_note_id IS NOT NULL) AS imported FROM client_note n LEFT JOIN \"user\" u ON u.id=n.author_id LEFT JOIN property p ON p.id=n.property_id WHERE n.client_id=$1 ORDER BY n.created_at DESC,n.id DESC LIMIT 30",
      [clientId],
    ),
    section(user.role === "owner",
      "SELECT e.id,e.action,e.entity_id,e.created_at,u.name AS author_name FROM audit_event e LEFT JOIN \"user\" u ON u.id=e.user_id WHERE e.entity_id=$1::text OR e.entity_id IN (SELECT id::text FROM property WHERE client_id=$1::uuid) ORDER BY e.created_at DESC LIMIT 12",
      [clientId],
    ),
  ]);
  res.json({
    client,
    properties: properties.rows,
    contacts: contacts.rows,
    agreements: agreements.rows,
    schedule: schedule.rows,
    requests: requests.rows,
    projects: projects.rows,
    notes: notes.rows,
    activity: activity.rows,
  });
});

clientWorkspaceApi.get("/clients/:id/notes", async (req, res) => {
  const user = await actor(req);
  requireCapability(user, "customers.clients");
  res.setHeader("Cache-Control", "private, no-store");
  res.json(await listClientNotes(identifier.parse(req.params.id), req.query));
});
clientWorkspaceApi.post("/clients/:id/notes", async (req, res) => {
  const user = await actor(req);
  requireCapability(user, "customers.clients");
  res.setHeader("Cache-Control", "private, no-store");
  const result = await createClientNote(
    identifier.parse(req.params.id), user.id, req.body,
  );
  res.status(result.replayed ? 200 : 201).json({ id: result.id });
});

clientWorkspaceApi.get("/properties/:id/workspace", async (req, res) => {
  const user = await actor(req);
  if (!["client", "crew"].includes(user.role)) requireCapability(user, "customers.properties");
  const propertyId = identifier.parse(req.params.id);
  await propertyAccess(user, propertyId);
  const visibility = propertyVisibility(user.role, user.id);
  const propertyResult = await pool.query(
    `SELECT p.id,p.name,p.address,p.address_line1,p.address_line2,p.city,p.state,p.postal_code,p.acreage,p.latitude,p.longitude,p.property_type_id,pt.name AS property_type_name,p.created_at,c.name AS client_name${hasCapability(user, "customers.properties") ? ",p.client_id,p.access_instructions,p.version" : ""} FROM property p JOIN client c ON c.id=p.client_id LEFT JOIN property_type pt ON pt.id=p.property_type_id WHERE p.id=$1 AND p.archived=false AND p.lifecycle='operational'${visibility.clause}`,
    [propertyId, ...visibility.values],
  );
  if (!propertyResult.rowCount) throw new HttpError(404, "Property not found");
  const property = propertyResult.rows[0];
  const clientSafe = user.role === "client";
  const crewSafe = user.role === "crew";
  const [schedule, agreements, requests, projects, inspections, files, contacts, notes] = await Promise.all([
    section(clientSafe || crewSafe || hasCapability(user, "operations.schedule"),
      `SELECT id,title,status,scheduled_at,scope FROM work_order WHERE property_id=$1 ${clientSafe ? "AND status<>'draft'" : user.role === "crew" ? "AND assigned_to=$2" : ""} ORDER BY scheduled_at NULLS LAST,created_at DESC LIMIT 12`,
      user.role === "crew" ? [propertyId, user.id] : [propertyId],
    ),
    (crewSafe || (!clientSafe && !(hasCapability(user, "revenue.agreements") || hasCapability(user, "revenue.billing"))))
      ? Promise.resolve({ rows: [] as unknown[] })
      : pool.query(
          `SELECT id,title,status,starts_on::text,ends_on::text,billing_mode FROM service_agreement WHERE property_id=$1 ${clientSafe ? "AND status='active'" : ""} ORDER BY ends_on DESC`,
          [propertyId],
        ),
    (crewSafe || (!clientSafe && !(hasCapability(user, "customers.requests"))))
      ? Promise.resolve({ rows: [] as unknown[] })
      : pool.query(
          `SELECT id,description,${clientSafe ? "CASE status WHEN 'new' THEN 'received' WHEN 'triaged' THEN 'under_review' WHEN 'scheduled' THEN 'service_planning' WHEN 'converted' THEN 'work_planning' WHEN 'closed' THEN 'closed' WHEN 'cancelled' THEN 'cancelled' ELSE 'under_review' END" : "status"} AS status,created_at,updated_at FROM service_request WHERE property_id=$1 ORDER BY CASE status WHEN 'new' THEN 0 ELSE 1 END,created_at DESC LIMIT 12`,
          [propertyId],
        ),
    (crewSafe || (!clientSafe && !(hasCapability(user, "operations.projects"))))
      ? Promise.resolve({ rows: [] as unknown[] })
      : pool.query(
          "SELECT id,name,scope,status,created_at FROM project WHERE property_id=$1 ORDER BY created_at DESC LIMIT 12",
          [propertyId],
        ),
    section(clientSafe || hasCapability(user, "operations.inspections"),
      `SELECT id,title,findings,published,created_at FROM inspection WHERE property_id=$1 ${clientSafe ? "AND published=true" : user.role === "crew" ? "AND false" : ""} ORDER BY created_at DESC LIMIT 12`,
      [propertyId],
    ),
    pool.query(
      `SELECT id,name,mime,bytes,classification,published,created_at FROM file_record f WHERE property_id=$1 AND status='ready' AND NOT EXISTS(SELECT 1 FROM service_request_attachment ra WHERE ra.file_id=f.id) ${clientSafe ? "AND published=true" : user.role === "crew" ? "AND false" : ""} ORDER BY created_at DESC LIMIT 12`,
      [propertyId],
    ),
    hasCapability(user, "customers.clients")
      ? pool.query(
          "SELECT id,name,email,phone,position,kind FROM contact WHERE client_id=$1 AND archived=false ORDER BY CASE kind WHEN 'primary' THEN 0 ELSE 1 END,name",
          [property.client_id],
        )
      : Promise.resolve({ rows: [] as unknown[] }),
    hasCapability(user, "customers.clients")
      ? pool.query(
          "SELECT n.id,n.body,n.created_at,u.name AS author_name,(n.source_note_id IS NOT NULL) AS imported FROM client_note n LEFT JOIN \"user\" u ON u.id=n.author_id WHERE n.client_id=$1 AND (n.property_id=$2 OR n.property_id IS NULL) ORDER BY n.created_at DESC,n.id DESC LIMIT 30",
          [property.client_id, propertyId],
        )
      : Promise.resolve({ rows: [] as unknown[] }),
  ]);
  res.json({
    property,
    schedule: schedule.rows,
    agreements: agreements.rows,
    requests: requests.rows,
    projects: projects.rows,
    inspections: inspections.rows,
    files: files.rows,
    contacts: contacts.rows,
    notes: notes.rows,
  });
});
