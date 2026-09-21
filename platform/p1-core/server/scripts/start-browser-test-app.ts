import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import express from "express";

const port = "5201";
const origin = `http://127.0.0.1:${port}`;
const federationEnabled = process.env.BROWSER_TEST_FEDERATION === "true";

type FederationCode = { challenge: string; subject: string };
type FederationGrant = {
  grantId: string;
  subject: string;
  email: string;
  name: string;
  expiresAt: string;
  ownerAttested: boolean;
  active: true;
  role: "member";
  capabilities: string[];
};

/**
 * Browser CMS acceptance needs the production federation consumer, including
 * the provider redirect and token/introspection exchange. This tiny provider
 * is intentionally available only inside the guarded test child process.
 */
async function startSyntheticFederationProvider() {
  const codes = new Map<string, FederationCode>();
  const grants = new Map<string, FederationGrant>();
  const clientId = "browser-cms-client";
  const clientSecret = "s".repeat(43);
  const subject = "browser-cms-editor";
  const provider = express();
  provider.use(express.json());
  provider.get("/api/v1/federation/authorize", (req, res) => {
    const client = String(req.query.client_id || "");
    const redirectUri = String(req.query.redirect_uri || "");
    const state = String(req.query.state || "");
    const challenge = String(req.query.code_challenge || "");
    if (
      client !== clientId ||
      redirectUri !== `${origin}/api/auth/federation/callback` ||
      !/^[A-Za-z0-9_-]{43,128}$/.test(state) ||
      !/^[A-Za-z0-9_-]{43,128}$/.test(challenge)
    ) {
      res.sendStatus(400);
      return;
    }
    const code = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "").slice(0, 11);
    codes.set(code, { challenge, subject });
    const callback = new URL(redirectUri);
    callback.searchParams.set("state", state);
    callback.searchParams.set("code", code);
    res.redirect(302, callback.toString());
  });
  provider.post("/api/integrations/core/v1/federation/:operation", (req, res) => {
    if (
      req.get("authorization") !==
      "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
    ) {
      res.sendStatus(401);
      return;
    }
    if (req.params.operation === "token") {
      const code = codes.get(String(req.body?.code || ""));
      codes.delete(String(req.body?.code || ""));
      if (
        !code ||
        createHash("sha256")
          .update(String(req.body?.code_verifier || ""))
          .digest("base64url") !== code.challenge
      ) {
        res.sendStatus(401);
        return;
      }
      const grant: FederationGrant = {
        grantId: randomUUID(),
        subject: code.subject,
        email: "browser-cms-editor@example.test",
        name: "Browser CMS Editor",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        ownerAttested: false,
        active: true,
        role: "member",
        capabilities: ["marketing.content.website"],
      };
      grants.set(grant.grantId, grant);
      res.json({
        grantId: grant.grantId,
        subject: grant.subject,
        email: grant.email,
        name: grant.name,
        expiresAt: grant.expiresAt,
        ownerAttested: grant.ownerAttested,
      });
      return;
    }
    if (req.params.operation === "introspect") {
      const grant = grants.get(String(req.body?.grant_id || ""));
      if (!grant) {
        res.sendStatus(401);
        return;
      }
      res.json(grant);
      return;
    }
    res.sendStatus(404);
  });
  const server = await new Promise<ReturnType<typeof provider.listen>>((resolve) => {
    const listener = provider.listen(0, "127.0.0.1", () => resolve(listener));
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Synthetic federation provider failed");
  return {
    issuer: `http://127.0.0.1:${address.port}`,
    clientId,
    clientSecret,
    subject,
  };
}

function testDatabaseUrl(value: string | undefined): string {
  if (!value) throw new Error("BROWSER_TEST_DATABASE_URL is required; DATABASE_URL is never used");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("BROWSER_TEST_DATABASE_URL must be a valid disposable PostgreSQL URL");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.pathname !== "/core_browser_test" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "BROWSER_TEST_DATABASE_URL must target loopback /core_browser_test without URL overrides",
    );
  }
  return url.toString();
}

function isolatedEnvironment(): NodeJS.ProcessEnv {
  const databaseUrl = testDatabaseUrl(process.env.BROWSER_TEST_DATABASE_URL);
  // Do not pass provider credentials, deployment identity, NODE_OPTIONS, VITE_*
  // values, PG* overrides, or the user's ordinary DATABASE_URL to the app.
  return {
    ...(process.env.PATH ? { PATH: process.env.PATH } : {}),
    ...(process.env.TMPDIR ? { TMPDIR: process.env.TMPDIR } : {}),
    NODE_ENV: federationEnabled ? "test" : "development",
    TZ: "UTC",
    BROWSER_TEST_DATABASE_URL: databaseUrl,
    DATABASE_URL: databaseUrl,
    DATABASE_TLS_MODE: "local",
    PORT: port,
    APP_URL: origin,
    SESSION_SECRET: "synthetic-browser-session-secret-for-disposable-local-tests-only",
    SYSTEM_BACKUPS_ENABLED: "false",
    ...(federationEnabled ? { BROWSER_TEST_FEDERATION: "true" } : {}),
  };
}

