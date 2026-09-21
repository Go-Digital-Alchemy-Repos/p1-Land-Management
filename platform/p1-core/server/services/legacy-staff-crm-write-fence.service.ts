import {
  LEGACY_STAFF_CRM_WRITE_FENCE_CATEGORY,
  LEGACY_STAFF_CRM_WRITE_FENCE_KEY_RULES,
  LEGACY_STAFF_CRM_WRITE_FENCE_SETTING_KEY,
} from "@shared/crm-write-fence";
import type { RequestHandler } from "express";
import { AppError } from "../middleware/error-handler";
import { storage } from "../storage";

export interface LegacyStaffCrmWriteFence {
  staffWritesFenced: boolean;
  version: string;
}

function parseStoredFence(value: string | undefined): boolean {
  if (value === undefined) return false;
  if (value === "true") return true;
  if (value === "false") return false;
  // A malformed row must not silently reopen staff writes after a cutover.
  throw new AppError("Legacy CRM write-fence configuration is invalid", 503);
}

export async function getLegacyStaffCrmWriteFence(): Promise<LegacyStaffCrmWriteFence> {
  const snapshot = await storage.settings.getCategorySnapshot(
    LEGACY_STAFF_CRM_WRITE_FENCE_CATEGORY,
    true,
    LEGACY_STAFF_CRM_WRITE_FENCE_KEY_RULES,
  );
  return {
    staffWritesFenced: parseStoredFence(snapshot.values[LEGACY_STAFF_CRM_WRITE_FENCE_SETTING_KEY]),
    version: snapshot.version,
  };
}

export async function saveLegacyStaffCrmWriteFence(
  staffWritesFenced: boolean,
  expectedVersion: string,
  actorId: string,
): Promise<LegacyStaffCrmWriteFence> {
  await storage.settings.upsertSettings(
    [
      {
        key: LEGACY_STAFF_CRM_WRITE_FENCE_SETTING_KEY,
        value: String(staffWritesFenced),
        category: LEGACY_STAFF_CRM_WRITE_FENCE_CATEGORY,
        isSecret: false,
      },
    ],
    {
      category: LEGACY_STAFF_CRM_WRITE_FENCE_CATEGORY,
      version: expectedVersion,
      publicOnly: true,
      keyRules: LEGACY_STAFF_CRM_WRITE_FENCE_KEY_RULES,
    },
    {
      userId: actorId,
      action: staffWritesFenced
        ? "legacy_staff_crm_writes_fenced"
        : "legacy_staff_crm_writes_reenabled",
      details: JSON.stringify({ scope: "legacy_core_staff_crm" }),
    },
  );
  return getLegacyStaffCrmWriteFence();
}

/**
 * This is intentionally attached only to authenticated legacy staff mutation
 * endpoints. It never fences public intake, durable effects, or the control
 * endpoint needed to recover forward from a cutover issue.
 */
export function requireLegacyStaffCrmWritesAllowed(operation: string): RequestHandler {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      if (!(await getLegacyStaffCrmWriteFence()).staffWritesFenced) {
        next();
        return;
      }
      await storage.activity.log(
        req.user.id,
        "legacy_staff_crm_write_blocked",
        JSON.stringify({ operation }),
      );
      res.status(409).json({
        message: "Legacy CRM staff writes are fenced during Dashboard cutover",
        code: "legacy_staff_crm_writes_fenced",
      });
    } catch (error) {
      next(error);
    }
  };
}
