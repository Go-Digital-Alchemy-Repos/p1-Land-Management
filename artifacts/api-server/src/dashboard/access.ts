import type { Request } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth, origin } from "./auth";
import { pool } from "./database";
import { HttpError, type Role } from "./policy";

type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

async function bearerSession(headers: Headers) {
  if (!headers.get("authorization")?.toLowerCase().startsWith("bearer "))
    return null;

  // Bearer credentials take strict precedence over cookies. The normal Better
  // Auth bearer hook leaves an existing cookie intact when token verification
  // fails, so pass no cookie to avoid a failed native credential falling back
  // to a browser session.
  const bearerHeaders = new Headers(headers);
  bearerHeaders.delete("cookie");
  const response = await auth.handler(
    new Request(new URL("/api/auth/get-session", origin), {
      headers: bearerHeaders,
    }),
  );
  if (!response.ok) return null;
  return (await response.json()) as AuthSession;
}

async function sessionFromRequest(req: Request) {
  const headers = fromNodeHeaders(req.headers);
  if (headers.get("authorization")?.toLowerCase().startsWith("bearer "))
    return bearerSession(headers);

  const cookieSession = await auth.api.getSession({ headers });
  if (cookieSession) return cookieSession;
  return null;
}

export async function identity(req: Request) {
  const s = await sessionFromRequest(req);
  if (!s || !s.user.emailVerified)
    throw new HttpError(401, "Sign in with a verified account");
  return s;
}
export async function actor(req: Request) {
  const s = await identity(req);
  const p = await pool.query(
    "SELECT role,mfa_required,EXISTS(SELECT 1 FROM session_assurance WHERE session_id=$2) AS assured FROM staff_profile WHERE user_id=$1 AND active=true",
    [s.user.id, s.session.id],
  );
  if (!p.rowCount) throw new HttpError(403, "Complete account activation");
  if (p.rows[0].mfa_required && (!s.user.twoFactorEnabled || !p.rows[0].assured))
    throw new HttpError(403, "Multi-factor authentication is required for this account");
  return { id: s.user.id, name: s.user.name, role: p.rows[0].role as Role };
}
export type Actor = Awaited<ReturnType<typeof actor>>;
export async function propertyAccess(a: Actor, id: string) {
  if (!(await pool.query("SELECT id FROM property WHERE id=$1 AND lifecycle='operational' AND client_id IS NOT NULL",[id])).rowCount) throw new HttpError(404,"Property not found");
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
