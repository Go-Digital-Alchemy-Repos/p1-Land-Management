import { isGoogleReportingSetting } from "@shared/google-reporting-config";
import { integrationRegistry, websiteIntegrationProviders } from "@shared/website-integrations";
import { isWebsiteIdentityKey } from "@shared/website-identity";
import { isSocialSettingKey } from "@shared/social-media";
import { isWebsiteFontKey } from "@shared/website-fonts";
import { isWebsiteColorKey } from "@shared/website-colors";
import { isWebsiteOwner, requireWebsiteOwner, websiteSettingScope } from "../middleware/website-owner";
import { getBaseUrl } from "../utils/route-helpers";
import { CRM_PIPELINE_SETTING_KEY } from "@shared/crm-pipeline-settings";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { storage } from "../storage/index";
import { authenticateToken, hasAdminPermission, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/error-handler";
import { paramString } from "../utils/params";
import {
  sendEmail,
  renderEmailShell,
  renderTemplate,
  resetEmailBrandingCache,
} from "../services/email.service";
import * as r2Service from "../services/r2.service";
import { SYSTEM_EMAIL_TEMPLATE_DEFAULTS } from "../services/system-email-templates.service";
import { emailTemplateSaveSchema, emailTemplateRestoreSchema } from "@shared/email-template-contract";
import { isDesignEditableBrandingSetting } from "../utils/branding-settings-policy";

const router = Router();

const RETIRED_PRIVATE_PROOF_KEY = "p1_private_proof_inventory";
const RETIRED_PRIVATE_PROOF_CATEGORY = "p1_private_proof";

function isRetiredPrivateProofSetting(key: unknown, category?: unknown) {
  return [key, category].some(
    (value) =>
      typeof value === "string" &&
      [RETIRED_PRIVATE_PROOF_KEY, RETIRED_PRIVATE_PROOF_CATEGORY].includes(
        value.trim().toLowerCase(),
      ),
  );
}

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

const integrationKeys = new Set<string>(Object.values(integrationRegistry).flatMap(provider => [...provider.publicKeys, ...provider.secretKeys]));
function isWebsiteIntegrationSetting(key: unknown, category?: unknown) {
  return isGoogleReportingSetting(key, category) || (typeof key === "string" && integrationKeys.has(key)) ||
    (typeof category === "string" && websiteIntegrationProviders.some(provider => provider === category));
}
const integrationMovedMessage = "Manage website integrations in Marketing > Website System > Integrations";
function rejectLegacyIntegration(req: Request, res: Response) {
  return isWebsiteOwner(req)
    ? res.status(409).json({message: integrationMovedMessage})
    : res.status(403).json({message: "Owner access required"});
}

function requireSettingWritePermission(req: Request, res: Response, next: NextFunction) {
  if (isWebsiteIntegrationSetting(req.body?.key, req.body?.category)) return rejectLegacyIntegration(req,res);
  if (isWebsiteIdentityKey(req.body?.key)) return res.status(409).json({message:"Edit company identity in Marketing > Design > Branding"});
  if (isSocialSettingKey(req.body?.key)) return res.status(409).json({message:"Edit social links in Marketing > Design > Social media"});
  if (isWebsiteFontKey(req.body?.key)) return res.status(409).json({message:"Edit website fonts in Marketing > Design > Typography"});
  if (isWebsiteColorKey(req.body?.key)) return res.status(409).json({message:"Edit website colors in Marketing > Design > Color palette"});
  if (websiteSettingScope(req.body?.key, req.body?.category)) return requireWebsiteOwner(req,res,next);
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
      if (isWebsiteIntegrationSetting(s.key, s.category)) continue;
      if (isRetiredPrivateProofSetting(s.key, s.category)) continue;
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
      isRetiredPrivateProofSetting(data.key, data.category) ||
      isRetiredPrivateProofSetting(existingPrivate?.key, existingPrivate?.category)
    )
      return res.status(403).json({ message: "This retired private proof setting is protected" });
    if (isWebsiteIntegrationSetting(existingPrivate?.key, existingPrivate?.category)) return rejectLegacyIntegration(req,res);
    const scope = websiteSettingScope(data.key,data.category) || websiteSettingScope(existingPrivate?.key,existingPrivate?.category);
    if (scope && !isWebsiteOwner(req)) return res.status(403).json({message:"Owner access required"});
    if (req.user?.role !== "admin" && !(scope && isWebsiteOwner(req))) {
      if (existingPrivate && (existingPrivate.category !== "branding" || existingPrivate.isSecret))
        return res.status(403).json({message:"Forbidden"});
    }
    const setting = scope
      ? (await storage.settings.upsertSettings([data],undefined,{userId:req.user!.id,action:scope === "head-tags" ? "website_head_tags_updated" : "website_features_updated",details:scope === "head-tags" ? "public_head_html (legacy settings route)" : `${data.key} (legacy settings route)`}))[0]
      : await storage.settings.upsertSetting(data.key,data.value,data.category,data.isSecret);

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
  (_req, res) => { res.status(409).json({message:"Upload branding images in Marketing > Design > Branding"}); },
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
    if (isWebsiteIntegrationSetting(paramString(req.params.key), existing?.category)) return rejectLegacyIntegration(req,res);
    if (isRetiredPrivateProofSetting(paramString(req.params.key), existing?.category))
      return res.status(403).json({ message: "This retired private proof setting is protected" });
    if (isWebsiteIdentityKey(paramString(req.params.key))) return res.status(409).json({message:"Clear company identity in Marketing > Design > Branding"});
    if (isSocialSettingKey(paramString(req.params.key))) return res.status(409).json({message:"Clear social links in Marketing > Design > Social media"});
    if (isWebsiteFontKey(paramString(req.params.key))) return res.status(409).json({message:"Clear website fonts in Marketing > Design > Typography"});
    if (isWebsiteColorKey(paramString(req.params.key))) return res.status(409).json({message:"Clear website colors in Marketing > Design > Color palette"});
    const scope = websiteSettingScope(paramString(req.params.key), existing?.category);
    if (scope) {
      if (!isWebsiteOwner(req)) return res.status(403).json({message:"Owner access required"});
      return res.status(400).json({message:scope === "head-tags" ? "Clear website head markup in Marketing > Website System > Head tag additions" : "Change feature flags in Marketing > Website System > Website modules"});
    }
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
    testConnectionSchema.parse(req.body);
    rejectLegacyIntegration(req,res);
  }),
);

router.get(
  "/email-templates",
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.json(await storage.emailTemplates.getVersionedTemplates());
  }),
);

router.post(
  "/email-templates/restore",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const body = emailTemplateRestoreSchema.parse(req.body);
    res.json(await storage.emailTemplates.restoreVersionedTemplates(SYSTEM_EMAIL_TEMPLATE_DEFAULTS, body.expectedVersion,
      { userId: req.user!.id, action: "website_email_templates_restored", details: "System defaults restored; activation preserved" }));
  }),
);

router.put(
  "/email-templates/:slug",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const body = emailTemplateSaveSchema.parse(req.body);
    const slug = paramString(req.params.slug);
    res.json(await storage.emailTemplates.saveVersionedTemplate(slug, body.template, body.expectedVersion,
      { userId: req.user!.id, action: "website_email_template_updated", details: slug }));
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
