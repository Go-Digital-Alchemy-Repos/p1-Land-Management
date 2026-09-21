import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import {
  LEGACY_STAFF_CRM_WRITE_FENCE_CATEGORY,
  LEGACY_STAFF_CRM_WRITE_FENCE_KEY_RULES,
  LEGACY_STAFF_CRM_WRITE_FENCE_SETTING_KEY,
} from "@shared/crm-write-fence";

const state = vi.hoisted(() => ({
  value: undefined as string | undefined,
  version: "a".repeat(64),
  save: vi.fn(),
  activity: vi.fn(),
}));

vi.mock("../storage", () => ({
  storage: {
    settings: {
      getCategorySnapshot: async () => ({
        values: state.value === undefined ? {} : { legacy_staff_crm_writes_fenced: state.value },
        version: state.version,
      }),
      upsertSettings: async (...args: unknown[]) => {
        state.save(...args);
        state.value = (args[0] as Array<{ value: string }>)[0].value;
        state.version = "b".repeat(64);
      },
    },
    activity: { log: (...args: unknown[]) => state.activity(...args) },
  },
}));

import {
  getLegacyStaffCrmWriteFence,
  requireLegacyStaffCrmWritesAllowed,
  saveLegacyStaffCrmWriteFence,
} from "./legacy-staff-crm-write-fence.service";

describe("legacy Core staff CRM write fence", () => {
  beforeEach(() => {
    state.value = undefined;
    state.version = "a".repeat(64);
    vi.clearAllMocks();
  });

  it("defaults off, then commits an audited, versioned fence transition", async () => {
    expect(await getLegacyStaffCrmWriteFence()).toEqual({
      staffWritesFenced: false,
      version: "a".repeat(64),
    });

    await expect(saveLegacyStaffCrmWriteFence(true, "a".repeat(64), "owner-id")).resolves.toEqual({
      staffWritesFenced: true,
      version: "b".repeat(64),
    });
    expect(state.save).toHaveBeenCalledWith(
      [
        {
          key: LEGACY_STAFF_CRM_WRITE_FENCE_SETTING_KEY,
          value: "true",
          category: LEGACY_STAFF_CRM_WRITE_FENCE_CATEGORY,
          isSecret: false,
        },
      ],
      {
        category: LEGACY_STAFF_CRM_WRITE_FENCE_CATEGORY,
        version: "a".repeat(64),
        publicOnly: true,
        keyRules: LEGACY_STAFF_CRM_WRITE_FENCE_KEY_RULES,
      },
      {
        userId: "owner-id",
        action: "legacy_staff_crm_writes_fenced",
        details: JSON.stringify({ scope: "legacy_core_staff_crm" }),
      },
    );
  });

  it("blocks staff mutation without mutating CRM, then permits forward recovery", async () => {
    state.value = "true";
    let writes = 0;
    const app = express();
    app.use((req, _res, next) => {
      req.user = { id: "staff-id" } as never;
      next();
    });
    app.post("/staff-write", requireLegacyStaffCrmWritesAllowed("lead_update"), (_req, res) => {
      writes += 1;
      res.status(201).json({ ok: true });
    });
    const server: Server = await new Promise((resolve) => {
      const active = app.listen(0, "127.0.0.1", () => resolve(active));
    });
    const port = (server.address() as { port: number }).port;
    try {
      const blocked = await fetch(`http://127.0.0.1:${port}/staff-write`, { method: "POST" });
      expect(blocked.status).toBe(409);
      expect(await blocked.json()).toMatchObject({ code: "legacy_staff_crm_writes_fenced" });
      expect(writes).toBe(0);
      expect(state.activity).toHaveBeenCalledWith(
        "staff-id",
        "legacy_staff_crm_write_blocked",
        JSON.stringify({ operation: "lead_update" }),
      );

      state.value = "false";
      expect((await fetch(`http://127.0.0.1:${port}/staff-write`, { method: "POST" })).status).toBe(
        201,
      );
      expect(writes).toBe(1);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("fails closed for malformed stored state instead of reopening staff writes", async () => {
    state.value = "enabled";
    await expect(getLegacyStaffCrmWriteFence()).rejects.toMatchObject({ statusCode: 503 });
  });
});
