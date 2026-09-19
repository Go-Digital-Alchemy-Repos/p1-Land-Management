import { afterEach, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
const state = vi.hoisted(() => ({ snapshot: vi.fn(), save: vi.fn(), log: vi.fn(), mailgun: vi.fn(), mailchimp: vi.fn(), r2: vi.fn(), reset: vi.fn() }));
vi.mock("../storage", () => ({ storage: { settings: { getCategorySnapshot: state.snapshot, upsertSettings: state.save }, activity: { log: state.log } } }));
vi.mock("../services/email.service", () => ({ testMailgunConnection: state.mailgun, resetMailgunConfig: state.reset }));
vi.mock("../services/mailchimp.service", () => ({ testMailchimpConnection: state.mailchimp }));
vi.mock("../services/r2.service", () => ({ testConnection: state.r2, resetClient: state.reset }));
import router from "./business-center-integrations.routes";
let server: Server;
let base: string;
let identity: any;
beforeEach(async () => {
  vi.clearAllMocks();
  identity = { active: true, role: "owner", ownerAttested: true };
  state.snapshot.mockResolvedValue({ values: { mailgun_api_key: "private-do-not-return", mailgun_domain: "mg.example.com" }, version: "a".repeat(64) });
  state.mailgun.mockResolvedValue({ success: false, message: "private-provider-response" });
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { req.user = { id: "owner" } as any; req.dashboardIdentity = identity; next(); });
  app.use(router); app.use((err: any, _req: any, res: any, _next: any) => res.status(err.statusCode || 400).json({ error: "invalid_request" }));
  server = app.listen(0); await new Promise<void>(resolve => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterEach(async () => { vi.unstubAllEnvs(); await new Promise<void>(resolve => server.close(() => resolve())); });
const put = (fields: unknown, extra = {}) => fetch(`${base}/mailgun`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedVersion: "a".repeat(64), fields, ...extra }) });
it("redacts secrets, identifies deployment-backed reporting, and uses private no-store", async () => {
  const response = await fetch(base); const body = await response.json();
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(JSON.stringify(body)).not.toContain("private-do-not-return");
  expect(body.providers[0].secrets.mailgun_api_key).toEqual({ configured: true });
  expect(body.google.configurationManagement).toBe("remaining");
});
it("denies member, unattested and inactive identities before storage", async () => {
  for (const value of [{ role: "member", active: true, ownerAttested: true }, { role: "owner", active: false, ownerAttested: true }, { role: "owner", active: true, ownerAttested: false }]) {
    identity = value; expect((await fetch(base)).status).toBe(403);
  }
  expect(state.snapshot).not.toHaveBeenCalled();
});
it("keeps credentials unchanged and batches public fields with version and actor audit", async () => {
  expect((await put({ mailgun_domain: "mg.example.com", mailgun_from_address: "", mailgun_api_key: { operation: "keep" } })).status).toBe(200);
  const [entries, expected, audit] = state.save.mock.calls[0];
  expect(entries).toHaveLength(2); expect(expected.version).toBe("a".repeat(64)); expect(audit.userId).toBe("owner");
  expect(audit.details).not.toContain("mg.example.com");
});
it("clear is an encrypted empty value in the same versioned transaction", async () => {
  await put({ mailgun_domain: "", mailgun_from_address: "", mailgun_api_key: { operation: "clear" } });
  expect(state.save.mock.calls[0][0]).toContainEqual({ key: "mailgun_api_key", category: "mailgun", value: "", isSecret: true });
});
it("rejects arbitrary fields, provider paths and secret masking", async () => {
  const fields = { mailgun_domain: "mg.example.com", mailgun_from_address: "", mailgun_api_key: { operation: "replace", value: "••••••••" } };
  expect((await put(fields)).status).toBe(400);
  expect((await put({ ...fields, mailgun_api_key: { operation: "keep" }, arbitrary: "x" })).status).toBe(400);
  expect((await fetch(`${base}/twilio/test`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status).toBe(400);
  expect(state.save).not.toHaveBeenCalled();
});
it("returns only sanitized read-only test result and audits no provider message", async () => {
  const response = await fetch(`${base}/mailgun/test`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  expect(await response.json()).toEqual({ success: false, code: "connection_unavailable", effects: "read-only" });
  expect(state.mailgun).toHaveBeenCalledOnce(); expect(JSON.stringify(state.log.mock.calls)).not.toContain("private-provider-response");
});
it("retains a stale version conflict without retrying or resetting caches", async () => {
  state.save.mockRejectedValueOnce(Object.assign(new Error("conflict"), { statusCode: 409 }));
  expect((await put({ mailgun_domain: "", mailgun_from_address: "", mailgun_api_key: { operation: "keep" } })).status).toBe(409);
  expect(state.save).toHaveBeenCalledOnce(); expect(state.reset).not.toHaveBeenCalled();
});
it("matches effective storage precedence including partial and irrelevant environment settings", async () => {
  for (const prefix of ["S3", "BACKUP_S3"]) for (const key of ["ENDPOINT", "ACCESS_KEY_ID", "SECRET_ACCESS_KEY", "BUCKET", "REGION", "FORCE_PATH_STYLE"]) vi.stubEnv(`${prefix}_${key}`, undefined);
  for (const key of ["ACCOUNT_ID", "ACCESS_KEY_ID", "SECRET_ACCESS_KEY", "BUCKET_NAME"]) vi.stubEnv(`BACKUP_R2_${key}`, undefined);
  const read = async () => (await fetch(base)).json();
  vi.stubEnv("S3_PUBLIC_URL", "https://unused.example.test");
  expect((await read()).backups.effectiveSource).toBe("settings");
  for (const key of ["ACCOUNT_ID", "ACCESS_KEY_ID", "SECRET_ACCESS_KEY", "BUCKET_NAME"]) vi.stubEnv(`BACKUP_R2_${key}`, "test");
  expect((await read()).backups.effectiveSource).toBe("BACKUP_R2");
  vi.stubEnv("BACKUP_R2_SECRET_ACCESS_KEY", "");
  expect((await read()).backups.effectiveSource).toBe("settings");
  vi.stubEnv("S3_REGION", "");
  let body = await read(); expect(body.backups.effectiveSource).toBe("S3"); expect(body.providers[2].effectiveSource).toBe("deployment");
  vi.stubEnv("BACKUP_S3_FORCE_PATH_STYLE", "");
  expect((await read()).backups.effectiveSource).toBe("BACKUP_S3");
});
it("never emits raw storage failures even outside production", async () => {
  state.snapshot.mockRejectedValueOnce(new Error("query containing private-secret"));
  const response = await fetch(base);
  expect(response.status).toBe(503); expect(await response.json()).toEqual({ code: "integration_unavailable" });
});
it("does not imply a default Search Console property or accept unrelated URLs", async () => {
  vi.stubEnv("P1_GSC_SITE_URL", undefined);
  let body = await (await fetch(base)).json(); expect(body.google.searchConsoleConfigured).toBe(false); expect(body.google.searchConsoleSite).toBeNull();
  vi.stubEnv("P1_GSC_SITE_URL", "https://example.test/private");
  body = await (await fetch(base)).json(); expect(body.google.searchConsoleConfigured).toBe(false); expect(body.google.searchConsoleSite).toBeNull();
  vi.stubEnv("P1_GSC_SITE_URL", "sc-domain:p1landmanagement.com");
  body = await (await fetch(base)).json(); expect(body.google.searchConsoleConfigured).toBe(true); expect(body.google.searchConsoleSite).toBe("sc-domain:p1landmanagement.com");
});
