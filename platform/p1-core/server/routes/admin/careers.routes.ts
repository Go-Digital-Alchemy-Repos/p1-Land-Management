import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/error-handler";
import { paramString } from "../../utils/params";
import {
  CAREER_APPLICATION_STATUSES,
  CAREER_EMPLOYMENT_TYPES,
  CAREER_JOB_STATUSES,
  CAREER_JOB_VISIBILITIES,
  CAREER_WORK_MODES,
  careerSettingsSchema,
  insertCareerJobSchema,
  type CareerJob,
  type InsertCareerJob,
} from "@shared/schema";
import {
  dispatchCareerWebhook,
  getCareerSettings,
  loadCareerResume,
  saveCareerSettings,
} from "../../services/careers.service";

const router = Router();
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function buildUniqueSlug(
  title: string,
  requestedSlug?: string | null,
  currentJobId?: string,
) {
  const base = slugify(requestedSlug || title) || "job";
  for (let i = 0; i < 100; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const owner = await storage.careers.getJobSlugOwner(candidate);
    if (!owner || owner.id === currentJobId) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

const dateFields = ["publishedAt", "closesAt"] as const;

function normalizeBlankStrings(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      typeof value === "string" && value.trim() === "" ? null : value,
    ]),
  );
}

function coerceJobPayload(body: Record<string, unknown>, userId?: string): Record<string, unknown> {
  const normalized = normalizeBlankStrings(body);
  for (const field of dateFields) {
    const value = normalized[field];
    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      normalized[field] = Number.isNaN(date.getTime()) ? null : date;
    }
  }
  if (typeof normalized.salaryMin === "string")
    normalized.salaryMin = Number(normalized.salaryMin) || null;
  if (typeof normalized.salaryMax === "string")
    normalized.salaryMax = Number(normalized.salaryMax) || null;
  if (!normalized.createdBy && userId) normalized.createdBy = userId;
  if (userId) normalized.updatedBy = userId;
  return normalized;
}

function validateJobData(data: Record<string, unknown>): string | null {
  const status = typeof data.status === "string" ? data.status : undefined;
  const visibility = typeof data.visibility === "string" ? data.visibility : undefined;
  const employmentType = typeof data.employmentType === "string" ? data.employmentType : undefined;
  const workMode = typeof data.workMode === "string" ? data.workMode : undefined;
  const slug = typeof data.slug === "string" ? data.slug : undefined;
  if (status && !CAREER_JOB_STATUSES.includes(status as CareerJob["status"]))
    return "Invalid job status";
  if (visibility && !CAREER_JOB_VISIBILITIES.includes(visibility as CareerJob["visibility"]))
    return "Invalid job visibility";
  if (
    employmentType &&
    !CAREER_EMPLOYMENT_TYPES.includes(employmentType as CareerJob["employmentType"])
  )
    return "Invalid employment type";
  if (workMode && !CAREER_WORK_MODES.includes(workMode as CareerJob["workMode"]))
    return "Invalid work mode";
  if (slug && !SLUG_PATTERN.test(slug))
    return "Slug must use lowercase letters, numbers, and hyphens only";
  return null;
}

router.get(
  "/jobs",
  asyncHandler(async (_req, res) => {
    res.json(await storage.careers.getJobs());
  }),
);

router.get(
  "/jobs/:id",
  asyncHandler(async (req, res) => {
    const job = await storage.careers.getJob(paramString(req.params.id));
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  }),
);

router.post(
  "/jobs",
  asyncHandler(async (req, res) => {
    const payload = coerceJobPayload(req.body, req.user?.id);
    const validationError = validateJobData(payload);
    if (validationError) return res.status(400).json({ message: validationError });
    payload.slug = await buildUniqueSlug(
      String(payload.title ?? ""),
      typeof payload.slug === "string" ? payload.slug : null,
    );
    const parsed = insertCareerJobSchema.safeParse(payload);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid job payload", errors: parsed.error.flatten() });
    }
    const job = await storage.careers.createJob(parsed.data);
    await dispatchCareerWebhook("career.job.created", job);
    res.status(201).json(job);
  }),
);

router.put(
  "/jobs/:id",
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const current = await storage.careers.getJob(id);
    if (!current) return res.status(404).json({ message: "Job not found" });
    const payload = coerceJobPayload(req.body, req.user?.id);
    const validationError = validateJobData(payload);
    if (validationError) return res.status(400).json({ message: validationError });
    if (typeof payload.title === "string" || typeof payload.slug === "string") {
      payload.slug = await buildUniqueSlug(
        String(payload.title ?? current.title),
        typeof payload.slug === "string" ? payload.slug : current.slug,
        id,
      );
    }
    const parsed = insertCareerJobSchema.partial().safeParse(payload);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid job payload", errors: parsed.error.flatten() });
    }
    const job = await storage.careers.updateJob(id, parsed.data as Partial<InsertCareerJob>);
    await dispatchCareerWebhook("career.job.updated", job);
    res.json(job);
  }),
);

router.delete(
  "/jobs/:id",
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const existing = await storage.careers.getJob(id);
    if (!existing) return res.status(404).json({ message: "Job not found" });
    await storage.careers.deleteJob(id);
    await dispatchCareerWebhook("career.job.deleted", existing);
    res.json({ success: true });
  }),
);

router.get(
  "/applications",
  asyncHandler(async (_req, res) => {
    res.json(await storage.careers.getApplications());
  }),
);

router.get(
  "/applications/:id",
  asyncHandler(async (req, res) => {
    const application = await storage.careers.getApplication(paramString(req.params.id));
    if (!application) return res.status(404).json({ message: "Application not found" });
    const notes = await storage.careers.getApplicationNotes(application.id);
    res.json({ ...application, notes });
  }),
);

const updateApplicationSchema = z.object({
  status: z.enum(CAREER_APPLICATION_STATUSES).optional(),
  note: z.string().optional().default(""),
});

router.put(
  "/applications/:id",
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const current = await storage.careers.getApplication(id);
    if (!current) return res.status(404).json({ message: "Application not found" });
    const parsed = updateApplicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid application update", errors: parsed.error.flatten() });
    }
    const updated = parsed.data.status
      ? await storage.careers.updateApplication(id, { status: parsed.data.status })
      : current;
    if (parsed.data.note || (parsed.data.status && parsed.data.status !== current.status)) {
      await storage.careers.createApplicationNote({
        applicationId: id,
        note: parsed.data.note || `Status changed to ${parsed.data.status}`,
        statusFrom: current.status,
        statusTo: parsed.data.status ?? current.status,
        createdBy: req.user?.id ?? null,
      });
    }
    await dispatchCareerWebhook("career.application.updated", updated);
    res.json(updated);
  }),
);

router.get(
  "/applications/:id/resume",
  asyncHandler(async (req, res) => {
    const application = await storage.careers.getApplication(paramString(req.params.id));
    if (!application) return res.status(404).json({ message: "Application not found" });
    const file = await loadCareerResume(application.resumeStorageKey);
    if (!file) return res.status(404).json({ message: "Resume file not found" });
    res.setHeader("Content-Type", file.contentType || application.resumeMimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${application.resumeFileName.replace(/"/g, "")}"`,
    );
    res.send(file.buffer);
  }),
);

router.get(
  "/settings",
  asyncHandler(async (_req, res) => {
    res.json(await getCareerSettings(false));
  }),
);

router.put(
  "/settings",
  asyncHandler(async (req, res) => {
    const parsed = careerSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid career settings", errors: parsed.error.flatten() });
    }
    res.json(await saveCareerSettings(parsed.data));
  }),
);

export default router;
