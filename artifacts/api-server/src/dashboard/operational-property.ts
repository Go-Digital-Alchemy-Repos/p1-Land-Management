import type pg from "pg";
import { transaction } from "./database";
import { HttpError } from "./policy";
export async function requireOperationalProperty(c: pg.PoolClient, id: string) {
  const p = await c.query(
    "SELECT id FROM property WHERE id=$1 AND lifecycle='operational' AND client_id IS NOT NULL FOR SHARE",
    [id],
  );
  if (!p.rowCount) throw new HttpError(404, "Operational property not found");
}
type Child =
  | "work_order"
  | "estimate"
  | "billing_draft"
  | "recurring_service"
  | "file_record";
export async function requireOperationalChild(
  c: pg.PoolClient,
  table: Child,
  id: string,
) {
  // Table is a closed internal union, never caller input. Lock parent before child writers lock their rows.
  const r = await c.query(
    `SELECT p.id FROM property p JOIN ${table} child ON child.property_id=p.id WHERE child.id=$1 AND p.lifecycle='operational' AND p.client_id IS NOT NULL FOR SHARE OF p`,
    [id],
  );
  if (!r.rowCount) throw new HttpError(404, "Operational record not found");
}
export async function operationalQuery(
  propertyId: string,
  query: string,
  values: unknown[],
) {
  return transaction(async (c) => {
    await requireOperationalProperty(c, propertyId);
    return c.query(query, values);
  });
}
export async function operationalChildQuery(
  table: Child,
  id: string,
  query: string,
  values: unknown[],
) {
  return transaction(async (c) => {
    await requireOperationalChild(c, table, id);
    return c.query(query, values);
  });
}
