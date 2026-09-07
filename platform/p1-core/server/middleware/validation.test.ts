import { describe, it, expect, vi } from "vitest";
import { validateBody } from "./validation";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

const schema = z.object({
  name: z.string().min(1),
  age: z.number().int().positive(),
});

function mockReqRes(body: unknown) {
  const req = { body } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe("validateBody", () => {
  it("calls next and parses body on valid input", () => {
    const { req, res, next } = mockReqRes({ name: "Alice", age: 30 });
    validateBody(schema)(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: "Alice", age: 30 });
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 400 with validation errors on invalid input", () => {
    const { req, res, next } = mockReqRes({ name: "", age: -5 });
    validateBody(schema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Validation error",
        errors: expect.arrayContaining([
          expect.objectContaining({ field: expect.any(String), message: expect.any(String) }),
        ]),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 400 when body is missing required fields", () => {
    const { req, res, next } = mockReqRes({});
    validateBody(schema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
