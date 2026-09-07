import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { mkdtemp, readFile, writeFile, symlink, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import https from "node:https";
import http from "node:http";
import net from "node:net";
import { randomUUID } from "node:crypto";

const coreRoot = path.resolve(import.meta.dirname, "../..");
const siteRoot =
  process.env.PILOT_SITE_ROOT ||
  path.resolve(coreRoot, "../Better Farms Foundation-form-reliability");
const publicOrigin = "https://site.localhost:5443";
const adminOrigin = "https://dashboard.site.localhost:5443";
const minimal = { PATH: process.env.PATH || "", TZ: "UTC" };
const mode = process.argv[2];
const formProxyToken = "synthetic-pilot-form-proxy-token-local-only";
const discoveryPath = path.join(tmpdir(), "core-better-farms-pilot-database-5443.json");

async function core() {
  const database = new URL(process.env.PILOT_DATABASE_URL || "");
  if (
    database.hostname !== "127.0.0.1" ||
    database.pathname !== "/core_pilot_test" ||
    database.search ||
    database.hash
  )
    throw new Error("Disposable local pilot DB required");
  const env = {
    ...minimal,
    NODE_ENV: "development",
    DATABASE_URL: database.href,
    DATABASE_TLS_MODE: "local",
    PORT: "5202",
    APP_URL: adminOrigin,
    SESSION_SECRET: "synthetic-pilot-session-secret-local-only",
    SYSTEM_BACKUPS_ENABLED: "false",
    CLIENT_SITE_MANIFEST_PATH: process.env.PILOT_MANIFEST_PATH!,
    CLIENT_SITE_CORE_VERSION: "1.0.0",
    CLIENT_STACK_ID: "better-farms-foundation",
    CLIENT_FORM_PROXY_TOKEN: formProxyToken,
  };
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, env);
  const { default: config } = await import("../../vite.config");
  Object.assign(config, { envDir: false });
  const { runMigrations } = await import("../../server/migrate");
  await runMigrations();
  const { db } = await import("../../server/db");
  const { users } = await import("../../shared/schema/users");
  const { hashPassword } = await import("../../server/middleware/auth");
  const { SettingsStorage } = await import("../../server/storage/settings.storage");
  for (const role of ["admin", "editor"]) {
    await db.insert(users).values({
      email: `pilot-${role}@example.test`,
      role,
      password: await hashPassword("CorePilotTest!2026"),
      firstName: "Synthetic",
      lastName: role,
      adminPermissions: role === "editor" ? ["content"] : [],
      isSuspended: false,
    });
  }
  await new SettingsStorage().upsertSetting("enable_cms", "true", "system_configuration", false);
  await new SettingsStorage().upsertSetting("enable_crm", "true", "system_configuration", false);
  const { ensureSystemForms } = await import("../../server/services/system-forms.service");
  const { storage } = await import("../../server/storage");
  await ensureSystemForms();
  for (const slug of ["contact-form", "newsletter-signup"]) {
    const form = await storage.forms.getBySlug(slug);
    if (!form) throw new Error("Required synthetic pilot form missing");
    await storage.forms.update(form.id, {
      isActive: true,
      settings: {
        ...form.settings,
        mailchimpEnabled: false,
        notifyAdmins: false,
        storeAsContactMessage: slug === "contact-form",
        createCrmLead: slug === "newsletter-signup",
      },
    });
  }
  await import("../../server/index");
}

async function buildSite() {
  const output = process.env.PILOT_OUTPUT!;
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, minimal, {
    NODE_ENV: "production",
    VITE_CORE_PLATFORM_ADMIN_ORIGIN: adminOrigin,
  });
  if (!(await stat(path.join(siteRoot, "node_modules")).catch(() => null))?.isDirectory()) {
    throw new Error(
      "Install the pinned Better Farms dependencies with npm ci before pilot acceptance",
    );
  }
  process.chdir(siteRoot);
  const requireSite = createRequire(path.join(siteRoot, "package.json"));
  const { build: viteBuild } = await import(pathToFileURL(requireSite.resolve("vite")).href);
  const { default: config } = await import(
    pathToFileURL(path.join(siteRoot, "vite.config.ts")).href
  );
  await viteBuild({
    ...config,
    configFile: false,
    envDir: false,
    cacheDir: path.join(output, "vite-cache"),
    build: { ...config.build, outDir: path.join(output, "public") },
  });
  const { build } = requireSite("esbuild");
  await build({
    entryPoints: [path.join(siteRoot, "server/index.ts")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: path.join(output, "index.cjs"),
    packages: "external",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
  });
  await symlink(path.join(siteRoot, "node_modules"), path.join(output, "node_modules"));
}

async function assertPortsAvailable() {
  const reservations: net.Server[] = [];
  try {
    for (const port of [5202, 5203, 5443]) {
      const server = net.createServer();
      await new Promise<void>((resolve, reject) => {
        server.once("error", () =>
          reject(new Error(`Pilot port ${port} is occupied or unavailable`)),
        );
        server.listen(port, "127.0.0.1", resolve);
      });
      reservations.push(server);
    }
  } finally {
    await Promise.all(
      reservations.map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
    );
  }
}

