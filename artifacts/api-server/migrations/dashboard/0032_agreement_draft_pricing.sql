-- Additive, private financial planning only; this does not issue estimates.
ALTER TABLE agreement_composition_draft ADD COLUMN pricing_plan jsonb;
ALTER TABLE agreement_composition_draft ADD CONSTRAINT agreement_draft_pricing_shape CHECK (
 pricing_plan IS NULL OR COALESCE(
   jsonb_typeof(pricing_plan)='object'
   AND pricing_plan->'schemaVersion'='1'::jsonb
   AND pricing_plan->'sourceVersion'=to_jsonb(version)
   AND jsonb_typeof(pricing_plan->'allocations')='array'
   AND jsonb_typeof(pricing_plan->'review')='object'
   AND pricing_plan->'review'->'sourceVersion'=to_jsonb(version)
   AND pricing_plan->'review'->'pricingValid'='true'::jsonb,
 false)
);
CREATE FUNCTION invalidate_agreement_draft_pricing() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF ROW(NEW.title,NEW.client_id,NEW.property_id,NEW.lead_id,NEW.source_estimate_id,
        NEW.content,NEW.dates,NEW.context_snapshot,NEW.source_templates)
    IS DISTINCT FROM
    ROW(OLD.title,OLD.client_id,OLD.property_id,OLD.lead_id,OLD.source_estimate_id,
        OLD.content,OLD.dates,OLD.context_snapshot,OLD.source_templates)
    OR (NEW.version<>OLD.version AND NEW.pricing_plan IS NOT DISTINCT FROM OLD.pricing_plan)
 THEN NEW.pricing_plan := NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER invalidate_agreement_draft_pricing BEFORE UPDATE ON agreement_composition_draft
 FOR EACH ROW EXECUTE FUNCTION invalidate_agreement_draft_pricing();
