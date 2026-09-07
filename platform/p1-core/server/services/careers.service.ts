import { getBaseUrl } from "../utils/route-helpers";
import { assertUploadMutationsAllowed } from "./upload-mutation-policy";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { Request } from "express";
import {
  careerSettingsSchema,
  type CareerApplication,
  type CareerJob,
  type CareerSettings,
} from "@shared/schema";
import { storage } from "../storage";
import * as r2Service from "./r2.service";
import { sendEmail } from "./email.service";
import { logger } from "../utils/logger";

const CAREER_SETTINGS_CATEGORY = "career_center";
const LOCAL_RESUME_DIR = path.resolve(process.cwd(), "private-uploads", "career-resumes");
const LEGACY_LOCAL_RESUME_DIR = path.resolve(process.cwd(), "uploads", "career-resumes");

export const DEFAULT_CAREER_SETTINGS: CareerSettings = careerSettingsSchema.parse({});

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on", "enabled"].includes(normalized)) return true;
  if (["false", "0", "no", "off", "disabled"].includes(normalized)) return false;
  return fallback;
}

export async function getCareerSettings(includeSecrets = false): Promise<CareerSettings> {
  const settings = await storage.settings.getDecryptedCategory(CAREER_SETTINGS_CATEGORY);
  const parsed = careerSettingsSchema.parse({
    sharing: {
      enabled: bool(settings.share_enabled, DEFAULT_CAREER_SETTINGS.sharing.enabled),
      copyLink: bool(settings.share_copy_link, DEFAULT_CAREER_SETTINGS.sharing.copyLink),
      nativeShare: bool(settings.share_native, DEFAULT_CAREER_SETTINGS.sharing.nativeShare),
      email: bool(settings.share_email, DEFAULT_CAREER_SETTINGS.sharing.email),
      linkedin: bool(settings.share_linkedin, DEFAULT_CAREER_SETTINGS.sharing.linkedin),
      facebook: bool(settings.share_facebook, DEFAULT_CAREER_SETTINGS.sharing.facebook),
      x: bool(settings.share_x, DEFAULT_CAREER_SETTINGS.sharing.x),
    },
    integrations: {
      googleIndexingEnabled: bool(settings.google_indexing_enabled, false),
      googleServiceAccountJson: includeSecrets ? (settings.google_service_account_json ?? "") : "",
      indeedFeedEnabled: bool(settings.indeed_feed_enabled, false),
      indeedApplyEnabled: bool(settings.indeed_apply_enabled, false),
      indeedApplySecret: includeSecrets ? (settings.indeed_apply_secret ?? "") : "",
      indeedDispositionSyncEnabled: bool(settings.indeed_disposition_sync_enabled, false),
      zipRecruiterEnabled: bool(settings.zip_recruiter_enabled, false),
      zipRecruiterApiKey: includeSecrets ? (settings.zip_recruiter_api_key ?? "") : "",
      linkedinApiEnabled: bool(settings.linkedin_api_enabled, false),
      linkedinPartnerId: settings.linkedin_partner_id ?? "",
      genericWebhookEnabled: bool(settings.generic_webhook_enabled, false),
      genericWebhookUrl: settings.generic_webhook_url ?? "",
      genericWebhookSecret: includeSecrets ? (settings.generic_webhook_secret ?? "") : "",
    },
  });
  return parsed;
}

export async function saveCareerSettings(settings: CareerSettings): Promise<CareerSettings> {
  const normalized = careerSettingsSchema.parse(settings);
  const entries: Array<[string, string, boolean]> = [
    ["share_enabled", String(normalized.sharing.enabled), false],
    ["share_copy_link", String(normalized.sharing.copyLink), false],
    ["share_native", String(normalized.sharing.nativeShare), false],
    ["share_email", String(normalized.sharing.email), false],
    ["share_linkedin", String(normalized.sharing.linkedin), false],
    ["share_facebook", String(normalized.sharing.facebook), false],
    ["share_x", String(normalized.sharing.x), false],
    ["google_indexing_enabled", String(normalized.integrations.googleIndexingEnabled), false],
    ["google_service_account_json", normalized.integrations.googleServiceAccountJson, true],
    ["indeed_feed_enabled", String(normalized.integrations.indeedFeedEnabled), false],
    ["indeed_apply_enabled", String(normalized.integrations.indeedApplyEnabled), false],
    ["indeed_apply_secret", normalized.integrations.indeedApplySecret, true],
    [
      "indeed_disposition_sync_enabled",
      String(normalized.integrations.indeedDispositionSyncEnabled),
      false,
    ],
    ["zip_recruiter_enabled", String(normalized.integrations.zipRecruiterEnabled), false],
    ["zip_recruiter_api_key", normalized.integrations.zipRecruiterApiKey, true],
    ["linkedin_api_enabled", String(normalized.integrations.linkedinApiEnabled), false],
    ["linkedin_partner_id", normalized.integrations.linkedinPartnerId, false],
    ["generic_webhook_enabled", String(normalized.integrations.genericWebhookEnabled), false],
    ["generic_webhook_url", normalized.integrations.genericWebhookUrl, false],
    ["generic_webhook_secret", normalized.integrations.genericWebhookSecret, true],
  ];

  await Promise.all(
    entries.map(([key, value, isSecret]) =>
      storage.settings.upsertSetting(key, value, CAREER_SETTINGS_CATEGORY, isSecret),
    ),
  );
  storage.settings.invalidateCategory(CAREER_SETTINGS_CATEGORY);
  return getCareerSettings(false);
}

