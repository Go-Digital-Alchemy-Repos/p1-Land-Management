import express from "express";
import type { AddressInfo } from "node:net";
import { expect, it } from "vitest";
import { builderPreviewPolicy, builderPreviewHtml } from "../middleware/builder-preview";
import { securityHeaders } from "../middleware/security";

const env = {
  NODE_ENV: "test",
  CORE_BUILDER_PREVIEW_ENABLED: "true",
  CORE_FEDERATION_ENABLED: "true",
  DASHBOARD_FEDERATION_ISSUER: "https://dashboard.example.test",
  APP_URL: "https://core.example.test",
  CORE_FEDERATION_CLIENT_ID: "preview-test",
  CORE_FEDERATION_CLIENT_SECRET_CURRENT: "s".repeat(43),
};
async function responses(configuration: NodeJS.ProcessEnv) {
  const app = express();
  app.use(securityHeaders(), builderPreviewPolicy(configuration));
  app.get("/{*path}", (_req, res) =>
    res.send(
      builderPreviewHtml(
        "<head><!--APP_DYNAMIC_HEAD--></head>",
        res.locals.builderPreviewOrigin || "",
      ),
    ),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    return await Promise.all(
      ["/cms-preview/builder?origin=https://evil.test", "/admin"].map(async (path) => {
        const response = await fetch(origin + path, {
          headers: { origin: "https://evil.test", "x-forwarded-host": "evil.test" },
        });
        return { status: response.status, headers: response.headers, body: await response.text() };
      }),
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
it("opens only the dedicated preview document to the configured issuer", async () => {
  const [preview, admin] = await responses(env);
  expect(preview.status).toBe(200);
  const csp = preview.headers.get("content-security-policy")!;
  expect(csp).toContain("frame-ancestors https://dashboard.example.test");
  expect(csp).toContain("form-action 'none'");
  expect(csp).toContain("frame-src 'none'");
  expect(csp).toContain("sandbox allow-scripts allow-same-origin");
  expect(csp).not.toContain("evil.test");
  expect(preview.headers.get("x-frame-options")).toBeNull();
  expect(preview.headers.get("cache-control")).toContain("no-store");
  expect(preview.body).toContain('content="https://dashboard.example.test"');
  expect(admin.headers.get("x-frame-options")).toBe("SAMEORIGIN");
  expect(admin.headers.get("content-security-policy")).toContain("frame-ancestors 'self'");
});
it("fails closed unless explicitly enabled with valid federation configuration", async () => {
  expect((await responses({}))[0].status).toBe(404);
  expect(() => builderPreviewPolicy({ CORE_BUILDER_PREVIEW_ENABLED: "true" })).toThrow();
  expect(() =>
    builderPreviewPolicy({ ...env, DASHBOARD_FEDERATION_ISSUER: "https://*.evil.test/path" }),
  ).toThrow();
});
