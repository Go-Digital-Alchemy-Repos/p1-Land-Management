const PRIVATE_RECIPIENTS_ENV = "P1_FORM_NOTIFICATION_RECIPIENTS";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function readP1FormNotificationRecipients(
  env: NodeJS.ProcessEnv = process.env,
): string[] | null {
  const configured = env[PRIVATE_RECIPIENTS_ENV]?.trim();
  if (!configured) return null;

  const recipients = [
    ...new Set(
      configured
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  if (recipients.length !== 2 || recipients.some((recipient) => !EMAIL_PATTERN.test(recipient))) {
    throw new Error(`${PRIVATE_RECIPIENTS_ENV} must contain exactly two valid email addresses`);
  }

  return recipients;
}
