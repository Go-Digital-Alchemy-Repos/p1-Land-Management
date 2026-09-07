import { getBaseUrl } from "../utils/route-helpers";
import { Router } from "express";
import multer from "multer";
import path from "path";
import { z } from "zod";
import { storage } from "../storage";
import { asyncHandler } from "../middleware/error-handler";
import { paramString } from "../utils/params";
import {
  CAREER_EMPLOYMENT_TYPE_LABELS,
  CAREER_WORK_MODE_LABELS,
  publicCareerApplicationSchema,
} from "@shared/schema";
import {
  getCareerSettings,
  notifyCareerApplication,
  storeCareerResume,
} from "../services/careers.service";

const router = Router();

const RESUME_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const RESUME_EXTENSIONS = [".pdf", ".doc", ".docx"];

const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (RESUME_MIMES.includes(file.mimetype) && RESUME_EXTENSIONS.includes(ext)) {
      cb(null, true);
      return;
    }
    cb(new Error("Accepted resume types: PDF, DOC, and DOCX."));
  },
});

function getStringQuery(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(value?: string | null) {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

router.get(
  "/settings",
  asyncHandler(async (_req, res) => {
    res.json(await getCareerSettings(false));
  }),
);

router.get(
  "/filters",
  asyncHandler(async (_req, res) => {
    res.json(await storage.careers.getFilterOptions());
  }),
);

router.get(
  "/jobs",
  asyncHandler(async (req, res) => {
    const jobs = await storage.careers.getJobs({
      publicOnly: true,
      q: getStringQuery(req.query.q),
      department: getStringQuery(req.query.department),
      employmentType: getStringQuery(req.query.employmentType),
      workMode: getStringQuery(req.query.workMode),
      location: getStringQuery(req.query.location),
    });
    res.json(jobs);
  }),
);

router.get(
  "/feed/indeed.xml",
  asyncHandler(async (req, res) => {
    const settings = await getCareerSettings(false);
    if (!settings.integrations.indeedFeedEnabled) {
      return res.status(404).type("text/plain").send("Indeed feed is disabled");
    }

    const baseUrl = getBaseUrl(req);
    const jobs = await storage.careers.getJobs({ publicOnly: true });
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<source>",
      "  <publisher>Core Platform</publisher>",
      `  <publisherurl>${escapeXml(baseUrl)}</publisherurl>`,
      `  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
      ...jobs.map((job) =>
        [
          "  <job>",
          `    <title><![CDATA[${job.title}]]></title>`,
          `    <date><![CDATA[${new Date(job.publishedAt ?? job.updatedAt ?? job.createdAt).toUTCString()}]]></date>`,
          `    <referencenumber><![CDATA[${job.id}]]></referencenumber>`,
          `    <url><![CDATA[${baseUrl}/careers/${job.slug}?source=indeed]]></url>`,
          `    <company><![CDATA[Core Platform]]></company>`,
          `    <city><![CDATA[${job.location ?? ""}]]></city>`,
          `    <description><![CDATA[${stripHtml(job.description || job.summary)}]]></description>`,
          `    <jobtype><![CDATA[${CAREER_EMPLOYMENT_TYPE_LABELS[job.employmentType] ?? job.employmentType}]]></jobtype>`,
          `    <remotetype><![CDATA[${CAREER_WORK_MODE_LABELS[job.workMode] ?? job.workMode}]]></remotetype>`,
          "  </job>",
        ].join("\n"),
      ),
      "</source>",
    ].join("\n");

    res.type("application/xml").send(xml);
  }),
);

router.post(
  "/indeed/apply",
  asyncHandler(async (req, res) => {
    const settings = await getCareerSettings(true);
    if (!settings.integrations.indeedApplyEnabled) {
      return res.status(404).json({ message: "Indeed Apply is disabled" });
    }
    const secret = req.header("x-indeed-apply-secret") || req.query.secret;
    if (
      settings.integrations.indeedApplySecret &&
      secret !== settings.integrations.indeedApplySecret
    ) {
      return res.status(401).json({ message: "Invalid Indeed Apply secret" });
    }
    res.status(202).json({
      accepted: true,
      message: "Indeed Apply endpoint is ready for partner payload mapping",
    });
  }),
);

router.get(
  "/jobs/:slug",
  asyncHandler(async (req, res) => {
    const slug = paramString(req.params.slug);
    const job = await storage.careers.getPublicJobBySlug(slug);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    res.json(job);
  }),
);

router.post(
  "/jobs/:slug/apply",
  resumeUpload.single("resume"),
  asyncHandler(async (req, res) => {
    const slug = paramString(req.params.slug);
    const job = await storage.careers.getPublicJobBySlug(slug);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Resume is required" });
    }

    const parsed = publicCareerApplicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid application", errors: parsed.error.flatten() });
    }

    const resume = await storeCareerResume(req.file);
    const application = await storage.careers.createApplication({
      jobId: job.id,
      ...parsed.data,
      resumeFileName: resume.fileName,
      resumeMimeType: resume.mimeType,
      resumeFileSize: resume.size,
      resumeStorageKey: resume.storageKey,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? null,
      integrationMetadata: {},
    });
    await notifyCareerApplication(req, job, application);
    res.status(201).json({ message: "Application received", applicationId: application.id });
  }),
);

const zipRecruiterWebhookSchema = z.object({}).passthrough();

router.post(
  "/ziprecruiter/apply",
  asyncHandler(async (req, res) => {
    zipRecruiterWebhookSchema.parse(req.body);
    res.status(202).json({
      accepted: true,
      message: "ZipRecruiter inbound apply endpoint is ready for partner payload mapping",
    });
  }),
);

export default router;
