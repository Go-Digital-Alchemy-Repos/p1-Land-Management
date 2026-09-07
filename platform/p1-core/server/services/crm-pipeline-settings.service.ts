import { storage } from "../storage";
import { AppError } from "../middleware/error-handler";
import { logger } from "../utils/logger";
import {
  CRM_PIPELINE_SETTING_KEY,
  DEFAULT_CRM_PIPELINE_CONFIG,
  crmPipelineConfigSchema,
  type CrmPipelineSettingsResponse,
} from "@shared/crm-pipeline-settings";

export async function getCrmPipelineSettings(): Promise<CrmPipelineSettingsResponse> {
  const raw = await storage.settings.getSetting(CRM_PIPELINE_SETTING_KEY);
  if (raw === null) return { config: DEFAULT_CRM_PIPELINE_CONFIG, source: "default", issue: null };
  let issue: CrmPipelineSettingsResponse["issue"] = "invalid_stored_config";
  try {
    const value = JSON.parse(raw);
    if (typeof value?.version === "number" && value.version !== 1) issue = "unsupported_version";
    else {
      const result = crmPipelineConfigSchema.safeParse(value);
      if (result.success) return { config: result.data, source: "stored", issue: null };
    }
  } catch {
    /* Report only the issue code, never stored contents. */
  }
  logger.app.warn("CRM pipeline settings fallback", {
    settingKey: CRM_PIPELINE_SETTING_KEY,
    issue,
  });
  return { config: DEFAULT_CRM_PIPELINE_CONFIG, source: "default", issue };
}

export async function saveCrmPipelineSettings(
  input: unknown,
  actorId: string,
): Promise<CrmPipelineSettingsResponse> {
  if (Buffer.byteLength(JSON.stringify(input) ?? "", "utf8") > 4096)
    throw new AppError("Configuration exceeds 4096 bytes", 400);
  const parsed = crmPipelineConfigSchema.safeParse(input);
  if (!parsed.success)
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid pipeline settings", 400);
  const config = parsed.data;
  if ((await getCrmPipelineSettings()).issue === "unsupported_version")
    throw new AppError("Stored pipeline settings use an unsupported version", 409);
  await storage.settings.upsertSetting(
    CRM_PIPELINE_SETTING_KEY,
    JSON.stringify(config),
    "crm",
    false,
  );
  logger.app.info("CRM pipeline settings saved", {
    actorId,
    settingKey: CRM_PIPELINE_SETTING_KEY,
    version: config.version,
  });
  return { config, source: "stored", issue: null };
}
