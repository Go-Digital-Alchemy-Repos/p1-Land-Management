import { auth, origin } from "./auth";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import type { PoolClient } from "pg";
import {
  CAPABILITIES,
  suggestedLegacyCapabilities,
} from "@workspace/api-zod/business-access";
import { pool, transaction } from "./database";
import { HttpError } from "./policy";
import {
  ownerNotificationsInput,
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
async function lockAuthAccountOperation(c: PoolClient, userId: string) {
  // Auth endpoints hold this same transaction-scoped lock until their handler
  // completes. It gives retirement a single ordering point with sign-in and
  // authenticated Better Auth mutations, which use a separate connection.
  await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    `dashboard-auth-account:${userId}`,
  ]);
}
async function mutableManagedTarget(c: PoolClient, targetId: string) {
  const target = (
    await c.query(
      `SELECT p.role,p.active,r.user_id AS retired
       FROM staff_profile p
       LEFT JOIN account_retirement r ON r.user_id=p.user_id AND r.restored_at IS NULL
       WHERE p.user_id=$1 FOR UPDATE OF p`,
      [targetId],
    )
  ).rows[0];
  if (!target) throw new HttpError(404, "Account not found");
  if (target.retired)
    throw new HttpError(409, "Retired accounts can only be changed through recovery");
  return target;
}
export async function listManagedAccounts() {
  const result =
    await pool.query(`SELECT u.id,u.name,u.email,u."emailVerified" AS "emailVerified",
    u."twoFactorEnabled" AS "twoFactorEnabled",p.role,p.active,p.mfa_required AS "mfaRequired",
    COALESCE(a.first_name,'') AS "firstName",COALESCE(a.last_name,'') AS "lastName",
    COALESCE(a.capabilities,'{}') AS capabilities,COALESCE(a.form_notification_ids,'{}') AS "formNotificationIds",
    COALESCE(a.version,1) AS version,a.reviewed_at AS "reviewedAt"
    FROM "user" u JOIN staff_profile p ON p.user_id=u.id LEFT JOIN business_account_access a ON a.user_id=u.id
    LEFT JOIN account_retirement r ON r.user_id=u.id AND r.restored_at IS NULL
    WHERE r.user_id IS NULL ORDER BY u.name,u.id`);
  return result.rows.map((row) => ({
    ...row,
    capabilities: row.role === "owner" ? [...CAPABILITIES] : row.capabilities,
    suggestedCapabilities: row.reviewedAt
      ? []
      : suggestedLegacyCapabilities(row.role),
  }));
}

export async function retireManagedAccount(ownerId: string, targetId: string) {
  return transaction(async (c) => {
    await ownerLock(c, ownerId);
    await lockAuthAccountOperation(c, targetId);
    const target = (await c.query(
      `SELECT u.email,p.role,p.active,COALESCE(a.capabilities,'{}') AS capabilities,
       COALESCE(a.form_notification_ids,'{}') AS form_notification_ids,r.user_id AS retired
       FROM "user" u JOIN staff_profile p ON p.user_id=u.id
       LEFT JOIN business_account_access a ON a.user_id=u.id
       LEFT JOIN account_retirement r ON r.user_id=u.id AND r.restored_at IS NULL
       WHERE u.id=$1 FOR UPDATE OF u,p`, [targetId]
    )).rows[0];
    if (!target) throw new HttpError(404, "Account not found");
    const installation = (await c.query("SELECT owner_id FROM installation WHERE id=1 FOR SHARE")).rows[0];
    if (installation?.owner_id === targetId) throw new HttpError(409, "The canonical Owner account cannot be retired");
    if (target.active) throw new HttpError(409, "Only inactive accounts can be retired");
    if (target.retired) throw new HttpError(409, "Account is already retired");
    await c.query("INSERT INTO business_account_access(user_id) VALUES($1) ON CONFLICT DO NOTHING", [targetId]);
    await c.query(
      `INSERT INTO account_retirement(user_id,retired_by,original_role,original_active,prior_capabilities,prior_form_notification_ids)
       VALUES($1,$2,$3,false,$4,$5)
       ON CONFLICT(user_id) DO UPDATE SET
         retired_at=now(),retired_by=EXCLUDED.retired_by,original_role=EXCLUDED.original_role,
         original_active=false,prior_capabilities=EXCLUDED.prior_capabilities,
         prior_form_notification_ids=EXCLUDED.prior_form_notification_ids,
         restored_at=NULL,restored_by=NULL`, [targetId, ownerId, target.role, target.capabilities, target.form_notification_ids]
    );
    await c.query("UPDATE business_account_access SET capabilities='{}',form_notification_ids='{}',version=version+1,updated_at=now() WHERE user_id=$1", [targetId]);
    await c.query('UPDATE dashboard_impersonation SET expires_at=now() WHERE target_id=$1', [targetId]);
    await c.query('DELETE FROM session WHERE "userId"=$1', [targetId]);
    // Better Auth binds password-reset and other account-bound verification
    // records to the user id in `value`. Deleting by that opaque id is precise:
    // it invalidates this account's existing tokens without touching another
    // user's verification flow.
    const revokedVerification = await c.query("DELETE FROM verification WHERE value=$1", [targetId]);
    await c.query("UPDATE invitation SET revoked_at=now() WHERE lower(email)=lower($1) AND accepted_at IS NULL AND revoked_at IS NULL", [target.email]);
    await audit(c, ownerId, "account.retired", targetId, {
      originalRole: target.role,
      revokedVerificationTokens: revokedVerification.rowCount,
    });
    return { retired: true };
  });
}

