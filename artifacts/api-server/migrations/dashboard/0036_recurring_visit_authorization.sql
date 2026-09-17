ALTER TABLE work_order ADD COLUMN service_agreement_id uuid REFERENCES service_agreement(id);
CREATE INDEX work_order_agreement_allowance ON work_order(service_agreement_id,status);

CREATE FUNCTION allocated_visit_agreement(recurrence_id uuid,visit_on date)
RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT CASE WHEN count(*)=1 THEN min(a.id::text)::uuid ELSE NULL END
 FROM service_agreement a WHERE a.recurring_service_id=recurrence_id AND a.estimate_allocation_id IS NOT NULL
 AND a.status IN ('active','cancelled') AND visit_on BETWEEN a.starts_on AND a.ends_on
 AND (a.status='active' OR visit_on<a.cancellation_effective_on);
$$;

CREATE FUNCTION allocated_recurrence_governed(recurrence_id uuid,visit_on date)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT r.estimate_allocation_id IS NOT NULL OR (
  EXISTS(SELECT 1 FROM service_agreement a WHERE a.recurring_service_id=r.id AND a.estimate_allocation_id IS NOT NULL AND a.status IN ('active','cancelled'))
  AND NOT EXISTS(SELECT 1 FROM service_agreement a WHERE a.recurring_service_id=r.id AND a.estimate_allocation_id IS NULL
    AND a.status IN ('active','cancelled') AND visit_on BETWEEN a.starts_on AND a.ends_on
    AND (a.status='active' OR visit_on<a.cancellation_effective_on))
 ) FROM recurring_service r WHERE r.id=recurrence_id;
$$;

-- Existing unallocated recurrences retain their historical behavior. New
-- allocated recurrences need an active agreement and finite authorization.
CREATE FUNCTION allocated_visit_available(recurrence_id uuid,visit_on date,excluding_work uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT COALESCE(CASE WHEN NOT allocated_recurrence_governed(r.id,visit_on) THEN true ELSE
   a.estimate_allocation_id IS NOT NULL AND a.recurring_service_id=r.id AND a.property_id=r.property_id AND e.property_id=r.property_id
   AND a.status IN ('active','cancelled') AND visit_on BETWEEN a.starts_on AND a.ends_on
   AND visit_on>=COALESCE((x.configuration->>'firstVisitOn')::date,a.starts_on)
   AND (a.status='active' OR visit_on<a.cancellation_effective_on)
   AND p.lifecycle='operational' AND NOT p.archived AND NOT cl.archived
   AND (e.kind<>'composed' OR e.composition_snapshot->'party'->>'clientId'=p.client_id::text)
   AND r.cadence=x.configuration->>'cadence'
   AND r.interval_count=(x.configuration->>'intervalCount')::integer
   AND left(r.local_time::text,5)=x.configuration->>'localTime'
   AND (x.basis='fixed_monthly' OR (x.basis='per_visit' AND
     (SELECT count(*) FROM work_order w WHERE (w.service_agreement_id=a.id OR (w.service_agreement_id IS NULL AND w.recurring_service_id=r.id AND (w.occurrence_date BETWEEN a.starts_on AND a.ends_on OR w.occurrence_date IS NULL))) AND (excluding_work IS NULL OR w.id<>excluding_work)
       AND (w.status NOT IN ('cancelled','skipped') OR EXISTS(SELECT 1 FROM agreement_charge c WHERE c.work_order_id=w.id)))
      < (x.configuration->>'maximumVisits')::integer))
   END,false)
 FROM recurring_service r JOIN property p ON p.id=r.property_id JOIN client cl ON cl.id=p.client_id
 LEFT JOIN service_agreement a ON a.id=allocated_visit_agreement(r.id,visit_on)
 LEFT JOIN estimate_allocation x ON x.id=a.estimate_allocation_id
 LEFT JOIN estimate e ON e.id=a.estimate_id
 WHERE r.id=recurrence_id;
$$;
CREATE FUNCTION enforce_recurring_visit_authorization() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE recurrence record; governed boolean; consumes boolean; selected_agreement uuid; entering boolean;
BEGIN
 IF TG_OP='UPDATE' AND OLD.service_agreement_id IS NOT NULL AND
   ROW(NEW.service_agreement_id,NEW.recurring_service_id,NEW.property_id,NEW.occurrence_date)
   IS DISTINCT FROM ROW(OLD.service_agreement_id,OLD.recurring_service_id,OLD.property_id,OLD.occurrence_date) THEN
  RAISE EXCEPTION 'Authorized visit provenance is immutable' USING ERRCODE='23514';
 END IF;
 IF NEW.recurring_service_id IS NULL THEN
  IF NEW.service_agreement_id IS NOT NULL THEN RAISE EXCEPTION 'Agreement visits require a recurrence' USING ERRCODE='23514'; END IF;
  RETURN NEW;
 END IF;
 SELECT * INTO recurrence FROM recurring_service WHERE id=NEW.recurring_service_id FOR UPDATE;
 governed=allocated_recurrence_governed(recurrence.id,NEW.occurrence_date);
 IF NOT governed THEN
  IF NEW.service_agreement_id IS NOT NULL THEN RAISE EXCEPTION 'Unallocated visits cannot claim an agreement authorization' USING ERRCODE='23514'; END IF;
  RETURN NEW;
 END IF;
 selected_agreement=allocated_visit_agreement(recurrence.id,NEW.occurrence_date);
 entering=TG_OP='INSERT' OR OLD.service_agreement_id IS NULL;
 IF entering THEN
  IF NEW.service_agreement_id IS NULL THEN NEW.service_agreement_id=selected_agreement; END IF;
  IF NEW.service_agreement_id IS DISTINCT FROM selected_agreement OR NEW.property_id<>recurrence.property_id THEN
   RAISE EXCEPTION 'Visit must belong to the current authorized agreement' USING ERRCODE='23514';
  END IF;
 END IF;
 -- Completing existing authorized work remains possible after cancellation or
 -- renewal. New visits and reactivation of released slots need current capacity.
 consumes=entering OR (OLD.status IN ('cancelled','skipped') AND NEW.status NOT IN ('cancelled','skipped'));
 IF consumes THEN
  IF NEW.service_agreement_id IS NULL OR NEW.service_agreement_id IS DISTINCT FROM selected_agreement
   OR NOT COALESCE(allocated_visit_available(recurrence.id,NEW.occurrence_date,NEW.id),false) THEN
   RAISE EXCEPTION 'Recurring visit is outside its term or authorized allowance' USING ERRCODE='23514';
  END IF;
 END IF;
 IF NEW.scheduled_at IS NOT NULL AND (TG_OP='INSERT' OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at) AND NOT EXISTS(
  SELECT 1 FROM service_agreement a WHERE a.id=NEW.service_agreement_id AND (NEW.scheduled_at AT TIME ZONE 'America/New_York')::date BETWEEN a.starts_on AND a.ends_on
    AND (a.status='active' OR (a.status='cancelled' AND (NEW.scheduled_at AT TIME ZONE 'America/New_York')::date<a.cancellation_effective_on))
 ) THEN RAISE EXCEPTION 'Scheduled visit is outside its authorized agreement term' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER recurring_visit_authorization BEFORE INSERT OR UPDATE OF recurring_service_id,service_agreement_id,property_id,occurrence_date,scheduled_at,status ON work_order
 FOR EACH ROW EXECUTE FUNCTION enforce_recurring_visit_authorization();
