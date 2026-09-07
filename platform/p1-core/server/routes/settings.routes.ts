import { isPrivateProofSetting } from "@shared/p1-private-proof";
import { getBaseUrl } from "../utils/route-helpers";
import { CRM_PIPELINE_SETTING_KEY } from "@shared/crm-pipeline-settings";
import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { z } from "zod";
import { storage } from "../storage/index";
import { authenticateToken, hasAdminPermission, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/error-handler";
import { paramString } from "../utils/params";
import {
  sendEmail,
  testMailgunConnection,
  renderEmailShell,
  renderTemplate,
  resetEmailBrandingCache,
} from "../services/email.service";
import * as r2Service from "../services/r2.service";
import { ensureSystemEmailTemplates } from "../services/system-email-templates.service";
import { testMailchimpConnection } from "../services/mailchimp.service";
import { BRANDING_OPTIONS, isImageMime } from "../services/image-optimizer";
import { createCmsMediaAssetFromUpload } from "../services/cms-media-upload.service";
import { isDesignEditableBrandingSetting } from "../utils/branding-settings-policy";

const router = Router();

const MAX_BRANDING_IMAGE_SIZE = 10 * 1024 * 1024;

const brandingUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BRANDING_IMAGE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (isImageMime(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Accepted file types: PNG, JPEG, WebP, and GIF"));
  },
});

router.use(authenticateToken);

function canManageBranding(req: Request) {
  return req.user?.role === "admin" || hasAdminPermission(req.user, "design");
}

function requireAdminOrDesignEditor(req: Request, res: Response, next: NextFunction) {
  if (canManageBranding(req)) {
    next();
    return;
  }
  res.status(403).json({ message: "Forbidden" });
}

function requireSettingWritePermission(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role === "admin") {
    next();
    return;
  }
  if (isDesignEditableBrandingSetting(req.body) && hasAdminPermission(req.user, "design")) {
    next();
    return;
  }
  res.status(403).json({ message: "Forbidden" });
}

router.get(
  "/settings",
  requireAdminOrDesignEditor,
  asyncHandler(async (_req, res) => {
    const settings = await storage.settings.getAllSettings();
    const grouped: Record<string, Record<string, { value: string; isSecret: boolean }>> = {};

    for (const s of settings) {
      if (isPrivateProofSetting(s.key, s.category)) continue;
      if (_req.user?.role !== "admin" && s.category !== "branding") continue;
      if (!grouped[s.category]) grouped[s.category] = {};
      grouped[s.category][s.key] = {
        value: s.isSecret ? "••••••••" : s.value,
        isSecret: s.isSecret,
      };
    }

    res.json(grouped);
  }),
);

const upsertSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  category: z.string().min(1),
  isSecret: z.boolean().default(false),
});

const brandingUploadSchema = z.object({
  settingKey: z.enum(["frontend_logo_url", "favicon_url"]),
});

router.put(
  "/settings",
  requireSettingWritePermission,
  asyncHandler(async (req, res) => {
    const data = upsertSettingSchema.parse(req.body);
    if (data.key === CRM_PIPELINE_SETTING_KEY)
      return res
        .status(400)
        .json({ message: "Use /api/admin/crm/settings/pipeline to update pipeline settings" });
    const existingPrivate = (await storage.settings.getAllSettings()).find(
      (s) => s.key === data.key,
    );
    if (
      isPrivateProofSetting(data.key, data.category) ||
      isPrivateProofSetting(existingPrivate?.key, existingPrivate?.category)
    )
      return res.status(403).json({ message: "Use the private proof editor" });
    if (req.user?.role !== "admin") {
      const existing = (await storage.settings.getAllSettings()).find(
        (setting) => setting.key === data.key,
      );
      if (existing && (existing.category !== "branding" || existing.isSecret)) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }
    const setting = await storage.settings.upsertSetting(
      data.key,
      data.value,
      data.category,
      data.isSecret,
    );

    if (data.category === "cloudflare_r2") {
      r2Service.resetClient();
    }

    if (data.category === "mailgun") {
      const { resetMailgunConfig } = await import("../services/email.service");
      resetMailgunConfig();
    }

    if (data.category === "branding") {
      resetEmailBrandingCache();
    }

    storage.settings.invalidateCategory(data.category);

    res.json({
      ...setting,
      value: setting.isSecret ? "••••••••" : setting.value,
    });
  }),
);

router.post(
  "/branding/upload",
  requireAdminOrDesignEditor,
  brandingUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const parsed = brandingUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid branding upload request" });
    }

    const asset = await createCmsMediaAssetFromUpload({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: req.user?.id,
      directory: "branding",
      title: parsed.data.settingKey === "frontend_logo_url" ? "Site logo" : "Site favicon",
      alt: parsed.data.settingKey === "frontend_logo_url" ? "Site logo" : "Site favicon",
      optimize: BRANDING_OPTIONS,
    });

    await storage.settings.upsertSetting(parsed.data.settingKey, asset.url, "branding", false);
    storage.settings.invalidateCategory("branding");
    resetEmailBrandingCache();
    r2Service.resetClient();

    res.status(201).json({
      key: parsed.data.settingKey,
      url: asset.url,
      mediaId: asset.id,
    });
  }),
);

