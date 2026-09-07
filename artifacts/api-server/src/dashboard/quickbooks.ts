import { guardAgreementPosting } from "./agreement-review.persistence";
import { requireOperationalChild } from "./operational-property";
import type { PoolClient } from "pg";
import { Router, raw } from "express";
import { z } from "zod";
import {
  randomBytes,
  randomUUID,
  createHash,
  createCipheriv,
  createDecipheriv,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { pool, transaction } from "./database";
import { actor } from "./access";
import { requireRole, HttpError } from "./policy";
const tokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});
function key() {
  const value = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value))
    throw new HttpError(503, "Integration encryption is not configured");
  return Buffer.from(value, "hex");
}
export function seal(value: unknown) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value)),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}
function unseal(value: string) {
  const b = Buffer.from(value, "base64"),
    d = createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([d.update(b.subarray(28)), d.final()]).toString(),
  );
}
function config() {
  if (!process.env.QBO_CLIENT_ID || !process.env.QBO_CLIENT_SECRET)
    throw new HttpError(503, "QuickBooks credentials are not configured");
  return {
    id: process.env.QBO_CLIENT_ID,
    secret: process.env.QBO_CLIENT_SECRET,
    redirect: process.env.DASHBOARD_ORIGIN + "/api/v1/quickbooks/callback",
  };
}
async function exchange(params: Record<string, string>) {
  const c = config();
  const r = await fetch(
    "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(c.id + ":" + c.secret).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams(params),
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!r.ok)
    throw new HttpError(
      502,
      "QuickBooks authorization failed; reconnect the account",
    );
  const t = tokenSchema.parse(await r.json());
  return { ...t, expiresAt: Date.now() + t.expires_in * 1000 };
}
async function credentials() {
  return transaction(async (c) => {
    const r = await c.query(
      "SELECT * FROM integration_connection WHERE provider='quickbooks' FOR UPDATE",
    );
    if (!r.rowCount) throw new HttpError(503, "QuickBooks is not connected");
    let t = unseal(r.rows[0].credentials_encrypted);
    if (t.expiresAt < Date.now() + 60000) {
      t = await exchange({
        grant_type: "refresh_token",
        refresh_token: t.refresh_token,
      });
      await c.query(
        "UPDATE integration_connection SET credentials_encrypted=$1,updated_at=now() WHERE provider='quickbooks'",
        [seal(t)],
      );
    }
    return { realm: r.rows[0].realm_id, token: t.access_token };
  });
}
async function qbo(path: string, body?: unknown) {
  const c = await credentials();
  const host =
    process.env.QBO_ENVIRONMENT === "production"
      ? "https://quickbooks.api.intuit.com"
      : "https://sandbox-quickbooks.api.intuit.com";
  const r = await fetch(
    host + "/v3/company/" + encodeURIComponent(c.realm) + "/" + path,
    {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: "Bearer " + c.token,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!r.ok)
    throw new HttpError(
      502,
      `QuickBooks request failed (${r.status}); review integration status`,
    );
  return (await r.json()) as any;
}
function paymentLink(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      (u.hostname === "intuit.com" || u.hostname.endsWith(".intuit.com"))
      ? value
      : null;
  } catch {
    return null;
  }
}
export const qboApi = Router();
qboApi.post("/quickbooks/connect", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner"]);
  const c = config();
  key();
  const state = randomBytes(32).toString("hex");
  await pool.query(
    "INSERT INTO oauth_state(hash,user_id,expires_at) VALUES($1,$2,now()+interval '10 minutes')",
    [createHash("sha256").update(state).digest("hex"), a.id],
  );
  const u = new URL("https://appcenter.intuit.com/connect/oauth2");
  u.search = new URLSearchParams({
    client_id: c.id,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    redirect_uri: c.redirect,
    state,
  }).toString();
  res.json({ url: u.toString() });
});
qboApi.get("/quickbooks/callback", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner"]);
  const b = z
    .object({
      state: z.string(),
      code: z.string(),
      realmId: z.string().regex(/^\d+$/),
    })
    .parse(req.query);
  await transaction(async (c) => {
    const r = await c.query(
      "DELETE FROM oauth_state WHERE hash=$1 AND user_id=$2 AND expires_at>now() RETURNING hash",
      [createHash("sha256").update(b.state).digest("hex"), a.id],
    );
    if (!r.rowCount)
      throw new HttpError(403, "Invalid or expired authorization state");
    await bindQuickBooksRealm(c, b.realmId, () =>
      exchange({
        grant_type: "authorization_code",
        code: b.code,
        redirect_uri: config().redirect,
      }),
    );
  });
  res.redirect("/");
});
export async function bindQuickBooksRealm(
  c: PoolClient,
  realmId: string,
  tokens: () => Promise<z.infer<typeof tokenSchema>>,
) {
  await c.query(
    "SELECT pg_advisory_xact_lock(hashtextextended('quickbooks-connection',0))",
  );
  const old = await c.query(
    "SELECT realm_id FROM integration_connection WHERE provider='quickbooks'",
  );
  if (old.rowCount && old.rows[0].realm_id !== realmId)
    throw new HttpError(
      409,
      "This dashboard is already connected to another QuickBooks company",
    );
  const t = await tokens();
  await c.query(
    "INSERT INTO integration_connection(provider,realm_id,credentials_encrypted) VALUES('quickbooks',$1,$2) ON CONFLICT(provider) DO UPDATE SET credentials_encrypted=EXCLUDED.credentials_encrypted,updated_at=now()",
    [realmId, seal(t)],
  );
}
async function queryAll(entity: "Customer" | "Invoice", filter = "") {
  const rows: any[] = [];
  for (let start = 1; start <= 10001; start += 1000) {
    const q = `select * from ${entity} ${filter} startposition ${start} maxresults 1000`;
    const result = await qbo("query?query=" + encodeURIComponent(q));
    const batch = result.QueryResponse?.[entity] || [];
    rows.push(...batch);
    if (batch.length < 1000) return rows;
  }
  throw new HttpError(422, "Import exceeds supported preview size");
}
qboApi.post("/quickbooks/import-preview", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "finance"]);
  const [customers, invoices] = await Promise.all([
    queryAll("Customer"),
    queryAll("Invoice", "where Balance > '0'"),
  ]);
  const existing = (
    await pool.query("SELECT id,name,email,quickbooks_id FROM client")
  ).rows;
  const preview = customers.map((c) => ({
    quickbooksId: c.Id,
    name: c.DisplayName,
    email: c.PrimaryEmailAddr?.Address || null,
    existingId: existing.find((e) => e.quickbooks_id === c.Id)?.id || null,
    possibleMatches: existing
      .filter(
        (e) =>
          !e.quickbooks_id &&
          (e.name.toLowerCase() === c.DisplayName.toLowerCase() ||
            (c.PrimaryEmailAddr?.Address &&
              e.email?.toLowerCase() ===
                c.PrimaryEmailAddr.Address.toLowerCase())),
      )
      .map((e) => ({ id: e.id, name: e.name })),
  }));
  const key = randomUUID();
  await pool.query(
    "INSERT INTO quickbooks_import_preview(id,user_id,payload,expires_at) VALUES($1,$2,$3,now()+interval '30 minutes')",
    [key, a.id, { customers: preview, invoices }],
  );
  res.json({ id: key, customers: preview, openInvoices: invoices.length });
});
qboApi.post("/quickbooks/import", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "finance"]);
  const b = z
    .object({
      previewId: z.string().uuid(),
      customers: z
        .array(
          z.object({
            quickbooksId: z.string(),
            clientId: z.string().uuid().nullable(),
          }),
        )
        .max(10000),
    })
    .parse(req.body);
  await transaction(async (c) => {
    const preview = (
      await c.query(
        "SELECT payload FROM quickbooks_import_preview WHERE id=$1 AND user_id=$2 AND expires_at>now() FOR UPDATE",
        [b.previewId, a.id],
      )
    ).rows[0]?.payload;
    if (!preview)
      throw new HttpError(409, "Preview expired; generate a new preview");
    for (const mapping of b.customers) {
      const item = preview.customers.find(
        (p: any) => p.quickbooksId === mapping.quickbooksId,
      );
      if (!item) throw new HttpError(400, "Customer is not in this preview");
      if (item.existingId && mapping.clientId !== item.existingId)
        throw new HttpError(409, "Existing customer mapping cannot be changed");
      if (mapping.clientId) {
        const changed = await c.query(
          "UPDATE client SET quickbooks_id=$2 WHERE id=$1 AND (quickbooks_id IS NULL OR quickbooks_id=$2) RETURNING id",
          [mapping.clientId, item.quickbooksId],
        );
        if (!changed.rowCount)
          throw new HttpError(409, "Client mapping conflict");
      } else
        await c.query(
          "INSERT INTO client(id,name,email,quickbooks_id) VALUES($1,$2,$3,$4)",
          [randomUUID(), item.name, item.email, item.quickbooksId],
        );
    }
    for (const invoice of preview.invoices) {
      const mapped = (
        await c.query("SELECT id FROM client WHERE quickbooks_id=$1", [
          invoice.CustomerRef.value,
        ])
      ).rows[0];
      if (!mapped)
        await c.query(
          "UPDATE external_invoice SET ownership_verified=false,payment_url=NULL WHERE id=$1",
          [invoice.Id],
        );
      if (mapped)
        await c.query(
          "INSERT INTO external_invoice(id,client_id,document_number,total_cents,balance_cents,due_date,payment_url,ownership_verified) VALUES($1,$2,$3,$4,$5,$6,$7,true) ON CONFLICT(id) DO UPDATE SET client_id=EXCLUDED.client_id,document_number=EXCLUDED.document_number,ownership_verified=true,total_cents=EXCLUDED.total_cents,balance_cents=EXCLUDED.balance_cents,due_date=EXCLUDED.due_date,payment_url=EXCLUDED.payment_url,updated_at=now()",
          [
            invoice.Id,
            mapped.id,
            invoice.DocNumber || null,
            Math.round(invoice.TotalAmt * 100),
            Math.round(invoice.Balance * 100),
            invoice.DueDate || null,
            paymentLink(invoice.InvoiceLink),
          ],
        );
    }
    await c.query("DELETE FROM quickbooks_import_preview WHERE id=$1", [
      b.previewId,
    ]);
  });
  res.json({ ok: true });
});
qboApi.get("/quickbooks/invoices", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "finance", "client"]);
  res.json(
    (
      await pool.query(
        `SELECT i.*,c.name AS client_name FROM external_invoice i JOIN client c ON c.id=i.client_id ${a.role === "client" ? "WHERE i.ownership_verified=true AND EXISTS(SELECT 1 FROM client_access ca WHERE ca.client_id=c.id AND ca.user_id=$1)" : ""} ORDER BY due_date`,
        a.role === "client" ? [a.id] : [],
      )
    ).rows,
  );
});
export async function postBillingDraft(
  a: Awaited<ReturnType<typeof actor>>,
  key: string,
  item: string,
  postInvoice: typeof qbo = qbo,
) {
  requireRole(a.role, ["owner", "manager", "finance"]);
  const draft = await transaction(async (c) => {
    await guardAgreementPosting(c, key);
    await requireOperationalChild(c, "billing_draft", key);
    const b = (
      await c.query(
        "SELECT b.*,c.quickbooks_id AS customer FROM billing_draft b JOIN property p ON p.id=b.property_id AND p.lifecycle='operational' JOIN client c ON c.id=p.client_id WHERE b.id=$1 FOR UPDATE OF b",
        [key],
      )
    ).rows[0];
    if (!b) throw new HttpError(404, "Billing draft not found");
    if (b.status === "posted") return b;
    if (!b.customer)
      throw new HttpError(409, "Map this client to QuickBooks before posting");
    const payload = b.posting_payload || {
      CustomerRef: { value: b.customer },
      PrivateNote: "P1 billing " + b.id,
      Line: [
        {
          Amount: Number(b.amount_cents) / 100,
          Description: b.title,
          DetailType: "SalesItemLineDetail",
          SalesItemLineDetail: {
            ItemRef: { value: item },
            Qty: 1,
            UnitPrice: Number(b.amount_cents) / 100,
          },
        },
      ],
    };
    const requestId = b.posting_request_id || randomUUID();
    await c.query(
      "UPDATE billing_draft SET status='approved',posting_request_id=$2,posting_payload=$3 WHERE id=$1",
      [key, requestId, payload],
    );
    return { ...b, posting_request_id: requestId, posting_payload: payload };
  });
  if (draft.status === "posted") {
    return { id: key, status: "posted" as const };
  }
  try {
    const response = await postInvoice(
      "invoice?requestid=" + draft.posting_request_id,
      draft.posting_payload,
    );
    const invoice = response.Invoice;
    if (!invoice?.Id)
      throw new HttpError(
        502,
        "QuickBooks returned an ambiguous result; retry the same draft",
      );
    await pool.query(
      "UPDATE billing_draft SET status='posted',quickbooks_id=$2,balance_cents=$3,payment_url=$4 WHERE id=$1",
      [
        key,
        invoice.Id,
        Math.round(invoice.Balance * 100),
        paymentLink(invoice.InvoiceLink),
      ],
    );
    return { id: key, status: "posted" as const };
  } catch (e) {
    await pool.query(
      "UPDATE billing_draft SET status='failed' WHERE id=$1 AND status<>'posted'",
      [key],
    );
    throw e;
  }
}
qboApi.post("/billing/:id/post", async (req, res) => {
  const a = await actor(req);
  const key = z.string().uuid().parse(req.params.id);
  const item = process.env.QBO_SERVICE_ITEM_ID;
  if (!item)
    throw new HttpError(503, "A QuickBooks service item mapping is required");
  res.json(await postBillingDraft(a, key, item));
});
// Every imported refresh revalidates accounting ownership before any client can see it.
export async function refreshInvoiceOwnership(i: any) {
  await transaction(async (c) => {
    const mapped = (
      await c.query("SELECT id FROM client WHERE quickbooks_id=$1", [
        i.CustomerRef?.value || "",
      ])
    ).rows[0];
    await c.query(
      "UPDATE external_invoice SET client_id=COALESCE($2,client_id),ownership_verified=$3,total_cents=$4,balance_cents=$5,payment_url=$6,updated_at=now() WHERE id=$1",
      [
        i.Id,
        mapped?.id || null,
        Boolean(mapped),
        Math.round(i.TotalAmt * 100),
        Math.round(i.Balance * 100),
        mapped ? paymentLink(i.InvoiceLink) : null,
      ],
    );
    await c.query(
      "UPDATE billing_draft b SET ownership_verified=COALESCE(p.lifecycle='operational' AND p.client_id=$2::uuid,false),balance_cents=$3,payment_url=CASE WHEN p.lifecycle='operational' AND p.client_id=$2::uuid THEN $4 ELSE NULL END FROM property p WHERE b.property_id=p.id AND b.quickbooks_id=$1",
      [
        i.Id,
        mapped?.id || null,
        Math.round(i.Balance * 100),
        paymentLink(i.InvoiceLink),
      ],
    );
  });
}
export async function reconcileQuickBooks() {
  const connected = await pool.query(
    "SELECT 1 FROM integration_connection WHERE provider='quickbooks'",
  );
  if (!connected.rowCount) return;
  const invoices = (
    await pool.query(
      "SELECT quickbooks_id AS id FROM billing_draft WHERE status='posted' UNION SELECT id FROM external_invoice",
    )
  ).rows;
  for (const row of invoices) {
    const result = await qbo(
      "invoice/" + encodeURIComponent(row.id) + "?include=invoiceLink",
    );
    const i = result.Invoice;
    if (!i) throw new Error("QuickBooks invoice unavailable");
    await refreshInvoiceOwnership(i);
  }
}
export const qboWebhook = Router();
qboWebhook.post(
  "/quickbooks",
  raw({ type: "application/json", limit: "1mb" }),
  async (req, res) => {
    const token = process.env.QBO_WEBHOOK_TOKEN,
      signature = req.headers["intuit-signature"];
    if (!token || typeof signature !== "string" || !Buffer.isBuffer(req.body)) {
      res.sendStatus(401);
      return;
    }
    const expected = createHmac("sha256", token).update(req.body).digest();
    const actual = Buffer.from(signature, "base64");
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      res.sendStatus(401);
      return;
    }
    await pool.query("INSERT INTO outbox(id,kind,payload) VALUES($1,$2,$3)", [
      randomUUID(),
      "quickbooks.reconcile",
      {},
    ]);
    res.sendStatus(200);
  },
);
