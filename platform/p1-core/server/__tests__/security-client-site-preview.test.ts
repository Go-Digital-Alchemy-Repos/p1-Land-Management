import { afterEach, describe, expect, it } from "vitest";
import express, { type RequestHandler } from "express";
import type { AddressInfo } from "node:net";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ClientSiteManifest } from "../../shared/client-site-manifest";
import { configuredSecurityHeaders, securityHeaders } from "../middleware/security";

const fixture = "docs/pilots/better-farms/client-site-manifest.example.json";
const temporaryDirectories: string[] = [];
async function manifestFile(transform: (value: ClientSiteManifest) => unknown): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "core-preview-csp-"));
  temporaryDirectories.push(directory);
  const file = path.join(directory, "manifest.json");
  await writeFile(file, JSON.stringify(transform(JSON.parse(await readFile(fixture, "utf8")))));
  return file;
}
async function policy(handler: RequestHandler, suppliedOrigin = "https://attacker.example") {
  const app = express();
  app.use(handler);
  app.get("/", (_req, res) => res.send("ok"));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    const response = await fetch(
      `http://127.0.0.1:${(server.address() as AddressInfo).port}/?origin=${encodeURIComponent(suppliedOrigin)}`,
      {
        headers: { origin: suppliedOrigin, "x-forwarded-host": "attacker.example" },
      },
    );
    expect(response.status).toBe(200);
    return Object.fromEntries(
      response.headers
        .get("content-security-policy")!
        .split(";")
        .map((directive) => {
          const [key, ...values] = directive.trim().split(/\s+/);
          return [key, values];
        }),
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});
describe("configured client-site preview CSP", () => {
  it("preserves standalone restrictions when no manifest is explicitly configured", async () => {
    const current = await policy(securityHeaders());
    expect(await policy(await configuredSecurityHeaders(undefined, "1.0.0"))).toEqual(current);
    expect(current["frame-src"]).toEqual([
      "'self'",
    ]);
  });
  it("adds only the validated public origin and preserves all other directives", async () => {
    const original = await policy(securityHeaders());
    const configured = await policy(await configuredSecurityHeaders(fixture, "1.0.0"));
    expect(configured["frame-src"]).toEqual([
      ...original["frame-src"],
      "https://better-farms.example",
    ]);
    expect({ ...configured, "frame-src": original["frame-src"] }).toEqual(original);
    expect(JSON.stringify(configured)).not.toContain("attacker.example");
    expect(configured["frame-src"]).not.toContain("https://dashboard.better-farms.example");
  });
  it.each(["", "/nonexistent/core-preview-manifest.json"])(
    "rejects an explicitly unreadable manifest: %s",
    async (file) => {
      await expect(configuredSecurityHeaders(file, "1.0.0")).rejects.toThrow(
        "could not be read or parsed",
      );
    },
  );
  it.each([
    "https://*.example",
    "https://site.example/path",
    "https://user:secret@site.example",
    "http://site.example",
    "https://site.example; frame-src *",
  ])("rejects an invalid configured public origin: %s", async (origin) => {
    const file = await manifestFile((manifest) => ({
      ...manifest,
      origins: { ...manifest.origins, publicSite: origin },
    }));
    await expect(configuredSecurityHeaders(file, "1.0.0")).rejects.toThrow("failed validation");
  });
  it("rejects coherent wildcard public and dashboard origins rather than allowing CSP patterns", async () => {
    const file = await manifestFile((manifest) => ({
      ...manifest,
      origins: {
        ...manifest.origins,
        publicSite: "https://*.example",
        admin: "https://dashboard.*.example",
      },
    }));
    await expect(configuredSecurityHeaders(file, "1.0.0")).rejects.toMatchObject({
      errors: expect.arrayContaining([
        expect.objectContaining({
          path: "origins.publicSite",
          message: "must use an exact hostname without wildcards",
        }),
        expect.objectContaining({
          path: "origins.admin",
          message: "must use an exact hostname without wildcards",
        }),
      ]),
    });
  });
  it("rejects a malformed contract even when the origin is valid", async () => {
    const file = await manifestFile((manifest) => ({ ...manifest, schemaVersion: "999.0" }));
    await expect(configuredSecurityHeaders(file, "1.0.0")).rejects.toThrow("failed validation");
  });
  it("rejects incompatible configured manifests", async () => {
    await expect(configuredSecurityHeaders(fixture, "0.9.0")).rejects.toThrow(
      "below the manifest minimum",
    );
  });
});