router.delete(
  "/settings/:key",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    if (paramString(req.params.key) === CRM_PIPELINE_SETTING_KEY)
      return res
        .status(400)
        .json({ message: "Use /api/admin/crm/settings/pipeline to restore pipeline defaults" });
    const existing = (await storage.settings.getAllSettings()).find(
      (s) => s.key === paramString(req.params.key),
    );
    if (isPrivateProofSetting(paramString(req.params.key), existing?.category))
      return res.status(403).json({ message: "Use the private proof editor" });
    await storage.settings.deleteSetting(paramString(req.params.key));
    res.json({ message: "Setting deleted" });
  }),
);

const testConnectionSchema = z.object({
  integration: z.enum(["mailgun", "mailchimp", "cloudflare_r2"]),
});

router.post(
  "/settings/test-connection",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { integration } = testConnectionSchema.parse(req.body);

    if (integration === "mailgun") {
      const result = await testMailgunConnection();
      res.json(result);
      return;
    }

    if (integration === "mailchimp") {
      const result = await testMailchimpConnection();
      res.json(result);
      return;
    }

    if (integration === "cloudflare_r2") {
      const result = await r2Service.testConnection();
      res.json(result);
      return;
    }

    res.status(400).json({ success: false, message: "Unknown integration" });
  }),
);

router.get(
  "/email-templates",
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const templates = await storage.emailTemplates.getAllTemplates();
    res.json(templates);
  }),
);

router.post(
  "/email-templates/restore",
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const result = await ensureSystemEmailTemplates(true);
    const templates = await storage.emailTemplates.getAllTemplates();
    res.json({
      restored: result.total,
      templates,
    });
  }),
);

const updateTemplateSchema = z.object({
  subject: z.string().optional(),
  htmlBody: z.string().optional(),
  isActive: z.boolean().optional(),
});

router.put(
  "/email-templates/:slug",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const data = updateTemplateSchema.parse(req.body);
    const template = await storage.emailTemplates.updateTemplate(
      paramString(req.params.slug),
      data,
    );
    if (!template) {
      res.status(404).json({ message: "Template not found" });
      return;
    }
    res.json(template);
  }),
);

const previewTemplateSchema = z.object({
  htmlBody: z.string().optional(),
  subject: z.string().optional(),
});

router.post(
  "/email-templates/:slug/preview",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { htmlBody: overrideBody, subject: overrideSubject } = previewTemplateSchema.parse(
      req.body,
    );
    const template = await storage.emailTemplates.getTemplate(paramString(req.params.slug));
    if (!template) {
      res.status(404).json({ message: "Template not found" });
      return;
    }

    const sampleVars: Record<string, string> = {};
    for (const v of template.variables) {
      if (v === "firstName") sampleVars[v] = "Jane";
      else if (v === "loginUrl" || v === "resetUrl" || v === "dashboardUrl")
        sampleVars[v] = "https://coreplatform.com/example-link";
      else if (v === "reason") sampleVars[v] = "Additional credentials required.";
      else if (v === "tempPassword") sampleVars[v] = "Temp1234!";
      else if (v === "therapistName" || v === "clientName" || v === "senderName")
        sampleVars[v] = "Jane Doe";
      else if (v === "therapistEmail" || v === "clientEmail" || v === "senderEmail")
        sampleVars[v] = "jane@example.com";
      else if (v === "messageBody")
        sampleVars[v] = "Hello, I would like to learn more about your services.";
      else sampleVars[v] = `[${v}]`;
    }

    const body = overrideBody || template.htmlBody;
    const subject = overrideSubject || template.subject;
    const renderedBody = renderTemplate(body, sampleVars);
    const renderedSubject = renderTemplate(subject, sampleVars);
    const html = await renderEmailShell("", renderedBody);

    res.json({ subject: renderedSubject, html });
  }),
);

router.post(
  "/email-templates/:slug/test",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const template = await storage.emailTemplates.getTemplate(paramString(req.params.slug));
    if (!template) {
      res.status(404).json({ message: "Template not found" });
      return;
    }

    const adminEmail = req.user!.email;
    const sampleVars: Record<string, string> = {};
    for (const v of template.variables) {
      if (v === "firstName") sampleVars[v] = "Test User";
      else if (v === "loginUrl" || v === "resetUrl" || v === "dashboardUrl")
        sampleVars[v] = getBaseUrl(req);
      else if (v === "reason") sampleVars[v] = "This is a test rejection reason.";
      else if (v === "tempPassword") sampleVars[v] = "TestPass123!";
      else if (v === "therapistName" || v === "clientName" || v === "senderName")
        sampleVars[v] = "Test Person";
      else if (v === "therapistEmail" || v === "clientEmail" || v === "senderEmail")
        sampleVars[v] = "test@example.com";
      else if (v === "messageBody")
        sampleVars[v] = "This is a test message from the email template tester.";
      else sampleVars[v] = `[${v}]`;
    }

    const renderedBody = renderTemplate(template.htmlBody, sampleVars);
    const renderedSubject = renderTemplate(template.subject, sampleVars);
    const html = await renderEmailShell("", renderedBody);

    const sent = await sendEmail(adminEmail, `[TEST] ${renderedSubject}`, html);
    res.json({
      success: sent,
      message: sent
        ? `Test email sent to ${adminEmail}`
        : "Email not sent — no email provider configured",
    });
  }),
);

export default router;
