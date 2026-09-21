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
  boundaryMismatch: false,
  save: vi.fn(),
  repair: vi.fn(),
  activity: vi.fn(),
}));

vi.mock("../storage", () => ({
  storage: {
    settings: {
      getCategorySnapshot: async () => {
        if (state.boundaryMismatch)
          throw Object.assign(new Error("Boundary mismatch"), {
            code: "settings_boundary_mismatch",
          });
        return {
          values: state.value === undefined ? {} : { legacy_staff_crm_writes_fenced: state.value },
          version: state.version,
        };
      },
      getSettingBoundarySnapshot: async () => ({ version: state.version }),
      upsertSettings: async (...args: unknown[]) => {
        state.save(...args);
        state.value = (args[0] as Array<{ value: string }>)[0].value;
        state.version = "b".repeat(64);
      },
      repairPublicSettingBoundary: async (...args: unknown[]) => {
        state.repair(...args);
        state.value = (args[0] as { value: string }).value;
        state.boundaryMismatch = false;
        state.version = "b".repeat(64);
      },
    },
    activity: { log: (...args: unknown[]) => state.activity(...args) },
  },
}));

import {
  getLegacyStaffCrmWriteFence,
  recoverLegacyStaffCrmWriteFence,
  requireLegacyStaffCrmWritesAllowed,
  saveLegacyStaffCrmWriteFence,
} from "./legacy-staff-crm-write-fence.service";

describe("legacy Core staff CRM write fence", () => {
  beforeEach(() => {
    state.value = undefined;
    state.version = "a".repeat(64);
    state.boundaryMismatch = false;
    vi.clearAllMocks();
  });

  it("defaults off, then commits an audited, versioned fence transition", async () => {
    expect(await getLegacyStaffCrmWriteFence()).toEqual({
      staffWritesFenced: false,
      configurationValid: true,
      issue: null,
      version: "a".repeat(64),
    });

    const readiness = {
      staffWritesQuiesced: true as const,
      inFlightStaffWritesDrained: true as const,
      postFenceReconciliationPlanned: true as const,
    };
    await expect(
      saveLegacyStaffCrmWriteFence(true, "a".repeat(64), "owner-id", readiness),
    ).resolves.toEqual({
      staffWritesFenced: true,
      configurationValid: true,
      issue: null,
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
        details: JSON.stringify({ scope: "legacy_core_staff_crm", activationReadiness: readiness }),
      },
    );
  });

  it("requires an explicit quiesce/drain/reconciliation gate before activation", async () => {
    await expect(
      saveLegacyStaffCrmWriteFence(true, "a".repeat(64), "owner-id"),
    ).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(state.save).not.toHaveBeenCalled();
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

  it("fails closed for malformed stored state while retaining CAS repair information", async () => {
    state.value = "enabled";
    await expect(getLegacyStaffCrmWriteFence()).resolves.toEqual({
      staffWritesFenced: true,
      configurationValid: false,
      issue: "invalid_value",
      version: "a".repeat(64),
    });
  });

  it("returns a fail-closed boundary snapshot and repairs it through the dedicated audited path", async () => {
    state.boundaryMismatch = true;
    await expect(getLegacyStaffCrmWriteFence()).resolves.toEqual({
      staffWritesFenced: true,
      configurationValid: false,
      issue: "boundary_mismatch",
      version: "a".repeat(64),
    });
    await expect(
      recoverLegacyStaffCrmWriteFence(false, "a".repeat(64), "owner-id"),
    ).resolves.toEqual({
      staffWritesFenced: false,
      configurationValid: true,
      issue: null,
      version: "b".repeat(64),
    });
    expect(state.repair).toHaveBeenCalledWith(
      expect.objectContaining({ key: LEGACY_STAFF_CRM_WRITE_FENCE_SETTING_KEY, value: "false" }),
      "a".repeat(64),
      expect.objectContaining({ action: "legacy_staff_crm_write_fence_recovered" }),
    );
  });
});
