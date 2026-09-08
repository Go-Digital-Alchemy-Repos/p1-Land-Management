import { eq } from "drizzle-orm";
import { db } from "../db";
import { emailTemplates, type InsertEmailTemplate } from "@shared/schema";
import type { EmailTemplateModule } from "@shared/schema/email-templates";
import { logger } from "../utils/logger";

const TEMPLATE_MODULES: Record<string, EmailTemplateModule> = {
  "password-reset": "users",
  "welcome-new-user": "users",
  "new-client-registration": "users",
  "contact-form-submission": "forms",
  "managed-form-submission": "forms",
  "event-registration-confirmation": "events",
  "event-registration-waitlisted": "events",
  "event-registration-canceled": "events",
  "event-payment-confirmation": "events",
  "event-reminder": "events",
  "event-recording-available": "events",
  "event-canceled": "events",
};

function baseWrap(title: string, body: string): string {
  return `<h2 style="margin:0 0 16px;color:#1e3a5f;font-size:20px;">${title}</h2>
${body}`;
}

function removeLegacyAdminCta(htmlBody: string) {
  return htmlBody.replace(
    /\s*<table cellpadding="0" cellspacing="0" style="margin:24px 0;">[\s\S]*?Admin Dashboard<\/a>\s*<\/td><\/tr>\s*<\/table>/i,
    "",
  );
}

