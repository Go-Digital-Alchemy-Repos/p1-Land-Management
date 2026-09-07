BEGIN;
DO $$ BEGIN
  BEGIN
    INSERT INTO ecommerce_inventory_adjustments(product_id,variant_id,order_id,delta,quantity_after,reason) VALUES ('upgrade-product','upgrade-variant','upgrade-order',-2,6,'order_paid');
    RAISE EXCEPTION 'Duplicate paid effect was accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  -- Manual corrections remain distinct legitimate effects.
  INSERT INTO ecommerce_inventory_adjustments(product_id,variant_id,order_id,delta,quantity_after,reason) VALUES ('upgrade-product','upgrade-variant','upgrade-order',1,9,'manual');
  INSERT INTO cms_form_submissions(id,form_id,data,idempotency_key) VALUES ('upgrade-new-submission','upgrade-form','{}','upgrade-key');
  BEGIN
    INSERT INTO cms_form_submissions(form_id,data,idempotency_key) VALUES ('upgrade-form','{}','upgrade-key');
    RAISE EXCEPTION 'Duplicate submission idempotency key was accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  INSERT INTO cms_form_effect_jobs(id,submission_id,deduplication_key,payload) VALUES ('upgrade-job','upgrade-new-submission','crm','{"type":"crm"}');
  IF NOT EXISTS (SELECT 1 FROM cms_form_effect_jobs WHERE id='upgrade-job' AND status='queued' AND attempt_count=0 AND next_attempt_at<=now()) THEN RAISE EXCEPTION 'New effect not ready'; END IF;
  BEGIN
    INSERT INTO cms_form_effect_jobs(submission_id,deduplication_key,payload) VALUES ('upgrade-new-submission','crm','{}');
    RAISE EXCEPTION 'Duplicate effect accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    INSERT INTO cms_form_effect_jobs(submission_id,deduplication_key,payload,status) VALUES ('upgrade-new-submission','invalid','{}','unknown');
    RAISE EXCEPTION 'Invalid effect status accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  IF (SELECT count(*) FROM information_schema.columns WHERE table_name='cms_form_effect_jobs' AND data_type='timestamp with time zone')<>6 THEN RAISE EXCEPTION 'Effect timestamp type mismatch'; END IF;
  DELETE FROM cms_form_submissions WHERE id='upgrade-new-submission';
  IF EXISTS(SELECT 1 FROM cms_form_effect_jobs WHERE id='upgrade-job') THEN RAISE EXCEPTION 'Orphan effect retained'; END IF;
END $$;
ROLLBACK;
