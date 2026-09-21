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
  configurationValid: boolean;
  issue: "invalid_value" | "boundary_mismatch" | null;
  version: string;
}

export interface LegacyStaffCrmFenceActivationReadiness {
  staffWritesQuiesced: true;
  inFlightStaffWritesDrained: true;
  postFenceReconciliationPlanned: true;
}

function parseStoredFence(
  value: string | undefined,
): Pick<LegacyStaffCrmWriteFence, "staffWritesFenced" | "configurationValid" | "issue"> {
  if (value === undefined)
    return { staffWritesFenced: false, configurationValid: true, issue: null };
  if (value === "true") return { staffWritesFenced: true, configurationValid: true, issue: null };
  if (value === "false") return { staffWritesFenced: false, configurationValid: true, issue: null };
  // A malformed row must not silently reopen staff writes after a cutover.
  return { staffWritesFenced: true, configurationValid: false, issue: "invalid_value" };
}

export async function getLegacyStaffCrmWriteFence(): Promise<LegacyStaffCrmWriteFence> {
  try {
    const snapshot = await storage.settings.getCategorySnapshot(
      LEGACY_STAFF_CRM_WRITE_FENCE_CATEGORY,
      true,
      LEGACY_STAFF_CRM_WRITE_FENCE_KEY_RULES,
    );
    return {
      ...parseStoredFence(snapshot.values[LEGACY_STAFF_CRM_WRITE_FENCE_SETTING_KEY]),
      version: snapshot.version,
    };
  } catch (error) {
    if (
      !(
        error &&
        typeof error === "object" &&
        (error as { code?: string }).code === "settings_boundary_mismatch"
      )
    )
      throw error;
    const recovery = await storage.settings.getSettingBoundarySnapshot(
      LEGACY_STAFF_CRM_WRITE_FENCE_SETTING_KEY,
    );
    return {
      staffWritesFenced: true,
      configurationValid: false,
      issue: "boundary_mismatch",
      version: recovery.version,
    };
  }
}

export async function saveLegacyStaffCrmWriteFence(
  staffWritesFenced: boolean,
  expectedVersion: string,
  actorId: string,
  activationReadiness?: LegacyStaffCrmFenceActivationReadiness,
): Promise<LegacyStaffCrmWriteFence> {
  if (staffWritesFenced && !activationReadiness)
    throw new AppError(
      "Cutover readiness confirmation is required before fencing staff writes",
      400,
    );
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
      details: JSON.stringify({
        scope: "legacy_core_staff_crm",
        activationReadiness: activationReadiness ?? null,
      }),
    },
  );
  return getLegacyStaffCrmWriteFence();
}

/**
 * A boundary mismatch cannot use the regular versioned writer. This narrowly
 * repairs this public key with a metadata-only CAS token and a dedicated audit.
 */
export async function recoverLegacyStaffCrmWriteFence(
  staffWritesFenced: boolean,
  expectedVersion: string,
  actorId: string,
  activationReadiness?: LegacyStaffCrmFenceActivationReadiness,
): Promise<LegacyStaffCrmWriteFence> {
  if (staffWritesFenced && !activationReadiness)
    throw new AppError(
      "Cutover readiness confirmation is required before fencing staff writes",
      400,
    );
  await storage.settings.repairPublicSettingBoundary(
    {
      key: LEGACY_STAFF_CRM_WRITE_FENCE_SETTING_KEY,
      value: String(staffWritesFenced),
      category: LEGACY_STAFF_CRM_WRITE_FENCE_CATEGORY,
    },
    expectedVersion,
    {
      userId: actorId,
      action: "legacy_staff_crm_write_fence_recovered",
      details: JSON.stringify({
        scope: "legacy_core_staff_crm",
        staffWritesFenced,
        activationReadiness: activationReadiness ?? null,
      }),
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