export async function recoverRetiredManagedAccount(ownerId: string, targetId: string) {
  return transaction(async (c) => {
    await ownerLock(c, ownerId);
    await lockAuthAccountOperation(c, targetId);
    const retired = (await c.query(
      `SELECT r.prior_capabilities,r.prior_form_notification_ids,p.active,i.owner_id
       FROM account_retirement r JOIN staff_profile p ON p.user_id=r.user_id
       CROSS JOIN installation i WHERE r.user_id=$1 AND r.restored_at IS NULL FOR UPDATE OF r,p`, [targetId]
    )).rows[0];
    if (!retired) throw new HttpError(404, "Retired account not found");
    if (retired.owner_id === targetId) throw new HttpError(409, "The canonical Owner account cannot be recovered here");
    if (retired.active) throw new HttpError(409, "Retired account state is invalid");
    await c.query("UPDATE account_retirement SET restored_at=now(),restored_by=$2 WHERE user_id=$1", [targetId, ownerId]);
    await c.query("UPDATE business_account_access SET capabilities=$2,form_notification_ids=$3,version=version+1,updated_at=now() WHERE user_id=$1", [targetId, retired.prior_capabilities, retired.prior_form_notification_ids]);
    await c.query('UPDATE dashboard_impersonation SET expires_at=now() WHERE target_id=$1', [targetId]);
    await c.query('DELETE FROM session WHERE "userId"=$1', [targetId]);
    await audit(c, ownerId, "account.retirement.recovered", targetId);
    return { recovered: true };
  });
}
export async function reactivateRecoveredOwnerAccount(ownerId: string, targetId: string) {
  return transaction(async (c) => {
    await ownerLock(c, ownerId);
    await lockAuthAccountOperation(c, targetId);
    const target = (
      await c.query(
        `SELECT p.role,p.active,u."twoFactorEnabled" AS "twoFactorEnabled",i.owner_id
         FROM account_retirement r
         JOIN staff_profile p ON p.user_id=r.user_id
         JOIN "user" u ON u.id=r.user_id
         CROSS JOIN installation i
         WHERE r.user_id=$1 AND r.restored_at IS NOT NULL
         FOR UPDATE OF r,p,u`,
        [targetId],
      )
    ).rows[0];
    if (!target) throw new HttpError(404, "Recovered account not found");
    if (target.owner_id === targetId)
      throw new HttpError(409, "The canonical Owner account cannot be reactivated here");
    if (target.role !== "owner")
      throw new HttpError(409, "Only a recovered Owner account can use this reactivation path");
    if (target.active) throw new HttpError(409, "Account is already active");
    if (!target.twoFactorEnabled)
      throw new HttpError(409, "The recovered Owner must enroll multi-factor authentication before reactivation");
    await c.query("UPDATE staff_profile SET active=true,mfa_required=true WHERE user_id=$1", [targetId]);
    await c.query('UPDATE dashboard_impersonation SET expires_at=now() WHERE target_id=$1', [targetId]);
    await c.query('DELETE FROM session WHERE "userId"=$1', [targetId]);
    await audit(c, ownerId, "account.retirement.reactivated", targetId, {
      mfaRequired: true,
    });
    return { reactivated: true, mfaRequired: true };
  });
}
export async function updateManagedAccount(
  ownerId: string,
  targetId: string,
  input: unknown,
) {
  const data = accountUpdateInput.parse(input);
  return transaction(async (c) => {
    await ownerLock(c, ownerId);
    const target = await mutableManagedTarget(c, targetId);
    if (target.role === "owner")
      throw new HttpError(
        409,
        "Owner access cannot be changed in User Manager",
      );
    if (
      ["client", "crew"].includes(target.role) &&
      (data.capabilities.length || data.formNotificationIds.length)
    )
      throw new HttpError(
        400,
        "Client and crew accounts cannot receive office permissions or form notifications",
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
    await c.query('UPDATE dashboard_impersonation SET expires_at=now() WHERE target_id=$1', [targetId]);
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
    const target = await mutableManagedTarget(c, targetId);
    if (target.role === "owner")
      throw new HttpError(
        409,
        "Manage your own sessions through account security",
      );
    await c.query('UPDATE dashboard_impersonation SET expires_at=now() WHERE target_id=$1', [targetId]);
    await c.query('DELETE FROM session WHERE "userId"=$1', [targetId]);
    await audit(c, ownerId, "account.sessions.revoked", targetId);
    return { ok: true };
  });
}

export async function requestManagedPasswordRecovery(
  ownerId: string,
  targetId: string,
) {
  return transaction(async (c) => {
    await ownerLock(c, ownerId);
    const target = await c.query(
      `SELECT u.email,p.active,r.user_id AS retired FROM "user" u
       JOIN staff_profile p ON p.user_id=u.id
       LEFT JOIN account_retirement r ON r.user_id=u.id AND r.restored_at IS NULL
       WHERE u.id=$1 FOR UPDATE OF p`,
      [targetId],
    );
    if (!target.rowCount) throw new HttpError(404, "Account not found");
    if (target.rows[0].retired)
      throw new HttpError(409, "Retired accounts can only be changed through recovery");
    if (!target.rows[0].active)
      throw new HttpError(
        409,
        "Reactivate this account before requesting password recovery",
      );
    const recent = await c.query(
      "SELECT 1 FROM audit_event WHERE entity_id=$1 AND action='account.password_recovery.requested' AND created_at>now()-interval '1 minute' LIMIT 1",
      [targetId],
    );
    if (recent.rowCount)
      throw new HttpError(
        429,
        "Wait one minute before sending another recovery email",
      );
    await auth.api.requestPasswordReset({
      body: {
        email: target.rows[0].email,
        redirectTo: new URL("/?reset=1", origin).href,
      },
    });
    await audit(c, ownerId, "account.password_recovery.requested", targetId);
    return { ok: true };
  });
}

export async function updateOwnerNotifications(
  ownerId: string,
  targetId: string,
  input: unknown,
) {
  const data = ownerNotificationsInput.parse(input);
  return transaction(async (c) => {
    await ownerLock(c, ownerId);
    const target = await mutableManagedTarget(c, targetId);
    if (target.role !== "owner")
      throw new HttpError(409, "Use the team account editor for this account");
    await c.query(
      "INSERT INTO business_account_access(user_id) VALUES($1) ON CONFLICT DO NOTHING",
      [targetId],
    );
    const changed = await c.query(
      "UPDATE business_account_access SET form_notification_ids=$2,version=version+1,updated_at=now() WHERE user_id=$1 AND version=$3 RETURNING version",
      [targetId, data.formNotificationIds, data.version],
    );
    if (!changed.rowCount)
      throw new HttpError(
        409,
        "Preferences changed. Reload saved preferences before saving again; your draft is retained.",
      );
    await audit(c, ownerId, "account.form_notifications.updated", targetId, {
      formNotificationIds: data.formNotificationIds,
      version: changed.rows[0].version,
    });
    return changed.rows[0] as { version: number };
  });
}
