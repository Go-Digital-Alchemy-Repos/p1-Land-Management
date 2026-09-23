import { Router } from "express";
import { hasCapability } from "@workspace/api-zod/business-access";
import { z } from "zod";
import { actor } from "./access";
import { pool } from "./database";
import { HttpError } from "./policy";

export const dashboardSearchApi = Router();
export type SearchResult = { kind: string; id: string; title: string; subtitle: string; href: string };
const input = z.object({ q: z.string().trim().min(2).max(120) }).strict();
const buckets = new Map<string, { until: number; count: number }>();

dashboardSearchApi.get("/search", async (req, res) => {
  const user = await actor(req);
  const { q } = input.parse(req.query);
  const now = Date.now();
  for (const [key, value] of buckets) if (value.until <= now) buckets.delete(key);
  let bucket = buckets.get(user.id);
  if (!bucket) {
    if (buckets.size >= 1000) throw new HttpError(429, "Search is busy. Try again shortly.");
    bucket = { until: now + 60000, count: 0 };
    buckets.set(user.id, bucket);
  }
  if (++bucket.count > 30) {
    res.setHeader("Retry-After", "60");
    throw new HttpError(429, "Too many searches. Try again shortly.");
  }
  const term = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const results: SearchResult[] = [];
  const add = async (kind: string, query: string, values: unknown[], make: (row: any) => SearchResult) => {
    if (results.length >= 20) return;
    const rows = (await pool.query(query, values)).rows;
    results.push(...rows.map(make));
  };
  if (user.role === "client" || user.role === "crew" || hasCapability(user, "customers.properties")) {
    const clause = user.role === "client"
      ? "AND EXISTS(SELECT 1 FROM client_access ca WHERE ca.client_id=p.client_id AND ca.user_id=$2)"
      : user.role === "crew"
        ? "AND EXISTS(SELECT 1 FROM work_order w WHERE w.property_id=p.id AND w.assigned_to=$2 AND w.status NOT IN ('cancelled','skipped','reviewed'))"
        : "";
    await add("property", `SELECT p.id,p.name,p.address FROM property p WHERE p.archived=false AND p.lifecycle='operational'
      AND (p.name ILIKE $1 OR p.address ILIKE $1) ${clause} ORDER BY p.name LIMIT 5`,
      clause ? [term, user.id] : [term], (p) => ({ kind: "property", id: p.id, title: p.name, subtitle: p.address, href: `/properties/${p.id}` }));
  }
  if (user.role === "crew" || hasCapability(user, "operations.schedule") || hasCapability(user, "workspace.my-day")) {
    const assigned = user.role === "crew" || !hasCapability(user, "operations.schedule");
    await add("work-order", `SELECT w.id,w.title,p.name AS property_name FROM work_order w JOIN property p ON p.id=w.property_id AND p.lifecycle='operational'
      WHERE w.title ILIKE $1 ${assigned ? "AND w.assigned_to=$2 AND w.status NOT IN ('cancelled','skipped','reviewed')" : ""}
      ORDER BY w.scheduled_at DESC NULLS LAST LIMIT 5`, assigned ? [term, user.id] : [term],
      (w) => ({ kind: "work-order", id: w.id, title: w.title, subtitle: w.property_name, href: `${assigned ? "/my-day" : "/schedule"}/work-orders/${w.id}` }));
  }
  if (user.role === "client") {
    await add("request", `SELECT r.id,r.description,p.name AS property_name FROM service_request r JOIN property p ON p.id=r.property_id AND p.lifecycle='operational'
      WHERE r.description ILIKE $1 AND EXISTS(SELECT 1 FROM client_access ca WHERE ca.client_id=p.client_id AND ca.user_id=$2)
      ORDER BY r.created_at DESC LIMIT 5`, [term, user.id],
      (r) => ({ kind: "request", id: r.id, title: r.description, subtitle: r.property_name, href: `/requests?request=${r.id}` }));
  } else if (user.role !== "crew") {
    if (hasCapability(user, "customers.clients"))
      await add("client", `SELECT id,name FROM client WHERE archived=false AND name ILIKE $1 ORDER BY name LIMIT 5`, [term],
        (c) => ({ kind: "client", id: c.id, title: c.name, subtitle: "Client", href: `/clients/${c.id}` }));
    if (hasCapability(user, "customers.requests"))
      await add("request", `SELECT r.id,r.description,p.name AS property_name FROM service_request r JOIN property p ON p.id=r.property_id AND p.lifecycle='operational'
        WHERE r.description ILIKE $1 ORDER BY r.created_at DESC LIMIT 5`, [term],
        (r) => ({ kind: "request", id: r.id, title: r.description, subtitle: r.property_name, href: `/requests?request=${r.id}` }));
    if (hasCapability(user, "revenue.sales"))
      await add("lead", `SELECT id,name,reported_company_name,location FROM lead WHERE name ILIKE $1 OR reported_company_name ILIKE $1 OR location ILIKE $1 ORDER BY created_at DESC LIMIT 5`, [term],
        (l) => ({ kind: "lead", id: l.id, title: l.name, subtitle: l.reported_company_name || l.location, href: `/sales/inquiries/${l.id}` }));
    if (hasCapability(user, "revenue.agreements") || hasCapability(user, "revenue.billing"))
      await add("agreement", `SELECT a.id,a.title,p.name AS property_name FROM service_agreement a JOIN property p ON p.id=a.property_id AND p.lifecycle='operational' AND p.client_id IS NOT NULL WHERE a.title ILIKE $1 OR p.name ILIKE $1 ORDER BY a.created_at DESC LIMIT 5`, [term],
        (a) => ({ kind: "agreement", id: a.id, title: a.title, subtitle: a.property_name, href: `/agreements/${a.id}` }));
  }
  res.setHeader("Cache-Control", "private, no-store");
  res.json(results.slice(0, 20));
});
