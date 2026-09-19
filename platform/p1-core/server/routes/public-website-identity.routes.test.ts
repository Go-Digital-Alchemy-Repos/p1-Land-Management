import { afterEach, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
const state = vi.hoisted(() => ({ snapshot: vi.fn(), media: vi.fn() }));
vi.mock("../storage", () => ({
  storage: {
    settings: { getCategorySnapshot: state.snapshot },
    cmsMedia: { getAllMedia: state.media },
  },
}));
vi.mock("../db", () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit: state.media }) }) }) },
}));
import router from "./public-website-identity.routes";
import {
  canonicalIdentityImagePath,
  publicWebsiteIdentitySchema,
} from "@shared/public-website-identity";
import { validWebsiteIdentityValue } from "@shared/website-identity";
let server: Server, base: string;
const snapshot = (values: Record<string, string>) =>
  state.snapshot.mockResolvedValue({ version: "a".repeat(64), values });
beforeEach(async () => {
  vi.clearAllMocks();
  snapshot({});
  state.media.mockResolvedValue([]);
  const app = express();
  app.use(router);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterEach(async () => new Promise<void>((r) => server.close(() => r())));
const get = () => fetch(base + "/website-identity");
it("projects exact public fields and provenance without raw settings", async () => {
  snapshot({
    company_name: "P1",
    company_phone_numbers: "(704) 221-8928\n+44 20 7946 0018",
    company_address: "Public\nregion",
    mailgun_api_key: "private",
    frontend_logo_url: "/p1-symbol.svg",
  });
  const res = await get();
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toBe("no-store");
  const body = await res.json();
  expect(publicWebsiteIdentitySchema.safeParse(body).success).toBe(true);
  expect(body).toMatchObject({
    schemaVersion: 1,
    stackId: "p1-land-management",
    companyName: "P1",
    companyAddress: "Public region",
    phoneDisplay: "(704) 221-8928",
    phoneHref: "tel:+17042218928",
    logoUrl: "/p1-symbol.svg",
  });
  expect(JSON.stringify(body)).not.toContain("private");
  expect(state.snapshot).toHaveBeenCalledWith("branding", true);
  expect(Object.keys(body).sort()).toEqual(
    [
      "schemaVersion",
      "stackId",
      "version",
      "companyName",
      "companyAddress",
      "phoneDisplay",
      "phoneHref",
      "logoUrl",
      "faviconUrl",
      "googleBusinessUrl",
    ].sort(),
  );
});
it("preserves bundled website defaults for empty and inherited administrator artwork", async () => {
  snapshot({
    company_name: "P1 Land & Property Management",
    frontend_logo_url: "https://www.p1landmanagement.com/admin/p1-land-management-logo.png",
    favicon_url: "/p1-symbol.svg",
  });
  const body = await (await get()).json();
  expect(body.logoUrl).toBeNull();
  expect(body.faviconUrl).toBeNull();
  expect(body.companyName).toBeNull();
  expect(state.media).not.toHaveBeenCalled();
});
it("maps only known public raster CMS objects to same-origin paths", async () => {
  snapshot({
    frontend_logo_url: "https://cdn.example.invalid/namespace/cms/branding/logo.webp",
    favicon_url: "/uploads/cms/branding/icon.png",
  });
  state.media
    .mockResolvedValueOnce([
      {
        url: "https://cdn.example.invalid/namespace/cms/branding/logo.webp",
        r2Key: "cms/branding/logo.webp",
        mimeType: "image/webp",
      },
    ])
    .mockResolvedValueOnce([
      { url: "/uploads/cms/branding/icon.png", r2Key: null, mimeType: "image/png" },
    ]);
  const res = await get();
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({
    logoUrl: "/r2/cms/branding/logo.webp",
    faviconUrl: "/uploads/cms/branding/icon.png",
  });
  expect(state.media).toHaveBeenCalledTimes(2);
  expect(state.media).toHaveBeenCalledWith(2);
});
it("rejects unknown, private, ambiguous and non-image media without leaking values", async () => {
  snapshot({ frontend_logo_url: "https://cdn.example.invalid/secret" });
  for (const assets of [
    [],
    [
      {
        url: "https://cdn.example.invalid/secret",
        r2Key: "career-resumes/private.png",
        mimeType: "image/png",
      },
    ],
    [
      {
        url: "https://cdn.example.invalid/secret",
        r2Key: "cms/branding/file.pdf",
        mimeType: "application/pdf",
      },
    ],
    [
      {
        url: "https://cdn.example.invalid/secret",
        r2Key: "cms/branding/a.png",
        mimeType: "image/png",
      },
      {
        url: "https://cdn.example.invalid/secret",
        r2Key: "cms/branding/b.png",
        mimeType: "image/png",
      },
    ],
  ]) {
    state.media.mockResolvedValue(assets);
    const res = await get();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Website identity unavailable" });
  }
});
it("fails closed for invalid fields and unavailable settings", async () => {
  for (const values of [
    { company_phone_numbers: "Call the office" },
    { company_phone_numbers: "7042218928\ninvalid" },
    { company_name: "x".repeat(256) },
    { company_name: "Invalid\nName" },
    { company_google_business_url: "https://unrelated.invalid/profile" },
    { company_google_business_url: "javascript:alert(1)" },
    { company_google_business_url: "https://user:pass@example.invalid" },
  ]) {
    snapshot(values);
    expect((await get()).status).toBe(503);
  }
  state.snapshot.mockRejectedValue(new Error("private database failure"));
  const res = await get();
  expect(await res.json()).toEqual({ error: "Website identity unavailable" });
});
it("rejects query selectors and unsafe paths while allowing narrow upload references", async () => {
  expect((await fetch(base + "/website-identity?category=private")).status).toBe(400);
  expect(state.snapshot).not.toHaveBeenCalled();
  for (const path of [
    "//evil.invalid/a.png",
    "/r2/career-resumes/a.png",
    "/uploads/cms/../private.png",
    "/uploads/cms/%2e%2e/private.png",
    "/r2/cms/branding/a.svg",
    "https://evil.invalid/favicon.ico",
    "/admin/p1-land-management-logo.png",
    "/assets/arbitrary.png",
  ]) {
    expect(canonicalIdentityImagePath(path)).toBeNull();
  }
  expect(validWebsiteIdentityValue("frontend_logo_url", "/r2/cms/branding/logo.webp")).toBe(true);
  expect(validWebsiteIdentityValue("frontend_logo_url", "/r2/career-resumes/logo.webp")).toBe(
    false,
  );
  expect(validWebsiteIdentityValue("frontend_logo_url", "/r2/cms/../private.webp")).toBe(false);
});
it("versions both settings and resolved media changes", async () => {
  snapshot({ company_name: "First" });
  const first = await (await get()).json();
  snapshot({ company_name: "Second" });
  const second = await (await get()).json();
  expect(first.version).not.toBe(second.version);
});

it("validates coherent phone pairs in the reusable contract", async () => {
  snapshot({
    company_phone_numbers: "704-221-8928",
    company_google_business_url: "https://maps.app.goo.gl/example",
  });
  const payload = await (await get()).json();
  expect(publicWebsiteIdentitySchema.safeParse(payload).success).toBe(true);
  expect(
    publicWebsiteIdentitySchema.safeParse({ ...payload, phoneHref: "tel:+19999999999" }).success,
  ).toBe(false);
  expect(publicWebsiteIdentitySchema.safeParse({ ...payload, phoneDisplay: null }).success).toBe(
    false,
  );
});
