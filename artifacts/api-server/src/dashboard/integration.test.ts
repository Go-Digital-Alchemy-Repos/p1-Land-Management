import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { pool, transaction } from "./database";
import { refreshInvoiceOwnership, bindQuickBooksRealm } from "./quickbooks";
import { generateRecurring } from "./recurrence";
const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw new Error("Integration tests require an explicitly local test server");
const headers = { origin: base || "", "Content-Type": "application/json" };
function totp(secret: string) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.toUpperCase().replace(/=+$/, ""))
    bits += chars.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac("sha1", key).update(counter).digest();
  const i = h[19] & 15;
  return String((h.readUInt32BE(i) & 0x7fffffff) % 1000000).padStart(6, "0");
}
async function waitForProfileLock() {
  for (let attempt = 0; attempt < 100; attempt++) {
    const waiting = await pool.query(
      "SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%FROM staff_profile WHERE user_id=$1%' LIMIT 1",
    );
    if (waiting.rowCount) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for the factor-policy lock");
}
function client() {
  const jar = new Map<string, string>();
  return async (
    path: string,
    body?: unknown,
    extra: Record<string, string> = {},
  ) => {
    const r = await fetch(base + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...headers,
        cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
        ...extra,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
    });
    for (const c of r.headers.getSetCookie()) {
      const [name, ...v] = c.split(";")[0].split("=");
      jar.set(name, v.join("="));
    }
    const raw = await r.text();
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
    return {
      status: r.status,
      data,
      authToken: r.headers.get("set-auth-token"),
      cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
    };
  };
}
async function nativeClient(
  path: string,
  token: string,
  body?: unknown,
  cookie?: string,
  requestOrigin?: string,
) {
  const r = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { cookie } : {}),
      ...(requestOrigin ? { origin: requestOrigin } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await r.text();
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }
  return { status: r.status, data };
}
function sessionTokenFromCookie(cookie: string) {
  const token = cookie.match(
    /(?:^|;\s*)p1-dashboard\.session_token=([^;]+)/,
  )?.[1];
  return token ? decodeURIComponent(token) : null;
}
after(async () => {
  await pool.end();
});
test(
  "local integration: bootstrap, isolation, approvals, offline replay, billing cap and slot collision",
  { skip: !base },
  async () => {
    const owner = client();
    const suffix = randomUUID();
    const ownerEmail =
      process.env.BOOTSTRAP_OWNER_EMAIL || "owner@example.test";
    const password = "Local-test-password-42!";
    let r = await owner(
      "/api/auth/sign-up/email",
      { name: "Test owner", email: ownerEmail, password },
      { "x-p1-setup-code": "wrong" },
    );
    assert.equal(r.status, 403);
    r = await owner(
      "/api/auth/sign-up/email",
      { name: "Test owner", email: ownerEmail, password },
      { "x-p1-setup-code": "secret" },
    );
    assert.equal(r.status, 200, JSON.stringify(r.data));
    async function verify(email: string) {
      const message = (
        await pool.query(
          "SELECT payload FROM outbox WHERE payload->>'to'=$1 ORDER BY created_at DESC LIMIT 1",
          [email],
        )
      ).rows[0];
      assert.ok(message);
      const url = new URL(message.payload.text);
      const response = await fetch(url, { redirect: "manual" });
      assert.ok([200, 302].includes(response.status));
    }
    await verify(ownerEmail);
    r = await owner("/api/auth/sign-in/email", { email: ownerEmail, password });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal((await owner("/api/v1/clients")).status, 403);
    const staleOwner = client();
    assert.equal(
      (
        await staleOwner("/api/auth/sign-in/email", {
          email: ownerEmail,
          password,
        })
      ).status,
      200,
    );
    r = await owner("/api/v1/setup/complete", { code: "secret" });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    // Bootstrap makes the owner MFA-required immediately. Authentication
    // enrollment remains available, but protected business data does not.
    assert.equal((await owner("/api/v1/clients")).status, 403);
    assert.equal(
      (await staleOwner("/api/v1/setup/complete", { code: "secret" })).status,
      401,
    );
    r = await owner("/api/auth/two-factor/enable", { password });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    const secret = new URL(r.data.totpURI).searchParams.get("secret")!;
    r = await owner("/api/auth/two-factor/verify-totp", { code: totp(secret) });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    const nativeToken = r.authToken;
    assert.ok(
      nativeToken,
      "MFA verification must yield a native session token",
    );
    const invalidBearerWithCookie = await nativeClient(
      "/api/v1/clients",
      "invalid-token",
      { name: "Must retain browser Origin protection" },
      r.cookie,
    );
    assert.equal(invalidBearerWithCookie.status, 403);
    const prefixedCookieBearer = await nativeClient(
      "/api/v1/clients",
      nativeToken,
      { name: "Secure-prefixed cookie must not use native transport" },
      "__Secure-p1-dashboard.session_token=synthetic",
    );
    assert.equal(prefixedCookieBearer.status, 403);
    const invalidNativeBearer = await nativeClient(
      "/api/v1/clients",
      "invalid-token",
      { name: "Invalid native bearer" },
    );
    assert.equal(invalidNativeBearer.status, 401);
    const forgedOriginBearer = await nativeClient(
      "/api/v1/clients",
      nativeToken,
      { name: "Forged Origin bearer" },
      undefined,
      "https://attacker.example",
    );
    assert.equal(forgedOriginBearer.status, 403);
    const native = await nativeClient("/api/v1/clients", nativeToken, {
      name: "Native session client " + suffix,
    });
    assert.equal(native.status, 201, JSON.stringify(native.data));
    assert.equal(
      (await owner("/api/v1/setup/complete", { code: "secret" })).status,
      409,
    );
    assert.equal((await staleOwner("/api/v1/clients")).status, 401);
    const ca = (await owner("/api/v1/clients", { name: "Client A " + suffix }))
      .data.id;
    const cb = (await owner("/api/v1/clients", { name: "Client B " + suffix }))
      .data.id;
    const pa = (
      await owner("/api/v1/properties", {
        clientId: ca,
        name: "Property A",
        address: "Test A",
        accessInstructions: "Private gate code",
      })
    ).data.id;
    const pb = (
      await owner("/api/v1/properties", {
        clientId: cb,
        name: "Property B",
        address: "Test B",
      })
    ).data.id;
    const email = "client-" + suffix + "@example.test";
    r = await owner("/api/v1/invitations", {
      email,
      role: "client",
      clientId: ca,
    });
    assert.equal(r.status, 201);
    const invite = (
      await pool.query("SELECT payload FROM outbox WHERE payload->>'to'=$1", [
        email,
      ])
    ).rows[0].payload.text;
    const token = new URL(invite.match(/http\S+/)[0]).searchParams.get(
      "invitation",
    )!;
    const customer = client();
    r = await customer(
      "/api/auth/sign-up/email",
      { name: "Client A", email, password },
      { "x-p1-invitation": token },
    );
    assert.equal(r.status, 200, JSON.stringify(r.data));
    await verify(email);
    assert.equal(
      (await customer("/api/auth/sign-in/email", { email, password })).status,
      200,
    );
    assert.equal(
      (await customer("/api/v1/invitations/accept", { token })).status,
      200,
    );
    const customerId = (await customer("/api/v1/me")).data.id;
    assert.equal(
      (await customer("/api/v1/account-mfa-policies")).status,
      403,
    );
    assert.equal(
      (
        await customer(`/api/v1/account-mfa-policies/${customerId}`, {
          required: true,
        })
      ).status,
      403,
    );
    r = await owner("/api/v1/account-mfa-policies");
    assert.equal(r.status, 200);
    assert.equal(r.data.some((account: any) => account.id === customerId), true);
    assert.equal(
      (
        await owner(`/api/v1/account-mfa-policies/${customerId}`, {
          required: true,
        })
      ).status,
      200,
    );
    r = await customer("/api/v1/me");
    assert.equal(r.data.mfaRequired, true);
    assert.equal(r.data.ownerMfaRequired, true);
    // A required but not-yet-enrolled account may still begin its first factor
    // enrollment; it cannot load protected data first.
    assert.equal(
      (await customer("/api/auth/two-factor/enable", { password })).status,
      200,
    );
    // A queued reset must re-read the factor state after acquiring the policy
    // lock. This simulates a factor enrollment completing while the queued
    // request still holds the user snapshot from before enrollment.
    const enrollmentLock = await pool.connect();
    let queuedFactorRead: ReturnType<typeof customer> | undefined;
    try {
      await enrollmentLock.query("BEGIN");
      await enrollmentLock.query(
        "SELECT 1 FROM staff_profile WHERE user_id=$1 FOR UPDATE",
        [customerId],
      );
      queuedFactorRead = customer("/api/auth/two-factor/get-totp-uri", {
        password,
      });
      await waitForProfileLock();
      await pool.query('UPDATE "user" SET "twoFactorEnabled"=true WHERE id=$1', [
        customerId,
      ]);
      await enrollmentLock.query("ROLLBACK");
      assert.equal((await queuedFactorRead).status, 403);
    } finally {
      await enrollmentLock.query("ROLLBACK").catch(() => undefined);
      enrollmentLock.release();
    }
    assert.equal((await customer("/api/v1/properties")).status, 403);
    assert.equal(
      (
        await owner(`/api/v1/account-mfa-policies/${customerId}`, {
          required: false,
        })
      ).status,
      200,
    );
    const props = (await customer("/api/v1/properties")).data;
    assert.equal(props.length, 1);
    assert.equal(props[0].id, pa);
    assert.equal(props[0].access_instructions, undefined);
    assert.equal(
      (await customer("/api/v1/properties/" + pb + "/timeline")).status,
      404,
    );
    assert.equal(
      (await customer("/api/v1/clients", { name: "Unauthorized" })).status,
      403,
    );
    // Requiring MFA for the current owner must take effect on the same session.
    // Remove that session's assurance to reproduce the stale-session factor
    // reset attack: password-only disable, backup-code replacement and URI
    // retrieval must all fail until the existing factor is verified.
    const ownerId = (await owner("/api/v1/me")).data.id;
    assert.equal(
      (
        await owner(`/api/v1/account-mfa-policies/${ownerId}`, {
          required: true,
        })
      ).status,
      200,
    );
    await pool.query(
      'DELETE FROM session_assurance WHERE session_id IN (SELECT id FROM session WHERE "userId"=$1)',
      [ownerId],
    );
    r = await owner("/api/v1/me");
    assert.equal(r.data.mfaRequired, true);
    assert.equal(r.data.ownerMfaRequired, true);
    assert.equal(
      (await owner("/api/auth/two-factor/disable", { password })).status,
      403,
    );
    assert.equal(
      (
        await owner("/api/auth/two-factor/generate-backup-codes", {
          password,
        })
      ).status,
      403,
    );
    assert.equal(
      (await owner("/api/auth/two-factor/get-totp-uri", { password })).status,
      403,
    );
    assert.equal(
      (
        await nativeClient("/api/auth/two-factor/get-totp-uri", nativeToken, {
          password,
        })
      ).status,
      403,
    );
    r = await owner("/api/auth/two-factor/verify-totp", { code: totp(secret) });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    // Ownership is permanently MFA-required. A verified owner may manage
    // another account's policy, but cannot use that policy endpoint to weaken
    // their own current or future session requirements.
    assert.equal(
      (
        await owner(`/api/v1/account-mfa-policies/${ownerId}`, {
          required: false,
        })
      ).status,
      409,
    );
    r = await owner("/api/v1/me");
    assert.equal(r.data.mfaRequired, false);
    assert.equal(r.data.ownerMfaRequired, false);
    const work = (
      await owner("/api/v1/work-orders", { propertyId: pa, title: "Mow" })
    ).data.id;
    assert.equal((await customer("/api/v1/work-orders")).data.length, 0);
    assert.equal(
      (
        await owner("/api/v1/work-orders/" + work + "/status", {
          status: "scheduled",
          version: 1,
        })
      ).status,
      200,
    );
    const event = {
      id: randomUUID(),
      workOrderId: work,
      baseVersion: 2,
      kind: "note",
      payload: { text: "Before condition" },
      capturedAt: new Date().toISOString(),
    };
    assert.equal(
      (await owner("/api/v1/field/sync", { events: [event] })).data.results[0]
        .status,
      "accepted",
    );
    assert.equal(
      (await owner("/api/v1/field/sync", { events: [event] })).data.results[0]
        .status,
      "accepted",
    );
    assert.equal(
      (
        await pool.query("SELECT count(*) FROM field_event WHERE id=$1", [
          event.id,
        ])
      ).rows[0].count,
      "1",
    );
    assert.equal(
      (await customer("/api/v1/properties/" + pa + "/timeline")).data.length,
      0,
    );
    const inspection = (
      await owner("/api/v1/inspections", {
        propertyId: pa,
        title: "Seasonal property review",
        findings: [
          {
            label: "North field",
            condition: "monitor",
            note: "Drainage inspection recommended after rain.",
          },
        ],
      })
    ).data.id;
    assert.equal((await customer("/api/v1/inspections")).data.length, 0);
    assert.equal(
      (await customer("/api/v1/inspections/" + inspection + "/publish", {}))
        .status,
      403,
    );
    assert.equal(
      (await owner("/api/v1/inspections/" + inspection + "/publish", {}))
        .status,
      200,
    );
    const reports = (await customer("/api/v1/inspections")).data;
    assert.equal(reports.length, 1);
    assert.equal(reports[0].id, inspection);
    assert.equal(reports[0].user_id, undefined);
    assert.deepEqual(reports[0].findings, [
      {
        label: "North field",
        condition: "monitor",
        note: "Drainage inspection recommended after rain.",
      },
    ]);
    const propertyHistory = (
      await customer("/api/v1/properties/" + pa + "/timeline")
    ).data;
    const publishedInspection = propertyHistory.find(
      (entry: any) => entry.kind === "inspection",
    );
    assert.ok(publishedInspection);
    assert.equal(publishedInspection.title, "Seasonal property review");
    assert.equal(publishedInspection.published, true);
    assert.equal(publishedInspection.payload.findings.length, 1);
    assert.equal(
      (
        await pool.query(
          "SELECT count(*) FROM audit_event WHERE action='inspection.published' AND entity_id=$1",
          [inspection],
        )
      ).rows[0].count,
      "1",
    );
    const est = (
      await owner("/api/v1/estimates", {
        propertyId: pa,
        title: "Mowing",
        scope: "Approved scope",
        amountCents: 10000,
      })
    ).data.id;
    assert.equal(
      (
        await owner("/api/v1/estimates/" + est + "/decision", {
          status: "sent",
          revision: 1,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await customer("/api/v1/estimates/" + est + "/decision", {
          status: "approved",
          revision: 1,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await customer("/api/v1/estimates/" + est + "/decision", {
          status: "declined",
          revision: 1,
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await owner("/api/v1/billing", {
          operationId: randomUUID(),
          propertyId: pa,
          estimateId: est,
          title: "Deposit",
          kind: "deposit",
          amountCents: 6000,
        })
      ).status,
      201,
    );
    assert.equal(
      (
        await owner("/api/v1/billing", {
          operationId: randomUUID(),
          propertyId: pa,
          estimateId: est,
          title: "Final",
          kind: "final",
          amountCents: 5000,
        })
      ).status,
      409,
    );
    const billingIntent = {
      operationId: randomUUID(),
      propertyId: pa,
      estimateId: est,
      title: "Progress",
      kind: "progress",
      amountCents: 1000,
    };
    const retries = await Promise.all([
      owner("/api/v1/billing", billingIntent),
      owner("/api/v1/billing", billingIntent),
    ]);
    assert.deepEqual(
      retries.map((x) => x.status),
      [201, 201],
    );
    assert.equal(retries[0].data.id, retries[1].data.id);
    assert.equal(
      (await owner("/api/v1/billing", { ...billingIntent, amountCents: 1200 }))
        .status,
      409,
    );
    await pool.query("UPDATE client SET quickbooks_id=$2 WHERE id=$1", [
      ca,
      "qa",
    ]);
    await pool.query("UPDATE client SET quickbooks_id=$2 WHERE id=$1", [
      cb,
      "qb",
    ]);
    await pool.query(
      "INSERT INTO external_invoice(id,client_id,total_cents,balance_cents,ownership_verified) VALUES('qi',$1,100,100,true)",
      [ca],
    );
    await refreshInvoiceOwnership({
      Id: "qi",
      CustomerRef: { value: "qb" },
      TotalAmt: 1,
      Balance: 1,
    });
    assert.equal(
      (await customer("/api/v1/quickbooks/invoices")).data.length,
      0,
    );
    assert.equal(
      (await pool.query("SELECT client_id FROM external_invoice WHERE id='qi'"))
        .rows[0].client_id,
      cb,
    );
    await refreshInvoiceOwnership({
      Id: "qi",
      CustomerRef: { value: "unknown" },
      TotalAmt: 1,
      Balance: 1,
    });
    assert.equal(
      (
        await pool.query(
          "SELECT ownership_verified FROM external_invoice WHERE id='qi'",
        )
      ).rows[0].ownership_verified,
      false,
    );
    // Locally originated billing must remain attached to the operational client, but hidden on mismatch.
    await pool.query(
      "UPDATE billing_draft SET status='posted',quickbooks_id='qi',ownership_verified=true WHERE id=$1",
      [retries[0].data.id],
    );
    await refreshInvoiceOwnership({
      Id: "qi",
      CustomerRef: { value: "qb" },
      TotalAmt: 1,
      Balance: 1,
    });
    assert.equal((await customer("/api/v1/billing")).data.length, 0);
    process.env.INTEGRATION_ENCRYPTION_KEY = "ab".repeat(32);
    const connections = await Promise.allSettled(
      ["123", "456"].map((realm) =>
        transaction((c) =>
          bindQuickBooksRealm(c, realm, async () => ({
            access_token: "synthetic-" + realm,
            refresh_token: "synthetic",
            expires_in: 3600,
          })),
        ),
      ),
    );
    assert.equal(connections.filter((x) => x.status === "fulfilled").length, 1);
    assert.equal(connections.filter((x) => x.status === "rejected").length, 1);
    assert.equal(
      (await pool.query("SELECT count(*) FROM integration_connection")).rows[0]
        .count,
      "1",
    );
    const anonymous = await fetch(base + "/api/v1/files/" + randomUUID(), {
      method: "POST",
      headers: { origin: base!, "content-type": "image/png" },
      body: "invalid image",
    });
    assert.equal(anonymous.status, 401);
    assert.equal(
      (
        await owner("/api/v1/work-orders/" + work + "/status", {
          status: "in_progress",
          version: 2,
        })
      ).status,
      200,
    );
    const completion = {
      id: randomUUID(),
      workOrderId: work,
      baseVersion: 3,
      kind: "complete",
      payload: { text: "Completed" },
      capturedAt: new Date().toISOString(),
    };
    assert.equal(
      (await owner("/api/v1/field/sync", { events: [completion] })).data
        .results[0].status,
      "accepted",
    );
    assert.equal(
      (
        await owner("/api/v1/work-orders/" + work + "/status", {
          status: "reviewed",
          version: 4,
        })
      ).status,
      200,
    );
    assert.equal(
      (await customer("/api/v1/work-orders/" + work + "/publish", {})).status,
      403,
    );
    assert.equal(
      (await owner("/api/v1/work-orders/" + work + "/publish", {})).status,
      200,
    );
    assert.equal(
      (await customer("/api/v1/properties/" + pa + "/timeline")).data.length,
      3,
    );
    const recurring = randomUUID();
    await pool.query(
      "INSERT INTO recurring_service(id,property_id,title,cadence,interval_count,next_date,local_time,billing_mode,anchor_day) VALUES($1,$2,'Month end','monthly',1,'2026-01-31','08:00','per_visit',31)",
      [recurring, pa],
    );
    await generateRecurring();
    await generateRecurring();
    assert.equal(
      (
        await pool.query(
          "SELECT next_date::text FROM recurring_service WHERE id=$1",
          [recurring],
        )
      ).rows[0].next_date,
      "2026-03-31",
    );
    await generateRecurring();
    const occurrences = (
      await pool.query(
        "SELECT occurrence_date::text,extract(hour from scheduled_at AT TIME ZONE 'UTC')::int AS hour FROM work_order WHERE recurring_service_id=$1 ORDER BY occurrence_date",
        [recurring],
      )
    ).rows;
    assert.equal(occurrences[0].hour, 13);
    assert.equal(occurrences[2].hour, 12);
    await pool.query("UPDATE recurring_service SET paused=true WHERE id=$1", [
      recurring,
    ]);
    await generateRecurring();
    assert.equal(
      (
        await pool.query(
          "SELECT count(*) FROM work_order WHERE recurring_service_id=$1",
          [recurring],
        )
      ).rows[0].count,
      "3",
    );
    const startsAt = new Date(Date.now() + 86400000).toISOString();
    const endsAt = new Date(Date.now() + 90000000).toISOString();
    const slot = (await owner("/api/v1/assessment-slots", { startsAt, endsAt }))
      .data.id;
    const bookings = await Promise.all([
      customer("/api/v1/assessment-slots/" + slot + "/book", {
        propertyId: pa,
      }),
      customer("/api/v1/assessment-slots/" + slot + "/book", {
        propertyId: pa,
      }),
    ]);
    assert.deepEqual(bookings.map((x) => x.status).sort(), [200, 409]);
    const crewId = (await customer("/api/v1/me")).data.id;
    await pool.query("UPDATE staff_profile SET role='crew' WHERE user_id=$1", [
      crewId,
    ]);
    await pool.query("UPDATE work_order SET assigned_to=$2 WHERE id=$1", [
      work,
      crewId,
    ]);
    const active = (
      await owner("/api/v1/work-orders", {
        propertyId: pa,
        title: "Active crew job",
        assignedTo: crewId,
        checklist: [{ label: "Inspect gates", done: false }],
      })
    ).data.id;
    const uploadHeaders = {
      "content-type": "image/png",
      "x-p1-property": pa,
      "x-p1-work": work,
    };
    assert.equal(
      (
        await customer(
          "/api/v1/files/" + randomUUID(),
          "invalid image",
          uploadHeaders,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await customer("/api/v1/files/" + randomUUID(), "invalid image", {
          ...uploadHeaders,
          "x-p1-work": active,
        })
      ).status,
      400,
    );

    // A crew member can perform the entire downloaded workflow without office starting it.
    assert.equal(
      (
        await owner("/api/v1/work-orders/" + active + "/status", {
          status: "scheduled",
          version: 1,
        })
      ).status,
      200,
    );
    const capturedAt = new Date().toISOString();
    const start = {
      id: randomUUID(),
      workOrderId: active,
      baseVersion: 2,
      kind: "time",
      payload: { action: "start" },
      capturedAt,
    };
    const checklist = {
      id: randomUUID(),
      workOrderId: active,
      baseVersion: 2,
      kind: "checklist",
      payload: { items: [{ label: "Inspect gates", done: true }] },
      capturedAt,
    };
    const complete = {
      id: randomUUID(),
      workOrderId: active,
      baseVersion: 2,
      kind: "complete",
      payload: { text: "Done offline" },
      capturedAt,
    };
    const completedDay = await customer("/api/v1/field/sync", {
      events: [start, checklist, complete],
    });
    assert.equal(completedDay.status, 200);
    assert.deepEqual(
      completedDay.data.results.map((x: any) => x.status),
      ["accepted", "accepted", "accepted"],
    );
    const completedRow = (
      await pool.query("SELECT status,version FROM work_order WHERE id=$1", [
        active,
      ])
    ).rows[0];
    assert.equal(completedRow.status, "completed");
    assert.equal(completedRow.version, 3);
    assert.deepEqual(
      (
        await customer("/api/v1/field/sync", {
          events: [start, checklist, complete],
        })
      ).data.results.map((x: any) => x.status),
      ["accepted", "accepted", "accepted"],
    );
    const draftWork = (
      await owner("/api/v1/work-orders", {
        propertyId: pa,
        title: "Not dispatched",
        assignedTo: crewId,
      })
    ).data.id;
    const blockedStart = await customer("/api/v1/field/sync", {
      events: [
        { ...start, id: randomUUID(), workOrderId: draftWork, baseVersion: 1 },
      ],
    });
    assert.equal(blockedStart.data.results[0].status, "conflict");
    assert.equal(
      (
        await pool.query("SELECT status FROM work_order WHERE id=$1", [
          draftWork,
        ])
      ).rows[0].status,
      "draft",
    );
    const revokedSession = await customer("/api/auth/sign-in/email", {
      email,
      password,
    });
    const revokedToken =
      revokedSession.authToken || sessionTokenFromCookie(revokedSession.cookie);
    assert.ok(revokedToken, "Sign-in must issue a signed session token");
    const deleted = await pool.query("DELETE FROM session WHERE token=$1", [
      revokedToken.split(".")[0],
    ]);
    assert.equal(deleted.rowCount, 1, "The native session must be revocable");
    const revokedBearer = await nativeClient(
      "/api/v1/field/sync",
      revokedToken,
      { events: [] },
    );
    assert.equal(revokedBearer.status, 401);
  },
);
