import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "../db";
export type CmsTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export class CmsMutationError extends Error {
  constructor(
    public status: 400 | 404 | 409,
    public code: string,
    message: string,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}
export const pagePreconditionSchema = z.object({
  expectedVersion: z.number().int().positive(),
  editorInstanceId: z.string().uuid(),
  leaseId: z.string().uuid(),
});
export type PagePreconditions = z.infer<typeof pagePreconditionSchema>;
export function pagePreconditions(body: unknown): PagePreconditions {
  const result = pagePreconditionSchema.safeParse(body);
  if (!result.success)
    throw new CmsMutationError(
      400,
      "CMS_CONCURRENCY_REQUIRED",
      "Reload this editor before saving. Page version and editor lease are required.",
    );
  return result.data;
}
export function menuExpectedVersion(body: unknown): number {
  const result = z.object({ expectedVersion: z.number().int().positive() }).safeParse(body);
  if (!result.success)
    throw new CmsMutationError(
      400,
      "CMS_CONCURRENCY_REQUIRED",
      "Reload this menu before saving. The saved menu version is required.",
    );
  return result.data.expectedVersion;
}
export async function lockPageResource(tx: CmsTransaction, id: string) {
  await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${"cms-page:" + id}, 0))`);
}
export async function lockMenus(tx: CmsTransaction) {
  await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended('cms-menu-writes', 0))`);
}
export async function databaseNow(tx: CmsTransaction): Promise<Date> {
  const result = await tx.execute(sql`SELECT clock_timestamp() AS now`);
  return new Date(result.rows[0].now as string | Date);
}
