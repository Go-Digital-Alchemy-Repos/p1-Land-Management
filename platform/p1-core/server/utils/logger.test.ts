import { describe, it, expect, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { logger, requestIdMiddleware, requestContext } from "./logger";

type MockRequest = Partial<Request> & { headers: Record<string, string>; requestId?: string };
type MockResponse = Pick<Response, "setHeader">;

describe("logger", () => {
  it("exposes named child loggers with info/warn/error methods", () => {
    const sources = [
      "http",
      "email",
      "r2",
      "stripe",
      "auth",
      "app",
      "db",
      "cms",
      "metrics",
    ] as const;
    for (const src of sources) {
      expect(logger[src]).toBeDefined();
      expect(typeof logger[src].info).toBe("function");
      expect(typeof logger[src].warn).toBe("function");
      expect(typeof logger[src].error).toBe("function");
    }
  });

  it("info does not throw", () => {
    expect(() => logger.app.info("test message")).not.toThrow();
  });

  it("error handles Error objects without throwing", () => {
    expect(() => logger.app.error("fail", new Error("boom"))).not.toThrow();
  });

  it("error handles non-Error values without throwing", () => {
    expect(() => logger.app.error("fail", "string error")).not.toThrow();
  });
});

describe("requestIdMiddleware", () => {
  it("assigns a UUID requestId and sets X-Request-Id header", () => {
    const req: MockRequest = { headers: {} };
    const setHeader = vi.fn();
    const res: MockResponse = { setHeader };
    const next: NextFunction = vi.fn();

    requestIdMiddleware(req as Request, res as Response, next);

    expect(req.requestId).toBeDefined();
    expect(req.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(setHeader).toHaveBeenCalledWith("X-Request-Id", req.requestId);
    expect(next).toHaveBeenCalled();
  });

  it("accepts an incoming X-Request-Id header", () => {
    const incomingId = "custom-request-id-123";
    const req: MockRequest = { headers: { "x-request-id": incomingId } };
    const setHeader = vi.fn();
    const res: MockResponse = { setHeader };
    const next: NextFunction = vi.fn();

    requestIdMiddleware(req as Request, res as Response, next);

    expect(req.requestId).toBe(incomingId);
    expect(setHeader).toHaveBeenCalledWith("X-Request-Id", incomingId);
  });
});

describe("requestContext (AsyncLocalStorage)", () => {
  it("propagates requestId to logger calls within context", () => {
    const testId = "test-request-id-abc";
    let capturedId: string | undefined;

    requestContext.run({ requestId: testId }, () => {
      capturedId = requestContext.getStore()?.requestId;
    });

    expect(capturedId).toBe(testId);
  });

  it("returns undefined outside of request context", () => {
    expect(requestContext.getStore()).toBeUndefined();
  });

  it("middleware sets up AsyncLocalStorage context for downstream code", () => {
    const req: MockRequest = { headers: {} };
    const setHeader = vi.fn();
    const res: MockResponse = { setHeader };
    let contextId: string | undefined;

    requestIdMiddleware(req as Request, res as Response, () => {
      contextId = requestContext.getStore()?.requestId;
    });

    expect(contextId).toBe(req.requestId);
    expect(contextId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
