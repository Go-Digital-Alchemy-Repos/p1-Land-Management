CREATE TABLE IF NOT EXISTS "crm_clients" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_lead_id" varchar UNIQUE REFERENCES "crm_leads"("id") ON DELETE SET NULL,
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "company" text,
  "status" text NOT NULL DEFAULT 'onboarding',
  "source" text NOT NULL DEFAULT 'manual',
  "form_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "owner_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "next_follow_up_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_crm_clients_source_lead" ON "crm_clients" ("source_lead_id");
CREATE INDEX IF NOT EXISTS "idx_crm_clients_status" ON "crm_clients" ("status");
CREATE INDEX IF NOT EXISTS "idx_crm_clients_email" ON "crm_clients" ("email");
CREATE INDEX IF NOT EXISTS "idx_crm_clients_phone" ON "crm_clients" ("phone");
CREATE INDEX IF NOT EXISTS "idx_crm_clients_owner" ON "crm_clients" ("owner_id");
CREATE INDEX IF NOT EXISTS "idx_crm_clients_created_at" ON "crm_clients" ("created_at");

CREATE TABLE IF NOT EXISTS "crm_client_notes" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_id" varchar NOT NULL REFERENCES "crm_clients"("id") ON DELETE CASCADE,
  "body" text NOT NULL,
  "created_by_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_crm_client_notes_client_id" ON "crm_client_notes" ("client_id");
CREATE INDEX IF NOT EXISTS "idx_crm_client_notes_created_at" ON "crm_client_notes" ("created_at");

CREATE TABLE IF NOT EXISTS "crm_client_tasks" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_id" varchar NOT NULL REFERENCES "crm_clients"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "due_at" timestamp,
  "completed" boolean NOT NULL DEFAULT false,
  "assigned_to_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "created_by_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_crm_client_tasks_client_id" ON "crm_client_tasks" ("client_id");
CREATE INDEX IF NOT EXISTS "idx_crm_client_tasks_due_at" ON "crm_client_tasks" ("due_at");
CREATE INDEX IF NOT EXISTS "idx_crm_client_tasks_completed" ON "crm_client_tasks" ("completed");
