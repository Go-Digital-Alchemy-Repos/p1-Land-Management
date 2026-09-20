import { beforeAll, afterAll, beforeEach, it, expect, vi } from "vitest";
import express from "express";
import { AppError } from "../middleware/error-handler";
const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  config: vi.fn(),
  submit: vi.fn(),
  storage: vi.fn(),
}));
vi.mock("../services/turnstile.service", async () => {
  const { asyncHandler } = await import("../middleware/error-handler");
  return {
    turnstile: { verify: mocks.verify, publicConfiguration: mocks.config },
    requirePublicFormVerification: asyncHandler(async (req, _res, next) => {
      await mocks.verify(req.get("X-Turnstile-Token"));
      next();
    }),
  };
});
vi.mock("../services/forms.service", () => ({
  submitManagedFormBySlug: mocks.submit,
  submitManagedFormById: mocks.submit,
}));
vi.mock("../storage", () => ({ storage: { forms: { getPublicBySlug: mocks.storage } } }));
vi.mock("../storage/index", () => ({ storage: { blog: { getPostBySlug: mocks.storage } } }));
vi.mock("../services/email.service", () => ({
  sendRegistrationConfirmationEmail: vi.fn(),
  sendWaitlistEmail: vi.fn(),
}));
vi.mock("../services/careers.service", () => ({
  getCareerSettings: async () => ({ integrations: { indeedApplyEnabled: false } }),
}));
vi.mock("../services/r2.service", () => ({}));
vi.mock("../services/blog-comments.service", () => ({}));
vi.mock("../middleware/auth", () => ({
  optionalAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
import forms from "./forms.routes";
import contact from "./contact.routes";
import aliases from "./client-forms.routes";
import careers from "./careers.routes";
import guests from "./guest-registration.routes";
import blog from "./blog.routes";
let server: ReturnType<express.Express["listen"]>, base: string;
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/forms", forms);
  app.use("/api/contact", contact);
  app.use("/api/client-forms", aliases);
  app.use("/api/careers", careers);
  app.use("/api/events", guests);
  app.use("/api/blog", blog);
  app.use(
    (error: AppError, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
      res.status(error.statusCode || 500).json({ message: error.message }),
  );
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.config.mockReturnValue({ enabled: true, siteKey: "public", action: "public_form" });
});
const post = (path: string, headers: Record<string, string> = {}) =>
  fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ name: "Synthetic" }),
  });
it("serves no-store public configuration before dynamic form slug", async () => {
  const response = await fetch(base + "/api/forms/turnstile-config");
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({
    enabled: true,
    siteKey: "public",
    action: "public_form",
  });
  expect(mocks.storage).not.toHaveBeenCalled();
});
it("denies all anonymous write routes before body processing or durable effects", async () => {
  mocks.verify.mockRejectedValue(new AppError("Verification required", 403));
  for (const path of [
    "/api/forms/p1-estimate/submit",
    "/api/forms/p1-commercial-assessment/submit",
    "/api/forms/newsletter-signup/submit",
    "/api/contact",
    "/api/events/event/register-guest",
    "/api/blog/post/comments",
    "/api/careers/jobs/job/apply",
  ])
    expect((await post(path)).status, path).toBe(403);
  expect(mocks.submit).not.toHaveBeenCalled();
  expect(mocks.storage).not.toHaveBeenCalled();
});
it("preserves proxy authentication and requires verification on every authorized alias", async () => {
  vi.stubEnv("CLIENT_STACK_ID", "fixture");
  vi.stubEnv("CLIENT_FORM_PROXY_TOKEN", "synthetic-proxy");
  try {
    expect((await post("/api/client-forms/fixture/contact")).status).toBe(403);
    expect(mocks.verify).not.toHaveBeenCalled();
    mocks.verify.mockRejectedValue(new AppError("Verification required", 403));
    for (const name of ["contact", "newsletter-signup", "estimate"])
      expect(
        (
          await post(`/api/client-forms/fixture/${name}`, {
            "x-client-form-proxy-token": "synthetic-proxy",
          })
        ).status,
      ).toBe(403);
    expect(mocks.verify).toHaveBeenCalledTimes(3);
    expect(mocks.submit).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllEnvs();
  }
});
it("reverifies durable retries and forwards original data/key without token persistence", async () => {
  mocks.submit
    .mockResolvedValueOnce({
      duplicate: false,
      successMessage: "Saved",
      submission: { id: "receipt" },
    })
    .mockResolvedValueOnce({
      duplicate: true,
      successMessage: "Saved",
      submission: { id: "receipt" },
    });
  for (const [token, status] of [
    ["first", 201],
    ["fresh-retry", 200],
  ] as const) {
    const response = await post("/api/forms/p1-estimate/submit", {
      "X-Turnstile-Token": token,
      "Idempotency-Key": "stable",
    });
    expect(response.status).toBe(status);
    expect((await response.json()).submissionId).toBe("receipt");
  }
  expect(mocks.verify.mock.calls).toEqual([["first"], ["fresh-retry"]]);
  for (const call of mocks.submit.mock.calls) {
    expect(call[1]).toEqual({ name: "Synthetic" });
    expect(call[2]).toMatchObject({ idempotencyKey: "stable" });
    expect(JSON.stringify(call)).not.toContain("fresh-retry");
  }
});

it("keeps public comment reads ungated and inactive partner ingress fail-closed", async () => {
  mocks.verify.mockRejectedValue(new AppError("Verification required", 403));
  expect((await fetch(base + "/api/blog/missing/comments")).status).toBe(404);
  expect(mocks.storage).toHaveBeenCalled();
  expect((await post("/api/careers/indeed/apply")).status).toBe(404);
  expect((await post("/api/careers/ziprecruiter/apply")).status).toBe(503);
  expect(mocks.verify).not.toHaveBeenCalled();
  expect(mocks.submit).not.toHaveBeenCalled();
});
