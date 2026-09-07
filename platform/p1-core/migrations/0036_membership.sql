CREATE TABLE IF NOT EXISTS membership_plans (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  visibility text NOT NULL DEFAULT 'public',
  sort_order integer NOT NULL DEFAULT 0,
  trial_days integer NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_plans_slug ON membership_plans (slug);
CREATE INDEX IF NOT EXISTS idx_membership_plans_status ON membership_plans (status);

CREATE TABLE IF NOT EXISTS membership_plan_prices (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id varchar NOT NULL REFERENCES membership_plans(id) ON DELETE CASCADE,
  label text NOT NULL,
  interval text NOT NULL DEFAULT 'month',
  amount integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  stripe_price_id text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_plan_prices_plan ON membership_plan_prices (plan_id);
CREATE INDEX IF NOT EXISTS idx_membership_plan_prices_stripe ON membership_plan_prices (stripe_price_id);

CREATE TABLE IF NOT EXISTS membership_plan_entitlements (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id varchar NOT NULL REFERENCES membership_plans(id) ON DELETE CASCADE,
  entitlement text NOT NULL,
  label text,
  created_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_plan_entitlements_unique ON membership_plan_entitlements (plan_id, entitlement);
CREATE INDEX IF NOT EXISTS idx_membership_plan_entitlements_plan ON membership_plan_entitlements (plan_id);

CREATE TABLE IF NOT EXISTS membership_subscriptions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id varchar REFERENCES membership_plans(id) ON DELETE SET NULL,
  price_id varchar REFERENCES membership_plan_prices(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'incomplete',
  source text NOT NULL DEFAULT 'manual',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  provider_checkout_session_id text,
  current_period_start timestamp,
  current_period_end timestamp,
  trial_ends_at timestamp,
  canceled_at timestamp,
  suspended_at timestamp,
  expires_at timestamp,
  last_payment_failed_at timestamp,
  admin_notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_subscriptions_user ON membership_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_membership_subscriptions_plan ON membership_subscriptions (plan_id);
CREATE INDEX IF NOT EXISTS idx_membership_subscriptions_status ON membership_subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_membership_subscriptions_provider_customer ON membership_subscriptions (provider_customer_id);
CREATE INDEX IF NOT EXISTS idx_membership_subscriptions_provider_subscription ON membership_subscriptions (provider_subscription_id);

CREATE TABLE IF NOT EXISTS membership_access_rules (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL,
  resource_id varchar NOT NULL,
  access_level text NOT NULL DEFAULT 'public',
  plan_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  entitlements jsonb NOT NULL DEFAULT '[]'::jsonb,
  teaser text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_access_rules_resource ON membership_access_rules (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_membership_access_rules_type ON membership_access_rules (resource_type);

CREATE TABLE IF NOT EXISTS membership_processed_webhook_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  processed_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_webhook_provider_event ON membership_processed_webhook_events (provider, event_id);

CREATE TABLE IF NOT EXISTS membership_audit_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  actor_user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  subscription_id varchar REFERENCES membership_subscriptions(id) ON DELETE SET NULL,
  action text NOT NULL,
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_audit_user ON membership_audit_events (user_id);
CREATE INDEX IF NOT EXISTS idx_membership_audit_subscription ON membership_audit_events (subscription_id);

INSERT INTO system_settings (key, value, category, is_secret)
VALUES ('enable_membership', 'true', 'system_configuration', false)
ON CONFLICT (key) DO NOTHING;
