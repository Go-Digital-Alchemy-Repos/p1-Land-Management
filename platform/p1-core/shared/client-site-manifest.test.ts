import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateClientSiteManifest } from "./client-site-manifest";

const fixturePath = fileURLToPath(
  new URL("../docs/pilots/better-farms/client-site-manifest.example.json", import.meta.url),
);

async function fixture(): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(fixturePath, "utf8")) as Record<string, unknown>;
}

describe("client site manifest", () => {
  it("validates the Better Farms adapter-facing fixture", async () => {
    const result = validateClientSiteManifest(await fixture());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.client.stackId).toBe("better-farms-foundation");
      expect(result.data.routes.find((route) => route.id === "fund-a-farm")).toMatchObject({
        path: "/fund-a-farm",
        editableRegions: ["fund-a-farm-hero"],
      });
      expect(result.data.forms.find((form) => form.id === "newsletter-signup")).toMatchObject({
        endpoint: "/api/forms/newsletter-signup/submit",
        method: "POST",
      });
    }
  });

  it("rejects coherent wildcard public and dashboard origins as non-exact hosts", async () => {
    const input = await fixture();
    input.origins = {
      ...(input.origins as Record<string, unknown>),
      publicSite: "https://*.example",
      admin: "https://dashboard.*.example",
    };
    const result = validateClientSiteManifest(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "origins.publicSite",
            message: "must use an exact hostname without wildcards",
          }),
          expect.objectContaining({
            path: "origins.admin",
            message: "must use an exact hostname without wildcards",
          }),
        ]),
      );
    }
  });

  it("keeps image origin policy additive and only on image fields", async () => {
    const input = await fixture();
    const manifest = input as unknown as {
      puck: {
        editableComponents: { fields: { type: string; allowedImageOrigins?: string[] }[] }[];
      };
    };
    const fields = manifest.puck.editableComponents[0].fields;
    const image = fields.find((field) => field.type === "image")!;
    delete image.allowedImageOrigins;
    expect(validateClientSiteManifest(input).success).toBe(true);
    image.allowedImageOrigins = ["https://dashboard.better-farms.example"];
    expect(validateClientSiteManifest(input).success).toBe(true);
    fields[0].allowedImageOrigins = [];
    expect(validateClientSiteManifest(input).success).toBe(false);
  });

  it("rejects noncanonical, wildcard, duplicate and oversized image origin lists", async () => {
    for (const origins of [
      ["https://*.example"],
      ["https://HOST.example"],
      ["https://host.example/"],
      ["https://host.example:443"],
      ["http://host.example"],
      ["https://user:pass@host.example"],
      ["https://host.example", "https://host.example"],
      Array.from({ length: 9 }, (_, i) => `https://host${i}.example`),
    ]) {
      const input = await fixture();
      const manifest = input as unknown as {
        puck: {
          editableComponents: { fields: { type: string; allowedImageOrigins?: string[] }[] }[];
        };
      };
      manifest.puck.editableComponents[0].fields.find(
        (field) => field.type === "image",
      )!.allowedImageOrigins = origins;
      expect(validateClientSiteManifest(input).success).toBe(false);
    }
  });

  it("fails closed on an unknown schema version", async () => {
    const input = await fixture();
    input.schemaVersion = "2.0";

    const result = validateClientSiteManifest(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: "schemaVersion" })]),
      );
    }
  });

  it("rejects inline secret fields and never returns their values", async () => {
    const input = await fixture();
    const sensitiveValue = "sk_live_1234567890ABCDEF";
    input.apiKey = sensitiveValue;

    const result = validateClientSiteManifest(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "apiKey", code: "embedded_secret_field" }),
          expect.objectContaining({ path: "apiKey", code: "embedded_secret_value" }),
        ]),
      );
      expect(JSON.stringify(result.errors)).not.toContain(sensitiveValue);
    }
  });

  it("rejects duplicate routes and unknown secret references", async () => {
    const input = await fixture();
    const routes = input.routes as Array<Record<string, unknown>>;
    routes[1].path = routes[0].path;
    const forms = input.forms as Array<Record<string, unknown>>;
    forms[0].secretRefs = ["missing-provider-secret"];

    const result = validateClientSiteManifest(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: "duplicate route path: /" }),
          expect.objectContaining({
            path: "forms.0.secretRefs.0",
            message: "must reference a declared secret",
          }),
        ]),
      );
    }
  });

  it("requires distinct credential-free HTTPS origins", async () => {
    const input = await fixture();
    input.origins = {
      publicSite: "http://user:password@better-farms.example/path",
      admin: "http://user:password@better-farms.example/path",
      publicApiPath: "/api",
      adminApiPath: "/api",
      routingMode: "same-origin-proxy",
    };

    const result = validateClientSiteManifest(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.map((error) => error.path)).toEqual(
        expect.arrayContaining(["origins.publicSite", "origins.admin"]),
      );
    }
  });

  it("rejects defaults that do not satisfy the declared editable fields", async () => {
    const input = await fixture();
    const puck = input.puck as {
      editableComponents: Array<{ defaultContent: Record<string, unknown> }>;
    };
    puck.editableComponents[0].defaultContent.heading = "";
    const result = validateClientSiteManifest(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "puck.editableComponents.0.defaultContent",
            code: "invalid_default_content",
          }),
        ]),
      );
    }
  });
});
