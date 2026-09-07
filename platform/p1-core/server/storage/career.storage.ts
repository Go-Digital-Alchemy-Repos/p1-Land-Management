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

  async updateJob(id: string, data: Partial<InsertCareerJob>): Promise<CareerJob | undefined> {
    const [job] = await db
      .update(careerJobs)
      .set({ ...data, updatedAt: new Date() } as Partial<CareerJobInsert>)
      .where(eq(careerJobs.id, id))
      .returning();
    return job;
  }

  async deleteJob(id: string): Promise<boolean> {
    await db.delete(careerJobs).where(eq(careerJobs.id, id));
    return true;
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
      .set({ ...data, updatedAt: new Date() } as Partial<CareerApplicationInsert>)
      .where(eq(careerApplications.id, id))
      .returning();
    return application;
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
