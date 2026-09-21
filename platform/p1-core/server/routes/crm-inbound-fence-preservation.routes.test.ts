import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";

const state = vi.hoisted(() => ({ key: "test-key", create: vi.fn() }));

vi.mock("../storage", () => ({
  storage: { settings: { getDecryptedValue: async () => state.key } },
}));
vi.mock("../services/crm.service", () => ({ createOrUpdateCrmLead: state.create }));

import router from "./crm.routes";

describe("CRM inbound intake remains outside the staff-write fence", () => {
  let server: Server;
  let base: string;
  beforeAll(async () => {
    const app = express();
    app.use(express.json(), router);
    server = await new Promise((resolve) => {
      const active = app.listen(0, "127.0.0.1", () => resolve(active));
    });
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  afterAll(async () => new Promise<void>((resolve) => server.close(() => resolve())));
  beforeEach(() => {
    vi.clearAllMocks();
    state.create
      .mockResolvedValueOnce({ lead: { id: "inquiry-id" }, duplicate: false })
      .mockResolvedValueOnce({ lead: { id: "inquiry-id" }, duplicate: true });
  });

  it("preserves authenticated durable-submission idempotency", async () => {
    const submit = () =>
      fetch(base + "/leads", {
        method: "POST",
        headers: { "content-type": "application/json", "X-CRM-API-Key": state.key },
        body: JSON.stringify({ formSubmissionId: "durable-submission" }),
      });
    expect((await submit()).status).toBe(201);
    const replay = await submit();
    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual({ id: "inquiry-id", duplicate: true });
    expect(state.create).toHaveBeenCalledTimes(2);
  });
});
