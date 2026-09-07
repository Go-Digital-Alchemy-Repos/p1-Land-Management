import { pool } from "./db";
import { createRuntimeLifecycle, shutdownTimeoutMs } from "./utils/runtime-lifecycle";
import { startFormEffectJobService } from "./services/form-effect-jobs.service";
import express, { type ErrorRequestHandler } from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import {
  enforceRequiredSecrets,
  securityHeaders,
  configuredSecurityHeaders,
  apiLimiter,
  originCheck,
} from "./middleware/security";
import { logger, requestIdMiddleware } from "./utils/logger";
import {
  getMetricsSnapshot,
  getPrometheusMetricsSnapshot,
  isMetricsRequestAuthorized,
  recordRequest,
} from "./utils/metrics";
import { startScheduledPublishService } from "./services/scheduled-publish.service";
import { startEventReminderService } from "./services/event-reminder.service";
import { startSystemBackupService } from "./services/system-backup.service";

declare const __APP_VERSION__: string;
const pkgVersion = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "unknown";

enforceRequiredSecrets();

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);
const runtime = createRuntimeLifecycle({
  server: httpServer,
  closeDatabase: () => pool.end(),
  timeoutMs: shutdownTimeoutMs(process.env.SHUTDOWN_TIMEOUT_MS),
  exit: (code) => process.exit(code),
  onEvent: (event, reason) => logger.app.info("Runtime shutdown", { event, reason }),
});
runtime.installSignalHandlers(process);

let activeSecurityHeaders = securityHeaders();
app.use((req, res, next) => activeSecurityHeaders(req, res, next));
app.use(requestIdMiddleware);
app.use(runtime.admission);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: "ok",
    version: pkgVersion,
    nodeVersion: process.version,
    uptime: Math.floor(process.uptime()),
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      external: Math.round(mem.external / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health/ready", async (_req, res) => {
  try {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`SELECT 1`);
    if (runtime.isStopping()) {
      res.status(503).json({ status: "not_ready", reason: "shutting_down" });
      return;
    }
    res.json({
      status: "ready",
      database: "connected",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.db.error("Readiness check failed", err);
    res.status(503).json({
      status: "not_ready",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/api/health/metrics", (req, res) => {
  if (!isMetricsRequestAuthorized(req.get("authorization"))) {
    return res.status(404).json({ message: "Not found" });
  }
  if (req.query.format === "prometheus") {
    res.type("text/plain; version=0.0.4; charset=utf-8");
    return res.send(getPrometheusMetricsSnapshot(process.env.CLIENT_STACK_ID));
  }
  res.json(getMetricsSnapshot());
});

app.use("/api", apiLimiter);
app.use(originCheck);

app.use("/uploads/career-resumes", (_req, res) => res.status(404).send("Not found"));
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      recordRequest(req.method, reqPath, duration, res.statusCode);

      logger.http.info(`${req.method} ${reqPath} ${res.statusCode} ${duration}ms`, {
        requestId: req.requestId,
        method: req.method,
        path: reqPath,
        statusCode: res.statusCode,
        durationMs: duration,
      });
    }
  });

  next();
});

const startup = (async () => {
  activeSecurityHeaders = await configuredSecurityHeaders(
    process.env.CLIENT_SITE_MANIFEST_PATH,
    process.env.CLIENT_SITE_CORE_VERSION || "1.0.0",
  );
  if (runtime.isStopping()) return;

  if (process.env.NODE_ENV === "production") {
    const { runMigrations } = await import("./migrate");
    await runMigrations();
    if (runtime.isStopping()) return;
  }

  const { runSystemBootstrap } = await import("./services/system-bootstrap.service");
  await runSystemBootstrap();
  if (runtime.isStopping()) return;

  await registerRoutes(httpServer, app);
  if (runtime.isStopping()) return;

  const finalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
    const httpError = err as { status?: number; statusCode?: number; message?: string };
    const status = httpError.status || httpError.statusCode || 500;

    logger.app.error(`${req.method} ${req.path} ${status}`, err, {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: status,
    });

    if (res.headersSent) {
      return next(err);
    }

    const isProduction = process.env.NODE_ENV === "production";
    const message =
      status >= 500 && isProduction
        ? "Internal Server Error"
        : httpError.message || "Internal Server Error";

    return res.status(status).json({ message });
  };

  app.use(finalErrorHandler);

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    runtime.register(await setupVite(httpServer, app));
  }

  if (runtime.isStopping()) return;
  runtime.register(startScheduledPublishService());
  const { isSiteFeatureEnabled } = await import("./services/site-features.service");
  if (await isSiteFeatureEnabled("eventsEnabled")) runtime.register(startEventReminderService());
  runtime.register(startSystemBackupService());
  runtime.register(startFormEffectJobService());

  const port = parseInt(process.env.PORT || "5000", 10);
  if (runtime.isStopping()) return;
  await runtime.listen({
    port,
    host: "0.0.0.0",
    ...(process.env.NODE_ENV === "production" ? { reusePort: true } : {}),
  });
  if (!runtime.isStopping()) logger.app.info(`Serving on port ${port}`);
})();
runtime.trackStartup(startup);
void startup.catch((error) => {
  logger.app.error("Server startup failed", error);
  void runtime.shutdown("startup_failure");
});
