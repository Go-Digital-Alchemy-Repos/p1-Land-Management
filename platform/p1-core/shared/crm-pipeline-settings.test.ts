import { describe, expect, it } from "vitest";
import { CRM_LEAD_STAGES, CRM_LEAD_STAGE_LABELS } from "./schema/crm";
import { DEFAULT_CRM_PIPELINE_CONFIG, crmPipelineConfigSchema } from "./crm-pipeline-settings";
describe("CRM pipeline configuration", () => {
  it("preserves lifecycle keys and existing defaults", () => {
    expect(crmPipelineConfigSchema.parse(DEFAULT_CRM_PIPELINE_CONFIG)).toEqual(
      DEFAULT_CRM_PIPELINE_CONFIG,
    );
    expect(DEFAULT_CRM_PIPELINE_CONFIG.stages.map((stage) => stage.key)).toEqual(CRM_LEAD_STAGES);
    for (const stage of DEFAULT_CRM_PIPELINE_CONFIG.stages)
      expect(stage.label).toBe(CRM_LEAD_STAGE_LABELS[stage.key]);
  });
  it("trims labels without changing lifecycle keys", () => {
    const value = structuredClone(DEFAULT_CRM_PIPELINE_CONFIG);
    value.stages[0].label = " Inquiry ";
    expect(crmPipelineConfigSchema.parse(value).stages[0]).toMatchObject({
      key: "new",
      label: "Inquiry",
    });
  });
  it.each([
    (v: { version: number; stages: Array<Record<string, unknown>>; isSecret?: boolean }) =>
      v.stages.pop(),
    (v: { version: number; stages: Array<Record<string, unknown>>; isSecret?: boolean }) =>
      v.stages.push(v.stages[0]),
    (v: { version: number; stages: Array<Record<string, unknown>>; isSecret?: boolean }) =>
      (v.stages[1].key = "new"),
    (v: { version: number; stages: Array<Record<string, unknown>>; isSecret?: boolean }) =>
      (v.stages[0].key = "customer"),
    (v: { version: number; stages: Array<Record<string, unknown>>; isSecret?: boolean }) =>
      (v.stages[0].label = "lost"),
    (v: { version: number; stages: Array<Record<string, unknown>>; isSecret?: boolean }) =>
      (v.stages[0].label = " "),
    (v: { version: number; stages: Array<Record<string, unknown>>; isSecret?: boolean }) =>
      (v.stages[0].label = "x".repeat(41)),
    (v: { version: number; stages: Array<Record<string, unknown>>; isSecret?: boolean }) =>
      (v.stages[0].label = "Bad\nlabel"),
    (v: { version: number; stages: Array<Record<string, unknown>>; isSecret?: boolean }) =>
      (v.stages[0].color = "red; background:url(x)"),
    (v: { version: number; stages: Array<Record<string, unknown>>; isSecret?: boolean }) =>
      (v.stages[0].html = "<script>"),
    (v: { version: number; stages: Array<Record<string, unknown>>; isSecret?: boolean }) =>
      (v.version = 2),
    (v: { version: number; stages: Array<Record<string, unknown>>; isSecret?: boolean }) =>
      (v.isSecret = true),
  ])("rejects invalid or ambiguous configuration %#", (change) => {
    const value = structuredClone(DEFAULT_CRM_PIPELINE_CONFIG);
    change(value);
    expect(crmPipelineConfigSchema.safeParse(value).success).toBe(false);
  });
});
