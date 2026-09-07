import subprocess,os,json,time,uuid
from pathlib import Path
root=Path(__file__).resolve().parents[1]
name='p1-federation-test-'+uuid.uuid4().hex[:8]
try:
 subprocess.run(['docker','run','--name',name,'-e','POSTGRES_PASSWORD=synthetic-only','-e','POSTGRES_DB=federation','-p','127.0.0.1::5432','-d','postgres:17-alpine'],check=True,capture_output=True)
 port=subprocess.check_output(['docker','port',name,'5432'],text=True).strip().split(':')[-1]
 for _ in range(40):
  if subprocess.run(['docker','exec',name,'pg_isready','-U','postgres'],capture_output=True).returncode==0:break
  time.sleep(.25)
 env=dict(os.environ,P1_FEDERATION_TEST_DATABASE_URL='postgresql://postgres:synthetic-only@127.0.0.1:'+port+'/federation')
 r=subprocess.run(['./node_modules/.bin/vitest','run','server/services/federation-bootstrap-proof.test.ts','server/services/federation-client.test.ts','server/services/federation-consumer.integration.test.ts'],cwd=root,env=env,stdout=open('/tmp/p1-federation-consumer-tests.log','w'),stderr=subprocess.STDOUT)
 print('Focused synthetic suite exit',r.returncode)
 if r.returncode:
  raise SystemExit(r.returncode)
finally: subprocess.run(['docker','rm','-f',name],capture_output=True)
