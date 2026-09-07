import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  crmPipelineSettingsResponseSchema,
  DEFAULT_CRM_PIPELINE_CONFIG,
  type CrmPipelineConfig,
} from "@shared/crm-pipeline-settings";
import type { CrmLeadStage } from "@shared/schema/crm";
export const CRM_PIPELINE_QUERY_KEY = ["/api/admin/crm/settings/pipeline"] as const;
export const CRM_PIPELINE_COLOR_CLASSES = {
  blue: "border-blue-200 bg-blue-50 text-blue-800",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-800",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  green: "border-green-200 bg-green-50 text-green-800",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};
export function pipelinePresentation(config: CrmPipelineConfig) {
  return {
    stages: config.stages.map((stage) => stage.key),
    labels: Object.fromEntries(config.stages.map((stage) => [stage.key, stage.label])) as Record<
      CrmLeadStage,
      string
    >,
    colors: Object.fromEntries(
      config.stages.map((stage) => [stage.key, CRM_PIPELINE_COLOR_CLASSES[stage.color]]),
    ) as Record<CrmLeadStage, string>,
  };
}
export function useCrmPipelineSettings() {
  const query = useQuery({
    queryKey: CRM_PIPELINE_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch(CRM_PIPELINE_QUERY_KEY[0], { credentials: "include" });
      if (!response.ok) throw new Error("Unable to load pipeline settings");
      return crmPipelineSettingsResponseSchema.parse(await response.json());
    },
  });
  const config = query.isError
    ? DEFAULT_CRM_PIPELINE_CONFIG
    : (query.data?.config ?? DEFAULT_CRM_PIPELINE_CONFIG);
  const presentation = useMemo(() => pipelinePresentation(config), [config]);
  return { ...query, config, presentation };
}
