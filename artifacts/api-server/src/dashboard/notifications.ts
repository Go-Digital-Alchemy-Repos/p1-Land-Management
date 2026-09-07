import { Router, urlencoded } from "express";
import { z } from "zod";
import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import { pool, transaction } from "./database";
import { actor } from "./access";
import { requireRole, HttpError } from "./policy";
export const notificationsApi = Router();
notificationsApi.get("/notifications", async (req, res) => {
  const a = await actor(req);
  res.json(
    (
      await pool.query(
        "SELECT * FROM notification WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",
        [a.id],
      )
    ).rows,
  );
});
notificationsApi.post("/notifications/:id/read", async (req, res) => {
  const a = await actor(req);
  await pool.query(
    "UPDATE notification SET read_at=now() WHERE id=$1 AND user_id=$2",
    [z.string().uuid().parse(req.params.id), a.id],
  );
  res.json({ ok: true });
});
notificationsApi.post("/notification-preferences", async (req, res) => {
  const a = await actor(req);
  const b = z
    .object({
      phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
      optedIn: z.boolean(),
    })
    .parse(req.body);
  const consent =
    "P1 operational text updates: appointment reminders and schedule changes. Message frequency varies. Message/data rates may apply. Reply STOP to opt out or HELP for help.";
  await pool.query(
    "INSERT INTO sms_consent(user_id,phone,opted_in,consent_text) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET phone=EXCLUDED.phone,opted_in=EXCLUDED.opted_in,consent_text=EXCLUDED.consent_text,updated_at=now()",
    [a.id, b.phone, b.optedIn, consent],
  );
  res.json({ ok: true });
});
notificationsApi.post("/notifications/send", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "dispatch"]);
  const b = z
    .object({
      id: z.string().uuid(),
      userId: z.string(),
      title: z.string().min(1).max(200),
      body: z.string().min(1).max(2000),
      email: z.boolean().default(true),
      sms: z.boolean().default(false),
    })
    .parse(req.body);
  await transaction(async (c) => {
    const user = (
      await c.query(
        'SELECT u.email FROM "user" u JOIN staff_profile p ON p.user_id=u.id WHERE u.id=$1 AND p.active=true',
        [b.userId],
      )
    ).rows[0];
    if (!user) throw new HttpError(404, "Recipient not found");
    const saved = await c.query(
      "INSERT INTO notification(id,user_id,title,body) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING RETURNING id",
      [b.id, b.userId, b.title, b.body],
    );
    if (!saved.rowCount) return;
    if (b.email)
      await c.query(
        "INSERT INTO outbox(id,kind,payload,dedup_key) VALUES($1,$2,$3,$4)",
        [
          randomUUID(),
          "email",
          { to: user.email, subject: b.title, text: b.body },
          "email:" + b.id,
        ],
      );
    if (b.sms) {
      const consent = (
        await c.query(
          "SELECT phone FROM sms_consent WHERE user_id=$1 AND opted_in=true",
          [b.userId],
        )
      ).rows[0];
      if (!consent)
        throw new HttpError(409, "Recipient has not opted in to SMS");
      await c.query(
        "INSERT INTO outbox(id,kind,payload,dedup_key) VALUES($1,$2,$3,$4)",
        [
          randomUUID(),
          "sms",
          { to: consent.phone, text: b.body, userId: b.userId },
          "sms:" + b.id,
        ],
      );
    }
  });
  res.status(201).json({ ok: true });
});
notificationsApi.post("/delivery-jobs/:id/retry", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager"]);
  const key = z.string().uuid().parse(req.params.id);
  await transaction(async (c) => {
    const r = await c.query(
      "UPDATE outbox SET status='pending',available_at=now(),last_error=NULL WHERE id=$1 AND status='failed' RETURNING id",
      [key],
    );
    if (!r.rowCount) throw new HttpError(409, "Job is not awaiting a retry");
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id) VALUES($1,$2,$3,$4)",
      [randomUUID(), a.id, "delivery.retry_requested", key],
    );
  });
  res.json({ ok: true });
});
export const smsWebhook = Router();
smsWebhook.post(
  "/twilio",
  urlencoded({ extended: false, limit: "32kb" }),
  async (req, res) => {
    const signature = req.headers["x-twilio-signature"],
      secret = process.env.TWILIO_AUTH_TOKEN;
    if (!secret || typeof signature !== "string") {
      res.sendStatus(401);
      return;
    }
    let content = process.env.DASHBOARD_ORIGIN + "/api/webhooks/twilio";
    for (const k of Object.keys(req.body).sort())
      content += k + String(req.body[k]);
    const expected = createHmac("sha1", secret).update(content).digest();
    const supplied = Buffer.from(signature, "base64");
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      res.sendStatus(401);
      return;
    }
    const command = String(req.body.Body || "")
      .trim()
      .toUpperCase();
    if (
      ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(
        command,
      )
    )
      await pool.query(
        "UPDATE sms_consent SET opted_in=false,updated_at=now() WHERE phone=$1",
        [req.body.From],
      );
    if (req.body.MessageSid && req.body.MessageStatus)
      await pool.query(
        "UPDATE outbox SET last_error=$2 WHERE provider_message_id=$1",
        [
          req.body.MessageSid,
          ["failed", "undelivered"].includes(req.body.MessageStatus)
            ? "SMS delivery failed"
            : null,
        ],
      );
    res
      .type("text/xml")
      .send(
        command === "HELP"
          ? "<Response><Message>P1 Land Management: contact info@p1landmanagement.com for help. Reply STOP to opt out.</Message></Response>"
          : "<Response/>",
      );
  },
);
export async function deliverSms(payload: {
  to: string;
  text: string;
  userId: string;
}) {
  if (
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN ||
    !process.env.TWILIO_FROM
  )
    throw new Error("SMS provider is not configured");
  const consent = await pool.query(
    "SELECT 1 FROM sms_consent WHERE user_id=$1 AND phone=$2 AND opted_in=true",
    [payload.userId, payload.to],
  );
  if (!consent.rowCount) throw new Error("SMS consent withdrawn");
  const result = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(process.env.TWILIO_ACCOUNT_SID)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            process.env.TWILIO_ACCOUNT_SID +
              ":" +
              process.env.TWILIO_AUTH_TOKEN,
          ).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: process.env.TWILIO_FROM,
        To: payload.to,
        Body: payload.text,
        StatusCallback: process.env.DASHBOARD_ORIGIN + "/api/webhooks/twilio",
      }),
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!result.ok) throw new Error(`SMS provider returned ${result.status}`);
  return ((await result.json()) as { sid: string }).sid;
}
