import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Actor } from "./access";
import { transaction } from "./database";
import { requireOperationalChild } from "./operational-property";
import { HttpError, requireRole } from "./policy";
export const readinessInput = z
  .object({
    version: z.number().int().positive(),
    prerequisites: z
      .array(
        z
          .object({
            label: z.string().trim().min(1).max(10000),
            done: z.boolean(),
          })
          .strict(),
      )
      .max(50),
    reason: z.string().trim().min(1).max(1000),
  })
  .strict();
export async function updateWorkReadiness(
  a: Actor,
  id: string,
  input: unknown,
) {
  requireRole(a.role, ["owner", "manager", "dispatch"]);
  const b = readinessInput.parse(input);
  return transaction(async (c) => {
    await requireOperationalChild(c, "work_order", id);
    const work = (
      await c.query("SELECT * FROM work_order WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (!work) throw new HttpError(404, "Work order not found");
    if (
      work.version !== b.version ||
      !["draft", "scheduled", "delayed"].includes(work.status)
    )
      throw new HttpError(
        409,
        "Work order changed or has started; refresh before editing readiness",
      );
    if (
      work.prerequisites.length === b.prerequisites.length &&
      work.prerequisites.every(
        (item: { label: string; done: boolean }, index: number) =>
          item.label === b.prerequisites[index].label &&
          item.done === b.prerequisites[index].done,
      )
    )
      throw new HttpError(400, "No readiness changes to save");
    const result = await c.query(
      "UPDATE work_order SET prerequisites=$2,override_reason=NULL,version=version+1 WHERE id=$1 RETURNING id,version,prerequisites,override_reason",
      [id, JSON.stringify(b.prerequisites)],
    );
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'work.readiness_updated',$3,$4)",
      [
        randomUUID(),
        a.id,
        id,
        {
          reason: b.reason,
          before: work.prerequisites,
          after: b.prerequisites,
          clearedOverride: work.override_reason,
        },
      ],
    );
    return result.rows[0];
  });
}
