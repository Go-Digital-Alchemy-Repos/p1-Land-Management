import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
  cmsForms,
  cmsFormEffectJobs,
  type CmsFormEffectJob,
  type CmsFormEffectPayload,
  cmsFormSubmissions,
  type CmsForm,
  type CmsFormSubmission,
  type InsertCmsForm,
  type InsertCmsFormSubmission,
} from "@shared/schema";
import { sanitizePublicCmsContent } from "../utils/sanitize-rich-html";

function normalizeForm<T extends CmsForm | undefined>(form: T): T {
  if (!form) return form;
  return {
    ...form,
    fields: Array.isArray(form.fields) ? form.fields : [],
    settings: typeof form.settings === "object" && form.settings ? form.settings : {},
  } as T;
}

function sanitizePublicForm<T extends CmsForm | undefined>(form: T): T {
  return sanitizePublicCmsContent(normalizeForm(form));
}

export class FormsStorage {
  async getAll(): Promise<CmsForm[]> {
    const rows = await db
      .select()
      .from(cmsForms)
      .orderBy(desc(cmsForms.updatedAt), desc(cmsForms.createdAt));
    return rows.map((row) => normalizeForm(row));
  }

  async getPublicForms(): Promise<CmsForm[]> {
    const rows = await db
      .select()
      .from(cmsForms)
      .where(eq(cmsForms.isActive, true))
      .orderBy(cmsForms.name);
    return rows
      .map((row) => sanitizePublicForm(row))
      .filter((row): row is CmsForm => Boolean(row && row.kind !== "application"));
  }

  async getById(id: string): Promise<CmsForm | undefined> {
    const [form] = await db.select().from(cmsForms).where(eq(cmsForms.id, id)).limit(1);
    return normalizeForm(form);
  }

  async getPublicById(id: string): Promise<CmsForm | undefined> {
    const [form] = await db
      .select()
      .from(cmsForms)
      .where(and(eq(cmsForms.id, id), eq(cmsForms.isActive, true)))
      .limit(1);
    const normalized = sanitizePublicForm(form);
    if (!normalized || normalized.kind === "application") return undefined;
    return normalized;
  }

  async getBySlug(slug: string): Promise<CmsForm | undefined> {
    const [form] = await db.select().from(cmsForms).where(eq(cmsForms.slug, slug)).limit(1);
    return normalizeForm(form);
  }

  async getPublicBySlug(slug: string): Promise<CmsForm | undefined> {
    const [form] = await db
      .select()
      .from(cmsForms)
      .where(and(eq(cmsForms.slug, slug), eq(cmsForms.isActive, true)))
      .limit(1);
    const normalized = sanitizePublicForm(form);
    if (!normalized || normalized.kind === "application") return undefined;
    return normalized;
  }

  async create(data: InsertCmsForm): Promise<CmsForm> {
    const [form] = await db.insert(cmsForms).values(data).returning();
    return normalizeForm(form)!;
  }

