import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { beforeAll, afterAll, it, expect } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import express from "express";
import cookieParser from "cookie-parser";
import pg from "pg";
import { opaque, digest } from "./federation-consumer";
const url = process.env.P1_FEDERATION_TEST_DATABASE_URL;
if (url && !/^postgres(?:ql)?:\/\/[^@]+@127\.0\.0\.1:\d+\//.test(url))
  throw Error("Disposable loopback DB required");
let pool: pg.Pool, providerServer: any, coreServer: any, base: string;
const codes = new Map<string, { challenge: string; subject: string }>(),
  grants = new Map<string, any>();
let issuer: string,
  denyIntrospection = 0,
  introspectionCalls = 0;
const proof = "p".repeat(43),
  owner = "synthetic-owner";
const sessions: string[] = [];
const envNames = [
  "DATABASE_URL",
  "NODE_ENV",
  "APP_URL",
  "CORE_FEDERATION_ENABLED",
  "CORE_FEDERATION_ALLOW_SYNTHETIC_HTTP",
  "CORE_FEDERATION_CLIENT_ID",
  "CORE_FEDERATION_CLIENT_SECRET_CURRENT",
  "DASHBOARD_FEDERATION_ISSUER",
  "CORE_FEDERATION_BOOTSTRAP_ID",
  "CORE_FEDERATION_BOOTSTRAP_PROOF_SHA256",
  "CORE_FEDERATION_BOOTSTRAP_EXPIRES_AT",
];
const previous = Object.fromEntries(envNames.map((k) => [k, process.env[k]]));
async function listen(app: express.Express) {
  return new Promise<any>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
}
function cookies(r: Response) {
  return r.headers
    .getSetCookie()
    .map((x) => x.split(";")[0])
    .filter((x) => !x.endsWith("="))
    .join("; ");
}
async function request(path: string, body?: unknown, cookie?: string) {
  return fetch(base + path, {
    redirect: "manual",
    headers: {
      origin: base,
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
  });
}
async function flow(cookie?: string, subject = owner) {
  const start = await request("/api/auth/federation/start", undefined, cookie);
  expect(start.status).toBe(302);
  const target = new URL(start.headers.get("location")!);
  const code = opaque();
  codes.set(code, { challenge: target.searchParams.get("code_challenge")!, subject });
  const combined = [cookie, cookies(start)].filter(Boolean).join("; ");
  return { state: target.searchParams.get("state")!, code, cookie: combined };
}
async function callback(f: Awaited<ReturnType<typeof flow>>) {
  return request(
    `/api/auth/federation/callback?state=${f.state}&code=${f.code}`,
    undefined,
    f.cookie,
  );
}
beforeAll(async () => {
  if (!url) return;
  pool = new pg.Pool({ connectionString: url });
  await migrate(drizzle(pool), {
    migrationsFolder: new URL("../../p1-migrations", import.meta.url).pathname,
  });
  const provider = express();
  provider.use(express.json());
  provider.post("/api/integrations/core/v1/federation/:op", (req, res) => {
    expect(req.headers.cookie).toBeUndefined();
    expect(req.headers.origin).toBeUndefined();
    if (
      req.headers.authorization !==
      "Basic " + Buffer.from("test-client:" + "s".repeat(43)).toString("base64")
    )
      return res.sendStatus(401);
    if (req.params.op === "token") {
      const record = codes.get(req.body.code);
      codes.delete(req.body.code);
      if (
        !record ||
        createHash("sha256").update(req.body.code_verifier).digest("base64url") !== record.challenge
      )
        return res.sendStatus(401);
      const grant = {
        grantId: randomUUID(),
        subject: record.subject,
        email: record.subject + "@example.test",
        name: "Synthetic",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        ownerAttested: record.subject === owner,
      };
      grants.set(grant.grantId, grant);
      return res.json(grant);
    }
    introspectionCalls++;
    if (denyIntrospection) return res.sendStatus(denyIntrospection);
    const grant = grants.get(req.body.grant_id);
    if (!grant) return res.sendStatus(401);
    if (req.body.require_owner_attestation && !grant.ownerAttested) return res.sendStatus(403);
    return res.json({ ...grant, active: true, role: grant.ownerAttested ? "owner" : "client" });
  });
  providerServer = await listen(provider);
  issuer = `http://127.0.0.1:${providerServer.address().port}`;
  Object.assign(process.env, {
    DATABASE_URL: url,
    NODE_ENV: "test",
    CORE_FEDERATION_ENABLED: "true",
    CORE_FEDERATION_ALLOW_SYNTHETIC_HTTP: "true",
    CORE_FEDERATION_CLIENT_ID: "test-client",
    CORE_FEDERATION_CLIENT_SECRET_CURRENT: "s".repeat(43),
    DASHBOARD_FEDERATION_ISSUER: issuer,
    CORE_FEDERATION_BOOTSTRAP_ID: randomUUID(),
    CORE_FEDERATION_BOOTSTRAP_PROOF_SHA256: digest(proof),
    CORE_FEDERATION_BOOTSTRAP_EXPIRES_AT: new Date(Date.now() + 3600000).toISOString(),
  });
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  const route = await import("../routes/federation.routes");
  app.use("/api/auth/federation", route.default);
  const auth = await import("../middleware/auth");
  app.get("/private", auth.authenticateToken, auth.requireAdminPermission("content"), (_req, res) =>
    res.json({ ok: true }),
  );
  app.use("/api/cms", (await import("../routes/cms-public.routes")).default);
  const authRoutes = await import("../routes/auth.routes");
  app.use("/api/auth", authRoutes.default);
  coreServer = await listen(app);
  base = `http://127.0.0.1:${coreServer.address().port}`;
  process.env.APP_URL = base;
}, 30000);
afterAll(async () => {
  if (!url) return;
  await new Promise<void>((r) => coreServer.close(() => r()));
  await new Promise<void>((r) => providerServer.close(() => r()));
  await (await import("../db")).pool.end();
  await pool.end();
  for (const k of envNames) {
    if (previous[k] === undefined) delete process.env[k];
    else process.env[k] = previous[k];
  }
});
it.skipIf(!url)(
  "actual HTTP bootstrap concurrency, nonce/PKCE/replay, explicit linking and revocation/outage boundaries",
  async () => {
    const bad = await request("/api/auth/federation/bootstrap-intent", { proof: "bad" });
    expect(bad.status).toBe(403);
    const foreign = await fetch(base + "/api/auth/federation/bootstrap-intent", {
      method: "POST",
      headers: { origin: "https://foreign.example", "content-type": "application/json" },
      body: JSON.stringify({ proof }),
    });
    expect(foreign.status).toBe(403);
    const deniedOwnerIntent = await request("/api/auth/federation/bootstrap-intent", { proof });
    expect((await callback(await flow(cookies(deniedOwnerIntent), "not-owner"))).status).toBe(403);
    const intentA = await request("/api/auth/federation/bootstrap-intent", { proof }),
      intentB = await request("/api/auth/federation/bootstrap-intent", { proof });
    expect(intentA.status).toBe(200);
    expect(intentB.status).toBe(200);
    const a = await flow(cookies(intentA)),
      b = await flow(cookies(intentB));
    const responses = await Promise.all([callback(a), callback(b)]);
    expect(responses.map((x) => x.status).sort()).toEqual([303, 409]);
    const session = cookies(responses.find((x) => x.status === 303)!);
    sessions.push(session);
    expect(
      Number((await pool.query("SELECT count(*) FROM users WHERE role='admin'")).rows[0].count),
    ).toBe(1);
    expect(
      Number(
        (await pool.query("SELECT count(*) FROM p1_federation_bootstrap_consumption")).rows[0]
          .count,
      ),
    ).toBe(1);
    expect((await callback(a)).status).toBe(401);
    const noNonce = await flow();
    expect(
      (await request(`/api/auth/federation/callback?state=${noNonce.state}&code=${noNonce.code}`))
        .status,
    ).toBe(401);
    expect((await callback(noNonce)).status).toBe(401);
    const pkce = await flow();
    codes.get(pkce.code)!.challenge = "bad";
    expect((await callback(pkce)).status).toBe(401);
    const unknown = await flow(undefined, "unlinked");
    expect((await callback(unknown)).status).toBe(403);
    const page = (
      await pool.query(
        "INSERT INTO cms_pages(title,slug,status,content) VALUES('Synthetic private draft','synthetic-private','draft','{}') RETURNING *",
      )
    ).rows[0];
    const { createCmsPreviewToken } = await import("../utils/cms-preview-token");
    const previewToken = createCmsPreviewToken(
      (await (await import("../storage")).storage.cmsPages.getPage(page.id))!,
    );
    const previewPath = `/api/cms/pages/preview/${page.id}?token=${previewToken}`;
    expect((await request(previewPath)).status).toBe(401);
    expect((await request(previewPath, undefined, session)).status).toBe(200);
    const before = introspectionCalls;
    expect((await request("/private", undefined, session)).status).toBe(200);
    expect((await request("/private", undefined, session)).status).toBe(200);
    expect(introspectionCalls - before).toBe(2);
    for (const status of [401, 403, 500]) {
      denyIntrospection = status;
      expect((await request("/private", undefined, session)).status).toBe(
        status === 500 ? 503 : status,
      );
      expect((await request("/api/cms/team")).status).toBe(200);
      expect((await request(previewPath, undefined, session)).status).toBe(
        status === 500 ? 503 : status,
      );
    }
    denyIntrospection = 0;
    const { hashPassword, generateToken } = await import("../middleware/auth"),
      password = "synthetic-password-long";
    const local = (
      await pool.query(
        "INSERT INTO users(email,password,role,admin_permissions) VALUES('legacy@example.test',$1,'editor','[\"content\"]') RETURNING id",
        [await hashPassword(password)],
      )
    ).rows[0];
    const storage = (await import("../storage")).storage;
    const oldUser = (await storage.users.getUser(local.id))!;
    const legacyCookie = "p1_admin_token=" + generateToken(oldUser);
    expect((await request("/private", undefined, legacyCookie)).status).toBe(401);
    const linkIntent = await request("/api/auth/federation/link-intent", {
      email: oldUser.email,
      password,
    });
    expect(linkIntent.status).toBe(200);
    const linked = await callback(await flow(cookies(linkIntent), "legacy-canonical"));
    expect(linked.status).toBe(303);
    expect(
      (await pool.query("SELECT 1 FROM p1_identity_link WHERE core_user_id=$1", [local.id]))
        .rowCount,
    ).toBe(0);
    const confirmCookie = cookies(linked);
    const confirmed = await request(
      "/api/auth/federation/confirm",
      { confirm: true },
      confirmCookie,
    );
    expect(confirmed.status).toBe(200);
    const linkedCookie = cookies(confirmed);
    expect((await request("/private", undefined, linkedCookie)).status).toBe(200);
    expect(
      (await request("/api/auth/federation/confirm", { confirm: true }, confirmCookie)).status,
    ).toBe(401);
    await pool.query("UPDATE users SET admin_permissions='[]' WHERE id=$1", [local.id]);
    expect((await request(previewPath, undefined, linkedCookie)).status).toBe(403);
    expect((await request("/private", undefined, linkedCookie)).status).toBe(403);
    await pool.query("UPDATE p1_identity_link SET revoked_at=now() WHERE core_user_id=$1", [
      local.id,
    ]);
    expect((await request("/private", undefined, linkedCookie)).status).toBe(403);
    process.env.CORE_FEDERATION_ENABLED = "false";
    const { updateUnlinkedPassword } = await import("./federation-runtime");
    await expect(
      updateUnlinkedPassword(local.id, await hashPassword("unauthorized-restoration")),
    ).rejects.toMatchObject({ status: 403 });
    expect((await request("/api/auth/login", { email: oldUser.email, password })).status).toBe(403);
    expect((await request("/private", undefined, legacyCookie)).status).toBe(401);
    process.env.CORE_FEDERATION_ENABLED = "true";
    expect(
      Number((await pool.query("SELECT count(*) FROM p1_federation_audit")).rows[0].count),
    ).toBeGreaterThan(5);
    await migrate(drizzle(pool), {
      migrationsFolder: new URL("../../p1-migrations", import.meta.url).pathname,
    });
    expect(Number((await pool.query("SELECT count(*) FROM p1_identity_link")).rows[0].count)).toBe(
      2,
    );
  },
  30000,
);