const SYSTEM_EMAIL_TEMPLATE_BASE_DEFAULTS: Omit<InsertEmailTemplate, "module">[] = [
  {
    slug: "password-reset",
    name: "Password Reset",
    subject: "Reset Your Core Platform Password",
    description: "Sent when a user requests a password reset or an admin sends a reset link.",
    variables: ["firstName", "resetUrl"],
    htmlBody: baseWrap(
      "Password Reset",
      `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi {{firstName}},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">We received a request to reset your password. Click the button below to set a new password:</p>
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td style="background:#2d8a7e;border-radius:6px;padding:12px 28px;">
        <a href="{{resetUrl}}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Reset Password</a>
      </td></tr>
    </table>
    <p style="color:#374151;font-size:15px;line-height:1.6;">This link will expire in 24 hours. If you didn't request a password reset, you can safely ignore this email.</p>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">If the button doesn't work, copy and paste this URL into your browser:</p>
    <p style="color:#6b7280;font-size:13px;word-break:break-all;">{{resetUrl}}</p>`,
    ),
  },
  {
    slug: "welcome-new-user",
    name: "Welcome New User",
    subject: "Welcome to Core Platform!",
    description: "Sent when an admin manually creates a new user account.",
    variables: ["firstName", "loginUrl", "tempPassword"],
    htmlBody: baseWrap(
      "Welcome to Core Platform",
      `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi {{firstName}},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">An account has been created for you on Core Platform.</p>
    {{#tempPassword}}<div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="margin:0;color:#166534;font-size:14px;"><strong>Temporary Password:</strong> {{tempPassword}}</p>
      <p style="margin:4px 0 0;color:#166534;font-size:13px;">Please change this after logging in.</p>
    </div>{{/tempPassword}}
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td style="background:#2d8a7e;border-radius:6px;padding:12px 28px;">
        <a href="{{loginUrl}}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Log In to Your Account</a>
      </td></tr>
    </table>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">If you have any questions, please reach out through our contact page.</p>`,
    ),
  },
  {
    slug: "new-therapist-registration",
    name: "New Provider Registration (Admin)",
    subject: "New Provider Registration: {{therapistName}}",
    description: "Sent to admin(s) when a provider self-registers on the platform.",
    variables: ["therapistName", "therapistEmail", "dashboardUrl"],
    htmlBody: baseWrap(
      "New Provider Registration",
      `
    <p style="color:#374151;font-size:15px;line-height:1.6;">A new provider has registered on Core Platform and is awaiting review.</p>
    <div style="background:#f3f4f6;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Name:</strong> {{therapistName}}</p>
      <p style="margin:0;color:#374151;font-size:14px;"><strong>Email:</strong> {{therapistEmail}}</p>
    </div>
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td style="background:#2d8a7e;border-radius:6px;padding:12px 28px;">
        <a href="{{dashboardUrl}}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Review in Admin Dashboard</a>
      </td></tr>
    </table>`,
    ),
  },
  {
    slug: "new-client-registration",
    name: "New Member Registration (Admin)",
    subject: "New Member Registration: {{clientName}}",
    description: "Sent to admin(s) when a member self-registers on the platform.",
    variables: ["clientName", "clientEmail", "dashboardUrl"],
    htmlBody: baseWrap(
      "New Member Registration",
      `
    <p style="color:#374151;font-size:15px;line-height:1.6;">A new member has registered on Core Platform.</p>
    <div style="background:#f3f4f6;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Name:</strong> {{clientName}}</p>
      <p style="margin:0;color:#374151;font-size:14px;"><strong>Email:</strong> {{clientEmail}}</p>
    </div>
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td style="background:#2d8a7e;border-radius:6px;padding:12px 28px;">
        <a href="{{dashboardUrl}}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">View in Admin Dashboard</a>
      </td></tr>
    </table>`,
    ),
  },
  {
    slug: "contact-form-submission",
    name: "Contact Form Submission (Admin)",
    subject: "New Contact Form: {{senderName}}",
    description: "Sent to admin(s) when someone submits the contact form.",
    variables: ["senderName", "senderEmail", "messageBody"],
    htmlBody: baseWrap(
      "New Contact Form Submission",
      `
    <p style="color:#374151;font-size:15px;line-height:1.6;">A new message has been submitted through the contact form.</p>
    <div style="background:#f3f4f6;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>From:</strong> {{senderName}} ({{senderEmail}})</p>
      <p style="margin:8px 0 0;color:#374151;font-size:14px;"><strong>Message:</strong></p>
      <p style="margin:4px 0 0;color:#374151;font-size:14px;">{{messageBody}}</p>
    </div>`,
    ),
  },
  {
    slug: "managed-form-submission",
    name: "Managed Form Submission (Admin)",
    subject: "New Form Submission: {{formName}}",
    description:
      "Sent to assigned system users when a managed frontend form receives a submission.",
    variables: ["formName", "submissionSummary"],
    htmlBody: baseWrap(
      "New Form Submission",
      `
    <p style="color:#374151;font-size:15px;line-height:1.6;">A new submission was received for <strong>{{formName}}</strong>.</p>
    <div style="background:#f3f4f6;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0;color:#374151;font-size:14px;white-space:pre-line;">{{submissionSummary}}</p>
    </div>`,
    ),
  },
  {
    slug: "event-registration-confirmation",
    name: "Event Registration Confirmation",
    subject: "Registration Confirmed: {{eventTitle}}",
    description: "Sent when a user successfully registers for an event.",
    variables: [
      "firstName",
      "eventTitle",
      "eventDate",
      "eventLocation",
      "googleCalendarUrl",
      "outlookCalendarUrl",
      "icsCalendarUrl",
    ],
    htmlBody: baseWrap(
      "Registration Confirmed",
      `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi {{firstName}},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">You're registered for <strong>{{eventTitle}}</strong>!</p>
    <div style="background:#f3f4f6;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Date:</strong> {{eventDate}}</p>
      <p style="margin:0;color:#374151;font-size:14px;"><strong>Location:</strong> {{eventLocation}}</p>
    </div>
    <p style="color:#374151;font-size:15px;line-height:1.6;">You'll receive a reminder email the day before the event with all the details you need.</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;"><strong>Add to your calendar:</strong></p>
    <table cellpadding="0" cellspacing="0" style="margin:8px 0 16px;">
      <tr>
        <td style="padding-right:8px;"><a href="{{googleCalendarUrl}}" style="display:inline-block;background:#4285f4;color:#ffffff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600;" target="_blank">Google Calendar</a></td>
        <td style="padding-right:8px;"><a href="{{icsCalendarUrl}}" style="display:inline-block;background:#333333;color:#ffffff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600;" download="event.ics">Apple / iCloud</a></td>
        <td><a href="{{outlookCalendarUrl}}" style="display:inline-block;background:#0078d4;color:#ffffff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600;" target="_blank">Office 365</a></td>
      </tr>
    </table>
    <p style="color:#374151;font-size:15px;line-height:1.6;">We look forward to seeing you there. If you need to cancel your registration, you can do so from the event page.</p>`,
    ),
  },
  {
    slug: "event-registration-waitlisted",
    name: "Event Registration Waitlisted",
    subject: "Waitlisted: {{eventTitle}}",
    description: "Sent when a user is added to the waitlist for a full event.",
    variables: [
      "firstName",
      "eventTitle",
      "eventDate",
      "googleCalendarUrl",
      "outlookCalendarUrl",
      "icsCalendarUrl",
    ],
    htmlBody: baseWrap(
      "You're on the Waitlist",
      `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi {{firstName}},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">The event <strong>{{eventTitle}}</strong> on {{eventDate}} is currently at capacity. You've been added to the waitlist.</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">If a spot becomes available, you'll be automatically moved to confirmed status and we'll let you know. Once confirmed, you'll receive a reminder email the day before the event.</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;"><strong>Add to your calendar (just in case!):</strong></p>
    <table cellpadding="0" cellspacing="0" style="margin:8px 0 16px;">
      <tr>
        <td style="padding-right:8px;"><a href="{{googleCalendarUrl}}" style="display:inline-block;background:#4285f4;color:#ffffff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600;" target="_blank">Google Calendar</a></td>
        <td style="padding-right:8px;"><a href="{{icsCalendarUrl}}" style="display:inline-block;background:#333333;color:#ffffff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600;" download="event.ics">Apple / iCloud</a></td>
        <td><a href="{{outlookCalendarUrl}}" style="display:inline-block;background:#0078d4;color:#ffffff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600;" target="_blank">Office 365</a></td>
      </tr>
    </table>`,
    ),
  },
  {
    slug: "event-registration-canceled",
    name: "Event Registration Canceled",
    subject: "Registration Canceled: {{eventTitle}}",
    description: "Sent when a user's event registration is canceled.",
    variables: ["firstName", "eventTitle"],
    htmlBody: baseWrap(
      "Registration Canceled",
      `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi {{firstName}},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">Your registration for <strong>{{eventTitle}}</strong> has been canceled.</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">If this was a mistake, you can re-register from the event page if spots are still available.</p>`,
    ),
  },
  {
    slug: "event-payment-confirmation",
    name: "Event Payment Confirmation",
    subject: "Payment Confirmed: {{eventTitle}}",
    description: "Sent when a user successfully pays for an event.",
    variables: ["firstName", "eventTitle", "eventDate", "eventLocation", "amountPaid"],
    htmlBody: baseWrap(
      "Payment Confirmed",
      `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi {{firstName}},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">Your payment for <strong>{{eventTitle}}</strong> has been confirmed.</p>
    <div style="background:#f3f4f6;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Amount Paid:</strong> {{amountPaid}}</p>
      <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Date:</strong> {{eventDate}}</p>
      <p style="margin:0;color:#374151;font-size:14px;"><strong>Location:</strong> {{eventLocation}}</p>
    </div>
    <p style="color:#374151;font-size:15px;line-height:1.6;">We look forward to seeing you there!</p>`,
    ),
  },
  {
    slug: "event-reminder",
    name: "Event Reminder",
    subject: "Reminder: {{eventTitle}} is coming up",
    description: "Sent as a reminder before an event starts.",
    variables: [
      "firstName",
      "eventTitle",
      "eventDate",
      "eventLocation",
      "eventDescription",
      "virtualJoinUrl",
      "locationAddress",
      "googleCalendarUrl",
      "outlookCalendarUrl",
      "icsCalendarUrl",
    ],
    htmlBody: baseWrap(
      "Event Reminder",
      `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi {{firstName}},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">This is a reminder that <strong>{{eventTitle}}</strong> is coming up tomorrow!</p>
    <div style="background:#f3f4f6;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Date:</strong> {{eventDate}}</p>
      <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Location:</strong> {{eventLocation}}</p>
      {{#locationAddress}}<p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Address:</strong> {{locationAddress}}</p>{{/locationAddress}}
      {{#virtualJoinUrl}}<p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Join Online:</strong> <a href="{{virtualJoinUrl}}" style="color:#2d8a7e;">{{virtualJoinUrl}}</a></p>{{/virtualJoinUrl}}
      {{#eventDescription}}<p style="margin:8px 0 0;color:#6b7280;font-size:13px;">{{eventDescription}}</p>{{/eventDescription}}
    </div>
    <p style="color:#374151;font-size:15px;line-height:1.6;"><strong>Add to your calendar:</strong></p>
    <table cellpadding="0" cellspacing="0" style="margin:8px 0 16px;">
      <tr>
        <td style="padding-right:8px;"><a href="{{googleCalendarUrl}}" style="display:inline-block;background:#4285f4;color:#ffffff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600;" target="_blank">Google Calendar</a></td>
        <td style="padding-right:8px;"><a href="{{icsCalendarUrl}}" style="display:inline-block;background:#333333;color:#ffffff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600;" download="event.ics">Apple / iCloud</a></td>
        <td><a href="{{outlookCalendarUrl}}" style="display:inline-block;background:#0078d4;color:#ffffff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600;" target="_blank">Office 365</a></td>
      </tr>
    </table>
    <p style="color:#374151;font-size:15px;line-height:1.6;">We look forward to seeing you there!</p>`,
    ),
  },
  {
    slug: "event-recording-available",
    name: "Event Recording Available",
    subject: "Recording Available: {{eventTitle}}",
    description: "Sent when an event recording is available for viewing.",
    variables: ["firstName", "eventTitle", "recordingUrl"],
    htmlBody: baseWrap(
      "Recording Now Available",
      `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi {{firstName}},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">The recording for <strong>{{eventTitle}}</strong> is now available for you to view.</p>
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td style="background:#2d8a7e;border-radius:6px;padding:12px 28px;">
        <a href="{{recordingUrl}}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">View Recording</a>
      </td></tr>
    </table>
    <p style="color:#374151;font-size:15px;line-height:1.6;">You can also find this recording in your dashboard under the Recording Archives section.</p>`,
    ),
  },
  {
    slug: "event-canceled",
    name: "Event Canceled",
    subject: "Event Canceled: {{eventTitle}}",
    description: "Sent when an event is canceled by the administrator.",
    variables: ["firstName", "eventTitle"],
    htmlBody: baseWrap(
      "Event Cancellation Notice",
      `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi {{firstName}},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">We are writing to inform you that the event <strong>{{eventTitle}}</strong> has been canceled.</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">We apologize for any inconvenience this may cause. If you paid for this event, a refund will be processed automatically.</p>`,
    ),
  },
];

