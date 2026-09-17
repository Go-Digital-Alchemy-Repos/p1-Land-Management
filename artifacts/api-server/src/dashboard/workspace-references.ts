import { Router } from "express";
import { hasCapability, type Capability } from "@workspace/api-zod/business-access";
import { actor } from "./access";
import { pool } from "./database";
import { requireAnyCapability } from "./policy";

const workflowGrants: readonly Capability[] = [
  "customers.clients", "customers.properties", "customers.requests",
  "operations.schedule", "operations.recurring", "operations.projects", "operations.inspections",
  "revenue.sales", "revenue.agreements", "revenue.billing", "revenue.expenses",
];

/** Selection references deliberately exclude contact, access, financial and security details. */
export const workspaceReferencesApi = Router();
workspaceReferencesApi.get("/workspace/references", async (req, res) => {
  const a = await actor(req);
  requireAnyCapability(a, workflowGrants);
  const scheduling = ["operations.schedule", "operations.recurring", "operations.projects", "operations.inspections"].some(grant => hasCapability(a, grant));
  const sales = hasCapability(a, "revenue.sales");
  const [clients, properties, staff] = await Promise.all([
    pool.query("SELECT id,name FROM client WHERE archived=false ORDER BY name,id"),
    pool.query("SELECT id,client_id,name,address FROM property WHERE lifecycle='operational' AND archived=false AND client_id IS NOT NULL ORDER BY name,id"),
    scheduling || sales ? pool.query(`SELECT u.id,u.name,p.role,
      (p.role='owner' OR (p.role NOT IN ('crew','client') AND COALESCE('revenue.sales'=ANY(a.capabilities),false))) AS "canOwnSales",
      (p.role IN ('owner','crew') OR (p.role<>'client' AND COALESCE('workspace.my-day'=ANY(a.capabilities),false))) AS "canAssignWork"
      FROM "user" u JOIN staff_profile p ON p.user_id=u.id LEFT JOIN business_account_access a ON a.user_id=u.id
      WHERE p.active=true AND p.role<>'client' AND (
        ($1::boolean AND (p.role IN ('owner','crew') OR 'workspace.my-day'=ANY(a.capabilities))) OR
        ($2::boolean AND (p.role='owner' OR (p.role<>'crew' AND 'revenue.sales'=ANY(a.capabilities)))))
      ORDER BY u.name,u.id`, [scheduling, sales]) : Promise.resolve({ rows: [] }),
  ]);
  res.json({ clients: clients.rows, properties: properties.rows, staff: staff.rows });
});
