#!/usr/bin/env python3
"""Rehearse a pinned populated baseline upgrade in an owned disposable local database."""
from __future__ import annotations
import argparse, hashlib, json, os, pathlib, secrets, signal, subprocess, tempfile, time, uuid

ROOT = pathlib.Path(__file__).resolve().parent.parent
TABLES = ['system_settings','cms_forms','cms_form_submissions','crm_leads','crm_lead_notes','ecommerce_products','ecommerce_product_variants','ecommerce_customers','ecommerce_orders','ecommerce_inventory_adjustments']

def main(output, baseline, rollback_ref=None):
    name = 'core-upgrade-' + uuid.uuid4().hex[:12]
    password = secrets.token_hex(24)
    report = {'status':'failed','baseline':baseline}
    cleanup_required = False
    def require(condition, message):
        if not condition: raise RuntimeError(message)
    def run(args, cwd=ROOT, env=None, data=None, timeout=60, check=True):
        r = subprocess.run(args,cwd=cwd,env=env,input=data,text=True,capture_output=True,timeout=timeout)
        if check and r.returncode: raise RuntimeError((r.stderr or r.stdout)[-4000:].replace(password,'[redacted]'))
        return r
    def sql(db, query):
        return run(['docker','exec','-i',name,'psql','-U','upgrade','-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1'],data=query).stdout.strip()
    try:
        context = os.environ.get('DOCKER_CONTEXT')
        endpoint = (os.environ.get('DOCKER_HOST') if not context else None) or run(['docker','context','inspect',*([context] if context else []),'--format','{{.Endpoints.docker.Host}}']).stdout.strip()
        if not endpoint.startswith('unix://'): raise RuntimeError('Only a local Docker Unix socket is permitted')
        revision = run(['git','rev-parse',baseline+'^{commit}']).stdout.strip()
        report['baseline'] = revision
        report['candidate'] = run(['git','rev-parse','HEAD']).stdout.strip()
        report['candidate_migration_runner_sha256'] = hashlib.sha256((ROOT/'server/migrate.ts').read_bytes()).hexdigest()
        report['candidate_migration_files_sha256'] = hashlib.sha256(b''.join(p.name.encode()+b'\0'+p.read_bytes() for p in sorted((ROOT/'migrations').glob('*.sql')))).hexdigest()
        with tempfile.TemporaryDirectory(prefix=name) as directory:
            base = pathlib.Path(directory)/'baseline'; base.mkdir()
            archive = pathlib.Path(directory)/'baseline.tar'
            run(['git','archive','--format=tar','--output',str(archive),revision])
            run(['tar','-xf',str(archive),'-C',str(base)])
            # Pinned baseline lock differs in Drizzle: use its exact dependency graph.
            install_env = {k:os.environ[k] for k in ('PATH','HOME','TMPDIR') if k in os.environ}
            install_env['npm_config_ignore_scripts']='true'
            run(['npm','ci','--no-audit','--no-fund'],cwd=base,env=install_env,timeout=240)
            report['baseline_dependency_install']='npm ci from pinned package-lock, lifecycle scripts disabled'
            cleanup_required=True
            run(['docker','run','-d','--name',name,'-p','127.0.0.1::5432','-e','POSTGRES_USER=upgrade','-e','POSTGRES_PASSWORD='+password,'-e','POSTGRES_DB=upgrade_clean','postgres:16-alpine'])
            port=run(['docker','port',name,'5432']).stdout.strip().rsplit(':',1)[1]
            end=time.monotonic()+30
            while run(['docker','exec','-e','PGPASSWORD='+password,name,'psql','-h','127.0.0.1','-U','upgrade','-d','upgrade_clean','-Atc','SELECT 1'],check=False).returncode:
                if time.monotonic()>end: raise RuntimeError('PostgreSQL startup timeout')
                time.sleep(.25)
            sql('upgrade_clean','CREATE DATABASE upgrade_duplicate;')
            def migrate(root, db, expect=True):
                env={k:os.environ[k] for k in ('PATH','HOME','TMPDIR') if k in os.environ}
                env.update(NODE_ENV='test',DATABASE_URL=f'postgresql://upgrade:{password}@127.0.0.1:{port}/{db}',SESSION_SECRET='synthetic-upgrade-session-only')
                code="const {runMigrations}=await import('./server/migrate.ts'); const {pool}=await import('./server/db.ts'); try {await runMigrations();} finally {await pool.end();}"
                return run(['node','--import','tsx','--input-type=module','-e',code],cwd=root,env=env,timeout=90,check=expect)
            def snapshot(db, columns=None):
                result={}; cols=columns or {}
                for table in TABLES:
                    if table not in cols: cols[table]=json.loads(sql(db,f"SELECT json_agg(column_name ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name='{table}';"))
                    projection=','.join('"'+c+'"' for c in cols[table])
                    result[table]=json.loads(sql(db,f'SELECT coalesce(json_agg(t ORDER BY id),\'[]\'::json) FROM (SELECT {projection} FROM {table}) t;'))
                return result,cols
            seed=(ROOT/'script/fixtures/upgrade-legacy.sql').read_text()
            for db in ('upgrade_clean','upgrade_duplicate'):
                print('Building populated baseline: '+db,flush=True)
                migrate(base,db);sql(db,seed)
            original,columns=snapshot('upgrade_clean')
            report['baseline_counts']={k:len(v) for k,v in original.items()}
            require(sql('upgrade_clean',"SELECT to_regclass('cms_form_effect_jobs') IS NULL;")=='t', 'Baseline unexpectedly contains form effects')
            for attempt in (1,2):
                migrate(ROOT,'upgrade_clean')
                require(snapshot('upgrade_clean',columns)[0]==original, 'Legacy rows changed')
                require(sql('upgrade_clean','SELECT count(*) FROM cms_form_effect_jobs;')=='0','Historical form effects replayed')
                require(sql('upgrade_clean','SELECT count(*) FROM ecommerce_notification_jobs;')=='0','Historical notifications replayed')
            report['upgrade_runs']=2; report['legacy_data_preserved']=True; report['historical_jobs_replayed']=False
            # Current valid jobs must survive startup reconciliation after real business activity.
            sql('upgrade_clean', "INSERT INTO ecommerce_notification_jobs(id,type,order_id,deduplication_key) SELECT 'upgrade-job-'||kind,kind,'upgrade-order','upgrade-job-'||kind FROM unnest(ARRAY['order_confirmation','refund_confirmation','shipment_confirmation','order_status']) AS kind;")
            jobs_query = "SELECT json_agg(t ORDER BY id) FROM ecommerce_notification_jobs t;"
            jobs_before = json.loads(sql('upgrade_clean',jobs_query))
            for attempt in (1,2):
                migrate(ROOT,'upgrade_clean')
                require(json.loads(sql('upgrade_clean',jobs_query))==jobs_before,'Notification history changed during restart')
                require(snapshot('upgrade_clean',columns)[0]==original,'Legacy rows changed during restart')
            report['populated_notification_restart']={'runs':2,'job_types_preserved':sorted(row['type'] for row in jobs_before),'all_job_values_preserved':True}
            # Real constraint checks inside rolled-back transactions leave history unchanged.
            checks=(ROOT/'script/fixtures/upgrade-constraints.sql').read_text()
            sql('upgrade_clean',checks)
            require(snapshot('upgrade_clean',columns)[0]==original,'Constraint checks failed to roll back')
            report['new_constraints_verified']=True
            if rollback_ref:
                sql('upgrade_clean', "INSERT INTO cms_form_effect_jobs(id,submission_id,deduplication_key,payload,status,attempt_count) VALUES ('upgrade-effect-queued','upgrade-submission','queued','{\"synthetic\":true}','queued',0),('upgrade-effect-failed','upgrade-submission','failed','{\"synthetic\":true}','failed',3);")
                effects_query = "SELECT json_agg(t ORDER BY id) FROM cms_form_effect_jobs t;"
                effects_before = json.loads(sql('upgrade_clean',effects_query))
                rollback_revision = run(['git','rev-parse',rollback_ref+'^{commit}']).stdout.strip()
                rollback_root = pathlib.Path(directory)/'rollback'; rollback_root.mkdir()
                rollback_archive = pathlib.Path(directory)/'rollback.tar'
                run(['git','archive','--format=tar','--output',str(rollback_archive),rollback_revision])
                run(['tar','-xf',str(rollback_archive),'-C',str(rollback_root)])
                run(['npm','ci','--no-audit','--no-fund'],cwd=rollback_root,env=install_env,timeout=240)
                migrate(rollback_root,'upgrade_clean')
                require(snapshot('upgrade_clean',columns)[0]==original,'Rollback startup changed legacy records')
                require(json.loads(sql('upgrade_clean',jobs_query))==jobs_before,'Rollback startup changed notification history')
                require(json.loads(sql('upgrade_clean',effects_query))==effects_before,'Rollback startup changed form queue history')
                migrate(ROOT,'upgrade_clean')
                require(snapshot('upgrade_clean',columns)[0]==original,'Roll-forward changed legacy records')
                require(json.loads(sql('upgrade_clean',jobs_query))==jobs_before,'Roll-forward changed notification history')
                require(json.loads(sql('upgrade_clean',effects_query))==effects_before,'Roll-forward changed form queue history')
                report['rollback_schema_rehearsal']={'revision':rollback_revision,'startup_completed':True,'legacy_values_preserved':True,'notification_values_preserved':True,'new_form_queue_values_preserved':True,'form_job_statuses':['queued','failed'],'roll_forward_completed':True,'scope':'Migration startup only; no application workers, business writes, provider operations or HTTP readiness exercised'}
            sql('upgrade_duplicate',"INSERT INTO ecommerce_inventory_adjustments(id,product_id,variant_id,order_id,delta,quantity_after,reason) VALUES ('upgrade-duplicate','upgrade-product','upgrade-variant','upgrade-order',-2,6,'order_paid');")
            duplicate_before,duplicate_columns=snapshot('upgrade_duplicate')
            rejected=migrate(ROOT,'upgrade_duplicate',expect=False)
            require(rejected.returncode!=0,'Duplicate paid history migration unexpectedly succeeded')
            require('idx_ecommerce_inventory_adjustments_paid_order_effect' in rejected.stderr+rejected.stdout,'Unexpected rejection cause')
            require(snapshot('upgrade_duplicate',duplicate_columns)[0]==duplicate_before,'Rejected migration changed legacy records')
            require(sql('upgrade_duplicate',"SELECT count(*) FROM ecommerce_inventory_adjustments WHERE reason='order_paid';")=='2', 'Duplicate paid records were not preserved')
            report['duplicate_paid_history']={'migration_rejected':True,'records_preserved':2,'index':'idx_ecommerce_inventory_adjustments_paid_order_effect'}
            report['status']='passed'
    except Exception as e:
        report['error']=str(e).replace(password,'[redacted]')
    finally:
        signal.signal(signal.SIGTERM,signal.SIG_IGN);signal.signal(signal.SIGINT,signal.SIG_IGN)
        if cleanup_required:
            try:
                inspected=run(['docker','container','inspect',name],check=False)
                if inspected.returncode==0:
                    report['fixture_removed']=run(['docker','rm','--force','--volumes',name],check=False).returncode==0
                else:
                    # A successful daemon inventory distinguishes absence from an unavailable daemon.
                    inventory=run(['docker','container','ls','--all','--format','{{.Names}}'],check=False)
                    report['fixture_removed']=inventory.returncode==0 and name not in inventory.stdout.splitlines()
            except Exception: report['fixture_removed']=False
            if not report['fixture_removed']: report['status']='failed'
        output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
    return 0 if report['status']=='passed' else 1

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=pathlib.Path,required=True);parser.add_argument('--baseline',default='a006f36a3c4f37566c71b278d561844b45fb3b81')
    parser.add_argument("--rollback-ref",help="Optional immutable rollback revision to rehearse against the upgraded populated schema")
    args=parser.parse_args()
    def interrupted(number,_frame): raise RuntimeError(f'Upgrade rehearsal interrupted by signal {number}')
    signal.signal(signal.SIGTERM,interrupted);signal.signal(signal.SIGINT,interrupted)
    raise SystemExit(main(args.output.resolve(),args.baseline,args.rollback_ref))
