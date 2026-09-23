-- The supplied standard forms have a stable source identity. This makes an
-- install request replay-safe while retaining the existing versioned template
-- lifecycle for later customer-specific revisions.
ALTER TABLE agreement_template
  ADD COLUMN source_slug text;

CREATE UNIQUE INDEX agreement_template_source_slug_idx
  ON agreement_template(source_slug)
  WHERE source_slug IS NOT NULL;
