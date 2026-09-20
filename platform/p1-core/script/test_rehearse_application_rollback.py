"""Offline runner lifecycle tests: no real archives, Docker calls or connections."""
import argparse
import gzip
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('rollback',Path(__file__).with_name('rehearse-application-rollback.py'))
runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)

class RollbackTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name);archive=self.root/'input.gz'
        archive.write_bytes(gzip.compress(json.dumps({'manifest':{'schemaVersion':1,'clientStackId':'p1-land-management'}}).encode()));archive.chmod(0o600)
        self.args=argparse.Namespace(backup=archive,output=self.root/'report.json',expected_stack_id='p1-land-management',current_image='sha256:'+'a'*64,previous_image='sha256:'+'b'*64,recovery_image='sha256:'+'c'*64,postgres_image='sha256:'+'d'*64,current_revision='current-fixture',previous_revision='previous-fixture',content_route='home',content_component='hero')
    def test_image_tags_rejected(self):
        for value in ('postgres:18','latest','sha256:abc','x'*64):
            with self.assertRaises(ValueError):runner.checked_image(value)
    def test_environment_is_synthetic_and_tls_verified(self):
        with patch.dict(runner.os.environ,{'MAILGUN_API_KEY':'DO_NOT_COPY','R2_SECRET_ACCESS_KEY':'DO_NOT_COPY'}):
            env=runner.safe_env('p1-land-management','synthetic','candidate','fixture-ca')
        self.assertNotIn('DO_NOT_COPY',json.dumps(env));self.assertEqual(env['DATABASE_TLS_MODE'],'verify-full')
        self.assertEqual(env['CORE_FEDERATION_ENABLED'],'false');self.assertEqual(len(set(env['P1_FORM_NOTIFICATION_RECIPIENTS'].split(','))),2)
    def test_mismatched_archive_stops_before_any_container(self):
        self.args.expected_stack_id='another-stack'
        calls=[]
        def fake(command,**kwargs):
            calls.append(command)
            value=command[3] if command[:3]==['docker','image','inspect'] else 'unix:///local.sock'
            return subprocess.CompletedProcess(command,0,value,'')
        with patch.object(runner.subprocess,'run',side_effect=fake),patch('builtins.print'),patch.object(runner.signal,'signal'):
            self.assertEqual(runner.main(self.args),1)
        self.assertFalse(any(c[:2] in (['docker','run'],['docker','create']) for c in calls))
    def test_isolated_lifecycle_clones_postcurrent_and_cleans_every_container(self):
        calls=[];containers={};network='';fault=None
        probe={'health':True,'ready':True,'authRejected':True,'setupAvailable':True,'needsSetup':False,'contentRevision':7,'contentHash':'fixture','conditional304':True,'identityHash':'fixture','contentAbsent404':True}
        def fake(command,**kwargs):
            nonlocal network
            calls.append(command);out='';code=0
            if command[0]=='openssl':
                Path(command[command.index('-keyout')+1]).write_text('synthetic-key')
                Path(command[command.index('-out')+1]).write_text('synthetic-ca')
            elif command[:3]==['docker','image','inspect']:out=command[3]
            elif command[:3]==['docker','context','inspect']:out='unix:///local.sock'
            elif command[:3]==['docker','network','create']:network=command[-1]
            elif command[:3]==['docker','network','inspect']:out='true'
            elif command[:2] in (['docker','run'],['docker','create']):
                containers[command[command.index('--name')+1]]=True
            elif command[:2]==['docker','inspect'] and '--format' in command:out='137' if fault=='stop' else '0'
            elif command[:3]==['docker','container','ls'] and fault=='cleanup':code=1
            elif command[:2]==['docker','inspect']:
                if command[2] not in containers:code=1
                else:out=json.dumps([{'NetworkSettings':{'Networks':{network:{}}},'HostConfig':{'PortBindings':{}},'Mounts':[]}])
            elif command[:3]==['docker','start','--attach']:
                out=('BLOG_BASELINE='+json.dumps(blog_expected)) if command[-1].endswith('-blog-baseline') else ('RECOVERY_RESULT={"restoredRowsVerified":false}' if fault=='restore' else 'RECOVERY_RESULT={"restoredRowsVerified":true,"sequencesVerified":true,"postRestoreMigrationsVerified":true}') if command[-1].endswith('-restore') else json.dumps(probe)
            elif command[:2]==['docker','exec'] and 'psql' in command:
                if 'json_agg' in command[-1]:out='[]'
            elif command[:2]==['docker','rm']:containers.pop(command[-1],None)
            return subprocess.CompletedProcess(command,code,out,'')
        with patch.object(runner.subprocess,'run',side_effect=fake),patch.object(runner.time,'sleep'),patch('builtins.print'),patch.object(runner.signal,'signal'):
            self.assertEqual(runner.main(self.args),0)
        self.assertEqual(containers,{})
        self.assertTrue(all('-h' in c and c[c.index('-h')+1]=='127.0.0.1' for c in calls if 'pg_isready' in c))
        self.assertFalse(any('pull' in c or 'build' in c for c in calls))
        launches=[c for c in calls if c[:2] in (['docker','run'],['docker','create'])]
        secret_values=[arg for c in launches for arg in c if arg.startswith('SESSION_SECRET=')]
        self.assertEqual(len(set(secret_values)),1)
        app_envs=[]
        for c in launches:
            if c[c.index('--name')+1].endswith(('-current','-previous')):
                app_envs.append(dict(c[i+1].split('=',1) for i,x in enumerate(c) if x=='-e'))
        urls=[env.pop('DATABASE_URL') for env in app_envs]
        self.assertEqual(app_envs[0],app_envs[1])
        self.assertTrue(urls[0].endswith('/candidate') and urls[1].endswith('/rollback'))
        self.assertTrue(all('--pull=never' in c and '-p' not in c and '--network' in c for c in launches))
        self.assertTrue(any(c[-1]=='CREATE DATABASE candidate TEMPLATE baseline' for c in calls))
        self.assertTrue(any(c[-1]=='CREATE DATABASE rollback TEMPLATE candidate' for c in calls))
        report=json.loads(self.args.output.read_text())
        self.assertTrue(report['cleanupVerified']);self.assertTrue(report['baselineUnchanged']);self.assertTrue(report['publishedContentParity'])
        self.assertNotIn('synthetic-key',self.args.output.read_text())
        self.args.backup.write_bytes(gzip.compress(json.dumps({'manifest':{'schemaVersion':1,'clientStackId':'p1-land-management'},'tables':[{'name':'client_site_content','rows':[]}]}).encode()))
        with patch.object(runner.subprocess,'run',side_effect=fake),patch.object(runner.time,'sleep'),patch('builtins.print'),patch.object(runner.signal,'signal'):
            self.assertEqual(runner.main(self.args),0)
        partial=json.loads(self.args.output.read_text())
        self.assertEqual(partial['status'],'passed-partial')
        self.assertFalse(partial['contentRecoveryVerified'])
        self.assertFalse(partial['publishedContentParity'])
        self.assertTrue(partial['contentAbsenceParity'])
        blog_expected={'revision':'e'*64,'posts':[{'id':'post1','revisionId':'revision1','generation':1,'hash':'f'*64}],'staticRoutes':[{'slug':'article','postId':'post1'}]}
        blog_tables=[{'name':'client_site_content','rows':[]},
            {'name':'blog_publication_state','rows':[{'post_id':'post1','visibility':'published','published_revision_id':'revision1'}]},
            {'name':'blog_post_revisions','rows':[{'id':'revision1','post_id':'post1','snapshot':{'slug':'article'}}]},
            {'name':'blog_publication_routes','rows':[{'post_id':'post1','state':'published','revision_id':'revision1','slug':'article','generation':1}]},
            {'name':'blog_static_import_receipts','rows':[{'source_slug':'article','post_id':'post1'}]}]
        self.args.backup.write_bytes(gzip.compress(json.dumps({'manifest':{'schemaVersion':1,'clientStackId':'p1-land-management'},'tables':blog_tables}).encode()))
        probe.update(blogRecoveryVerified=True,blogRevision='e'*64,blogSnapshotHashes=['f'*64],blogOwnershipHash='a'*64)
        with patch.object(runner.subprocess,'run',side_effect=fake),patch.object(runner.time,'sleep'),patch('builtins.print'),patch.object(runner.signal,'signal'):
            self.assertEqual(runner.main(self.args),0)
        populated=json.loads(self.args.output.read_text())
        self.assertEqual(populated['status'],'passed');self.assertTrue(populated['blogPublicationParity'])
        self.assertTrue(populated['blogRecoveryVerified']);self.assertFalse(populated['contentRecoveryVerified'])
        self.assertTrue(any('EXPECT_BLOG=' in arg for c in calls for arg in c))
        baseline_commands=[c for c in calls if c[:2]==['docker','create'] and c[c.index('--name')+1].endswith('-blog-baseline')]
        self.assertTrue(baseline_commands)
        self.assertTrue(all('--read-only' in c and '--tmpfs' in c and '/tmp:rw,nosuid,size=64m' in c for c in baseline_commands))
        for fault in ('cleanup','stop','restore'):
            calls.clear();containers.clear()
            with self.subTest(fault=fault),patch.object(runner.subprocess,'run',side_effect=fake),patch.object(runner.time,'sleep'),patch('builtins.print'),patch.object(runner.signal,'signal'):
                self.assertEqual(runner.main(self.args),1)
            failed=json.loads(self.args.output.read_text())
            self.assertEqual(failed['status'],'failed')
            if fault=='cleanup':self.assertFalse(failed['cleanupVerified'])
            if fault=='stop':self.assertEqual(failed['failedStage'],'current-boot')
            if fault=='restore':self.assertEqual(failed['failedStage'],'baseline-restore')

    def test_remote_selected_context_rejects_even_with_local_host_override(self):
        calls=[]
        def fake(command,**kwargs):
            calls.append(command)
            return subprocess.CompletedProcess(command,0,'ssh://remote.example','')
        with patch.dict(runner.os.environ,{'DOCKER_CONTEXT':'remote-selected','DOCKER_HOST':'unix:///local.sock'}),patch.object(runner.subprocess,'run',side_effect=fake),patch.object(runner.signal,'signal'),patch('builtins.print'):
            self.assertEqual(runner.main(self.args),1)
        self.assertEqual(len(calls),1)
        self.assertIn('remote-selected',calls[0])

    def test_empty_content_probe_only_accepts404_and_positive_path_requires200(self):
        for empty,status,expected in [('true',404,0),('true',200,1),('false',404,1),('false',200,0)]:
            setup="""process.env.TARGET='fixture';process.env.STACK_ID='p1-land-management';process.env.CONTENT_ROUTE='home';process.env.CONTENT_COMPONENT='hero';
            global.fetch=async(url,opts)=>{const path=new URL(url).pathname;let status=200;let body={};
            if(path==='/api/auth/me')status=401;
            if(path==='/api/setup/status')body={needsSetup:false};
            if(path.startsWith('/api/client-site-content/')){status=CONTENT_STATUS;if(opts.headers['if-none-match'])status=304;body={revision:1,content:{text:'private fixture'}};}
            if(path==='/api/p1/website-identity')body={schemaVersion:1,stackId:'p1-land-management',version:'a'.repeat(64),companyName:null,companyAddress:null,phoneDisplay:null,phoneHref:null,logoUrl:null,faviconUrl:null,googleBusinessUrl:null};
            return {status,headers:{get:()=> 'fixture-etag'},json:async()=>body};};
            """.replace('CONTENT_STATUS',str(status))
            result=subprocess.run(['node','-e',"process.env.EXPECT_EMPTY_CONTENT="+json.dumps(empty)+';'+setup+runner.PROBE],capture_output=True,text=True)
            with self.subTest(empty=empty,status=status):
                self.assertEqual(result.returncode,expected)
                self.assertNotIn('private fixture',result.stdout)
                if expected==0:self.assertEqual(json.loads(result.stdout)['contentRecoveryVerified'],empty!='true')

    def test_archive_blog_selects_published_revision_and_requires_complete_tables(self):
        archive={'tables':[
            {'name':'blog_publication_state','rows':[{'post_id':'post1','visibility':'published','published_revision_id':'published','draft_revision_id':'private-draft'}]},
            {'name':'blog_post_revisions','rows':[{'id':'published','post_id':'post1','snapshot':{'slug':'article'}},{'id':'private-draft','post_id':'post1','snapshot':{'slug':'private-draft'}}]},
            {'name':'blog_publication_routes','rows':[{'post_id':'post1','state':'published','revision_id':'published','slug':'article','generation':2}]},
            {'name':'blog_static_import_receipts','rows':[{'source_slug':'article','post_id':'post1'}]}]}
        expected=runner.archived_blog_contract(archive)
        self.assertEqual(expected['posts'],[{'id':'post1','revisionId':'published','generation':2}])
        self.assertNotIn('private-draft',json.dumps(expected))
        with self.assertRaises(ValueError):runner.archived_blog_contract({'tables':archive['tables'][:-1]})
        archive['tables'][2]['rows'][0]['revision_id']='private-draft'
        with self.assertRaises(ValueError):runner.archived_blog_contract(archive)
        self.assertIsNone(runner.archived_blog_contract({'tables':[]}))

    def test_blog_probe_compares_all_five_snapshots_and_permanent_ownership(self):
        setup=r'''
        process.env.TARGET='fixture';process.env.STACK_ID='p1-land-management';process.env.EXPECT_EMPTY_CONTENT='true';
        const c=require('node:crypto'),hash=v=>c.createHash('sha256').update(JSON.stringify(v)).digest('hex');
        const posts=Array.from({length:5},(_,i)=>({id:'post'+i,revisionId:'published'+i,generation:1,snapshot:{title:'Title'+i,content:'Private fixture article '+i,excerpt:'Published excerpt',responsiveCover:{src:'/r2/cover.webp'},presentation:{relatedContent:'Aside'}}}));
        const staticRoutes=posts.map((p,i)=>({slug:'article'+i,postId:p.id}));
        const body={schemaVersion:2,stackId:'p1-land-management',revision:hash({posts,staticRoutes}),posts,staticRoutes};
        process.env.EXPECT_BLOG=JSON.stringify({revision:body.revision,posts:posts.map(p=>({id:p.id,revisionId:p.revisionId,generation:p.generation,hash:hash(p)})),staticRoutes});
        MUTATION
        global.fetch=async(url,opts)=>{const path=new URL(url).pathname;let status=200,data={};
        if(path==='/api/auth/me')status=401;
        if(path==='/api/setup/status')data={needsSetup:false};
        if(path.startsWith('/api/client-site-content/'))status=404;
        if(path==='/api/website/blog-publication'){status=BLOG_STATUS;data=body;}
        if(path==='/api/p1/website-identity')data={schemaVersion:1,stackId:'p1-land-management',version:'a'.repeat(64),companyName:null,companyAddress:null,phoneDisplay:null,phoneHref:null,logoUrl:null,faviconUrl:null,googleBusinessUrl:null};
        return {status,headers:{get:()=>null},json:async()=>data};};
        '''
        cases=[('',200,0),('body.posts[4].snapshot.content="Wrong fifth article";',200,1),('body.staticRoutes.pop();',200,1),('body.posts[0].revisionId="private-draft";',200,1),('body.posts=[];',200,1),('body.schemaVersion=1;',200,1),('',503,1)]
        for mutation,status,expected in cases:
            # Recompute revision too: mismatched archive content must fail even when
            # a candidate returns a self-consistent, newly generated collection hash.
            script=setup.replace('MUTATION',mutation+'body.revision=hash({posts:body.posts,staticRoutes:body.staticRoutes});').replace('BLOG_STATUS',str(status))+runner.PROBE
            result=subprocess.run(['node','-e',script],capture_output=True,text=True)
            with self.subTest(mutation=mutation,status=status):
                self.assertEqual(result.returncode,expected)
                self.assertNotIn('Private fixture article',result.stdout)
                if expected==0:
                    evidence=json.loads(result.stdout)
                    self.assertTrue(evidence['blogRecoveryVerified']);self.assertEqual(evidence['blogPostCount'],5)
                    self.assertEqual(evidence['blogOwnershipCount'],5);self.assertEqual(len(evidence['blogSnapshotHashes']),5)
                    self.assertFalse(evidence['contentRecoveryVerified'])

    def test_baseline_projection_script_parses_and_never_exports_exception_values(self):
        syntax=subprocess.run(['node','--input-type=module','--check'],input=runner.BLOG_BASELINE,capture_output=True,text=True)
        self.assertEqual(syntax.returncode,0,syntax.stderr)
        catch=runner.BLOG_BASELINE.split('} catch {',1)[1].split('} finally {',1)[0]
        script="const blogStage='media-resolution';const error=new Error('SYNTHETIC_PRIVATE');"+catch
        result=subprocess.run(['node','-e',script],capture_output=True,text=True)
        self.assertEqual(result.returncode,1)
        self.assertEqual(result.stdout,'BLOG_BASELINE_FAILURE=media-resolution\n')
        self.assertNotIn('SYNTHETIC_PRIVATE',result.stdout+result.stderr)

    def test_input_output_alias_rejected(self):
        self.args.output=self.args.backup
        with self.assertRaises(ValueError):runner.main(self.args)

if __name__=='__main__':unittest.main()
