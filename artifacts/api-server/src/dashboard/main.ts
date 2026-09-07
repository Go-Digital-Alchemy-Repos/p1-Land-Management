import { serviceAgreementApi } from "./service-agreement.routes";
import { workReadinessApi } from "./work-readiness.routes";
import { prospectContextApi } from "./prospect-context.routes";
import { commercialIngress, commercialStaffApi } from "./commercial-ingress";
import {
  coreFederationApi,
  coreFederationIngress,
  startCoreFederationRetention,
  stopCoreFederationRetention,
} from "./core-federation";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { resolve } from "node:path";
import {
  auth,
  closeFactorResetLockPool,
  origin,
  withFactorResetLockScope,
} from "./auth";
import { api } from "./api";
import { operationsApi } from "./operations";
import { filesApi } from "./files";
import { qboApi, qboWebhook } from "./quickbooks";
import { notificationsApi, smsWebhook } from "./notifications";
import { salesApi } from "./sales";
import { pool, database } from "./database";
import { sql } from "drizzle-orm";
import { HttpError } from "./policy";
import { ZodError } from "zod";
for (const name of ["DASHBOARD_DATABASE_URL", "BETTER_AUTH_SECRET"])
  if (!process.env[name]) throw new Error(`${name} is required`);
if ((process.env.BETTER_AUTH_SECRET?.length || 0) < 32)
  throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    "Permissions-Policy": "geolocation=(), microphone=()",
  });
  if (req.path.startsWith("/api")) res.set("Cache-Control", "no-store");
  next();
});
app.get("/api/healthz", async (_req, res, next) => {
  try {
    await database.execute(sql`SELECT 1`);
    res.json({ status: "ok" });
  } catch (e) {
    next(e);
  }
});
const authHandler = toNodeHandler(auth);
app.all("/api/auth/*splat", (req, res, next) => {
  void withFactorResetLockScope(() => authHandler(req, res)).catch(next);
});
app.use("/api/webhooks", qboWebhook, smsWebhook);
app.use("/api/integrations/core/v1", commercialIngress, coreFederationIngress);
app.use(express.json({ limit: "1mb" }));
app.use(
  "/api/v1",
  (req, res, next) => {
    const isNativeBearerRequest = /^Bearer\s+\S+$/i.test(
      req.headers.authorization || "",
    );
    // A browser session must never use the native no-Origin exception. This
    // prevents an invalid bearer value from falling back to an automatically
    // attached dashboard cookie and bypassing the browser Origin check.
    const hasCookie = Boolean(req.headers.cookie?.trim());
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin !== origin &&
      // Bearer tokens are never automatically attached by a browser. A native
      // request therefore qualifies only when it has no Origin at all and no
      // cookie; a forged non-dashboard Origin remains rejected. Rejecting all
      // cookies also covers production's __Secure- cookie-name prefix.
      (!isNativeBearerRequest || hasCookie || Boolean(req.headers.origin))
    ) {
      res.status(403).json({ error: "Invalid request origin" });
      return;
    }
    next();
  },
  coreFederationApi,
  prospectContextApi,
  commercialStaffApi,
  api,
  operationsApi,
  workReadinessApi,
  serviceAgreementApi,
  filesApi,
  qboApi,
  notificationsApi,
  salesApi,
);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});
app.use(
  express.static(
    resolve(process.env.DASHBOARD_STATIC_DIR || "../p1-dashboard/dist"),
    { index: false, maxAge: 0 },
  ),
);
app.get("/{*splat}", (_req, res) => {
  res.set("Cache-Control", "no-cache");
  res.sendFile(
    resolve(
      process.env.DASHBOARD_STATIC_DIR || "../p1-dashboard/dist",
      "index.html",
    ),
  );
});
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: "Invalid input",
        fields: error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      });
      return;
    }
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if ((error as { code?: string })?.code === "23505") {
      res.status(409).json({ error: "This record already exists" });
      return;
    }
    if ((error as { code?: string })?.code === "23503") {
      res.status(400).json({ error: "A referenced record does not exist" });
      return;
    }
    console.error(
      JSON.stringify({
        event: "request.failed",
        type: error instanceof Error ? error.name : "unknown",
      }),
    );
    res.status(500).json({ error: "Unable to complete this request" });
  },
);
const server = app.listen(Number(process.env.PORT || 4180), "0.0.0.0", () =>
  console.log("P1 dashboard listening"),
);
startCoreFederationRetention();
server.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
  void Promise.all([pool.end(), closeFactorResetLockPool()]);
});
process.on("SIGTERM", () =>
  server.close(() => {
    stopCoreFederationRetention();
    void Promise.all([pool.end(), closeFactorResetLockPool()]).then(() =>
      process.exit(0),
    );
  }),
);
