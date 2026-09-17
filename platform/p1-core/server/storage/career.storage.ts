import { and, asc, desc, eq, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  careerApplicationNotes,
  careerApplications,
  careerJobs,
  type CareerApplication,
  type CareerApplicationNote,
  type CareerJob,
  type InsertCareerApplication,
  type InsertCareerApplicationNote,
  type InsertCareerJob,
} from "@shared/schema";

type CareerJobInsert = typeof careerJobs.$inferInsert;
type CareerApplicationInsert = typeof careerApplications.$inferInsert;
type CareerApplicationNoteInsert = typeof careerApplicationNotes.$inferInsert;

export interface CareerJobFilters {
  q?: string;
  department?: string;
  employmentType?: string;
  workMode?: string;
  location?: string;
  directoryProfileId?: string;
  publicOnly?: boolean;
}

export type CareerApplicationWithJob = CareerApplication & {
  job?: CareerJob | null;
};

export class CareerStorage {
  async getJobs(filters: CareerJobFilters = {}): Promise<CareerJob[]> {
    const conditions = [];
    if (filters.publicOnly) {
      conditions.push(eq(careerJobs.status, "published"));
      conditions.push(eq(careerJobs.visibility, "public"));
      conditions.push(
        or(sql`${careerJobs.publishedAt} IS NULL`, lte(careerJobs.publishedAt, new Date())),
      );
      conditions.push(
        or(sql`${careerJobs.closesAt} IS NULL`, sql`${careerJobs.closesAt} >= NOW()`),
      );
      conditions.push(eq(careerJobs.noindex, false));
    }
    if (filters.department && filters.department !== "all") {
      conditions.push(eq(careerJobs.department, filters.department));
    }
    if (filters.employmentType && filters.employmentType !== "all") {
      conditions.push(
        eq(careerJobs.employmentType, filters.employmentType as CareerJob["employmentType"]),
      );
    }
    if (filters.workMode && filters.workMode !== "all") {
      conditions.push(eq(careerJobs.workMode, filters.workMode as CareerJob["workMode"]));
    }
    if (filters.location && filters.location !== "all") {
      conditions.push(eq(careerJobs.location, filters.location));
    }
    if (filters.directoryProfileId && filters.directoryProfileId !== "all") {
      conditions.push(eq(careerJobs.directoryProfileId, filters.directoryProfileId));
    }
    if (filters.q?.trim()) {
      const term = `%${filters.q.trim()}%`;
      conditions.push(
        or(
          ilike(careerJobs.title, term),
          ilike(careerJobs.department, term),
          ilike(careerJobs.location, term),
          ilike(careerJobs.summary, term),
          ilike(careerJobs.description, term),
        ),
      );
    }

    return db
      .select()
      .from(careerJobs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(careerJobs.publishedAt), desc(careerJobs.updatedAt));
  }

  async getJob(id: string): Promise<CareerJob | undefined> {
    const [job] = await db.select().from(careerJobs).where(eq(careerJobs.id, id)).limit(1);
    return job;
  }

  async getJobBySlug(slug: string): Promise<CareerJob | undefined> {
    const [job] = await db.select().from(careerJobs).where(eq(careerJobs.slug, slug)).limit(1);
    return job;
  }

  async getPublicJobBySlug(slug: string): Promise<CareerJob | undefined> {
    const [job] = await db
      .select()
      .from(careerJobs)
      .where(
        and(
          eq(careerJobs.slug, slug),
          eq(careerJobs.status, "published"),
          eq(careerJobs.visibility, "public"),
          or(sql`${careerJobs.publishedAt} IS NULL`, lte(careerJobs.publishedAt, new Date())),
          or(sql`${careerJobs.closesAt} IS NULL`, sql`${careerJobs.closesAt} >= NOW()`),
        ),
      )
      .limit(1);
    return job;
  }

  async getJobSlugOwner(slug: string): Promise<CareerJob | undefined> {
    return this.getJobBySlug(slug);
  }

  async createJob(data: InsertCareerJob): Promise<CareerJob> {
    const [job] = await db
      .insert(careerJobs)
      .values(data as CareerJobInsert)
      .returning();
    return job;
  }

  async updateJob(id: string, data: Partial<InsertCareerJob>, expectedUpdatedAt?: string): Promise<CareerJob | undefined> {
    const [job] = await db
      .update(careerJobs)
      .set({ ...(data as Partial<CareerJobInsert>), updatedAt: sql`GREATEST(date_trunc('milliseconds', now() AT TIME ZONE 'UTC'), date_trunc('milliseconds', ${careerJobs.updatedAt}) + interval '1 millisecond')` })
      .where(and(eq(careerJobs.id, id), expectedUpdatedAt ? sql`date_trunc('milliseconds', ${careerJobs.updatedAt}) = (${expectedUpdatedAt}::timestamptz AT TIME ZONE 'UTC')` : undefined))
      .returning();
    return job;
  }

