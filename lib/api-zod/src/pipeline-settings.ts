import { z } from "zod";
export const pipelineStages = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const;
export const pipelineColors = [
  "blue",
  "cyan",
  "emerald",
  "amber",
  "green",
  "slate",
] as const;
export const pipelineConfigSchema = z
  .object({
    version: z.literal(1),
    stages: z
      .array(
        z
          .object({
            key: z.enum(pipelineStages),
            label: z
              .string()
              .trim()
              .min(1)
              .max(40)
              .refine(
                (value) => !/[\u0000-\u001f\u007f]/.test(value),
                "Control characters are not allowed",
              ),
            color: z.enum(pipelineColors),
          })
          .strict(),
      )
      .length(6),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (new Set(value.stages.map((s) => s.key)).size !== 6)
      ctx.addIssue({
        code: "custom",
        message: "Include each stable stage exactly once",
      });
    if (new Set(value.stages.map((s) => s.label.toLowerCase())).size !== 6)
      ctx.addIssue({ code: "custom", message: "Stage labels must be unique" });
    if (
      encodeURIComponent(JSON.stringify(value)).replace(/%[A-F0-9]{2}/g, "x")
        .length > 4096
    )
      ctx.addIssue({
        code: "custom",
        message: "Configuration exceeds 4096 bytes",
      });
  });
export const defaultPipelineConfig = pipelineConfigSchema.parse({
  version: 1,
  stages: pipelineStages.map((key, i) => ({
    key,
    label: key[0].toUpperCase() + key.slice(1),
    color: pipelineColors[i],
  })),
});
