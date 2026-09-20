#!/usr/bin/env python3
"""Exercise production Dashboard/Core restore HTTP against disposable PostgreSQL and local S3."""
import json, os, pathlib, secrets, socket, ssl, subprocess, tempfile, time, urllib.request, urllib.error, uuid, threading, queue
ROOT=pathlib.Path(__file__).resolve().parents[2]
IMAGE='sha256:6c538e7206ea40ff740ef27883529390a690b6ead6ba96b44c67a9f7c638e8fd'
def output(args,**kw):return subprocess.check_output(args,text=True,**kw).strip()
def port():
 with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
def main():
 if not output(['docker','context','inspect','--format','{{.Endpoints.docker.Host}}']).startswith('unix://'):raise RuntimeError('Local Docker required')
 directory=pathlib.Path(tempfile.mkdtemp(prefix='p1-restore-joined-',dir='/private/tmp'));directory.chmod(0o700)
 name='p1-restore-joined-'+secrets.token_hex(6);created=False;children=[];core=None;checks=[]
 def sql(database,query):
  return output(['docker','exec',name,'psql','-U','postgres','-d',database,'-At','-v','ON_ERROR_STOP=1','-c',query])
 def check(label,condition):
  if not condition:raise AssertionError(label)
  checks.append(label)
 def request(path,cookie=None,body=None,include_origin=True):
  headers={'Content-Type':'application/json'}
  if cookie:headers['Cookie']=cookie
  if include_origin:headers['Origin']=origin
  req=urllib.request.Request(origin+path,data=None if body is None else json.dumps(body).encode(),headers=headers)
  try:r=urllib.request.urlopen(req,timeout=45)
  except urllib.error.HTTPError as e:r=e
  return r.status,json.loads(r.read())
 def control(command,**fields):
  ident=secrets.token_hex(6);core.stdin.write(json.dumps({'id':ident,'command':command,**fields})+'\n');core.stdin.flush()
  deadline=time.monotonic()+60
  while time.monotonic()<deadline:
   if core.poll() is not None:raise RuntimeError('Core exited; inspect private log')
   try:result=core.responses.get(timeout=1)
   except queue.Empty:continue
   if result:
    if result.get('id')==ident:
     if result.get('error'):raise RuntimeError('Core fixture command failed: '+command)
     return result['result']
  raise TimeoutError('Core fixture command '+command)
 def start_core():
  child=subprocess.Popen(['node',str(tsx),'server/scripts/restore-acceptance-core.ts'],cwd=ROOT/'platform/p1-core',env=core_env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=core_log,text=True,bufsize=1)
  child.responses=queue.Queue()
  def read():
   for line in child.stdout:
    core_log.write(line);core_log.flush()
    if line.startswith('P1_RESTORE_ACCEPTANCE '):child.responses.put(json.loads(line[len('P1_RESTORE_ACCEPTANCE '):]))
  threading.Thread(target=read,daemon=True).start()
  children.append(child);return child
 def await_health():
  for _ in range(100):
   if dashboard.poll() is not None:raise RuntimeError('Dashboard exited; inspect private log')
   try:
    if request('/api/healthz')[0]==200:return
   except (OSError,ValueError):pass
   time.sleep(.2)
  raise TimeoutError('Dashboard readiness')
 try:
  output(['docker','run','--pull=never','-d','--name',name,'-e','POSTGRES_PASSWORD=synthetic-only','-e','POSTGRES_DB=restore_joined_dashboard','-p','127.0.0.1::5432',IMAGE]);created=True
  info=json.loads(output(['docker','inspect',name]))[0];binding=info['NetworkSettings']['Ports']['5432/tcp'][0]
  check('database loopback only',binding['HostIp']=='127.0.0.1')
  for _ in range(100):
   # The image's temporary init server can accept pg_isready immediately before
   # the entrypoint restarts it. Require an actual query against the fixture
   # database so the following CREATE DATABASE cannot race that restart.
   if subprocess.run(['docker','exec',name,'psql','-U','postgres','-d','restore_joined_dashboard','-At','-c','SELECT 1'],capture_output=True).returncode==0:break
   time.sleep(.2)
  else:raise TimeoutError('PostgreSQL readiness')
  sql('restore_joined_dashboard','CREATE DATABASE core_restore_acceptance_test')
  core_port,dashboard_port=port(),port();origin=f'http://127.0.0.1:{dashboard_port}';core_origin=f'https://127.0.0.1:{core_port}'
  cert=directory/'cert.pem';key=directory/'key.pem';conf=directory/'openssl.cnf'
  conf.write_text('[req]\ndistinguished_name=dn\nx509_extensions=ext\nprompt=no\n[dn]\nCN=localhost\n[ext]\nsubjectAltName=DNS:localhost,IP:127.0.0.1\nbasicConstraints=critical,CA:TRUE\n')
  subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-days','1','-keyout',str(key),'-out',str(cert),'-config',str(conf)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);key.chmod(0o600)
  ids={role:str(uuid.uuid4()) for role in ['owner','recovery','manager']};secret=secrets.token_urlsafe(40);service=secrets.token_urlsafe(40)
  base={'PATH':os.environ['PATH'],'NODE_ENV':'test','TZ':'America/New_York','NODE_EXTRA_CA_CERTS':str(cert),'CORE_FEDERATION_ENABLED':'true','CORE_FEDERATION_CLIENT_ID':'restore_fixture','CORE_FEDERATION_CLIENT_SECRET_CURRENT':secret}
  dbprefix=f"postgres://postgres:synthetic-only@127.0.0.1:{binding['HostPort']}/"
  dashboard_env={**base,'DASHBOARD_DATABASE_URL':dbprefix+'restore_joined_dashboard','DASHBOARD_ORIGIN':origin,'PORT':str(dashboard_port),'BETTER_AUTH_SECRET':secrets.token_hex(32),'CORE_MARKETING_ORIGIN':core_origin,'CORE_MARKETING_SERVICE_KEY':service,'CORE_FEDERATION_TEST_ALLOW_INSECURE_ORIGIN':'true','CORE_FEDERATION_REDIRECT_URI':core_origin+'/api/auth/federation/callback','DASHBOARD_MIGRATIONS_DIR':str(ROOT/'artifacts/api-server/migrations/dashboard'),'P1_RESTORE_FIXTURE_STATE':str(directory/'accounts.json'),**{'P1_RESTORE_FIXTURE_'+role.upper():value for role,value in ids.items()}}
  core_env={**base,'CLIENT_STACK_ID':'p1-restore-acceptance','DATABASE_URL':dbprefix+'core_restore_acceptance_test','PORT':str(core_port),'APP_URL':core_origin,'DASHBOARD_FEDERATION_ISSUER':origin,'CORE_FEDERATION_ALLOW_SYNTHETIC_HTTP':'true','DASHBOARD_MARKETING_SERVICE_KEY':service,'P1_RESTORE_ACCEPTANCE_ENABLE':'true','P1_RESTORE_ACCEPTANCE_TLS_KEY':str(key),'P1_RESTORE_ACCEPTANCE_TLS_CERT':str(cert),'P1_RESTORE_ACCEPTANCE_ARCHIVES':str(directory/'archives'),'P1_RESTORE_ACCEPTANCE_ACTORS':json.dumps([{'canonicalId':value,'coreId':str(uuid.uuid4()),'email':value+'@example.test'} for value in ids.values()])}
  tsx=ROOT/'platform/p1-core/node_modules/tsx/dist/cli.mjs'
  with (directory/'migrations.log').open('w') as log:subprocess.run(['node',str(tsx),'artifacts/api-server/src/dashboard/migrate.ts'],cwd=ROOT,env=dashboard_env,stdout=log,stderr=log,check=True,timeout=120)
  dashboard_log=(directory/'dashboard.log').open('w');core_log=(directory/'core.log').open('w')
  dashboard=subprocess.Popen(['node',str(tsx),'scripts/consolidation/restore-acceptance-dashboard.ts'],cwd=ROOT,env=dashboard_env,stdout=dashboard_log,stderr=dashboard_log);children.append(dashboard);await_health()
  accounts=json.loads((directory/'accounts.json').read_text());owner=accounts['owner']['cookie'];recovery=accounts['recovery']['cookie']
  core=start_core();control('inspect')
  root='/api/v1/marketing/cms/website-system/backups/restore-operations'
  check('anonymous rejected',request(root)[0]==401)
  check('manager rejected',request(root,accounts['manager']['cookie'])[0]==403)
  check('production CSRF enforced',request(root,owner,{'key':'invalid'},False)[0]==403)
  archive=control('backup')
  check('Core backup completed',bool(archive.get('key')))
  confirm={'confirmation':'RESTORE WEBSITE DATABASE'}
  def review(cookie):
   status,body=request(root,cookie,{'key':archive['key']})
   if status!=201:
    (directory/'review-failure.json').write_text(json.dumps({'status':status,'body':body}))
    control('diagnose-review',key=archive['key'],operationId=str(uuid.uuid4()),actorId=ids['owner'])
   check('authenticated review accepted',status==201);return body['id']
  def inspect_label():return control('inspect')['business'][0]['label']
  first=review(owner)
  check('real Core reservation persisted',any(r['operation_id']==first and r['status']=='reserved' for r in control('inspect')['receipts']))
  control('mutate',label='newer-value')
  status,body=request(root+'/'+first+'/execute',owner,confirm)
  check('authenticated restore completed',status==200 and body.get('status')=='completed')
  check('database content restored',inspect_label()=='archived-value')
  control('mutate',label='after-success')
  status,body=request(root+'/'+first+'/execute',owner,confirm)
  check('duplicate execute does not restore again',status==200 and inspect_label()=='after-success')
  lost=review(owner);control('fault-next-execute-response')
  status,body=request(root+'/'+lost+'/execute',owner,confirm)
  check('lost completion response remains uncertain',status==202 and body.get('status')=='uncertain')
  check('lost response followed actual commit',inspect_label()=='archived-value')
  control('stop');core.wait(timeout=10);core=start_core();control('inspect')
  status,body=request(root+'/'+lost+'/reconcile',owner,{})
  check('completion reconciles after Core restart',status==200 and body.get('status')=='completed')
  unavailable=review(owner)
  control('stop');core.wait(timeout=10)
  status,body=request(root+'/'+unavailable+'/execute',owner,confirm)
  check('pre-admission outage remains uncertain',status==202 and body.get('status')=='uncertain')
  core=start_core();control('inspect')
  # Explicit fixture deadline advance, not a claim that five wall-clock minutes elapsed.
  sql('restore_joined_dashboard',"UPDATE website_restore_operation SET expires_at='2000-01-01T00:00:00Z' WHERE id='"+unavailable+"'")
  sql('core_restore_acceptance_test',"UPDATE p1_operations.restore_receipts SET expires_at='2000-01-01T00:00:00Z' WHERE operation_id='"+unavailable+"'")
  sql('restore_joined_dashboard',"UPDATE staff_profile SET active=false WHERE user_id='"+ids['owner']+"'")
  check('inactive initiator recovery listed',any(row['id']==unavailable for row in request(root,recovery)[1]))
  check('recovery cannot execute another actor restore',request(root+'/'+unavailable+'/execute',recovery,confirm)[0]==404)
  status,body=request(root+'/'+unavailable+'/reconcile',recovery,{})
  check('real federation recovery resolves no commit',status==200 and body.get('status')=='not_applied')
  check('terminal recovery survives refresh',request(root+'/'+unavailable,recovery)[1].get('status')=='not_applied')
  check('Core terminal receipt persisted',any(r['operation_id']==unavailable and r['status']=='not_applied' for r in control('inspect')['receipts']))
  check('temporary federation grants cleaned',sql('restore_joined_dashboard','SELECT count(*) FROM core_federation_grant')=='0')
  check('both Core recovery audits recorded',sql('core_restore_acceptance_test',"SELECT count(*) FROM activity_logs WHERE action IN ('website_restore_recovery_requested','website_restore_recovery_checked')")=='2')

 finally:
  for child in reversed(children):
   if child.poll() is None:
    child.terminate()
    try:child.wait(timeout=10)
    except subprocess.TimeoutExpired:child.kill();child.wait()
  if created:
   subprocess.run(['docker','rm','-fv',name],check=True,capture_output=True)
   check('container cleanup',name not in output(['docker','ps','-a','--format','{{.Names}}']).splitlines())
  (directory/'evidence.json').write_text(json.dumps({'checks':checks},indent=2));print(json.dumps({'directory':str(directory),'checks':checks}))
if __name__=='__main__':main()
