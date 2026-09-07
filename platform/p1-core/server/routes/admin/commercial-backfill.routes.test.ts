import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
const { backfill } = vi.hoisted(() => ({ backfill: vi.fn() }));
vi.mock("../../storage", () => ({ storage: {} }));
vi.mock("../../storage/index", () => ({ storage: { users: { getUser: vi.fn() } } }));
vi.mock("../../services/commercial-backfill.service", () => ({
  backfillCommercialInquiries: backfill,
}));
import router from "./forms.routes";

describe("commercial backfill mounted admin route", () => {
  afterEach(() => vi.resetAllMocks());
  it("denies anonymous/editors and forwards session actor only for admin", async () => {
    const app = express();
    app.use(express.json());
    // Shared admin mount authenticates sessions; this fixture tests the actual per-route role guard.
    app.use((req, _res, next) => {
      const role = req.get("x-test-role");
      if (role) req.user = { id: "session-actor", role } as Express.User;
      next();
    });
    app.use("/api/admin", router);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/admin/form-delivery-jobs/commercial-backfill`;
    try {
      for (const [role, status] of [
        ["", 401],
        ["editor", 403],
        ["user", 403],
      ] as const) {
        expect(
          (
            await fetch(base, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                ...(role ? { "x-test-role": role } : {}),
              },
              body: "{}",
            })
          ).status,
        ).toBe(status);
      }
      expect(backfill).not.toHaveBeenCalled();
      backfill.mockResolvedValue({ outcome: "preview", items: [] });
      const body = { mode: "dry_run", receipts: [{ submissionId: "synthetic" }] };
      expect(
        (
          await fetch(base, {
            method: "POST",
            headers: { "content-type": "application/json", "x-test-role": "admin" },
            body: JSON.stringify(body),
          })
        ).status,
      ).toBe(200);
      expect(backfill).toHaveBeenCalledWith(body, "session-actor");
      backfill.mockResolvedValue({ outcome: "rejected", items: [] });
      expect(
        (
          await fetch(base, {
            method: "POST",
            headers: { "content-type": "application/json", "x-test-role": "admin" },
            body: "{}",
          })
        ).status,
      ).toBe(409);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
