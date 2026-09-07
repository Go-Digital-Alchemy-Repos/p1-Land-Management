import { z } from "zod";
import { CRM_LEAD_STAGES, CRM_LEAD_STAGE_LABELS } from "./schema/crm";

export const CRM_PIPELINE_SETTING_KEY = "crm_pipeline_config";
export const CRM_PIPELINE_COLORS = ["blue", "cyan", "emerald", "amber", "green", "slate"] as const;
export const crmPipelineConfigSchema = z
  .object({
    version: z.literal(1),
    stages: z
      .array(
        z
          .object({
            key: z.enum(CRM_LEAD_STAGES),
            label: z
              .string()
              .trim()
              .min(1)
              .max(40)
              .refine(
                (value) =>
                  Array.from(value).every(
                    (character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
                  ),
                "Control characters are not allowed",
              ),
            color: z.enum(CRM_PIPELINE_COLORS),
          })
          .strict(),
      )
      .length(6),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (new Set(value.stages.map((stage) => stage.key)).size !== 6)
      ctx.addIssue({
        code: "custom",
        path: ["stages"],
        message: "Include each of the six stages exactly once",
      });
    if (new Set(value.stages.map((stage) => stage.label.toLowerCase())).size !== 6)
      ctx.addIssue({ code: "custom", path: ["stages"], message: "Stage labels must be unique" });
    if (new TextEncoder().encode(JSON.stringify(value)).length > 4096)
      ctx.addIssue({ code: "custom", message: "Configuration exceeds 4096 bytes" });
  });
export type CrmPipelineConfig = z.infer<typeof crmPipelineConfigSchema>;
export const DEFAULT_CRM_PIPELINE_CONFIG: CrmPipelineConfig = {
  version: 1,
  stages: CRM_LEAD_STAGES.map((key, index) => ({
    key,
    label: CRM_LEAD_STAGE_LABELS[key],
    color: CRM_PIPELINE_COLORS[index],
  })),
};
export const crmPipelineSettingsResponseSchema = z.object({
  config: crmPipelineConfigSchema,
  source: z.enum(["stored", "default"]),
  issue: z.enum(["invalid_stored_config", "unsupported_version"]).nullable(),
});
export type CrmPipelineSettingsResponse = z.infer<typeof crmPipelineSettingsResponseSchema>;