function ensureResumeDir() {
  if (!fs.existsSync(LOCAL_RESUME_DIR)) {
    fs.mkdirSync(LOCAL_RESUME_DIR, { recursive: true });
  }
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function storeCareerResume(file: Express.Multer.File): Promise<{
  storageKey: string;
  fileName: string;
  mimeType: string;
  size: number;
}> {
  assertUploadMutationsAllowed();
  const fileName = file.originalname;
  const safeName = safeFileName(file.originalname);
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${safeName}`;
  const r2Key = `career-resumes/${filename}`;

  if (await r2Service.isConfigured()) {
    const uploaded = await r2Service.uploadFile(r2Key, file.buffer, file.mimetype);
    if (uploaded) {
      return {
        storageKey: `r2:${r2Key}`,
        fileName,
        mimeType: file.mimetype,
        size: file.size,
      };
    }
  }

  ensureResumeDir();
  fs.writeFileSync(path.join(LOCAL_RESUME_DIR, filename), file.buffer);
  return {
    storageKey: `local:${filename}`,
    fileName,
    mimeType: file.mimetype,
    size: file.size,
  };
}

export async function loadCareerResume(storageKey: string): Promise<{
  buffer: Buffer;
  contentType: string | null;
} | null> {
  if (storageKey.startsWith("r2:")) {
    return r2Service.downloadFile(storageKey.slice(3));
  }
  if (storageKey.startsWith("local:")) {
    const file = storageKey.slice(6);
    for (const directory of [LOCAL_RESUME_DIR, LEGACY_LOCAL_RESUME_DIR]) {
      const safePath = path.resolve(directory, file);
      if (safePath.startsWith(directory) && fs.existsSync(safePath)) {
        return { buffer: fs.readFileSync(safePath), contentType: null };
      }
    }
    return null;
  }
  return null;
}

function jobUrl(req: Request, job: CareerJob) {
  return `${getBaseUrl(req)}/careers/${job.slug}`;
}

export async function notifyCareerApplication(
  req: Request,
  job: CareerJob,
  application: CareerApplication,
) {
  const baseUrl = getBaseUrl(req);
  const applicantName = `${application.firstName} ${application.lastName}`.trim();

  sendEmail(
    application.email,
    `Application received: ${job.title}`,
    `<p>Hi ${applicantName},</p><p>Thanks for applying for <strong>${job.title}</strong>. Our team has received your application.</p><p><a href="${jobUrl(req, job)}">View job listing</a></p>`,
  ).catch((err) =>
    logger.email.warn("Failed to send career application confirmation", {
      applicationId: application.id,
      error: err instanceof Error ? err.message : String(err),
    }),
  );

  const admins = await storage.users.getUsersByRole("admin");
  const recipients = admins.map((admin) => admin.email).filter(Boolean);
  if (recipients.length === 0) return;

  for (const recipient of recipients) {
    sendEmail(
      recipient,
      `New career application: ${job.title}`,
      `<p><strong>${applicantName}</strong> applied for <strong>${job.title}</strong>.</p><p>Email: ${application.email}</p><p><a href="${baseUrl}/admin/careers?tab=applications&application=${application.id}">Review application</a></p>`,
    ).catch((err) =>
      logger.email.warn("Failed to send career admin notification", {
        applicationId: application.id,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}

export async function dispatchCareerWebhook(eventType: string, payload: unknown) {
  const settings = await getCareerSettings(true);
  if (!settings.integrations.genericWebhookEnabled || !settings.integrations.genericWebhookUrl)
    return;

  const body = JSON.stringify({ type: eventType, payload, sentAt: new Date().toISOString() });
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (settings.integrations.genericWebhookSecret) {
    headers["x-career-webhook-signature"] = crypto
      .createHmac("sha256", settings.integrations.genericWebhookSecret)
      .update(body)
      .digest("hex");
  }

  try {
    await fetch(settings.integrations.genericWebhookUrl, {
      method: "POST",
      headers,
      body,
    });
  } catch (err) {
    logger.app.warn("Career webhook dispatch failed", {
      eventType,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
