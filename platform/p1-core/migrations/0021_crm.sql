CREATE TABLE IF NOT EXISTS "crm_leads" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "company" text,
  "message" text,
  "stage" text NOT NULL DEFAULT 'new',
  "source" text NOT NULL DEFAULT 'manual',
  "external_id" text,
  "form_submission_id" varchar REFERENCES "cms_form_submissions"("id") ON DELETE SET NULL,
  "form_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "owner_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "next_follow_up_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_crm_leads_stage" ON "crm_leads" ("stage");
CREATE INDEX IF NOT EXISTS "idx_crm_leads_email" ON "crm_leads" ("email");
CREATE INDEX IF NOT EXISTS "idx_crm_leads_phone" ON "crm_leads" ("phone");
CREATE INDEX IF NOT EXISTS "idx_crm_leads_source" ON "crm_leads" ("source");
CREATE INDEX IF NOT EXISTS "idx_crm_leads_created_at" ON "crm_leads" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_crm_leads_owner" ON "crm_leads" ("owner_id");

CREATE TABLE IF NOT EXISTS "crm_lead_notes" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "lead_id" varchar NOT NULL REFERENCES "crm_leads"("id") ON DELETE CASCADE,
  "body" text NOT NULL,
  "created_by_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_crm_lead_notes_lead_id" ON "crm_lead_notes" ("lead_id");
CREATE INDEX IF NOT EXISTS "idx_crm_lead_notes_created_at" ON "crm_lead_notes" ("created_at");

CREATE TABLE IF NOT EXISTS "crm_lead_tasks" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "lead_id" varchar NOT NULL REFERENCES "crm_leads"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "due_at" timestamp,
  "completed" boolean NOT NULL DEFAULT false,
  "assigned_to_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "created_by_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_crm_lead_tasks_lead_id" ON "crm_lead_tasks" ("lead_id");
CREATE INDEX IF NOT EXISTS "idx_crm_lead_tasks_due_at" ON "crm_lead_tasks" ("due_at");
CREATE INDEX IF NOT EXISTS "idx_crm_lead_tasks_completed" ON "crm_lead_tasks" ("completed");
