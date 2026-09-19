#!/usr/bin/env python3
"""Isolated application boot/rollback; accepts only already-local immutable images."""
import argparse
import hashlib
import gzip
import importlib.util
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import signal
import stat
import subprocess
import tempfile
import time
import uuid

SPEC = importlib.util.spec_from_file_location('recovery', Path(__file__).with_name('verify-backup-recovery.py'))
recovery = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(recovery)
IMAGE = re.compile(r'^sha256:[a-f0-9]{64}$')

def checked_image(value):
    if not IMAGE.fullmatch(value):
        raise ValueError('immutable-image-id-required')
    return value

def safe_env(stack, password, database, ca):
    return dict(NODE_ENV='production', PORT='5000', CLIENT_STACK_ID=stack,
                DATABASE_URL=f'postgresql://recovery:{password}@recovery-db:5432/{database}',
                DATABASE_TLS_MODE='verify-full', DATABASE_TLS_CA=ca,
                SESSION_SECRET=secrets.token_hex(32), SETUP_TOKEN=secrets.token_hex(32),
                SYSTEM_BACKUPS_ENABLED='false', CORE_FEDERATION_ENABLED='false',
                APP_URL='https://admin.rehearsal.invalid', CORE_PLATFORM_ADMIN_ORIGIN='https://admin.rehearsal.invalid',
                PUBLIC_SITE_ORIGIN='https://public.rehearsal.invalid',
                TRUSTED_ORIGINS='https://admin.rehearsal.invalid,https://public.rehearsal.invalid',
                P1_FORM_NOTIFICATION_RECIPIENTS='fixture-one@example.invalid,fixture-two@example.invalid')

# Only status, revision and content digests leave this process; never response bodies.
PROBE = r'''
const crypto=require('node:crypto');
(async()=>{
 const base='http://'+process.env.TARGET+':5000';
 const request=(path,headers={})=>fetch(base+path,{headers,redirect:'error',signal:AbortSignal.timeout(5000)});
 for(const path of ['/api/health','/api/health/ready']) {const r=await request(path);if(r.status!==200)throw Error('health');}
 const auth=await request('/api/auth/me');if(![401,403].includes(auth.status))throw Error('auth');
 const setup=await request('/api/setup/status');if(setup.status!==200)throw Error('setup');const state=await setup.json();if(typeof state.needsSetup!=='boolean')throw Error('setup-schema');
 const path='/api/client-site-content/'+encodeURIComponent(process.env.CONTENT_ROUTE)+'/'+encodeURIComponent(process.env.CONTENT_COMPONENT);
 const content=await request(path);let contentEvidence;
 if(process.env.EXPECT_EMPTY_CONTENT==='true') {
   if(content.status!==404)throw Error('expected-empty-content');
   contentEvidence={contentRecoveryVerified:false,contentAbsent404:true,contentRevision:null,contentHash:null,conditional304:false};
 } else {
   if(content.status!==200)throw Error('content');const etag=content.headers.get('etag');const body=await content.json();if(!etag||body.revision==null)throw Error('revision');
   const conditional=await request(path,{'if-none-match':etag});if(conditional.status!==304)throw Error('conditional');
   contentEvidence={contentRecoveryVerified:true,contentAbsent404:false,contentRevision:body.revision,contentHash:crypto.createHash('sha256').update(JSON.stringify(body.content)).digest('hex'),conditional304:true};
 }
 const identity=await request('/api/p1/website-identity');if(identity.status!==200)throw Error('identity');const projected=await identity.json();if(projected.schemaVersion!==1||projected.stackId!==process.env.STACK_ID||typeof projected.version!=='string'||!/^[a-f0-9]{64}$/.test(projected.version))throw Error('identity-schema');for(const key of ['companyName','companyAddress','phoneDisplay','phoneHref','logoUrl','faviconUrl','googleBusinessUrl']){if(projected[key]!==null&&(typeof projected[key]!=='string'||projected[key].length>4096))throw Error('identity-field');}
 process.stdout.write(JSON.stringify({health:true,ready:true,authRejected:true,setupAvailable:true,needsSetup:state.needsSetup,...contentEvidence,identityHash:crypto.createHash('sha256').update(JSON.stringify(projected)).digest('hex')}));
})().catch(()=>{process.exitCode=1});
'''

