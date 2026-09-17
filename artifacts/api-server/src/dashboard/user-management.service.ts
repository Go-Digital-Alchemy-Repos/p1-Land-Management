import { randomBytes, randomUUID, createHash } from "node:crypto";
import type { PoolClient } from "pg";
import {
  CAPABILITIES,
  suggestedLegacyCapabilities,
} from "@workspace/api-zod/business-access";
import { pool, transaction } from "./database";
import { HttpError } from "./policy";
import {
  accountUpdateInput,
  invitationInput,
} from "./user-management.contract";

async function ownerLock(c: PoolClient, ownerId: string) {
  const result = await c.query(
    "SELECT user_id FROM staff_profile WHERE user_id=$1 AND role='owner' AND active=true FOR SHARE",
    [ownerId],
  );
  if (!result.rowCount) throw new HttpError(403, "Only Owner can manage users");
}
async function audit(
  c: PoolClient,
  actorId: string,
  action: string,
  entityId: string,
  details: unknown = {},
) {
  await c.query(
    "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,$3,$4,$5)",
    [randomUUID(), actorId, action, entityId, details],
  );
}
export async function listManagedAccounts() {
  const result =
    await pool.query(`SELECT u.id,u.name,u.email,u."emailVerified" AS "emailVerified",
    u."twoFactorEnabled" AS "twoFactorEnabled",p.role,p.active,p.mfa_required AS "mfaRequired",
    COALESCE(a.first_name,'') AS "firstName",COALESCE(a.last_name,'') AS "lastName",
    COALESCE(a.capabilities,'{}') AS capabilities,COALESCE(a.form_notification_ids,'{}') AS "formNotificationIds",
    COALESCE(a.version,1) AS version,a.reviewed_at AS "reviewedAt"
    FROM "user" u JOIN staff_profile p ON p.user_id=u.id LEFT JOIN business_account_access a ON a.user_id=u.id ORDER BY u.name,u.id`);
  return result.rows.map((row) => ({
    ...row,
    capabilities: row.role === "owner" ? [...CAPABILITIES] : row.capabilities,
    suggestedCapabilities: row.reviewedAt
      ? []
      : suggestedLegacyCapabilities(row.role),
  }));
}
export async function updateManagedAccount(
  ownerId: string,
  targetId: string,
  input: unknown,
) {
  const data = accountUpdateInput.parse(input);
  return transaction(async (c) => {
    await ownerLock(c, ownerId);
    const target = (
      await c.query(
        "SELECT role FROM staff_profile WHERE user_id=$1 FOR UPDATE",
        [targetId],
      )
    ).rows[0];
    if (!target) throw new HttpError(404, "Account not found");
    if (target.role === "owner")
      throw new HttpError(
        409,
        "Owner access cannot be changed in User Manager",
      );
    if (
      target.role === "client" &&
      (data.capabilities.length || data.formNotificationIds.length)
    )
      throw new HttpError(
        400,
        "Client accounts cannot receive staff permissions or form notifications",
      );
    await c.query(
      "INSERT INTO business_account_access(user_id) VALUES($1) ON CONFLICT DO NOTHING",
      [targetId],
    );
    const saved = await c.query(
      `UPDATE business_account_access SET first_name=$2,last_name=$3,capabilities=$4,
      form_notification_ids=$5,version=version+1,reviewed_by=$6,reviewed_at=now(),updated_at=now()
      WHERE user_id=$1 AND version=$7 RETURNING version`,
      [
        targetId,
        data.firstName,
        data.lastName,
        data.capabilities,
        data.formNotificationIds,
        ownerId,
        data.version,
      ],
    );
    if (!saved.rowCount)
      throw new HttpError(
        409,
        "This account changed. Reload and review before saving; your changes have not been applied.",
      );
    await c.query('UPDATE "user" SET name=$2,"updatedAt"=now() WHERE id=$1', [
      targetId,
      `${data.firstName} ${data.lastName}`,
    ]);
    await c.query("UPDATE staff_profile SET active=$2 WHERE user_id=$1", [
      targetId,
      data.active,
    ]);
    // Session revocation also invalidates session-bound federation grants.
    await c.query('DELETE FROM session WHERE "userId"=$1', [targetId]);
    await audit(c, ownerId, "account.access.updated", targetId, {
      active: data.active,
      capabilities: data.capabilities,
      formNotificationIds: data.formNotificationIds,
      version: saved.rows[0].version,
    });
    return { version: saved.rows[0].version };
  });
}
async function queueInvitation(c: PoolClient, email: string, token: string) {
  const origin = process.env.DASHBOARD_ORIGIN;
  if (!origin) throw new HttpError(503, "Dashboard origin is not configured");
  const url = new URL("/", origin);
  url.searchParams.set("invitation", token);
  await c.query("INSERT INTO outbox(id,kind,payload) VALUES($1,'email',$2)", [
    randomUUID(),
    {
      to: email,
      subject: "Your P1 Business Center invitation",
      text: `Create your account: ${url.href}`,
    },
  ]);
}
export async function inviteManagedAccount(ownerId: string, input: unknown) {
  const data = invitationInput.parse(input);
  return transaction(async (c) => {
    await ownerLock(c, ownerId);
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      `business-invitation:${data.email}`,
    ]);
    const existing = await c.query(
      'SELECT id FROM "user" WHERE lower(email)=$1',
      [data.email],
    );
    if (existing.rowCount)
      throw new HttpError(
        409,
        "This email already has an account. Manage the existing account instead.",
      );
    const pending = await c.query(
      "SELECT id FROM invitation WHERE email=$1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now()",
      [data.email],
    );
    if (pending.rowCount)
      throw new HttpError(
        409,
        "An invitation is already pending. Resend or revoke it first.",
      );
    if (
      data.clientId &&
      !(
        await c.query("SELECT id FROM client WHERE id=$1 AND archived=false", [
          data.clientId,
        ])
      ).rowCount
    )
      throw new HttpError(400, "Choose an active client");
    const id = randomUUID(),
      token = randomBytes(32).toString("base64url");
    await c.query(
      `INSERT INTO invitation(id,email,role,client_id,token_hash,expires_at,first_name,last_name,capabilities,form_notification_ids,created_by)
      VALUES($1,$2,$3,$4,$5,now()+interval '7 days',$6,$7,$8,$9,$10)`,
      [
        id,
        data.email,
        data.role,
        data.clientId ?? null,
        createHash("sha256").update(token).digest("hex"),
        data.firstName,
        data.lastName,
        data.capabilities,
        data.formNotificationIds,
        ownerId,
      ],
    );
    await queueInvitation(c, data.email, token);
    await audit(c, ownerId, "invitation.created", id, {
      role: data.role,
      capabilities: data.capabilities,
    });
    return { id };
  });
}
export async function changeInvitation(
  ownerId: string,
  invitationId: string,
  action: "resend" | "revoke",
) {
  return transaction(async (c) => {
    await ownerLock(c, ownerId);
    const invitation = (
      await c.query("SELECT * FROM invitation WHERE id=$1 FOR UPDATE", [
        invitationId,
      ])
    ).rows[0];
    if (!invitation) throw new HttpError(404, "Invitation not found");
    if (invitation.accepted_at || invitation.revoked_at)
      throw new HttpError(409, "This invitation is no longer pending");
    if (action === "revoke")
      await c.query("UPDATE invitation SET revoked_at=now() WHERE id=$1", [
        invitationId,
      ]);
    else {
      const token = randomBytes(32).toString("base64url");
      await c.query(
        "UPDATE invitation SET token_hash=$2,expires_at=now()+interval '7 days' WHERE id=$1",
        [invitationId, createHash("sha256").update(token).digest("hex")],
      );
      await queueInvitation(c, invitation.email, token);
    }
    await audit(c, ownerId, `invitation.${action}`, invitationId);
    return { ok: true };
  });
}
export async function revokeManagedSessions(ownerId: string, targetId: string) {
  return transaction(async (c) => {
    await ownerLock(c, ownerId);
    const target = (
      await c.query(
        "SELECT role FROM staff_profile WHERE user_id=$1 FOR UPDATE",
        [targetId],
      )
    ).rows[0];
    if (!target) throw new HttpError(404, "Account not found");
    if (target.role === "owner")
      throw new HttpError(
        409,
        "Manage your own sessions through account security",
      );
    await c.query('DELETE FROM session WHERE "userId"=$1', [targetId]);
    await audit(c, ownerId, "account.sessions.revoked", targetId);
    return { ok: true };
  });
}