function localDockerEndpoint(): string {
  const context = process.env.DOCKER_CONTEXT;
  const endpoint =
    (!context && process.env.DOCKER_HOST) ||
    execFileSync(
      "docker",
      [
        "context",
        "inspect",
        ...(context ? [context] : []),
        "--format",
        "{{.Endpoints.docker.Host}}",
      ],
      {
        env: {
          ...minimal,
          ...(process.env.HOME ? { HOME: process.env.HOME } : {}),
          ...(process.env.DOCKER_CONFIG ? { DOCKER_CONFIG: process.env.DOCKER_CONFIG } : {}),
        },
        encoding: "utf8",
        timeout: 30000,
      },
    ).trim();
  const url = new URL(endpoint);
  if (
    url.protocol !== "unix:" ||
    url.hostname ||
    !url.pathname.startsWith("/") ||
    url.search ||
    url.hash
  )
    throw new Error("Pilot requires a local Docker Unix socket");
  return endpoint;
}

async function main() {
  await assertPortsAvailable();
  const dockerEndpoint = localDockerEndpoint();
  const siteRevision = execFileSync("git", ["-C", siteRoot, "rev-parse", "HEAD"], {
    env: minimal,
    encoding: "utf8",
    timeout: 30000,
  }).trim();
  if (siteRevision !== "7fd1298beb373ee447aa97f578fb11e575faf8f0")
    throw new Error("Pilot requires reviewed Better Farms 7fd1298 source");
  if (
    execFileSync("git", ["-C", siteRoot, "status", "--porcelain", "--untracked-files=no"], {
      env: minimal,
      encoding: "utf8",
      timeout: 30000,
    }).trim()
  )
    throw new Error("Pilot requires an unchanged reviewed Better Farms source tree");
  const temp = await mkdtemp(path.join(tmpdir(), "core-better-farms-pilot-"));
  const name = `core-better-farms-pilot-${randomUUID()}`;
  const docker = (...args: string[]) =>
    execFileSync("docker", ["--host", dockerEndpoint, ...args], {
      env: minimal,
      encoding: "utf8",
      timeout: 30000,
    }).trim();
  const children: ChildProcess[] = [];
  let proxy: https.Server | undefined;
  let stopped = false;
  let containerAttempted = false;
  let discoveryCreated = false;
  const apps: ChildProcess[] = [];
  const cleanup = async () => {
    if (stopped) return;
    stopped = true;
    proxy?.close();
    await Promise.all(
      children.map(async (child) => {
        if (child.exitCode !== null || child.signalCode !== null) return;
        child.kill("SIGTERM");
        await Promise.race([
          new Promise<void>((resolve) => child.once("exit", () => resolve())),
          new Promise<void>((resolve) =>
            setTimeout(() => {
              child.kill("SIGKILL");
              resolve();
            }, 15000).unref(),
          ),
        ]);
      }),
    );
    try {
      if (containerAttempted) {
        let stopError: unknown;
        try {
          docker("stop", "--time", "5", name);
        } catch (error) {
          stopError = error;
        }
        let present = true;
        for (let attempt = 0; attempt < 20; attempt++) {
          present = docker("ps", "-a", "--filter", `name=^/${name}$`, "--format", "{{.Names}}")
            .split("\n")
            .includes(name);
          if (!present) break;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        if (present)
          throw new Error(`Owned pilot container ${name} was not removed`, { cause: stopError });
      }
    } finally {
      try {
        if (discoveryCreated) await rm(discoveryPath);
      } finally {
        await rm(temp, { recursive: true, force: true });
      }
    }
  };
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => {
      void cleanup().then(
        () => process.exit(0),
        (error) => {
          console.error("Pilot cleanup failed", error);
          process.exit(1);
        },
      );
    });
  function child(args: string[], env: NodeJS.ProcessEnv, cwd = coreRoot) {
    const result = spawn(process.execPath, args, {
      cwd,
      env: { ...minimal, ...env },
      stdio: "inherit",
    });
    children.push(result);
    return result;
  }
  try {
    containerAttempted = true;
    docker(
      "run",
      "--detach",
      "--rm",
      "--name",
      name,
      "--publish",
      "127.0.0.1::5432",
      "--env",
      "POSTGRES_USER=pilot_test",
      "--env",
      "POSTGRES_PASSWORD=disposable_pilot_test",
      "--env",
      "POSTGRES_DB=core_pilot_test",
      "postgres:16-alpine",
    );
    const port = docker("port", name, "5432/tcp").split(":").pop();
    const databaseUrl = `postgresql://pilot_test:disposable_pilot_test@127.0.0.1:${port}/core_pilot_test`;
    await writeFile(discoveryPath, JSON.stringify({ databaseUrl }), { flag: "wx", mode: 0o600 });
    discoveryCreated = true;
    for (let attempt = 0; ; attempt++) {
      try {
        docker("exec", name, "pg_isready", "-U", "pilot_test");
        break;
      } catch {
        if (attempt > 30) throw new Error("Disposable DB not ready");
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    const manifest = JSON.parse(
      await readFile(
        path.join(coreRoot, "docs/pilots/better-farms/client-site-manifest.example.json"),
        "utf8",
      ),
    );
    Object.assign(manifest.origins, { publicSite: publicOrigin, admin: adminOrigin });
    for (const component of manifest.puck.editableComponents) {
      for (const field of component.fields) {
        if (field.type === "image") field.allowedImageOrigins = [adminOrigin];
      }
    }
    manifest.client.source.revision = siteRevision;
    const manifestPath = path.join(temp, "manifest.json");
    await writeFile(manifestPath, JSON.stringify(manifest));
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-keyout",
        path.join(temp, "key.pem"),
        "-out",
        path.join(temp, "cert.pem"),
        "-days",
        "1",
        "-subj",
        "/CN=site.localhost",
      ],
      { env: minimal, stdio: "ignore", timeout: 30000 },
    );
    const build = child(["--import", "tsx", fileURLToPath(import.meta.url), "--build-site"], {
      PILOT_SITE_ROOT: siteRoot,
      PILOT_OUTPUT: temp,
    });
    await new Promise<void>((resolve, reject) => {
      build.once("error", reject);
      build.once("exit", (code) =>
        code === 0 ? resolve() : reject(new Error("Pilot site build failed")),
      );
    });
    apps.push(
      child(
        [
          "--require",
          path.join(coreRoot, "e2e/pilot/loopback.cjs"),
          "--import",
          "tsx",
          fileURLToPath(import.meta.url),
          "--core",
        ],
        {
          PILOT_DATABASE_URL: databaseUrl,
          PILOT_MANIFEST_PATH: manifestPath,
        },
      ),
    );
    apps.push(
      child(
        ["--require", path.join(coreRoot, "e2e/pilot/loopback.cjs"), path.join(temp, "index.cjs")],
        {
          NODE_ENV: "production",
          PORT: "5203",
          VITE_CORE_PLATFORM_ADMIN_ORIGIN: adminOrigin,
          CORE_PLATFORM_API_ORIGIN: "http://127.0.0.1:5202",
          CORE_PLATFORM_FORM_PROXY_TOKEN: formProxyToken,
        },
        siteRoot,
      ),
    );
    for (const app of apps) {
      app.once("error", (error) => {
        if (!stopped) {
          console.error("Pilot app failed", error);
          void cleanup().finally(() => process.exit(1));
        }
      });
      app.once("exit", () => {
        if (!stopped) {
          console.error("Pilot app exited unexpectedly");
          void cleanup().finally(() => process.exit(1));
        }
      });
    }
    proxy = https.createServer(
      {
        key: await readFile(path.join(temp, "key.pem")),
        cert: await readFile(path.join(temp, "cert.pem")),
      },
      (req, res) => {
        const host = req.headers.host?.split(":")[0];
        if (req.url === "/pilot-ready") {
          if (apps.some((app) => app.exitCode !== null || app.signalCode !== null)) {
            res.writeHead(503);
            res.end();
            return;
          }
          Promise.all([
            fetch("http://127.0.0.1:5202/api/health/ready", { signal: AbortSignal.timeout(3000) }),
            fetch("http://127.0.0.1:5203/fund-a-farm", { signal: AbortSignal.timeout(3000) }),
          ])
            .then((responses) => {
              res.writeHead(responses.every((r) => r.ok) ? 200 : 503);
              res.end();
            })
            .catch(() => {
              res.writeHead(503);
              res.end();
            });
          return;
        }
        const targetPort =
          host === "dashboard.site.localhost" ? 5202 : host === "site.localhost" ? 5203 : undefined;
        if (!targetPort) {
          res.writeHead(400);
          res.end();
          return;
        }
        const upstream = http.request(
          {
            hostname: "127.0.0.1",
            port: targetPort,
            path: req.url,
            method: req.method,
            headers: { ...req.headers, "x-forwarded-proto": "https" },
          },
          (response) => {
            res.writeHead(response.statusCode || 502, response.headers);
            response.pipe(res);
          },
        );
        upstream.setTimeout(10000, () =>
          upstream.destroy(new Error("Pilot proxy upstream timed out")),
        );
        upstream.on("error", () => {
          if (res.headersSent) res.destroy();
          else {
            res.writeHead(502);
            res.end();
          }
        });
        req.pipe(upstream);
      },
    );
    await new Promise<void>((resolve) => proxy!.listen(5443, "127.0.0.1", resolve));
    console.log("Pilot HTTPS proxy ready; waiting for both actual applications");
  } catch (error) {
    await cleanup();
    throw error;
  }
}
(mode === "--core" ? core() : mode === "--build-site" ? buildSite() : main()).catch((error) => {
  console.error(error);
  process.exit(1);
});
