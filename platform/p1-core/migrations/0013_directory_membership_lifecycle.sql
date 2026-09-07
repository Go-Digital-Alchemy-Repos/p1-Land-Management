ALTER TABLE "therapist_subscriptions"
  ADD COLUMN IF NOT EXISTS "last_failed_invoice_id" text,
  ADD COLUMN IF NOT EXISTS "application_fee_credit_amount" integer,
  ADD COLUMN IF NOT EXISTS "application_fee_credit_applied_at" timestamp,
  ADD COLUMN IF NOT EXISTS "renewal_reminder_sent_for_period_end" timestamp,
  ADD COLUMN IF NOT EXISTS "last_payment_failed_at" timestamp,
  ADD COLUMN IF NOT EXISTS "payment_failure_notice_sent_at" timestamp,
  ADD COLUMN IF NOT EXISTS "grace_period_ends_at" timestamp,
  ADD COLUMN IF NOT EXISTS "suspended_at" timestamp;
