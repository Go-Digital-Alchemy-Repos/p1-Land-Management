import { afterEach, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
const state = vi.hoisted(() => ({
  snapshot: vi.fn(),
  save: vi.fn(),
  media: vi.fn(),
  allowed: true,
}));
vi.mock("../storage", () => ({
  storage: { settings: { getCategorySnapshot: state.snapshot, upsertSettings: state.save } },
}));
vi.mock("../db", () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit: state.media }) }) }) },
}));
vi.mock("../middleware/auth", () => ({
  requireBusinessCapability: () => (_req: any, res: any, next: any) =>
    state.allowed ? next() : res.status(403).end(),
}));
vi.mock("../services/email.service", () => ({ resetEmailBrandingCache: vi.fn() }));
vi.mock("../services/cms-media-upload.service", () => ({ createCmsMediaAssetFromUpload: vi.fn() }));
import router from "./business-center-identity.routes";
import { errorHandler } from "../middleware/error-handler";
let server: Server, base: string;
const version = "a".repeat(64);
beforeEach(async () => {
  vi.clearAllMocks();
  state.allowed = true;
  state.snapshot.mockResolvedValue({ version, values: {} });
  state.media.mockResolvedValue([]);
  state.save.mockResolvedValue([]);
  const app = express();
  app.use(
    express.json(),
    (req, _res, next) => {
      req.user = { id: "owner" } as any;
      next();
    },
    router,
    errorHandler,
  );
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterEach(async () => new Promise<void>((r) => server.close(() => r())));
const put = (settings: Record<string, string>) =>
  fetch(base + "/", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ expectedVersion: version, settings }),
  });
it("rejects unpublishable incoming fields before writes", async () => {
  for (const settings of [
    { company_phone_numbers: "Call us" },
    { frontend_logo_url: "https://unrecognized.invalid/logo.png" },
    { company_google_business_url: "https://unrecognized.invalid/profile" },
    { company_name: "Two\nLines" },
  ]) {
    const res = await put(settings);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      message:
        "Company details could not be published. Use valid phone numbers, a Google Business URL and an uploaded public logo or favicon.",
    });
  }
  expect(state.save).not.toHaveBeenCalled();
});
it("validates merged fresh state and allows explicit repair of invalid historic values", async () => {
  state.snapshot.mockResolvedValue({
    version,
    values: { frontend_logo_url: "https://unknown.invalid/logo.png" },
  });
  expect((await put({ company_name: "New name" })).status).toBe(400);
  expect(state.save).not.toHaveBeenCalled();
  expect((await put({ frontend_logo_url: "", company_name: "New name" })).status).toBe(200);
  expect(state.save).toHaveBeenCalledTimes(1);
});
it("accepts known uploaded R2 raster and passes original expected version into atomic save", async () => {
  state.media.mockResolvedValue([
    {
      url: "https://cdn.invalid/logo.webp",
      r2Key: "cms/branding/logo.webp",
      mimeType: "image/webp",
    },
  ]);
  expect(
    (
      await put({
        frontend_logo_url: "/r2/cms/branding/logo.webp",
        company_phone_numbers: "(704) 221-8928",
      })
    ).status,
  ).toBe(200);
  expect(state.media).toHaveBeenCalledWith(2);
  expect(state.save).toHaveBeenCalledWith(
    expect.any(Array),
    { category: "branding", version, publicOnly: true },
    expect.objectContaining({ userId: "owner" }),
  );
});
it("preserves inherited seed values and keeps permission enforcement before validation", async () => {
  state.snapshot.mockResolvedValue({
    version,
    values: {
      company_name: "P1 Land & Property Management",
      favicon_url: "https://www.p1landmanagement.com/p1-symbol.svg",
      frontend_logo_url: "https://www.p1landmanagement.com/admin/p1-land-management-logo.png",
    },
  });
  expect((await put({ company_phone_numbers: "7042218928" })).status).toBe(200);
  expect(state.media).not.toHaveBeenCalled();
  state.allowed = false;
  expect((await put({ company_name: "Other" })).status).toBe(403);
  expect(state.save).toHaveBeenCalledTimes(1);
});
