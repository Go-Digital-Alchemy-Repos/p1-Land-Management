ALTER TABLE "email_templates"
ADD COLUMN IF NOT EXISTS "module" text NOT NULL DEFAULT 'system';

UPDATE "email_templates"
SET "module" = CASE
  WHEN "slug" IN (
    'event-registration-confirmation',
    'event-registration-waitlisted',
    'event-registration-canceled',
    'event-payment-confirmation',
    'event-reminder',
    'event-recording-available',
    'event-canceled'
  ) THEN 'events'
  WHEN "slug" IN (
    'membership-renewal-reminder',
    'membership-payment-failed',
    'membership-suspended',
    'membership-reactivated'
  ) THEN 'membership'
  WHEN "slug" IN (
    'therapist-approval',
    'therapist-rejection',
    'new-therapist-registration'
  ) THEN 'directory'
  WHEN "slug" IN (
    'password-reset',
    'welcome-new-user',
    'new-client-registration'
  ) THEN 'users'
  WHEN "slug" IN (
    'contact-form-submission',
    'managed-form-submission'
  ) THEN 'forms'
  ELSE 'system'
END;
