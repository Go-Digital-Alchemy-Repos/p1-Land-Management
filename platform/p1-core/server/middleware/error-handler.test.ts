import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { Request, Response } from "express";
import { logger } from "../utils/logger";
import { errorHandler } from "./error-handler";

vi.mock("../utils/logger", () => ({
  logger: {
    app: {
      error: vi.fn(),
      warn: vi.fn(),
    },
  },
}));

function mockReqRes() {
  const req = {
    method: "POST",
    path: "/api/example",
    requestId: "request-1",
  } as Request;
  const res = {
    headersSent: false,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return { req, res };
}

describe("errorHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns structured 400 responses for uncaught Zod validation errors", () => {
    const schema = z.object({
      email: z.string().email(),
      quantity: z.number().int().positive(),
    });
    const parsed = schema.safeParse({ email: "bad", quantity: 0 });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const { req, res } = mockReqRes();
    errorHandler(parsed.error, req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Validation error",
      errors: expect.arrayContaining([
        expect.objectContaining({ field: "email", message: expect.any(String) }),
        expect.objectContaining({ field: "quantity", message: expect.any(String) }),
      ]),
    });
    expect(logger.app.warn).toHaveBeenCalledWith(
      "POST /api/example 400",
      expect.objectContaining({ statusCode: 400, error: expect.any(String) }),
    );
    expect(logger.app.error).not.toHaveBeenCalled();
  });

  it("logs server errors at error level", () => {
    const { req, res } = mockReqRes();
    const err = Object.assign(new Error("Database unavailable"), { statusCode: 503 });

    errorHandler(err, req, res, vi.fn());

    expect(logger.app.error).toHaveBeenCalledWith(
      "POST /api/example 503",
      err,
      expect.objectContaining({ statusCode: 503 }),
    );
    expect(logger.app.warn).not.toHaveBeenCalled();
  });
});
