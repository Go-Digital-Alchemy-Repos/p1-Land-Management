import { randomUUID } from "node:crypto";

/** Queue operational updates without putting contact addresses in audit events. */
export async function notifyStaff(
  c: any,
  userId: string | null | undefined,
  title: string,
  body: string,
  dedupKey: string,
) {
  if (!userId) return;
  const recipient = (await c.query(
    `SELECT u.email FROM "user" u JOIN staff_profile s ON s.user_id=u.id
     WHERE u.id=$1 AND s.active=true`,
    [userId],
  )).rows[0];
  if (!recipient?.email) return;
  const queued = await c.query(
    "INSERT INTO outbox(id,kind,payload,dedup_key) VALUES($1,'email',$2,$3) ON CONFLICT(dedup_key) DO NOTHING",
    [randomUUID(), { to: recipient.email, subject: title, text: body }, dedupKey],
  );
  if (queued.rowCount)
    await c.query(
      "INSERT INTO notification(id,user_id,title,body) VALUES($1,$2,$3,$4)",
      [randomUUID(), userId, title, body],
    );
}

export async function notifyClientContacts(
  c: any,
  propertyId: string,
  title: string,
  body: string,
  dedupPrefix: string,
) {
  const contacts = (await c.query(
    `SELECT c.id,c.email FROM contact c JOIN property p ON p.client_id=c.client_id
     LEFT JOIN contact_notification_preference pref ON pref.contact_id=c.id
     WHERE p.id=$1 AND c.archived=false AND c.email IS NOT NULL
       AND COALESCE(pref.email_enabled,true)=true`,
    [propertyId],
  )).rows;
  for (const contact of contacts)
    await c.query(
      "INSERT INTO outbox(id,kind,payload,dedup_key) VALUES($1,'email',$2,$3) ON CONFLICT(dedup_key) DO NOTHING",
      [randomUUID(), { to: contact.email, subject: title, text: body }, `${dedupPrefix}:${contact.id}`],
    );
}

export async function notifyRoles(
  c: any,
  roles: string[],
  title: string,
  body: string,
  dedupPrefix: string,
) {
  const recipients = (await c.query(
    "SELECT user_id FROM staff_profile WHERE active=true AND role=ANY($1::text[])",
    [roles],
  )).rows;
  for (const recipient of recipients)
    await notifyStaff(c, recipient.user_id, title, body, `${dedupPrefix}:${recipient.user_id}`);
}
