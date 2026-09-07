import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createRequire } from "node:module";
import { AuthProtocol } from "../src/core/auth";
const base = process.env.DASHBOARD_TEST_ORIGIN!;
assert.match(base, /^http:\/\/localhost:\d+$/);
const require = createRequire(
  process.env.P1_API_ARCHIVE + "/artifacts/api-server/package.json",
);
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DASHBOARD_DATABASE_URL });
after(() => pool.end());
function totp(secret: string) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.toUpperCase().replace(/=+$/, ""))
    bits += chars.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac("sha1", key).update(counter).digest();
  return String((h.readUInt32BE(h[19] & 15) & 0x7fffffff) % 1000000).padStart(
    6,
    "0",
  );
}
async function call(
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  const r = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  return { status: r.status, headers: r.headers, data: await r.json() };
}
// Local test transport only: maps the strict HTTPS app origin to the isolated server
// and translates its non-Secure development cookie name. Production app remains HTTPS.
const testFetch: typeof fetch = async (input, init) => {
  const url = new URL(String(input));
  assert.equal(url.origin, "https://native.example.test");
  const headers = new Headers(init?.headers);
  if (headers.has("Origin")) headers.set("Origin", base);
  if (headers.has("Cookie"))
    headers.set(
      "Cookie",
      headers.get("Cookie")!.replace("__Secure-p1-dashboard", "p1-dashboard"),
    );
  const response = await fetch(base + url.pathname, { ...init, headers });
  if (!response.ok) {
    const error = await response.clone().json();
    console.log(
      "auth protocol denial",
      url.pathname,
      response.status,
      error.code || error.error || "unknown",
    );
  }
  const outputHeaders = new Headers(response.headers);
  if (outputHeaders.has("set-cookie"))
    outputHeaders.set(
      "set-cookie",
      outputHeaders
        .get("set-cookie")!
        .replaceAll(
          "p1-dashboard.two_factor",
          "__Secure-p1-dashboard.two_factor",
        ),
    );
  return new Response(await response.text(), {
    status: response.status,
    headers: outputHeaders,
  });
};
test("real committed BetterAuth native password, enrollment, challenge, recovery and revocation protocol", async () => {
  const email = "owner@example.test",
    password = "Native-synthetic-password-42!";
  let r = await call(
    "/api/auth/sign-up/email",
    { name: "Synthetic native owner", email, password },
    { Origin: base, "x-p1-setup-code": "secret" },
  );
  assert.equal(r.status, 200);
  const message = (
    await pool.query(
      "SELECT payload FROM outbox WHERE payload->>'to'=$1 ORDER BY created_at DESC LIMIT 1",
      [email],
    )
  ).rows[0];
  assert.ok(message);
  await fetch(new URL(message.payload.text), { redirect: "manual" });
  let stored: string | null = null;
  const store = {
    read: async () => stored,
    write: async (token: string) => {
      stored = token;
    },
    remove: async () => {
      stored = null;
    },
  };
  const auth = new AuthProtocol(
    "https://native.example.test",
    store,
    testFetch,
  );
  assert.equal(
    (await auth.call("sign-in/email", { email, password })).challenge,
    false,
  );
  assert.ok(auth.getToken());
  const session = await auth.call("get-session", undefined);
  assert.equal(session.challenge, false);
  if (session.challenge) throw new Error("unexpected challenge");
  assert.equal(typeof session.result.session.expiresAt, "string");
  assert.equal(session.result.user.id, session.result.session.userId);
  const before = auth.getToken()!;
  r = await call("/api/v1/clients", undefined, {
    Authorization: "Bearer " + before,
  });
  assert.equal(r.status, 403);
  const enrolled = await auth.call("two-factor/enable", { password });
  assert.equal(enrolled.challenge, false);
  if (enrolled.challenge) throw new Error("unexpected challenge");
  const secret = new URL(enrolled.result.totpURI).searchParams.get("secret")!;
  const recovery = enrolled.result.backupCodes[0];
  await auth.call("two-factor/verify-totp", { code: totp(secret) });
  assert.ok(auth.getToken());
  r = await call(
    "/api/v1/setup/complete",
    { code: "secret" },
    { Authorization: "Bearer " + auth.getToken() },
  );
  assert.equal(r.status, 201);
  r = await call("/api/v1/clients", undefined, {
    Authorization: "Bearer " + auth.getToken(),
  });
  assert.equal(r.status, 200);
  await auth.clear();
  assert.equal(
    (await auth.call("sign-in/email", { email, password })).challenge,
    true,
  );
  assert.equal(auth.getToken(), null);
  assert.equal(stored, null);
  await auth.call("two-factor/verify-totp", { code: totp(secret) });
  assert.ok(auth.getToken());
  r = await call("/api/v1/clients", undefined, {
    Authorization: "Bearer " + auth.getToken(),
  });
  assert.equal(r.status, 200);
  await auth.clear();
  assert.equal(
    (await auth.call("sign-in/email", { email, password })).challenge,
    true,
  );
  await auth.call("two-factor/verify-backup-code", { code: recovery });
  assert.ok(auth.getToken());
  r = await call("/api/v1/me", undefined, {
    Authorization: "Bearer " + auth.getToken(),
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.ownerMfaRequired, false);
  r = await call("/api/v1/me", undefined, { Authorization: "Bearer invalid" });
  assert.equal(r.status, 401);
  const token = auth.getToken()!;
  const mixed = await call(
    "/api/v1/clients",
    { name: "Must reject mixed transport" },
    {
      Authorization: "Bearer invalid",
      Cookie: "p1-dashboard.session_token=" + encodeURIComponent(token),
    },
  );
  assert.equal(mixed.status, 403);
  await auth.call("sign-out", {});
  r = await call("/api/v1/me", undefined, { Authorization: "Bearer " + token });
  assert.equal(r.status, 401);
  // Respect the real sign-in rate limiter; do not disable it in the fixture.
  await new Promise((resolve) => setTimeout(resolve, 11000));
  const failing = new AuthProtocol(
    "https://native.example.test",
    {
      read: async () => null,
      remove: async () => {},
      write: async () => {
        throw new Error("secure storage unavailable");
      },
    },
    testFetch,
  );
  assert.equal(
    (await failing.call("sign-in/email", { email, password })).challenge,
    true,
  );
  await assert.rejects(
    failing.call("two-factor/verify-totp", { code: totp(secret) }),
    /secure storage unavailable/,
  );
  assert.equal(failing.getToken(), null);
  await auth.clear();
  assert.equal(
    (await auth.call("sign-in/email", { email, password })).challenge,
    true,
  );
  await auth.call("two-factor/verify-totp", { code: totp(secret) });
  await pool.query(`UPDATE session SET "expiresAt"=now()-interval '1 minute'`);
  r = await call("/api/v1/me", undefined, {
    Authorization: "Bearer " + auth.getToken(),
  });
  assert.equal(r.status, 401);
});
