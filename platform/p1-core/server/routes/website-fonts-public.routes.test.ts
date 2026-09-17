import { afterEach, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
const state = vi.hoisted(() => ({ snapshot: vi.fn() }));
vi.mock("../storage", () => ({ storage: { settings: { getCategorySnapshot: state.snapshot } } }));
import router from "./website-fonts-public.routes";
let server: Server, base: string;
beforeEach(async () => {
  vi.clearAllMocks();
  const app = express();
  app.use(router);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterEach(async () => new Promise<void>((r) => server.close(() => r())));
it("publishes only known font families and uses null for defaults or unknown legacy values", async () => {
  state.snapshot.mockResolvedValue({
    values: { frontend_body_font: "inter", frontend_heading_font: "lora", secret: "private" },
    version: "private",
  });
  const response = await fetch(base + "/website-fonts");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({
    schemaVersion: 1,
    stackId: "p1-land-management",
    body: { name: "Inter", fallback: "sans-serif" },
    heading: { name: "Lora", fallback: "serif" },
  });
  expect(state.snapshot).toHaveBeenCalledWith("branding", true);
  state.snapshot.mockResolvedValue({
    values: { frontend_body_font: "<script>", frontend_heading_font: "" },
  });
  expect(await (await fetch(base + "/website-fonts")).json()).toEqual({
    schemaVersion: 1,
    stackId: "p1-land-management",
    body: null,
    heading: null,
  });
  expect((await fetch(base + "/website-fonts?key=secret")).status).toBe(400);
  state.snapshot.mockRejectedValue(Error("private"));
  expect(await (await fetch(base + "/website-fonts")).json()).toEqual({
    error: "Website fonts unavailable",
  });
});
