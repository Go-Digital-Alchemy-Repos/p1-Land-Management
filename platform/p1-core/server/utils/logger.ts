import pino from "pino";
import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";

const isProduction = process.env.NODE_ENV === "production";

const baseLogger = pino({
  level: process.env.LOG_LEVEL || "info",
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        },
      }),
});

interface RequestContext {
  requestId: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

function createChildLogger(source: string) {
  const child = baseLogger.child({ source });
  return {
    info(msg: string, ctx?: Record<string, unknown>) {
      const requestId = getRequestId();
      child.info({ ...(requestId ? { requestId } : {}), ...ctx }, msg);
    },
    warn(msg: string, ctx?: Record<string, unknown>) {
      const requestId = getRequestId();
      child.warn({ ...(requestId ? { requestId } : {}), ...ctx }, msg);
    },
    error(msg: string, err?: unknown, ctx?: Record<string, unknown>) {
      const requestId = getRequestId();
      const errorInfo: Record<string, unknown> = {
        ...(requestId ? { requestId } : {}),
        ...ctx,
      };
      if (err instanceof Error) {
        errorInfo.error = err.message;
        if (err.stack) errorInfo.stack = err.stack.split("\n").slice(0, 5).join(" | ");
      } else if (err) {
        errorInfo.error = String(err);
      }
      child.error(errorInfo, msg);
    },
  };
}

export const logger = {
  http: createChildLogger("http"),
  email: createChildLogger("email"),
  r2: createChildLogger("r2"),
  backup: createChildLogger("backup"),
  stripe: createChildLogger("stripe"),
  auth: createChildLogger("auth"),
  app: createChildLogger("app"),
  db: createChildLogger("db"),
  cms: createChildLogger("cms"),
  metrics: createChildLogger("metrics"),
};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers["x-request-id"] as string) || randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  requestContext.run({ requestId: id }, () => {
    next();
  });
}
