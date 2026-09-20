import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool, transaction } from "./database";
import { HttpError } from "./policy";

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
    if (Buffer.byteLength(JSON.stringify(value), "utf8") > 4096)
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
const updateSchema = z
  .object({
    expectedRevision: z.number().int().nonnegative(),
    config: pipelineConfigSchema,
  })
  .strict();

export async function getPipelineSettings() {
  const row = (
    await pool.query(
      "SELECT revision,config FROM sales_pipeline_settings WHERE singleton=true",
    )
  ).rows[0];
  if (!row) return { revision: 0, config: defaultPipelineConfig };
  // Corrupt or unsupported stored data must not become an editable default.
  return {
    revision: row.revision as number,
    config: pipelineConfigSchema.parse(row.config),
  };
}
export async function savePipelineSettings(actorId: string, input: unknown) {
  const body = updateSchema.parse(input);
  return transaction(async (c) => {
    // Serializes first-insert and subsequent writes; no lead row or stage is changed.
    await c.query("SELECT pg_advisory_xact_lock(918278)");
    const row = (
      await c.query(
        "SELECT revision,config FROM sales_pipeline_settings WHERE singleton=true FOR UPDATE",
      )
    ).rows[0];
    if ((row?.revision ?? 0) !== body.expectedRevision)
      throw new HttpError(
        409,
        "Pipeline settings changed; reload before saving",
      );
    if (row) pipelineConfigSchema.parse(row.config);
    const revision = (row?.revision ?? 0) + 1;
    await c.query(
      `INSERT INTO sales_pipeline_settings(singleton,revision,config,updated_by)
      VALUES(true,$1,$2,$3) ON CONFLICT(singleton) DO UPDATE SET revision=excluded.revision,config=excluded.config,updated_by=excluded.updated_by,updated_at=now()`,
      [revision, body.config, actorId],
    );
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,details) VALUES($1,$2,'sales.pipeline_settings_updated',$3)",
      [
        randomUUID(),
        actorId,
        {
          revision,
          previousConfig: row?.config ?? defaultPipelineConfig,
          config: body.config,
        },
      ],
    );
    return { revision, config: body.config };
  });
}