def main(args):
    prefix='core-app-rehearsal-'+uuid.uuid4().hex[:10]
    network=prefix+'-net'; pg=prefix+'-db'
    owned=[]; owned_volumes=[]; network_created=False
    report={'status':'failed','fixture':prefix,'imageProvenance':'caller-supplied immutable local images; deployment identity not inferred'}
    stage='validation'
    if args.backup.resolve()==args.output.resolve() or (args.output.exists() and os.path.samefile(args.backup,args.output)):
        raise ValueError('input-and-report-must-differ')
    def run(command, timeout=90, check=True):
        result=subprocess.run(command,capture_output=True,text=True,timeout=timeout)
        if check and result.returncode: raise RuntimeError('command-failed')
        return result
    def docker(*command, **kwargs): return run(['docker',*command],**kwargs)
    def sql(database, statement):
        return docker('exec',pg,'psql','-U','recovery','-d',database,'-At','-v','ON_ERROR_STOP=1','-c',statement).stdout.strip()
    def fingerprint(database):
        names=json.loads(sql(database,"SELECT COALESCE(json_agg(json_build_array(schemaname,tablename)), '[]') FROM pg_tables WHERE schemaname IN ('public','drizzle')"))
        result={}
        for schema,table in names:
            quote=lambda value:'"'+value.replace('"','""')+'"'
            value=json.loads(sql(database,"SELECT json_build_object('rows',count(*),'hash',md5(COALESCE(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),''))) FROM "+quote(schema)+'.'+quote(table)+' t'))
            result[schema+'.'+table]=value
        return result
    def form_column_fingerprints(database):
        columns=json.loads(sql(database,"SELECT COALESCE(json_agg(column_name ORDER BY ordinal_position),'[]') FROM information_schema.columns WHERE table_schema='public' AND table_name='cms_forms'"))
        result={}
        for column in columns:
            quoted='"'+column.replace('"','""')+'"'
            result[column]=sql(database,"SELECT md5(COALESCE(string_agg(jsonb_build_array(id,"+quoted+")::text,E'\\n' ORDER BY id::text),'')) FROM public.cms_forms")
        return result
    def create_container(name,image,environment,extra=(),command=()):
        owned.append(name)
        invocation=['create','--pull=never','--name',name,'--network',network,'--cap-drop=ALL','--security-opt=no-new-privileges',*extra]
        for key,value in environment.items(): invocation.extend(['-e',key+'='+value])
        docker(*invocation,image,*command)
        info=json.loads(docker('inspect',name).stdout)[0]
        if set(info['NetworkSettings']['Networks'])!={network} or info['HostConfig'].get('PortBindings'):
            raise RuntimeError('isolation-check-failed')
        if any(m.get('Source')=='/var/run/docker.sock' for m in info.get('Mounts',[])):
            raise RuntimeError('socket-mounted')
    try:
        context=os.environ.get('DOCKER_CONTEXT')
        endpoint=(os.environ.get('DOCKER_HOST') if not context else None) or docker('context','inspect',*([context] if context else []),'--format','{{.Endpoints.docker.Host}}').stdout.strip()
        if not endpoint.startswith('unix://'):raise RuntimeError('local-docker-required')
        for value in [args.current_image,args.previous_image,args.recovery_image,args.postgres_image]:
            checked_image(value)
            if docker('image','inspect',value,'--format','{{.Id}}').stdout.strip()!=value: raise RuntimeError('image-id-mismatch')
        report['images']={key:getattr(args,key) for key in ('current_image','previous_image','recovery_image','postgres_image')}
        report['sourceRevisions']={'current':args.current_revision,'previous':args.previous_revision}
        with tempfile.TemporaryDirectory(prefix=prefix) as temp:
            directory=Path(temp); archive=directory/'snapshot.json.gz'
            fd=os.open(args.backup,os.O_RDONLY|os.O_NOFOLLOW)
            with os.fdopen(fd,'rb') as source:
                info=os.fstat(source.fileno())
                if not stat.S_ISREG(info.st_mode) or stat.S_IMODE(info.st_mode)!=0o600 or info.st_uid!=os.getuid() or info.st_size>recovery.MAX_COMPRESSED_BYTES: raise RuntimeError('unsafe-input')
                with archive.open('wb') as dest:
                    copied=0
                    while chunk:=source.read(1024*1024):
                        copied+=len(chunk)
                        if copied>recovery.MAX_COMPRESSED_BYTES:raise RuntimeError('input-too-large')
                        dest.write(chunk)
            archive.chmod(0o600)
            recovery.validate_snapshot_identity(archive,args.expected_stack_id)
            with gzip.open(archive,'rb') as content_file:
                archived=json.loads(content_file.read(recovery.MAX_SNAPSHOT_BYTES+1))
            content_tables=[table for table in archived.get('tables',[]) if table.get('name')=='client_site_content']
            empty_content=len(content_tables)==1 and content_tables[0].get('rows')==[]
            del archived
            report['contentRecoveryVerified']=False
            if empty_content:report['contentRecoveryGap']='Archive client_site_content table is empty; only absence404 can be tested. Populated content recovery remains pending.'
            report['backupSha256']=hashlib.sha256(archive.read_bytes()).hexdigest()
            stage='tls-preparation'
            certs=directory/'certs';certs.mkdir(mode=0o755)
            run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=recovery-db','-addext','subjectAltName=DNS:recovery-db','-addext','basicConstraints=critical,CA:TRUE','-keyout',str(certs/'server.key'),'-out',str(certs/'server.crt')])
            (certs/'server.key').chmod(0o600);(certs/'server.crt').chmod(0o644)
            ca=(certs/'server.crt').read_text();password=secrets.token_hex(24)
            stage='database-start'
            docker('network','create','--internal',network);network_created=True
            if docker('network','inspect',network,'--format','{{.Internal}}').stdout.strip()!='true':raise RuntimeError('not-internal')
            stage='database-container-start'
            owned.append(pg)
            docker('run','--pull=never','-d','--name',pg,'--network',network,'--network-alias','recovery-db','--mount',f'type=bind,src={certs},dst=/certs,readonly','-e','POSTGRES_USER=recovery','-e','POSTGRES_PASSWORD='+password,'-e','POSTGRES_DB=baseline',args.postgres_image,'sh','-c','cp /certs/server.* /tmp/; chown postgres:postgres /tmp/server.*; chmod 600 /tmp/server.key; exec docker-entrypoint.sh postgres -c ssl=on -c ssl_cert_file=/tmp/server.crt -c ssl_key_file=/tmp/server.key')
            stage='database-isolation-inspect'
            pg_info=json.loads(docker('inspect',pg).stdout)[0]
            owned_volumes.extend(m['Name'] for m in pg_info.get('Mounts',[]) if m.get('Type')=='volume')
            if set(pg_info['NetworkSettings']['Networks'])!={network} or pg_info['HostConfig'].get('PortBindings'):raise RuntimeError('database-isolation-failed')
            stage='database-readiness'
            for attempt in range(120):
                if docker('exec',pg,'pg_isready','-h','127.0.0.1','-U','recovery','-d','baseline',check=False).returncode==0:break
                time.sleep(.25)
            else:raise RuntimeError('database-timeout')
            stage='database-version'
            report['postgresVersion']=sql('baseline','SHOW server_version')
            stage='baseline-restore'
            base_environment=safe_env(args.expected_stack_id,password,'baseline',ca)
            env=dict(base_environment);env.update(NODE_ENV='test',RECOVERY_ALLOW_LEGACY='false',RECOVERY_INPUT='/input/snapshot.json.gz')
            name=prefix+'-restore'
            create_container(name,args.recovery_image,env,('--read-only','--tmpfs','/tmp:rw,nosuid,size=64m','--mount',f'type=bind,src={archive},dst=/input/snapshot.json.gz,readonly'))
            restored=docker('start','--attach',name,timeout=300)
            markers=[line.removeprefix('RECOVERY_RESULT=') for line in restored.stdout.splitlines() if line.startswith('RECOVERY_RESULT=')]
            if len(markers)!=1:raise RuntimeError('restore-unconfirmed')
            evidence=json.loads(markers[0])
            if not all(evidence.get(key) is True for key in ('restoredRowsVerified','sequencesVerified','postRestoreMigrationsVerified')):raise RuntimeError('restore-unverified')
            baseline=fingerprint('baseline');report['baselineTables']=len(baseline)
            report['baselineFingerprint']=hashlib.sha256(json.dumps(baseline,sort_keys=True).encode()).hexdigest()
            report['baselineMigrationTables']={key:value['rows'] for key,value in baseline.items() if 'migration' in key}
            previous_state=baseline
            previous_forms=form_column_fingerprints('baseline')
            for label,image,source_database,database in [('current',args.current_image,'baseline','candidate'),('previous',args.previous_image,'candidate','rollback')]:
                stage=label+'-clone'
                sql('postgres',"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='"+source_database+"' AND pid<>pg_backend_pid()")
                sql('postgres','CREATE DATABASE '+database+' TEMPLATE '+source_database)
                stage=label+'-boot';app=prefix+'-'+label
                create_container(app,image,dict(base_environment,DATABASE_URL=base_environment['DATABASE_URL'].rsplit('/',1)[0]+'/'+database),('--read-only','--tmpfs','/tmp:rw,nosuid,size=64m','--tmpfs','/app/uploads:rw,uid=1000,gid=1000,size=64m'))
                docker('start',app)
                probe=None
                for attempt in range(30):
                    name=prefix+'-'+label+'-probe-'+str(attempt)
                    create_container(name,args.recovery_image,{'TARGET':app,'STACK_ID':args.expected_stack_id,'EXPECT_EMPTY_CONTENT':'true' if empty_content else 'false','CONTENT_ROUTE':args.content_route,'CONTENT_COMPONENT':args.content_component},('--read-only',),('node','-e',PROBE))
                    response=docker('start','--attach',name,timeout=40,check=False)
                    if response.returncode==0:
                        probe=json.loads(response.stdout);break
                    time.sleep(1)
                if probe is None:raise RuntimeError('probe-failed')
                docker('stop','--time','20',app)
                exit_code=docker('inspect',app,'--format','{{.State.ExitCode}}').stdout.strip()
                if exit_code!='0':raise RuntimeError('application-stop-not-clean')
                current_state=fingerprint(database)
                current_forms=form_column_fingerprints(database)
                report[label]={'probes':probe,'cmsFormsChangedColumns':[key for key in sorted(set(previous_forms)|set(current_forms)) if previous_forms.get(key)!=current_forms.get(key)],'changedTables':[name for name in sorted(set(previous_state)|set(current_state)) if previous_state.get(name)!=current_state.get(name)],'tableCount':len(current_state),'stateFingerprint':hashlib.sha256(json.dumps(current_state,sort_keys=True).encode()).hexdigest(),'migrationFingerprint':hashlib.sha256(json.dumps({k:v for k,v in current_state.items() if 'migration' in k},sort_keys=True).encode()).hexdigest(),'beforeRows':sum(v['rows'] for v in previous_state.values()),'afterRows':sum(v['rows'] for v in current_state.values())}
                previous_state=current_state
                previous_forms=current_forms
            identity_parity=report['current']['probes']['identityHash']==report['previous']['probes']['identityHash']
            report['identityParity']=identity_parity
            report['contentAbsenceParity']=empty_content and all(report[label]['probes'].get('contentAbsent404') is True for label in ('current','previous'))
            report['publishedContentParity']=not empty_content and all(report['current']['probes'][key]==report['previous']['probes'][key] for key in ('contentRevision','contentHash'))
            if not identity_parity or not (report['contentAbsenceParity'] if empty_content else report['publishedContentParity']):raise RuntimeError('published-content-drift')
            report['baselineUnchanged']=fingerprint('baseline')==baseline
            if not report['baselineUnchanged']:raise RuntimeError('baseline-mutated')
            report['contentRecoveryVerified']=not empty_content
            report['status']='passed-partial' if empty_content else 'passed'
    except Exception:
        report.update(failedStage=stage,error='Rehearsal failed; raw logs and response bodies withheld.')
    finally:
        signal.signal(signal.SIGINT,signal.SIG_IGN)
        signal.signal(signal.SIGTERM,signal.SIG_IGN)
        cleanup=True
        for name in reversed(owned):
            try:
                docker('rm','--force','--volumes',name,check=False)
                inventory=docker('container','ls','--all','--format','{{.Names}}',check=False)
                cleanup=cleanup and inventory.returncode==0 and name not in inventory.stdout.splitlines()
            except Exception:cleanup=False
        for volume in owned_volumes:
            try:
                docker('volume','rm',volume,check=False)
                inventory=docker('volume','ls','--format','{{.Name}}',check=False)
                cleanup=cleanup and inventory.returncode==0 and volume not in inventory.stdout.splitlines()
            except Exception:cleanup=False
        if network_created:
            try:cleanup=(docker('network','rm',network,check=False).returncode==0) and cleanup
            except Exception:cleanup=False
        report['cleanupVerified']=cleanup
        if not cleanup:report['status']='failed'
        args.output.parent.mkdir(parents=True,exist_ok=True)
        with os.fdopen(os.open(args.output,os.O_WRONLY|os.O_CREAT|os.O_TRUNC|os.O_NOFOLLOW,0o600),'w') as dest:
            os.fchmod(dest.fileno(),0o600);json.dump(report,dest,indent=2)
        print(json.dumps(report,indent=2))
    return 0 if report['status'] in ('passed','passed-partial') else 1

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    for key in ('current-image','previous-image','recovery-image','postgres-image','current-revision','previous-revision','expected-stack-id','content-route','content-component'):
        parser.add_argument('--'+key,required=True)
    parser.add_argument('--backup',type=Path,required=True);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    if args.backup.resolve()==args.output.resolve():parser.error('input and output must differ')
    def interrupted(_number,_frame):raise RuntimeError('interrupted')
    signal.signal(signal.SIGINT,interrupted);signal.signal(signal.SIGTERM,interrupted)
    raise SystemExit(main(args))