  async deleteJob(
    id: string,
    expectedUpdatedAt?: string,
  ): Promise<
    { kind: "missing" | "conflict" | "has_applications" } | { kind: "deleted"; job: CareerJob }
  > {
    return db.transaction(async (tx) => {
      // FOR UPDATE conflicts with the FK key-share lock of incoming applications.
      const [job] = await tx.select().from(careerJobs).where(eq(careerJobs.id, id)).for("update");
      if (!job) return { kind: "missing" };
      if (
        expectedUpdatedAt &&
        job.updatedAt.toISOString() !== new Date(expectedUpdatedAt).toISOString()
      )
        return { kind: "conflict" };
      const [application] = await tx
        .select({ id: careerApplications.id })
        .from(careerApplications)
        .where(eq(careerApplications.jobId, id))
        .limit(1);
      if (application) return { kind: "has_applications" };
      await tx.delete(careerJobs).where(eq(careerJobs.id, id));
      return { kind: "deleted", job };
    });
  }

  async getApplications(): Promise<CareerApplicationWithJob[]> {
    const rows = await db
      .select({ application: careerApplications, job: careerJobs })
      .from(careerApplications)
      .leftJoin(careerJobs, eq(careerApplications.jobId, careerJobs.id))
      .orderBy(desc(careerApplications.createdAt));
    return rows.map((row) => ({ ...row.application, job: row.job ?? null }));
  }

  async getApplicationsForJob(jobId: string): Promise<CareerApplication[]> {
    return db
      .select()
      .from(careerApplications)
      .where(eq(careerApplications.jobId, jobId))
      .orderBy(desc(careerApplications.createdAt));
  }

  async getApplication(id: string): Promise<CareerApplicationWithJob | undefined> {
    const [row] = await db
      .select({ application: careerApplications, job: careerJobs })
      .from(careerApplications)
      .leftJoin(careerJobs, eq(careerApplications.jobId, careerJobs.id))
      .where(eq(careerApplications.id, id))
      .limit(1);
    return row ? { ...row.application, job: row.job ?? null } : undefined;
  }

  async createApplication(data: InsertCareerApplication): Promise<CareerApplication> {
    const [application] = await db
      .insert(careerApplications)
      .values(data as CareerApplicationInsert)
      .returning();
    return application;
  }

  async updateApplication(
    id: string,
    data: Partial<InsertCareerApplication>,
  ): Promise<CareerApplication | undefined> {
    const [application] = await db
      .update(careerApplications)
      .set({ ...(data as Partial<CareerApplicationInsert>), updatedAt: sql`GREATEST(date_trunc('milliseconds', now() AT TIME ZONE 'UTC'), date_trunc('milliseconds', ${careerApplications.updatedAt}) + interval '1 millisecond')` })
      .where(eq(careerApplications.id, id))
      .returning();
    return application;
  }

  async reviewApplication(id: string, input: {status?: CareerApplication["status"];note: string;expectedUpdatedAt?: string}, actorId: string | null) {
    return db.transaction(async tx => {
      const [current]=await tx.select().from(careerApplications).where(eq(careerApplications.id,id)).for("update");
      if(!current)return {kind:"missing" as const};
      if(input.expectedUpdatedAt && current.updatedAt.toISOString()!==new Date(input.expectedUpdatedAt).toISOString())return {kind:"conflict" as const};
      const status=input.status ?? current.status;
      if(!input.note && status===current.status)return {kind:"saved" as const,application:current};
      const [application]=await tx.update(careerApplications).set({status,updatedAt:sql`GREATEST(date_trunc('milliseconds', now() AT TIME ZONE 'UTC'), date_trunc('milliseconds', ${careerApplications.updatedAt}) + interval '1 millisecond')`}).where(eq(careerApplications.id,id)).returning();
      await tx.insert(careerApplicationNotes).values({applicationId:id,note:input.note || `Status changed to ${status}`,statusFrom:current.status,statusTo:status,createdBy:actorId});
      return {kind:"saved" as const,application};
    });
  }

  async getApplicationNotes(applicationId: string): Promise<CareerApplicationNote[]> {
    return db
      .select()
      .from(careerApplicationNotes)
      .where(eq(careerApplicationNotes.applicationId, applicationId))
      .orderBy(asc(careerApplicationNotes.createdAt));
  }

  async createApplicationNote(data: InsertCareerApplicationNote): Promise<CareerApplicationNote> {
    const [note] = await db
      .insert(careerApplicationNotes)
      .values(data as CareerApplicationNoteInsert)
      .returning();
    return note;
  }

  async getFilterOptions(): Promise<{
    departments: string[];
    locations: string[];
  }> {
    const jobs = await this.getJobs({ publicOnly: true });
    return {
      departments: Array.from(
        new Set(
          jobs.map((job) => job.department).filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
      locations: Array.from(
        new Set(jobs.map((job) => job.location).filter((value): value is string => Boolean(value))),
      ).sort(),
    };
  }
}
