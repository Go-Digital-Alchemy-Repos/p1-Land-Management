import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const port = "5201";
const origin = `http://127.0.0.1:${port}`;

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
    NODE_ENV: "development",
    TZ: "UTC",
    BROWSER_TEST_DATABASE_URL: databaseUrl,
    DATABASE_URL: databaseUrl,
    DATABASE_TLS_MODE: "local",
    PORT: port,
    APP_URL: origin,
    SESSION_SECRET: "synthetic-browser-session-secret-for-disposable-local-tests-only",
    SYSTEM_BACKUPS_ENABLED: "false",
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
    const settings = new SettingsStorage();
    await settings.upsertSetting("enable_crm", "true", "system_configuration", false);
    await settings.upsertSetting("enable_ecommerce", "true", "system_configuration", false);
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