export const SYSTEM_EMAIL_TEMPLATE_DEFAULTS: InsertEmailTemplate[] =
  SYSTEM_EMAIL_TEMPLATE_BASE_DEFAULTS.filter((template) => template.slug !== "new-client-registration").map((template) => ({
    ...template,
    module: TEMPLATE_MODULES[template.slug] ?? "system",
  }));

export async function ensureSystemEmailTemplates(refreshExisting = false) {
  let created = 0;
  let updated = 0;

  for (const template of SYSTEM_EMAIL_TEMPLATE_DEFAULTS) {
    if (!refreshExisting) {
      const existing = await db.query.emailTemplates.findFirst({
        where: (emailTemplate, { eq }) => eq(emailTemplate.slug, template.slug),
      });

      if (
        existing &&
        (template.slug === "contact-form-submission" || template.slug === "managed-form-submission")
      ) {
        const nextHtmlBody = removeLegacyAdminCta(existing.htmlBody);
        const nextVariables = template.variables;
        const variablesChanged =
          JSON.stringify(existing.variables) !== JSON.stringify(nextVariables);

        if (nextHtmlBody !== existing.htmlBody || variablesChanged) {
          await db
            .update(emailTemplates)
            .set({
              htmlBody: nextHtmlBody,
              module: template.module,
              variables: nextVariables,
              updatedAt: new Date(),
            })
            .where(eq(emailTemplates.slug, template.slug));
          updated += 1;
        }
      }
    }

    if (refreshExisting) {
      await db
        .insert(emailTemplates)
        .values(template)
        .onConflictDoUpdate({
          target: emailTemplates.slug,
          set: {
            name: template.name,
            module: template.module,
            subject: template.subject,
            htmlBody: template.htmlBody,
            description: template.description,
            variables: template.variables,
            isActive: template.isActive ?? true,
            updatedAt: new Date(),
          },
        });
      updated += 1;
      continue;
    }

    const inserted = await db.insert(emailTemplates).values(template).onConflictDoNothing({
      target: emailTemplates.slug,
    });
    created += inserted.rowCount ?? 0;
  }

  logger.app.info("System email templates ensured", {
    total: SYSTEM_EMAIL_TEMPLATE_DEFAULTS.length,
    created,
    updated,
    refreshExisting,
  });

  return {
    total: SYSTEM_EMAIL_TEMPLATE_DEFAULTS.length,
    created,
    updated,
  };
}
