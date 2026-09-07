import type { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodError } from "zod";
import { logger } from "../utils/logger";

export class AppError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

type HttpError = Error & {
  status?: number;
  statusCode?: number;
};

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const isValidationError = err instanceof ZodError;
  const httpError = err as Partial<HttpError>;
  const status = isValidationError ? 400 : httpError.statusCode || httpError.status || 500;
  const logContext = {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    statusCode: status,
  };

  if (status >= 500) {
    logger.app.error(`${req.method} ${req.path} ${status}`, err, logContext);
  } else {
    logger.app.warn(`${req.method} ${req.path} ${status}`, {
      ...logContext,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  if (!res.headersSent) {
    if (isValidationError) {
      res.status(status).json({
        message: "Validation error",
        errors: err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
      return;
    }

    const isProduction = process.env.NODE_ENV === "production";
    const message =
      status >= 500 && isProduction
        ? "Internal Server Error"
        : err instanceof Error
          ? err.message
          : "Internal Server Error";

    res.status(status).json({ message });
  }
}
