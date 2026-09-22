import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { adminLeafRedirect, adminLeafRedirectsEnabled } from "./admin-leaf-redirect";

const approvedLeaves: Record<string, string> = {
  "/admin/design/branding": "/marketing/design/branding",
  "/admin/design/colors": "/marketing/design/colors",
  "/admin/design/social-media": "/marketing/design/social-media",
  "/admin/design/typography": "/marketing/design/typography",
  "/admin/settings/head-tags": "/marketing/system/head-tags",
  "/admin/cms/seo": "/marketing/content/seo",
  "/admin/cms/menus": "/marketing/content/menus",
  "/admin/cms/sidebars": "/marketing/content/sidebars",
};

async function startServer(enabled: boolean) {
  const app = express();
  app.use(adminLeafRedirect(enabled));
  app.use((_req, res) => res.status(200).send("retained admin behavior"));
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const port = (server.address() as AddressInfo).port;
  return { server, origin: `http://127.0.0.1:${port}` };
}

describe("review-only admin leaf redirects", () => {
  let enabledServer: Awaited<ReturnType<typeof startServer>>;
  let disabledServer: Awaited<ReturnType<typeof startServer>>;

  beforeAll(async () => {
    enabledServer = await startServer(true);
    disabledServer = await startServer(false);
  });

  afterAll(async () => {
    await Promise.all(
      [enabledServer, disabledServer].map(
        ({ server }) => new Promise<void>((resolve) => server.close(() => resolve())),
      ),
    );
  });

  it("requires the exact opt-in value and is otherwise disabled", () => {
    expect(adminLeafRedirectsEnabled({})).toBe(false);
    expect(adminLeafRedirectsEnabled({ P1_ADMIN_LEAF_REDIRECTS_ENABLED: "1" })).toBe(false);
    expect(adminLeafRedirectsEnabled({ P1_ADMIN_LEAF_REDIRECTS_ENABLED: "TRUE" })).toBe(false);
    expect(adminLeafRedirectsEnabled({ P1_ADMIN_LEAF_REDIRECTS_ENABLED: "true" })).toBe(true);
  });

  it("preserves retained behavior when the flag is off", async () => {
    const response = await fetch(`${disabledServer.origin}/admin/design/branding`, {
      redirect: "manual",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(await response.text()).toBe("retained admin behavior");
  });

  it.each(Object.entries(approvedLeaves))("maps only %s to %s", async (source, destination) => {
    const response = await fetch(`${enabledServer.origin}${source}`, { redirect: "manual" });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      `https://dashboard.p1landmanagement.com${destination}`,
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("drops untrusted query data rather than forwarding tokens or redirect targets", async () => {
    const response = await fetch(
      `${enabledServer.origin}/admin/design/branding?token=secret&next=https%3A%2F%2Fevil.example%2F&tab=other`,
      { redirect: "manual" },
    );
    expect(response.headers.get("location")).toBe(
      "https://dashboard.p1landmanagement.com/marketing/design/branding",
    );
  });

  it.each([
    "/admin",
    "/admin/login?next=/admin/design/branding",
    "/admin/forgot-password",
    "/admin/reset-password?token=secret",
    "/admin/setup?token=secret",
    "/admin/users",
    "/admin/crm",
    "/admin/crm/clients",
    "/admin/crm/settings",
    "/admin/system/backups",
    "/admin/cms",
    "/admin/cms/pages",
    "/admin/design",
    "/admin/design/branding/extra",
    "/admin/design%2Fbranding",
    "/admin/assets/index.js",
    "/api/admin/cms/pages",
  ])("never redirects excluded path %s", async (path) => {
    const response = await fetch(`${enabledServer.origin}${path}`, { redirect: "manual" });
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects document navigation only and never mutating methods", async () => {
    const resourceRequest = await fetch(`${enabledServer.origin}/admin/design/branding`, {
      headers: { "Sec-Fetch-Dest": "empty" },
      redirect: "manual",
    });
    expect(resourceRequest.status).toBe(200);

    const postRequest = await fetch(`${enabledServer.origin}/admin/design/branding`, {
      method: "POST",
      redirect: "manual",
    });
    expect(postRequest.status).toBe(200);

    const documentRequest = await fetch(`${enabledServer.origin}/admin/design/branding`, {
      headers: { "Sec-Fetch-Dest": "document" },
      redirect: "manual",
    });
    expect(documentRequest.status).toBe(302);
  });
});
