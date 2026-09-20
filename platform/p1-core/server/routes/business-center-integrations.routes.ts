import { GOOGLE_REPORTING_CATEGORY, googleReportingKeys, googleReportingKeyRules, googleReportingWrite } from "@shared/google-reporting-config";
import { googleReportingConfiguration } from "../services/google-reporting-config.service";
import { Router, type ErrorRequestHandler } from "express";
import { z } from "zod";
import { integrationFields, integrationKeyRules, integrationRegistry, integrationWriteSchema, websiteIntegrationProviderSchema, websiteIntegrationProviders, type WebsiteIntegrationProvider } from "@shared/website-integrations";
import { storage } from "../storage";
import { requireWebsiteOwner } from "../middleware/website-owner";
import { asyncHandler } from "../middleware/error-handler";
import { testMailgunConnection, resetMailgunConfig } from "../services/email.service";
import { testMailchimpConnection } from "../services/mailchimp.service";
import { testConnection as testStorage, resetClient } from "../services/r2.service";

const empty = z.object({}).strict();
const router = Router();
router.use(requireWebsiteOwner);
const s3Keys = ["ENDPOINT", "ACCESS_KEY_ID", "SECRET_ACCESS_KEY", "BUCKET", "REGION", "FORCE_PATH_STYLE"];
const hasS3 = (prefix: string) => s3Keys.some(key => process.env[`${prefix}_${key}`] !== undefined);
function source(provider: WebsiteIntegrationProvider) {
  return provider === "cloudflare_r2" && hasS3("S3") ? "deployment" : "settings";
}
async function view(provider: WebsiteIntegrationProvider) {
  const snapshot = await storage.settings.getCategorySnapshot(provider, false, integrationKeyRules(provider));
  const registry = integrationRegistry[provider];
  return {
    provider, version: snapshot.version, effectiveSource: source(provider),
    fields: Object.fromEntries(registry.publicKeys.map(key => [key, snapshot.values[key] || ""])),
    secrets: Object.fromEntries(registry.secretKeys.map(key => [key, { configured: Boolean(snapshot.values[key]) }])),
    configurationIssue: null,
    configurationManagement: "settings", // Editing a fallback does not change deployment configuration.
    testEffects: "Read-only provider request; no email, subscriptions, or object writes.",
  };
}
router.get("/", asyncHandler(async (req, res) => {
  empty.parse(req.query);
  res.json({
    providers: await Promise.all(websiteIntegrationProviders.map(async provider => {
      try { return await view(provider); } catch (error) {
        if ((error as { code?: string }).code !== "settings_boundary_mismatch") throw error;
        const registry = integrationRegistry[provider];
        return { provider, version: "0".repeat(64), effectiveSource: source(provider),
          fields: Object.fromEntries(registry.publicKeys.map(key => [key, ""])),
          secrets: Object.fromEntries(registry.secretKeys.map(key => [key, { configured: false }])),
          configurationManagement: "settings", configurationIssue: "Stored settings require category or secrecy reconciliation before editing. Values are withheld.",
          testEffects: "Read-only provider request; no email, subscriptions, or object writes." };
      }
    })),
    google: await googleReportingConfiguration.view(),
    backups: { effectiveSource: hasS3("BACKUP_S3") ? "BACKUP_S3" : hasS3("S3") ? "S3" : ["ACCOUNT_ID", "ACCESS_KEY_ID", "SECRET_ACCESS_KEY", "BUCKET_NAME"].every(key => process.env[`BACKUP_R2_${key}`]) ? "BACKUP_R2" : "settings" },
    smtpFallbackConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
  });
}));
router.put(
  "/google-reporting",
  asyncHandler(async (req, res) => {
    empty.parse(req.query);
    const body = googleReportingWrite.parse(req.body);
    const entries = Object.entries(googleReportingKeys).map(([field, key]) => ({
      key,
      category: GOOGLE_REPORTING_CATEGORY,
      value: body.fields[field as keyof typeof googleReportingKeys],
      isSecret: false,
    }));
    await storage.settings.upsertSettings(
      entries,
      {
        category: GOOGLE_REPORTING_CATEGORY,
        version: body.expectedVersion,
        keyRules: googleReportingKeyRules,
      },
      {
        userId: req.user!.id,
        action: "website_google_reporting_targets_updated",
        details: JSON.stringify({
          keys: entries.map((entry) => entry.key),
          targetSource: body.fields.targetSource,
        }),
      },
    );
    res.json({ saved: true, google: await googleReportingConfiguration.view() });
  }),
);
router.put("/:provider", asyncHandler(async (req, res) => {
  empty.parse(req.query);
  const provider = websiteIntegrationProviderSchema.parse(req.params.provider);
  const body = integrationWriteSchema(provider).parse(req.body);
  const fields = body.fields as Record<string, string | { operation: "keep" | "clear" | "replace"; value?: string }>;
  const entries = Object.entries(fields).flatMap(([key, field]) => {
    if (typeof field === "string") return [{ key, category: provider, value: field, isSecret: false }];
    if (field.operation === "keep") return [];
    return [{ key, category: provider, value: field.operation === "clear" ? "" : field.value!, isSecret: true }];
  });
  await storage.settings.upsertSettings(entries, { category: provider, version: body.expectedVersion, keyRules: integrationKeyRules(provider) }, {
    userId: req.user!.id, action: "website_integration_updated", details: JSON.stringify({ provider, keys: entries.map(entry => entry.key) }),
  });
  if (provider === "mailgun") resetMailgunConfig();
  if (provider === "cloudflare_r2") resetClient();
  res.json({ saved: true, integration: await view(provider) });
}));
router.post("/:provider/test", asyncHandler(async (req, res) => {
  empty.parse(req.query); empty.parse(req.body ?? {});
  const provider = websiteIntegrationProviderSchema.parse(req.params.provider);
  // Validate persisted identifiers too: legacy values were accepted without provider constraints.
  if (source(provider) === "settings") {
    const snapshot = await storage.settings.getCategorySnapshot(provider, false, integrationKeyRules(provider));
    const registry = integrationRegistry[provider];
    const fields = Object.fromEntries([
      ...registry.publicKeys.map(key => [key, snapshot.values[key] || ""]),
      ...registry.secretKeys.map(key => [key, { operation: "keep" }]),
    ]);
    if (!integrationFields[provider].safeParse(fields).success || (provider === "mailchimp" && !snapshot.values.mailchimp_server_prefix && !/^[^-]+-us\d+$/.test(snapshot.values.mailchimp_api_key || ""))) {
      await storage.activity.log(req.user!.id, "website_integration_tested", JSON.stringify({ provider, success: false, code: "invalid_configuration" }));
      res.json({ success: false, code: "invalid_configuration", effects: "read-only" }); return;
    }
  }
  let success = false;
  try { success = (await (provider === "mailgun" ? testMailgunConnection() : provider === "mailchimp" ? testMailchimpConnection() : testStorage())).success; } catch { /* Never forward provider error bodies or credentials. */ }
  await storage.activity.log(req.user!.id, "website_integration_tested", JSON.stringify({ provider, success }));
  res.json({ success, code: success ? "connection_verified" : "connection_unavailable", effects: "read-only" });
}));
// Storage/database errors can contain query parameters. Never forward or log the
// original exception through the generic handler, including in development.
const integrationError: ErrorRequestHandler = (error, _req, res, _next) => {
  const status = error instanceof z.ZodError ? 400 : error?.statusCode === 409 ? 409 : 503;
  res.status(status).json({ code: status === 400 ? "invalid_request" : status === 409 ? "settings_conflict" : "integration_unavailable" });
};
router.use(integrationError);
export default router;