async function startIsolatedApp() {
  // Reapply the allowlist even when the child entry point is invoked directly.
  const env = isolatedEnvironment();
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, env);

  // Vite normally discovers .env files independently of server/bootstrap.ts.
  // Disable that discovery in this process before server/vite imports its config.
  const { default: viteConfig } = await import("../../vite.config");
  Object.assign(viteConfig, { envDir: false });

  const federation = federationEnabled ? await startSyntheticFederationProvider() : null;
  if (federation) {
    Object.assign(process.env, {
      CORE_FEDERATION_ENABLED: "true",
      CORE_FEDERATION_ALLOW_SYNTHETIC_HTTP: "true",
      CORE_FEDERATION_CLIENT_ID: federation.clientId,
      CORE_FEDERATION_CLIENT_SECRET_CURRENT: federation.clientSecret,
      DASHBOARD_FEDERATION_ISSUER: federation.issuer,
    });
  }
  const { runMigrations } = await import("../migrate");
  const { db, pool } = await import("../db");
  try {
    await runMigrations();
    const { users } = await import("../../shared/schema/users");
    const { hashPassword } = await import("../middleware/auth");
    const { SettingsStorage } = await import("../storage/settings.storage");
    const password = await hashPassword("CoreBrowserTest!2026");
    for (const user of [
      { email: "browser-admin@example.test", role: "admin", adminPermissions: [] },
      { email: "browser-editor@example.test", role: "editor", adminPermissions: ["crm"] },
      ...(federation
        ? [
            {
              email: "browser-cms-editor@example.test",
              role: "editor",
              adminPermissions: ["content"],
            },
          ]
        : []),
    ]) {
      const values = {
        ...user,
        password,
        firstName: "Browser",
        lastName: user.role === "admin" ? "Admin" : "Editor",
        isSuspended: false,
      };
      await db
        .insert(users)
        .values(values)
        .onConflictDoUpdate({ target: users.email, set: values });
    }
    if (federation) {
      const user = (
        await pool.query("SELECT id FROM users WHERE email=$1", ["browser-cms-editor@example.test"])
      ).rows[0];
      if (!user?.id) throw new Error("Synthetic federation user was not created");
      await pool.query(
        "INSERT INTO p1_identity_link(core_user_id,canonical_user_id,initial_grant_id) VALUES($1,$2,$3) ON CONFLICT (core_user_id) DO UPDATE SET canonical_user_id=EXCLUDED.canonical_user_id, initial_grant_id=EXCLUDED.initial_grant_id, revoked_at=NULL",
        [user.id, federation.subject, randomUUID()],
      );
    }
    const settings = new SettingsStorage();
    await settings.upsertSetting("enable_crm", "true", "system_configuration", false);
    await settings.upsertSetting("enable_ecommerce", "true", "system_configuration", false);
    if (!federation) {
      // Synthetic offline transaction fixture, confined to the guarded browser-test database.
      await pool.query(
        "INSERT INTO ecommerce_products (id,name,price,url_slug,status,active) VALUES ('browser-manual-product','Browser offline product',2500,'browser-offline-product','published',true) ON CONFLICT (id) DO UPDATE SET status='published',active=true",
      );
      await pool.query(
        "INSERT INTO ecommerce_product_variants (id,product_id,inventory_quantity,track_inventory,is_default) VALUES ('browser-manual-variant','browser-manual-product',100,true,true) ON CONFLICT (id) DO NOTHING",
      );
      await pool.query(
        "INSERT INTO ecommerce_customers (id,name,email) VALUES ('browser-manual-customer','Browser offline customer','offline-buyer@example.test') ON CONFLICT (id) DO NOTHING",
      );
    }
    console.log("Starting synthetic browser-test app at http://127.0.0.1:5201");
    // Import the actual Express/Vite application, bypassing loadLocalEnv entirely.
    await import("../index");
  } catch (error) {
    await pool.end();
    throw error;
  }
}

async function main() {
  if (process.argv[2] === "--isolated-app") {
    if (process.argv.length !== 3) throw new Error("Unexpected browser-test launcher arguments");
    await startIsolatedApp();
    return;
  }
  if (process.argv.length !== 2) throw new Error("Unexpected browser-test launcher arguments");
  const child = spawn(
    process.execPath,
    ["--import", "tsx", fileURLToPath(import.meta.url), "--isolated-app"],
    { cwd: process.cwd(), env: isolatedEnvironment(), stdio: "inherit" },
  );
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => child.kill(signal));
  }
  await new Promise<void>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => {
      process.exitCode = code ?? 1;
      resolve();
    });
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Browser-test launcher failed");
  process.exitCode = 1;
});
