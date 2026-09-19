import { afterEach, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
const version = "a".repeat(64);
const state = vi.hoisted(() => ({
  identity: null as any,
  user: null as any,
  list: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  get: vi.fn(),
  send: vi.fn(),
  log: vi.fn(),
  render: vi.fn(),
  shell: vi.fn(),
}));
vi.mock("../storage", () => ({
  storage: {
    emailTemplates: {
      getVersionedTemplates: state.list,
      saveVersionedTemplate: state.save,
      restoreVersionedTemplates: state.restore,
      getTemplate: state.get,
    },
    activity: { log: state.log },
  },
}));
vi.mock("../services/email.service", () => ({
  sendEmail: state.send,
  renderEmailShell: state.shell,
  renderTemplate: state.render,
}));
vi.mock("../services/system-email-templates.service", () => ({
  SYSTEM_EMAIL_TEMPLATE_DEFAULTS: [{ slug: "system-default" }],
}));
vi.mock("../utils/route-helpers", () => ({ getBaseUrl: () => "https://www.p1landmanagement.com" }));
vi.mock("../utils/logger", () => ({ logger: { app: { warn: vi.fn(), error: vi.fn() } } }));
import router from "./business-center-email-templates.routes";
import { errorHandler } from "../middleware/error-handler";
let server: Server, base: string;
beforeEach(async () => {
  vi.clearAllMocks();
  state.identity = { active: true, role: "owner", ownerAttested: true };
  state.user = { id: "linked-owner", email: "owner@example.invalid" };
  state.list.mockResolvedValue({ version, templates: [] });
  state.save.mockResolvedValue({ slug: "welcome", version });
  state.restore.mockResolvedValue({ version, templates: [], restored: 1 });
  state.get.mockResolvedValue({
    slug: "welcome",
    subject: "Hello {{firstName}}",
    htmlBody: "Saved {{messageBody}}",
    variables: ["firstName", "messageBody", "loginUrl", "custom"],
  });
  state.render.mockImplementation((text: string) => text);
  state.shell.mockImplementation(async (_title: string, body: string) => `shell:${body}`);
  state.send.mockResolvedValue(true);
  state.log.mockResolvedValue(undefined);
  const app = express();
  app.use(
    express.json(),
    (req, _res, next) => {
      req.user = state.user;
      req.dashboardIdentity = state.identity;
      next();
    },
    router,
    errorHandler,
  );
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterEach(async () => new Promise<void>((resolve) => server.close(() => resolve())));
const request = (path: string, method = "GET", body?: unknown) =>
  fetch(base + path, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
it("requires active attested Owner across all operations before storage or mail", async () => {
  for (const identity of [
    null,
    { active: false, role: "owner", ownerAttested: true },
    { active: true, role: "owner", ownerAttested: false },
    { active: true, role: "member", ownerAttested: true },
  ]) {
    state.identity = identity;
    for (const [path, method, body] of [
      ["/", "GET", undefined],
      ["/welcome", "PUT", {}],
      ["/restore", "POST", {}],
      ["/welcome/preview", "POST", {}],
      ["/welcome/test", "POST", {}],
    ] as const)
      expect((await request(path, method, body)).status).toBe(403);
  }
  expect(state.list).not.toHaveBeenCalled();
  expect(state.get).not.toHaveBeenCalled();
  expect(state.send).not.toHaveBeenCalled();
});
it("returns private versioned reads and derives mutation actors", async () => {
  const res = await request("/");
  expect(res.headers.get("cache-control")).toBe("private, no-store");
  expect(await res.json()).toEqual({ version, templates: [] });
  expect(
    (await request("/welcome", "PUT", { template: { isActive: false }, expectedVersion: version }))
      .status,
  ).toBe(200);
  expect(state.save).toHaveBeenCalledWith("welcome", { isActive: false }, version, {
    userId: "linked-owner",
    action: "website_email_template_updated",
    details: "welcome",
  });
  expect((await request("/restore", "POST", { expectedVersion: version })).status).toBe(200);
  expect(state.restore).toHaveBeenCalledWith(
    [{ slug: "system-default" }],
    version,
    expect.objectContaining({ userId: "linked-owner" }),
  );
  expect(state.send).not.toHaveBeenCalled();
});
it("rejects unknown query/body fields, invalid slugs, excessive content and unversioned writes", async () => {
  expect((await request("/?recipient=other")).status).toBe(400);
  for (const body of [
    { subject: "old" },
    { template: { subject: "Valid" }, expectedVersion: version, userId: "spoof" },
    { template: { variables: [] }, expectedVersion: version },
  ])
    expect((await request("/welcome", "PUT", body)).status).toBe(400);
  expect((await request("/restore", "POST", {})).status).toBe(400);
  expect((await request("/bad_slug/preview", "POST", {})).status).toBe(400);
  expect((await request("/welcome/preview", "POST", { subject: "x".repeat(1001) })).status).toBe(
    400,
  );
  expect((await request("/welcome/preview", "POST", { recipient: "other" })).status).toBe(400);
  expect(
    (await request("/welcome/test", "POST", { recipient: "other@example.invalid" })).status,
  ).toBe(400);
  expect(state.get).not.toHaveBeenCalled();
  expect(state.save).not.toHaveBeenCalled();
  expect(state.send).not.toHaveBeenCalled();
});
it("previews unsaved content through branded shell without sending or changing templates", async () => {
  const res = await request("/welcome/preview", "POST", { htmlBody: "", subject: "Draft" });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ subject: "Draft", html: "shell:" });
  expect(state.render).toHaveBeenCalledWith(
    "",
    expect.objectContaining({
      firstName: "Jane",
      custom: "[custom]",
      loginUrl: "https://www.p1landmanagement.com/example-link",
    }),
  );
  expect(state.send).not.toHaveBeenCalled();
  expect(state.save).not.toHaveBeenCalled();
  expect(state.log).not.toHaveBeenCalled();
});
it("sends only saved content to authenticated email and records content-free intent/outcome", async () => {
  const res = await request("/welcome/test", "POST");
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ success: true });
  expect(state.send).toHaveBeenCalledExactlyOnceWith(
    "owner@example.invalid",
    "[TEST] Hello {{firstName}}",
    "shell:Saved {{messageBody}}",
  );
  expect(state.render).toHaveBeenCalledWith(
    "Saved {{messageBody}}",
    expect.objectContaining({
      firstName: "Test User",
      loginUrl: "https://www.p1landmanagement.com",
    }),
  );
  expect(state.log.mock.calls).toEqual([
    ["linked-owner", "website_email_template_test_requested", "welcome"],
    ["linked-owner", "website_email_template_test_sent", "welcome"],
  ]);
  expect(state.log.mock.invocationCallOrder[0]).toBeLessThan(
    state.send.mock.invocationCallOrder[0],
  );
});
it("reports unsent provider result honestly and missing templates without sending", async () => {
  state.send.mockResolvedValue(false);
  const res = await request("/welcome/test", "POST", {});
  expect(await res.json()).toMatchObject({ success: false });
  expect(state.log).toHaveBeenLastCalledWith(
    "linked-owner",
    "website_email_template_test_not_sent",
    "welcome",
  );
  state.get.mockResolvedValue(undefined);
  expect((await request("/welcome/preview", "POST", {})).status).toBe(404);
  expect((await request("/welcome/test", "POST", {})).status).toBe(404);
  expect(state.send).toHaveBeenCalledTimes(1);
});
it("fails closed before mail when audit fails and sanitizes uncertain provider failures", async () => {
  state.log.mockRejectedValueOnce(new Error("private SQL recipient"));
  const first = await request("/welcome/test", "POST", {});
  expect(first.status).toBe(503);
  expect(await first.text()).not.toContain("private SQL");
  expect(state.send).not.toHaveBeenCalled();
  state.send.mockRejectedValue(new Error("private provider body"));
  const second = await request("/welcome/test", "POST", {});
  expect(second.status).toBe(503);
  expect(await second.text()).not.toContain("private provider");
  expect(state.send).toHaveBeenCalledTimes(1);
});
it("preserves sanitized conflicts and rejects missing authenticated email", async () => {
  state.save.mockRejectedValue(Object.assign(new Error("private conflict"), { statusCode: 409 }));
  const res = await request("/welcome", "PUT", {
    template: { isActive: true },
    expectedVersion: version,
  });
  expect(res.status).toBe(409);
  expect(await res.text()).not.toContain("private conflict");
  state.user.email = "";
  expect((await request("/welcome/test", "POST", {})).status).toBe(503);
  expect(state.send).not.toHaveBeenCalled();
});
