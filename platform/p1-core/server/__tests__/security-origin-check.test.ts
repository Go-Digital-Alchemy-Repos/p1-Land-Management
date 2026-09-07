import type { Request, Response, NextFunction } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

async function loadOriginCheckForProduction() {
  vi.resetModules();
  process.env.NODE_ENV = "production";
  const { originCheck } = await import("../middleware/security");
  return originCheck;
}

function mockResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

describe("originCheck", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.resetModules();
  });

  it("does not exempt removed ecommerce webhooks from origin checks", async () => {
    const originCheck = await loadOriginCheckForProduction();
    const req = {
      method: "POST",
      path: "/api/ecommerce/webhook/stripe",
      headers: {},
      get: vi.fn(),
    } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    originCheck(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("rejects non-exempt production writes without origin headers", async () => {
    const originCheck = await loadOriginCheckForProduction();
    const req = {
      method: "POST",
      path: "/api/ecommerce/cart/price",
      headers: {},
      get: vi.fn(),
    } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    originCheck(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden: missing origin" });
  });
});
