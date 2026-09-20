#!/usr/bin/env python3
"""Start a disposable joined crew fixture; browser work is performed only via CUA."""
import argparse,json,os,pathlib,secrets,signal,socket,subprocess,tempfile,time,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[2]
def command(args,**kwargs):
 r=subprocess.run(args,capture_output=True,text=True,timeout=120,**kwargs)
 if r.returncode:raise RuntimeError('fixture command failed')
 return r.stdout.strip()
def run():
 directory=pathlib.Path(tempfile.mkdtemp(prefix='p1-joined-crew-',dir='/private/tmp'));directory.chmod(0o700)
 name='p1-joined-crew-'+secrets.token_hex(5);child=None;volumes=[];report={'cleanupVerified':False}
 def stop(_signum,_frame):raise KeyboardInterrupt()
 signal.signal(signal.SIGTERM,stop);signal.signal(signal.SIGINT,stop)
 try:
  context=os.environ.get('DOCKER_CONTEXT');endpoint=(os.environ.get('DOCKER_HOST') if not context else None) or command(['docker','context','inspect',*([context] if context else []),'--format','{{.Endpoints.docker.Host}}'])
  if not endpoint.startswith('unix://'):raise RuntimeError('local Docker required')
  image='sha256:6c538e7206ea40ff740ef27883529390a690b6ead6ba96b44c67a9f7c638e8fd'
  if command(['docker','image','inspect',image,'--format','{{.Id}}'])!=image:raise RuntimeError('image mismatch')
  command(['docker','run','--pull=never','-d','--name',name,'-e','POSTGRES_PASSWORD=synthetic-only','-e','POSTGRES_DB=p1_crew_joined_fixture','-p','127.0.0.1::5432',image])
  info=json.loads(command(['docker','inspect',name]))[0];volumes=[m['Name'] for m in info['Mounts'] if m['Type']=='volume'];binding=info['NetworkSettings']['Ports']['5432/tcp'];assert len(binding)==1 and binding[0]['HostIp']=='127.0.0.1'
  for attempt in range(80):
   if subprocess.run(['docker','exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],capture_output=True).returncode==0:break
   time.sleep(.25)
  else:raise RuntimeError('database readiness')
  with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
  origin=f'http://127.0.0.1:{port}';control=secrets.token_hex(32)
  env={'PATH':os.environ['PATH'],'NODE_ENV':'test','TZ':'America/New_York','DASHBOARD_DATABASE_URL':f"postgres://postgres:synthetic-only@127.0.0.1:{binding[0]['HostPort']}/p1_crew_joined_fixture",'DASHBOARD_ORIGIN':origin,'BETTER_AUTH_SECRET':secrets.token_hex(32),'P1_FIXTURE_CONTROL':control,'P1_FIXTURE_EVIDENCE':str(directory/'workflow-evidence.json'),'DASHBOARD_MIGRATIONS_DIR':str(ROOT/'artifacts/api-server/migrations/dashboard')}
  tsx=ROOT/'platform/p1-core/node_modules/tsx/dist/cli.mjs'
  command(['node',str(tsx),str(ROOT/'artifacts/api-server/src/dashboard/migrate.ts')],cwd=ROOT,env=env)
  state={'origin':origin,'control':control,'supervisorPid':os.getpid(),'container':name};(directory/'control.json').write_text(json.dumps(state));(directory/'control.json').chmod(0o600)
  log=(directory/'fixture.log').open('w');os.chmod(directory/'fixture.log',0o600)
  child=subprocess.Popen(['node',str(tsx),str(ROOT/'scripts/consolidation/crew-joined-fixture.ts')],cwd=ROOT,env=env,stdout=log,stderr=log)
  for attempt in range(100):
   if child.poll() is not None:raise RuntimeError('fixture exited')
   try:
    with urllib.request.urlopen(origin+'/__fixture/status',timeout=1) as response:status=json.load(response)
    if status.get('ready'):break
   except Exception:pass
   time.sleep(.2)
  else:raise RuntimeError('fixture readiness')
  print(json.dumps({'ready':True,'url':origin+'/__fixture/crew','directory':str(directory),'verifyCommand':f'python3 scripts/consolidation/crew-joined-fixture.py verify {directory}'}),flush=True)
  child.wait()
 except KeyboardInterrupt:pass
 except Exception:print(json.dumps({'ready':False,'directory':str(directory),'error':'Fixture failed; private log retained'}),flush=True)
 finally:
  if child and child.poll() is None:
   child.terminate()
   try:child.wait(timeout=10)
   except subprocess.TimeoutExpired:child.kill();child.wait()
  subprocess.run(['docker','rm','-fv',name],capture_output=True)
  try:report['cleanupVerified']=name not in command(['docker','ps','-a','--format','{{.Names}}']).splitlines() and all(v not in command(['docker','volume','ls','--format','{{.Name}}']).splitlines() for v in volumes)
  except Exception:pass
  (directory/'cleanup.json').write_text(json.dumps(report));(directory/'cleanup.json').chmod(0o600);print(json.dumps(report),flush=True)
def control(action,directory):
 path=pathlib.Path(directory)/'control.json';assert path.stat().st_uid==os.getuid() and path.stat().st_mode&0o777==0o600
 state=json.loads(path.read_text());assert urllib.parse.urlparse(state['origin']).hostname=='127.0.0.1'
 if action in ('verify','verify-cancelled','verify-resolved','cancel-work','offline','online'):
  req=urllib.request.Request(state['origin']+('/__fixture/'+action if action in ('verify','verify-cancelled','verify-resolved','cancel-work') else '/__fixture/network'),data=(b'{}' if action in ('verify','verify-cancelled','verify-resolved','cancel-work') else json.dumps({'offline':action=='offline'}).encode()),headers={'Content-Type':'application/json','X-Fixture-Control':state['control']},method='POST')
  with urllib.request.urlopen(req,timeout=30) as response:print(response.read().decode())
 else:
  process=command(['ps','-p',str(state['supervisorPid']),'-o','command=']);assert 'crew-joined-fixture.py run' in process
  os.kill(state['supervisorPid'],signal.SIGTERM)
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('action',choices=['run','verify','verify-cancelled','verify-resolved','cancel-work','stop','offline','online']);parser.add_argument('directory',nargs='?');args=parser.parse_args()
 if args.action=='run':run()
 else:control(args.action,args.directory)
