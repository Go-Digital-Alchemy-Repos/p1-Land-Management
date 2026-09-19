import { Router } from "express";
import { z, ZodError } from "zod";
import { storage } from "../storage";
import { requireWebsiteOwner } from "../middleware/website-owner";
import { asyncHandler } from "../middleware/error-handler";
import {
  emailTemplateSaveSchema,
  emailTemplateRestoreSchema,
} from "@shared/email-template-contract";
import { SYSTEM_EMAIL_TEMPLATE_DEFAULTS } from "../services/system-email-templates.service";
import { renderEmailShell, renderTemplate, sendEmail } from "../services/email.service";
import { getBaseUrl } from "../utils/route-helpers";

const router = Router();
const empty = z.object({}).strict();
const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const previewSchema = z
  .object({
    subject: z.string().min(1).max(1000).optional(),
    htmlBody: z.string().max(500000).optional(),
  })
  .strict();
router.use(requireWebsiteOwner);
router.use((req, _res, next) => {
  try {
    empty.parse(req.query);
    next();
  } catch (error) {
    next(error);
  }
});

// Keep sample substitution aligned with the retained editor, including unknown variables.
function sampleVariables(
  variables: string[],
  test: boolean,
  baseUrl: string,
): Record<string, string> {
  return Object.fromEntries(
    variables.map((variable) => {
      let value: string;
      if (variable === "firstName") value = test ? "Test User" : "Jane";
      else if (["loginUrl", "resetUrl", "dashboardUrl"].includes(variable)) value = baseUrl;
      else if (variable === "reason")
        value = test ? "This is a test rejection reason." : "Additional credentials required.";
      else if (variable === "tempPassword") value = test ? "TestPass123!" : "Temp1234!";
      else if (["therapistName", "clientName", "senderName"].includes(variable))
        value = test ? "Test Person" : "Jane Doe";
      else if (["therapistEmail", "clientEmail", "senderEmail"].includes(variable))
        value = test ? "test@example.com" : "jane@example.com";
      else if (variable === "messageBody")
        value = test
          ? "This is a test message from the email template tester."
          : "Hello, I would like to learn more about your services.";
      else value = `[${variable}]`;
      return [variable, value];
    }),
  );
}

router.get(
  "/",
  asyncHandler(async (_req, res) => res.json(await storage.emailTemplates.getVersionedTemplates())),
);
router.put(
  "/:slug",
  asyncHandler(async (req, res) => {
    const slug = slugSchema.parse(req.params.slug);
    const body = emailTemplateSaveSchema.parse(req.body);
    res.json(
      await storage.emailTemplates.saveVersionedTemplate(
        slug,
        body.template,
        body.expectedVersion,
        { userId: req.user!.id, action: "website_email_template_updated", details: slug },
      ),
    );
  }),
);
router.post(
  "/restore",
  asyncHandler(async (req, res) => {
    const body = emailTemplateRestoreSchema.parse(req.body);
    res.json(
      await storage.emailTemplates.restoreVersionedTemplates(
        SYSTEM_EMAIL_TEMPLATE_DEFAULTS,
        body.expectedVersion,
        {
          userId: req.user!.id,
          action: "website_email_templates_restored",
          details: "System defaults restored; activation preserved",
        },
      ),
    );
  }),
);
router.post(
  "/:slug/preview",
  asyncHandler(async (req, res) => {
    const slug = slugSchema.parse(req.params.slug);
    const body = previewSchema.parse(req.body);
    const template = await storage.emailTemplates.getTemplate(slug);
    if (!template) {
      res.status(404).json({ message: "Template not found" });
      return;
    }
    const variables = sampleVariables(
      template.variables,
      false,
      "https://www.p1landmanagement.com/example-link",
    );
    const subject = renderTemplate(body.subject ?? template.subject, variables);
    const html = await renderEmailShell(
      "",
      renderTemplate(body.htmlBody ?? template.htmlBody, variables),
    );
    res.json({ subject, html });
  }),
);
router.post(
  "/:slug/test",
  asyncHandler(async (req, res) => {
    const slug = slugSchema.parse(req.params.slug);
    empty.parse(req.body ?? {});
    const template = await storage.emailTemplates.getTemplate(slug);
    if (!template) {
      res.status(404).json({ message: "Template not found" });
      return;
    }
    const recipient = z.string().email().safeParse(req.user!.email);
    if (!recipient.success) throw new Error("Authenticated email unavailable");
    const variables = sampleVariables(template.variables, true, getBaseUrl(req));
    const html = await renderEmailShell("", renderTemplate(template.htmlBody, variables));
    const subject = renderTemplate(template.subject, variables);
    // A durable intent precedes the external side effect. Neither audit entry contains content or addresses.
    await storage.activity.log(req.user!.id, "website_email_template_test_requested", slug);
    const sent = await sendEmail(recipient.data, `[TEST] ${subject}`, html);
    await storage.activity.log(
      req.user!.id,
      sent ? "website_email_template_test_sent" : "website_email_template_test_not_sent",
      slug,
    );
    res.json({
      success: sent,
      message: sent
        ? "Test email sent to your account email."
        : "Test email was not sent. Check the email provider configuration.",
    });
  }),
);

// Storage/provider exceptions can contain bodies or addresses. Preserve only known client-safe failures.
router.use(
  (
    error: unknown,
    _req: import("express").Request,
    _res: import("express").Response,
    next: import("express").NextFunction,
  ) => {
    if (error instanceof ZodError) {
      next(error);
      return;
    }
    if ((error as { statusCode?: number })?.statusCode === 409) {
      next(
        Object.assign(
          new Error("Email templates changed. Reload saved templates before trying again."),
          { statusCode: 409 },
        ),
      );
      return;
    }
    next(
      Object.assign(
        new Error(
          "Email template operation could not be confirmed. Reload saved templates and check delivery before retrying.",
        ),
        { statusCode: 503 },
      ),
    );
  },
);
export default router;
