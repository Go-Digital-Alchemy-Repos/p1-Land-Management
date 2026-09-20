import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool, transaction } from "./database";
import { HttpError } from "./policy";

import {
  pipelineConfigSchema,
  defaultPipelineConfig,
} from "@workspace/api-zod/pipeline-settings";
export {
  pipelineConfigSchema,
  defaultPipelineConfig,
} from "@workspace/api-zod/pipeline-settings";
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
