import { CAPABILITIES, type Capability } from "@workspace/api-zod/business-access";
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

export async function originalIdentity(req: Request) {
  const s = await sessionFromRequest(req);
  if (!s || !s.user.emailVerified)
    throw new HttpError(401, "Sign in with a verified account");
  if ((await pool.query("SELECT 1 FROM account_retirement WHERE user_id=$1 AND restored_at IS NULL", [s.user.id])).rowCount)
    throw new HttpError(401, "Sign in with a verified account");
  return s;
}

export type ImpersonationContext = {
  ownerId: string;
  ownerName: string;
  targetId: string;
  targetName: string;
  targetEmail: string;
  targetRole: Role;
  demo: boolean;
  expiresAt: string;
  targetTwoFactorEnabled: boolean;
};

/** A browser-only overlay; the Owner's Better Auth session remains the credential. */
export async function activeImpersonation(req: Request, original?: AuthSession): Promise<ImpersonationContext | null> {
  if (req.headers.authorization) return null;
  const s = original || await originalIdentity(req);
  const result = await pool.query(
    `SELECT i.owner_id AS "ownerId",o.name AS "ownerName",i.target_id AS "targetId",
            t.name AS "targetName",t.email AS "targetEmail",t."emailVerified" AS "targetVerified",
            t."twoFactorEnabled" AS "targetTwoFactorEnabled",p.role AS "targetRole",
            p.active AS "targetActive",op.role AS "ownerRole",op.active AS "ownerActive",
            op.mfa_required AS "ownerMfaRequired",
            EXISTS(SELECT 1 FROM session_assurance WHERE session_id=i.session_id) AS assured,
            EXISTS(SELECT 1 FROM account_retirement r WHERE r.user_id=i.target_id AND r.restored_at IS NULL) AS retired,
            EXISTS(SELECT 1 FROM dashboard_demo_persona d WHERE d.user_id=i.target_id) AS demo,
            i.expires_at AS "expiresAt"
     FROM dashboard_impersonation i
     JOIN "user" o ON o.id=i.owner_id
     JOIN "user" t ON t.id=i.target_id
     JOIN staff_profile op ON op.user_id=i.owner_id
     JOIN staff_profile p ON p.user_id=i.target_id
     WHERE i.session_id=$1 AND i.owner_id=$2`,
    [s.session.id, s.user.id],
  );
  const row = result.rows[0];
  if (!row) return null;
  // A stale target page must never send a write with the Owner's grants.
  if (new Date(row.expiresAt).getTime() <= Date.now())
    throw new HttpError(403, "User switch expired. Return to Owner.");
  if (row.ownerRole !== "owner" || !row.ownerActive ||
      (row.ownerMfaRequired && (!s.user.twoFactorEnabled || !row.assured)) ||
      !row.targetActive || !row.targetVerified || row.retired || row.targetRole === "owner")
    throw new HttpError(403, "Impersonation is no longer available. Return to Owner.");
  return row as ImpersonationContext;
}

export async function identity(req: Request) {
  const s = await originalIdentity(req);
  const impersonation = await activeImpersonation(req, s);
  if (!impersonation) return s as AuthSession & { impersonation?: ImpersonationContext };
  return {
    ...s,
    user: {
      ...s.user,
      id: impersonation.targetId,
      name: impersonation.targetName,
      email: impersonation.targetEmail,
      emailVerified: true,
      twoFactorEnabled: impersonation.targetTwoFactorEnabled,
    },
    impersonation,
  } as AuthSession & { impersonation?: ImpersonationContext };
}
export async function actor(req: Request): Promise<Actor> {
  const s = await identity(req);
  const p = await pool.query(
    "SELECT role,mfa_required,EXISTS(SELECT 1 FROM session_assurance WHERE session_id=$2) AS assured FROM staff_profile WHERE user_id=$1 AND active=true",
    [s.user.id, s.session.id],
  );
  if (!p.rowCount) throw new HttpError(403, "Complete account activation");
  // The verified Owner factor authorizes the short-lived browser overlay. The
  // target's own factor applies when they authenticate with their credential.
  if (!s.impersonation && p.rows[0].mfa_required && (!s.user.twoFactorEnabled || !p.rows[0].assured))
    throw new HttpError(403, "Multi-factor authentication is required for this account");
  const capabilities: Capability[] = p.rows[0].role === "owner" ? [...CAPABILITIES] : ["client", "crew"].includes(p.rows[0].role) ? [] :
    (await pool.query("SELECT capabilities FROM business_account_access WHERE user_id=$1", [s.user.id])).rows[0]?.capabilities ?? [];
  return { id: s.user.id, name: s.user.name, role: p.rows[0].role as Role, capabilities,
    impersonatedBy: s.impersonation?.ownerId };
}
export type Actor = { id: string; name: string; role: Role; capabilities?: readonly Capability[]; impersonatedBy?: string };
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
