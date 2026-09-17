import type { DashboardFormNotification } from "@shared/schema";
import { createFederationClient, federationConfig, federationEnabled } from "./federation-client";
import { deliverManagedFormNotification } from "./email.service";

/** The queue carries an account identity, never a frozen recipient address. */
export async function deliverDashboardFormNotification(
  payload: DashboardFormNotification,
): Promise<"completed" | "skipped"> {
  if (!federationEnabled()) throw new Error("dashboard_form_notifications_unavailable");
  const config = federationConfig();
  const recipient = await createFederationClient(config).formNotificationRecipient(
    payload.formId,
    payload.subject,
  );
  if (!recipient) return "skipped";
  return deliverManagedFormNotification({
    recipient: recipient.email,
    formName: payload.formName,
    summary: payload.summary,
    contact: payload.contact,
    dashboardUrl: new URL("/marketing/content/forms", config.issuer).href,
  });
}
