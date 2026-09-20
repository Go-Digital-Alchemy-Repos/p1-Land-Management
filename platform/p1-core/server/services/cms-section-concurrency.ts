import { sql, and, eq } from "drizzle-orm";
import { editorLocks } from "@shared/schema";
import {
  CmsMutationError,
  databaseNow,
  pagePreconditionSchema,
  type CmsTransaction,
  type PagePreconditions,
} from "./cms-concurrency";

// Every section writer/lease takes the shared library lock first. A library reset
// takes it exclusively, so it can check all leases and change all templates atomically.
export async function lockSectionLibrary(tx: CmsTransaction, exclusive = false) {
  await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
  if (exclusive)
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended('cms-section-library', 0))`);
  else
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock_shared(hashtextextended('cms-section-library', 0))`,
    );
}
export async function lockSectionResource(tx: CmsTransaction, id: string) {
  await lockSectionLibrary(tx);
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${"cms-section:" + id}, 0))`);
}
export function sectionPreconditions(body: unknown): PagePreconditions {
  const parsed = pagePreconditionSchema.safeParse(body);
  if (!parsed.success)
    throw new CmsMutationError(
      400,
      "CMS_CONCURRENCY_REQUIRED",
      "Reload this section editor. Its saved version and editor lease are required.",
    );
  return parsed.data;
}
export async function assertSectionLease(
  tx: CmsTransaction,
  id: string,
  actorId: string,
  proof: PagePreconditions,
) {
  const [lease] = await tx
    .select()
    .from(editorLocks)
    .where(and(eq(editorLocks.resourceType, "cms_section"), eq(editorLocks.resourceId, id)))
    .for("update");
  const now = await databaseNow(tx);
  if (
    !lease ||
    lease.lockedByUserId !== actorId ||
    lease.editorInstanceId !== proof.editorInstanceId ||
    lease.id !== proof.leaseId ||
    lease.expiresAt <= now
  )
    throw new CmsMutationError(
      409,
      "CMS_SECTION_LEASE_LOST",
      "This section reservation has expired or belongs to another editor. Your draft is retained.",
    );
  return now;
}
