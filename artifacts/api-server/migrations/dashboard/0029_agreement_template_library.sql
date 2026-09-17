-- Extend the retained template store; old rows keep their IDs/text/version.
ALTER TABLE agreement_template
  ADD COLUMN kind text NOT NULL DEFAULT 'msa' CHECK(kind IN ('msa','scope','cost','package')),
  ADD COLUMN status text NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published','archived')),
  ADD COLUMN description text NOT NULL DEFAULT '',
  ADD COLUMN payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(payload)='object'),
  ADD COLUMN edit_version integer NOT NULL DEFAULT 1 CHECK(edit_version>0),
  ADD COLUMN family_id uuid,
  ADD COLUMN source_template_id uuid REFERENCES agreement_template(id);
UPDATE agreement_template SET family_id=id,status=CASE WHEN active THEN 'published' ELSE 'archived' END;
ALTER TABLE agreement_template ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE agreement_template ALTER COLUMN family_id SET DEFAULT gen_random_uuid();
ALTER TABLE agreement_template DROP CONSTRAINT agreement_template_body_check;
ALTER TABLE agreement_template ADD CONSTRAINT agreement_template_body_check CHECK(length(body)<=50000 AND (status<>'published' OR kind<>'msa' OR length(btrim(body))>0));
ALTER TABLE agreement_template DROP CONSTRAINT agreement_template_name_version_key;
ALTER TABLE agreement_template ADD CONSTRAINT agreement_template_family_version_key UNIQUE(family_id,version);
ALTER TABLE agreement_template ADD CONSTRAINT agreement_template_status_active_check CHECK(active=(status='published'));
CREATE UNIQUE INDEX agreement_template_family_draft_idx ON agreement_template(family_id) WHERE status='draft';
CREATE INDEX agreement_template_library_idx ON agreement_template(kind,status,name);
