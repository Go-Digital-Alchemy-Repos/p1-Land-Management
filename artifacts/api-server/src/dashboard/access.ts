import type { Request } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth";
import { pool } from "./database";
import { HttpError, type Role } from "./policy";
export async function identity(req: Request) {
  const s = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!s || !s.user.emailVerified)
    throw new HttpError(401, "Sign in with a verified account");
  return s;
}
export async function actor(req: Request) {
  const s = await identity(req);
  const p = await pool.query(
    "SELECT role FROM staff_profile WHERE user_id=$1 AND active=true",
    [s.user.id],
  );
  if (!p.rowCount) throw new HttpError(403, "Complete account activation");
  const assurance = p.rows[0].role === "owner" ? await pool.query("SELECT 1 FROM session_assurance WHERE session_id=$1", [s.session.id]) : null;
  if (p.rows[0].role === "owner" && (!s.user.twoFactorEnabled || !assurance?.rowCount))
    throw new HttpError(403, "Owner MFA enrollment is required");
  return { id: s.user.id, name: s.user.name, role: p.rows[0].role as Role };
}
export type Actor = Awaited<ReturnType<typeof actor>>;
export async function propertyAccess(a: Actor, id: string) {
  if (a.role === "client") {
    const r = await pool.query(
      "SELECT 1 FROM property p JOIN client_access ca ON ca.client_id=p.client_id WHERE p.id=$1 AND ca.user_id=$2",
      [id, a.id],
    );
    if (!r.rowCount) throw new HttpError(404, "Property not found");
  } else if (a.role === "crew") {
    const r = await pool.query(
      "SELECT 1 FROM work_order WHERE property_id=$1 AND assigned_to=$2 AND status NOT IN ('cancelled','skipped','reviewed')",
      [id, a.id],
    );
    if (!r.rowCount) throw new HttpError(404, "Property not found");
  } else {
    const r = await pool.query("SELECT 1 FROM property WHERE id=$1", [id]);
    if (!r.rowCount) throw new HttpError(404, "Property not found");
  }
}