  async update(id: string, data: Partial<InsertCmsForm>): Promise<CmsForm | undefined> {
    const [form] = await db
      .update(cmsForms)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cmsForms.id, id))
      .returning();
    return normalizeForm(form);
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await db
      .delete(cmsForms)
      .where(eq(cmsForms.id, id))
      .returning({ id: cmsForms.id });
    return deleted.length > 0;
  }

  async createSubmission(data: InsertCmsFormSubmission): Promise<CmsFormSubmission> {
    const [submission] = await db.insert(cmsFormSubmissions).values(data).returning();
    return submission;
  }

  async createIdempotentSubmission(
    data: InsertCmsFormSubmission & { idempotencyKey: string },
  ): Promise<{ submission: CmsFormSubmission; created: boolean }> {
    const [created] = await db
      .insert(cmsFormSubmissions)
      .values(data)
      .onConflictDoNothing({
        target: [cmsFormSubmissions.formId, cmsFormSubmissions.idempotencyKey],
      })
      .returning();

    if (created) return { submission: created, created: true };

    const [existing] = await db
      .select()
      .from(cmsFormSubmissions)
      .where(
        and(
          eq(cmsFormSubmissions.formId, data.formId),
          eq(cmsFormSubmissions.idempotencyKey, data.idempotencyKey),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new Error("Unable to resolve idempotent form submission");
    }

    return { submission: existing, created: false };
  }

  async createSubmissionWithEffects(
    data: InsertCmsFormSubmission,
    effects: CmsFormEffectPayload[],
  ): Promise<{ submission: CmsFormSubmission; created: boolean }> {
    return db.transaction(async (tx) => {
      const [created] = await tx
        .insert(cmsFormSubmissions)
        .values(data)
        .onConflictDoNothing({
          target: [cmsFormSubmissions.formId, cmsFormSubmissions.idempotencyKey],
        })
        .returning();
      if (!created) {
        if (!data.idempotencyKey) throw new Error("Unable to create form submission");
        const [existing] = await tx
          .select()
          .from(cmsFormSubmissions)
          .where(
            and(
              eq(cmsFormSubmissions.formId, data.formId),
              eq(cmsFormSubmissions.idempotencyKey, data.idempotencyKey),
            ),
          )
          .limit(1);
        if (!existing) throw new Error("Unable to resolve idempotent form submission");
        return { submission: existing, created: false };
      }
      if (effects.length) {
        await tx.insert(cmsFormEffectJobs).values(
          effects.map((payload) => ({
            submissionId: created.id,
            deduplicationKey:
              payload.kind === "admin_notification"
                ? `${payload.kind}:${payload.recipient.trim().toLowerCase()}`
                : payload.kind,
            payload,
          })),
        );
      }
      return { submission: created, created: true };
    });
  }

  async claimNextEffectJob(now = new Date()): Promise<CmsFormEffectJob | undefined> {
    const token = randomUUID();
    // Match Drizzle timestamp-column serialization regardless of the host timezone.
    const nowSql = now.toISOString();
    const staleBefore = new Date(now.getTime() - 10 * 60_000).toISOString();
    return db.transaction(async (tx) => {
      await tx.execute(sql`
        UPDATE cms_form_effect_jobs SET status = 'failed', failed_at = ${nowSql},
          updated_at = ${nowSql}, processing_token = NULL, last_error_code = 'claim_expired'
        WHERE status = 'processing' AND claimed_at < ${staleBefore} AND attempt_count >= 5
      `);
      const result = await tx.execute(sql<{ id: string }>`
        WITH candidate AS (
          SELECT id FROM cms_form_effect_jobs
          WHERE attempt_count < 5 AND (
            (status = 'queued' AND next_attempt_at <= ${nowSql}) OR
            (status = 'processing' AND claimed_at < ${staleBefore})
          )
          ORDER BY next_attempt_at ASC, created_at ASC
          FOR UPDATE SKIP LOCKED LIMIT 1
        )
        UPDATE cms_form_effect_jobs SET status = 'processing', processing_token = ${token},
          claimed_at = ${nowSql}, attempt_count = attempt_count + 1, updated_at = ${nowSql}
        WHERE id IN (SELECT id FROM candidate) RETURNING id
      `);
      const id = result.rows[0]?.id;
      if (typeof id !== "string") return undefined;
      const [job] = await tx.select().from(cmsFormEffectJobs).where(eq(cmsFormEffectJobs.id, id));
      return job;
    });
  }

  // Internal writes and completion share a transaction. Holding the job row lock
  // prevents a replacement claim from committing while the effect is applied.
  async completeEffectJob(
    jobId: string,
    token: string,
    outcome: "completed" | "skipped",
    clock: () => Date = () => new Date(),
    apply?: (
      tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
      submission: CmsFormSubmission,
    ) => Promise<void>,
  ): Promise<boolean> {
    return db.transaction(async (tx) => {
      const [job] = await tx
        .select()
        .from(cmsFormEffectJobs)
        .where(
          and(
            eq(cmsFormEffectJobs.id, jobId),
            eq(cmsFormEffectJobs.status, "processing"),
            eq(cmsFormEffectJobs.processingToken, token),
          ),
        )
        .for("update");
      if (!job) return false;
      if (apply) {
        const [submission] = await tx
          .select()
          .from(cmsFormSubmissions)
          .where(eq(cmsFormSubmissions.id, job.submissionId));
        if (!submission) throw new Error("Form submission unavailable");
        await apply(tx, submission);
      }
      const now = clock();
      await tx
        .update(cmsFormEffectJobs)
        .set({
          status: outcome,
          completedAt: now,
          processingToken: null,
          failedAt: null,
          lastErrorCode: null,
          updatedAt: now,
        })
        .where(and(eq(cmsFormEffectJobs.id, jobId), eq(cmsFormEffectJobs.processingToken, token)));
      return true;
    });
  }

  async retryEffectJob(job: CmsFormEffectJob, now = new Date()) {
    const failed = job.attemptCount >= 5;
    const nextAttemptAt = new Date(
      now.getTime() + Math.min(30_000 * 2 ** Math.max(job.attemptCount - 1, 0), 30 * 60_000),
    );
    if (!job.processingToken) return undefined;
    const [updated] = await db
      .update(cmsFormEffectJobs)
      .set({
        status: failed ? "failed" : "queued",
        nextAttemptAt,
        processingToken: null,
        failedAt: failed ? now : null,
        lastErrorCode: "effect_delivery_failed",
        updatedAt: now,
      })
      .where(
        and(
          eq(cmsFormEffectJobs.id, job.id),
          eq(cmsFormEffectJobs.status, "processing"),
          eq(cmsFormEffectJobs.processingToken, job.processingToken),
        ),
      )
      .returning();
    return updated;
  }

  async listFailedEffectJobs() {
    return db
      .select({
        id: cmsFormEffectJobs.id,
        attemptCount: cmsFormEffectJobs.attemptCount,
        failedAt: cmsFormEffectJobs.failedAt,
        lastErrorCode: cmsFormEffectJobs.lastErrorCode,
      })
      .from(cmsFormEffectJobs)
      .where(eq(cmsFormEffectJobs.status, "failed"))
      .orderBy(desc(cmsFormEffectJobs.failedAt))
      .limit(100);
  }

  async requeueFailedEffectJob(id: string, now = new Date()) {
    const [job] = await db
      .update(cmsFormEffectJobs)
      .set({
        status: "queued",
        attemptCount: 0,
        processingToken: null,
        claimedAt: null,
        failedAt: null,
        nextAttemptAt: now,
        updatedAt: now,
      })
      .where(and(eq(cmsFormEffectJobs.id, id), eq(cmsFormEffectJobs.status, "failed")))
      .returning({ id: cmsFormEffectJobs.id });
    return job;
  }

  async getSubmissionsByFormId(formId: string): Promise<CmsFormSubmission[]> {
    return db
      .select()
      .from(cmsFormSubmissions)
      .where(eq(cmsFormSubmissions.formId, formId))
      .orderBy(desc(cmsFormSubmissions.createdAt));
  }

  async deleteSubmission(formId: string, submissionId: string): Promise<boolean> {
    const deleted = await db
      .delete(cmsFormSubmissions)
      .where(and(eq(cmsFormSubmissions.formId, formId), eq(cmsFormSubmissions.id, submissionId)))
      .returning({ id: cmsFormSubmissions.id });
    return deleted.length > 0;
  }
}
