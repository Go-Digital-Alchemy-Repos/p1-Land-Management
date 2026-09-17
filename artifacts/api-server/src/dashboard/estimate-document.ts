import { HttpError } from "./policy";
import type { Pool, PoolClient } from "pg";
/** Status/approval/availability remain live; issued document content does not. */
export async function estimateDocument(
  c: Pool | PoolClient,
  estimateId: string,
) {
  const estimate = (
    await c.query(
      `SELECT e.*,p.name AS property_name,p.address,c.name AS client_name
    FROM estimate e JOIN property p ON p.id=e.property_id JOIN client c ON c.id=p.client_id WHERE e.id=$1`,
      [estimateId],
    )
  ).rows[0];
  if (!estimate) throw new HttpError(404, "Estimate not found");
  if (estimate.document_snapshot) {
    const snapshot = estimate.document_snapshot;
    if (snapshot.schemaVersion !== 1 || !snapshot.document)
      throw new HttpError(409, "Estimate document snapshot needs review");
    return {
      ...estimate,
      ...snapshot.document,
      document_captured_at: snapshot.capturedAt,
      document_snapshot_state: "frozen",
    };
  }
  const lines = (
    await c.query(
      "SELECT description,unit,quantity,unit_price_cents,position FROM estimate_line_item WHERE estimate_id=$1 ORDER BY position",
      [estimateId],
    )
  ).rows;
  return {
    ...estimate,
    line_items: lines,
    document_captured_at: null,
    document_snapshot_state:
      estimate.status === "draft" ? "draft" : "legacy_live",
  };
}
