import { pool, transaction } from "./database";
import { generateRecurring } from "./recurrence";
import { reconcileQuickBooks } from "./quickbooks";
import { deliverSms } from "./notifications";
let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
async function deliver(job: {
  kind: string;
  payload: { to: string; subject: string; text: string; userId: string };
}) {
  if (job.kind === "sms") {
    return await deliverSms(job.payload);
  }
  if (job.kind === "quickbooks.reconcile") {
    await reconcileQuickBooks();
    return undefined;
  }
  if (job.kind !== "email") throw new Error("Unsupported job type");
  if (
    !process.env.MAILGUN_API_KEY ||
    !process.env.MAILGUN_DOMAIN ||
    !process.env.EMAIL_FROM
  )
    throw new Error("Email provider is not configured");
  const form = new FormData();
  form.set("from", process.env.EMAIL_FROM);
  form.set("to", job.payload.to);
  form.set("subject", job.payload.subject);
  form.set("text", job.payload.text);
  const response = await fetch(
    `https://api.mailgun.net/v3/${encodeURIComponent(process.env.MAILGUN_DOMAIN)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from("api:" + process.env.MAILGUN_API_KEY).toString("base64"),
      },
      body: form,
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!response.ok)
    throw new Error(`Email provider returned ${response.status}`);
  return ((await response.json()) as { id: string }).id;
}
let lastRecurring = 0,
  lastReconcile = 0;
try {
  while (!stopping) {
    if (Date.now() - lastReconcile > 900000) {
      await pool.query(
        "INSERT INTO outbox(id,kind,payload) SELECT gen_random_uuid(),'quickbooks.reconcile','{}'::jsonb WHERE EXISTS(SELECT 1 FROM integration_connection WHERE provider='quickbooks') AND NOT EXISTS(SELECT 1 FROM outbox WHERE kind='quickbooks.reconcile' AND status IN ('pending','processing'))",
      );
      lastReconcile = Date.now();
    }
    if (Date.now() - lastRecurring > 60000) {
      await generateRecurring();
      lastRecurring = Date.now();
    }
    const job = await transaction(async (c) => {
      await c.query(
        "UPDATE outbox SET status='failed',last_error='Delivery outcome unknown after worker interruption; review before retry' WHERE status='processing' AND locked_at<now()-interval '5 minutes'",
      );
      const r = await c.query(
        "SELECT * FROM outbox WHERE status='pending' AND available_at<=now() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1",
      );
      if (!r.rowCount) return null;
      await c.query(
        "UPDATE outbox SET status='processing',locked_at=now(),attempts=attempts+1 WHERE id=$1",
        [r.rows[0].id],
      );
      return r.rows[0];
    });
    if (!job) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }
    try {
      const providerId = await deliver(job);
      await pool.query(
        "UPDATE outbox SET status='sent',payload='{}'::jsonb,last_error=NULL,provider_message_id=$2 WHERE id=$1",
        [job.id, providerId || null],
      );
    } catch (error) {
      await pool.query(
        "UPDATE outbox SET status='failed',last_error=$2 WHERE id=$1",
        [job.id, error instanceof Error ? error.message : "Delivery failed"],
      );
      console.error(
        JSON.stringify({ event: "delivery.failed", jobId: job.id }),
      );
    }
  }
} finally {
  await pool.end();
}
