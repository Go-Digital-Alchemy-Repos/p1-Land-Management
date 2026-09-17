import { pool } from "./database";

// Office access and opt-in are both required. Selection is repeated at delivery;
// a queued account ID never freezes an email address or grants lasting access.
const eligible = `FROM "user" u
  JOIN staff_profile p ON p.user_id=u.id
  JOIN business_account_access a ON a.user_id=u.id
  WHERE p.active=true AND u."emailVerified"=true
    AND p.role NOT IN ('client','crew')
    AND (p.mfa_required=false OR u."twoFactorEnabled"=true)
    AND $1=ANY(a.form_notification_ids)
    AND (p.role='owner' OR 'marketing.content.forms'=ANY(a.capabilities))`;

export async function listFormNotificationSubjects(
  formId: string,
  after: string,
) {
  const result = await pool.query(
    `SELECT u.id ${eligible} AND u.id>$2 ORDER BY u.id LIMIT 21`,
    [formId, after],
  );
  const subjects = result.rows.slice(0, 20).map((row) => row.id as string);
  return {
    subjects,
    nextCursor: result.rows.length > 20 ? subjects[subjects.length - 1] : null,
  };
}

export async function resolveFormNotificationRecipient(
  formId: string,
  subject: string,
) {
  const result = await pool.query(
    `SELECT u.id,u.email ${eligible} AND u.id=$2`,
    [formId, subject],
  );
  return {
    recipient: result.rows[0]
      ? {
          subject: result.rows[0].id as string,
          email: result.rows[0].email as string,
        }
      : null,
  };
}
