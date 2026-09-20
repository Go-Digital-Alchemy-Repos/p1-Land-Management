#!/usr/bin/env python3
"""Verify a trusted P1 backup in a fresh owned local database; never fetch backups."""
from __future__ import annotations
import argparse
import hashlib
import gzip
import json
import os
import pathlib
import re
import shutil
import secrets
import signal
import stat
import subprocess
import tempfile
import time
import uuid

ROOT = pathlib.Path(__file__).resolve().parent.parent
MAX_COMPRESSED_BYTES = 256 * 1024 * 1024
MAX_SNAPSHOT_BYTES = 1024 * 1024 * 1024


def prepare_runtime_context(target):
    """Allowlisted source only; never copy .env, archives or host dependencies."""
    for name in ('package.json', 'package-lock.json', 'tsconfig.json'):
        if (ROOT / name).is_symlink():
            raise ValueError('symlink-in-runtime-source')
        shutil.copyfile(ROOT / name, target / name)
    for name in ('server', 'shared', 'p1-migrations'):
        if (ROOT / name).is_symlink():
            raise ValueError('symlink-in-runtime-source')
        for source in (ROOT / name).rglob('*'):
            if source.is_symlink():
                raise ValueError('symlink-in-runtime-source')
            if source.is_file() and source.suffix in ('.ts', '.json', '.sql') and not any(part.startswith('.') for part in source.relative_to(ROOT).parts):
                destination = target / source.relative_to(ROOT)
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, destination)
    (target / 'recovery.mjs').write_text(CHILD)
    (target / 'Dockerfile').write_text('FROM node:22-bookworm-slim\nWORKDIR /runtime\nCOPY package.json package-lock.json ./\nRUN npm ci --ignore-scripts --no-audit --no-fund\nCOPY . .\nCMD ["node", "--import", "tsx", "recovery.mjs"]\n')


def validate_snapshot_identity(path, expected_stack_id=None, allow_legacy_backup=False):
    """Reject wrong provenance before provisioning a database. Never rewrite it."""
    with gzip.open(path, 'rb') as source:
        data = source.read(MAX_SNAPSHOT_BYTES + 1)
    if len(data) > MAX_SNAPSHOT_BYTES:
        raise ValueError('snapshot-too-large')
    snapshot = json.loads(data)
    manifest = snapshot.get('manifest')
    if not isinstance(manifest, dict) or manifest.get('schemaVersion') != 1:
        raise ValueError('invalid-manifest')
    identity = manifest.get('clientStackId')
    if identity is not None and not isinstance(identity, str):
        raise ValueError('invalid-stack-identity')
    identity = (identity or '').strip()
    expected = (expected_stack_id or '').strip()
    if identity:
        if not expected or identity != expected:
            raise ValueError('stack-identity-mismatch')
        return expected, 'exact-match'
    if not allow_legacy_backup or expected:
        raise ValueError('legacy-acknowledgement-required')
    return 'disposable-backup-recovery', 'legacy-explicit'


def migration_files_digest(root):
    """Fingerprint the SQL and journal actually consumed by server/migrate.ts."""
    folder = root / 'p1-migrations'
    paths = sorted(folder.glob('*.sql'))
    journal = folder / 'meta' / '_journal.json'
    if not paths or not journal.is_file():
        raise ValueError('missing-p1-migrations')
    paths.append(journal)
    return hashlib.sha256(b''.join(
        path.relative_to(folder).as_posix().encode() + b'\0' + path.read_bytes()
        for path in paths
    )).hexdigest()

# Raw child logs can contain restored settings or SQL values. Never forward them.
CHILD = r'''
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {types as pgTypes} from 'pg';
const load = path => import(pathToFileURL(process.cwd()+'/'+path).href);
let pool;
let childStage="snapshot-validation";
const check = (condition) => { if (!condition) throw new Error('Recovery verification failed'); };
const quote = value => '"'+value.replaceAll('"','""')+'"';
const canonical = value => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key,canonical(value[key])]));
  return value;
};
// Match captureTable's query-local raw temporal parser. Never round actual data.
const recoveryTypeParser=(oid,format='text')=>format==='text'&&[1082,1114,1184].includes(oid)?value=>value:pgTypes.getTypeParser(oid,format);
const expectedTemporalCache=new Map();
async function expectedTemporalRow(row,fields,query) {
  const result={...row};
  for(const field of fields) {
    const type=({1082:'date',1114:'timestamp',1184:'timestamptz'})[field.dataTypeID];
    const value=row[field.name];
    if(!type||value===null)continue;
    check(typeof value==='string');
    const key=JSON.stringify([type,value]);
    if(!expectedTemporalCache.has(key)) {
      // Casting archived expectations handles historical ISO serialization and
      // timezone spelling without truncating either side's fractional precision.
      const converted=await query('SELECT $1::'+type+'::text AS value',[value]);
      expectedTemporalCache.set(key,converted.rows[0].value);
    }
    result[field.name]=expectedTemporalCache.get(key);
  }
  return result;
}
try {
  const snapshot=JSON.parse(gunzipSync(fs.readFileSync(process.env.RECOVERY_INPUT), {maxOutputLength: 1024*1024*1024}).toString('utf8'));
  check(snapshot?.manifest?.schemaVersion===1);
  const {assertBackupRestoreIdentity}=await load('server/services/backup-restore-identity.ts');
  const identity=assertBackupRestoreIdentity(snapshot.manifest, {
    targetStackId:process.env.CLIENT_STACK_ID,
    allowLegacyBackup:process.env.RECOVERY_ALLOW_LEGACY==='true',
  });
  check(Array.isArray(snapshot.tables) && snapshot.tables.length>0 && Array.isArray(snapshot.sequences));
  const names=snapshot.tables.map(table=>table.name);
  check(names.every(name=>typeof name==='string' && /^[a-z_][a-z0-9_]*$/.test(name)) && new Set(names).size===names.length);
  check(snapshot.manifest.tableCount===names.length && Array.isArray(snapshot.manifest.restoreOrder));
  check(snapshot.manifest.restoreOrder.length===names.length && new Set(snapshot.manifest.restoreOrder).size===names.length && snapshot.manifest.restoreOrder.every(name=>names.includes(name)));
  let rowCount=0;
  for(const table of snapshot.tables) {
    check(Array.isArray(table.rows) && table.rows.length===table.rowCount);
    const columns=Object.keys(table.rows[0]||{}).sort();
    for(const row of table.rows) check(row && typeof row==='object' && !Array.isArray(row) && JSON.stringify(Object.keys(row).sort())===JSON.stringify(columns));
    rowCount+=table.rows.length;
  }
  check(snapshot.manifest.totalRowCount===rowCount);
  childStage='initial-migration';
  const database=await load('server/db.ts'); pool=database.pool;
  const {runMigrations}=await load('server/migrate.ts');
  await runMigrations();
  const actualNames=new Set((await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")).rows.map(row=>row.table_name));
  check(names.every(name=>actualNames.has(name)));
  const currentSequences=(await pool.query(`SELECT table_name AS "tableName", column_name AS "columnName",
    pg_get_serial_sequence(format('%I.%I', table_schema, table_name), column_name) AS "sequenceName"
    FROM information_schema.columns WHERE table_schema='public' AND table_name = ANY($1::text[])
    AND (is_identity='YES' OR column_default LIKE 'nextval(%')`,[names])).rows;
  check(currentSequences.every(sequence=>sequence.sequenceName));
  for(const sequence of snapshot.sequences) {
    check(names.includes(sequence.tableName) && typeof sequence.columnName==='string' && typeof sequence.sequenceName==='string');
    const known=await pool.query('SELECT pg_get_serial_sequence($1,$2) AS name',['public.'+quote(sequence.tableName),sequence.columnName]);
    check(known.rows[0]?.name===sequence.sequenceName);
  }
  childStage='restore-module-load';
  const {restoreBackupSnapshot}=await load('server/services/system-backup.service.ts');
  childStage='restore';
  await restoreBackupSnapshot(snapshot,{allowLegacyBackup:process.env.RECOVERY_ALLOW_LEGACY==='true'});
  async function verify() {
    for(const table of snapshot.tables) {
      const count=await pool.query('SELECT count(*)::text AS count FROM public.'+quote(table.name));
      check(count.rows[0].count===String(table.rowCount));
      if(!table.rows.length) continue;
      const columns=Object.keys(table.rows[0]);
      const result=await pool.query({text:'SELECT '+columns.map(quote).join(',')+' FROM public.'+quote(table.name),types:{getTypeParser:recoveryTypeParser}});
      const expectedRows=[];
      for(const row of table.rows)expectedRows.push(await expectedTemporalRow(row,result.fields,(text,values)=>pool.query(text,values)));
      const expected=expectedRows.map(row=>JSON.stringify(canonical(row))).sort();
      const actual=result.rows.map(row=>JSON.stringify(canonical(row))).sort();
      check(JSON.stringify(actual)===JSON.stringify(expected));
    }
  }
  childStage='restored-row-comparison';
  await verify();
  for(const sequence of currentSequences) {
    const expected=await pool.query('SELECT MAX('+quote(sequence.columnName)+')::text AS value FROM public.'+quote(sequence.tableName));
    // sequenceName was independently resolved through pg_get_serial_sequence above.
    const actual=await pool.query('SELECT last_value::text AS value,is_called FROM '+sequence.sequenceName);
    check(actual.rows[0].value===(expected.rows[0].value??'1'));
    check(actual.rows[0].is_called===(expected.rows[0].value!==null));
  }
  childStage='post-restore-migration';
  await runMigrations();
  childStage='post-migration-comparison';
  await verify();
  process.stdout.write('\nRECOVERY_RESULT='+JSON.stringify({tableCount:names.length,rowCount,restoredRowsVerified:true,sequencesVerified:true,sequenceCount:currentSequences.length,postRestoreMigrationsVerified:true,identity:identity.kind,legacyIdentityAcknowledged:identity.kind==='legacy-explicit'})+'\n');
} catch (error) {
  const codes = { '23503':'foreign-key', '23505':'unique-constraint', '23502':'not-null', '42703':'missing-column', '42P01':'missing-table', '22P02':'invalid-input', '0A000':'unsupported-operation', '42804':'type-mismatch', '428C9':'generated-identity-rejected', ERR_MODULE_NOT_FOUND:'module-not-found', MODULE_NOT_FOUND:'module-not-found', ERR_DLOPEN_FAILED:'native-module', ENOENT:'missing-file' };
  const category = codes[error?.code] || codes[error?.cause?.code] || 'unclassified';
  process.stdout.write('\nRECOVERY_FAILURE_CATEGORY='+category+'\n');
  const names = ['Error','TypeError','ReferenceError','SyntaxError','RangeError'];
  const state = [error?.code,error?.cause?.code].find(code=>typeof code==='string' && /^[0-9]{2}[A-Z0-9]{3}$/.test(code));
  const frames = String(error?.stack||'').split('\n').slice(1).filter(line=>/^\s+at /.test(line)).flatMap(line=>line.match(/\/runtime\/(?:server|shared)\/[A-Za-z0-9_.\/-]+:\d+:\d+/g)||[]).slice(0,5);
  process.stdout.write('\nRECOVERY_FAILURE_DIAGNOSTIC='+JSON.stringify({name:names.includes(error?.name)?error.name:'Other',sqlState:state||null,frames})+'\n');
  process.stdout.write('\nRECOVERY_FAILURE_STAGE='+childStage+'\n');
  process.exitCode=1;
} finally {
  if(pool) await pool.end();
}
'''


def safe_failure_diagnostic(value):
    """Only fixed error metadata and paths in the reviewed source tree."""
    if not isinstance(value, dict) or set(value) != {'name', 'sqlState', 'frames'}:
        raise ValueError('invalid-diagnostic')
    if value['name'] not in ('Error', 'TypeError', 'ReferenceError', 'SyntaxError', 'RangeError', 'Other'):
        raise ValueError('invalid-diagnostic')
    state = value['sqlState']
    if state is not None and (not isinstance(state, str) or not re.fullmatch(r'[0-9]{2}[A-Z0-9]{3}', state)):
        raise ValueError('invalid-diagnostic')
    if not isinstance(value['frames'], list) or len(value['frames']) > 5:
        raise ValueError('invalid-diagnostic')
    frames = []
    for frame in value['frames']:
        match = re.fullmatch(r'/runtime/((?:server|shared)/[A-Za-z0-9_./-]+):(\d{1,6}):(\d{1,6})', frame) if isinstance(frame, str) else None
        if not match:
            continue
        path = ROOT / match[1]
        if '..' not in path.parts and path.is_file() and not path.is_symlink():
            frames.append(frame)
    return {'name': value['name'], 'sqlState': state, 'frames': frames}


def main(backup, output, expected_stack_id=None, allow_legacy_backup=False, postgres_image='postgres:18-alpine'):
    if backup.resolve() == output.resolve() or (backup.exists() and output.exists() and os.path.samefile(backup, output)):
        print(json.dumps({'status': 'failed', 'error': 'Input and report must be different files.'}))
        return 1
    name = 'core-recovery-' + uuid.uuid4().hex[:12]
    password = secrets.token_hex(24)
    report = {'status': 'failed', 'fixture': name}
    cleanup_required = False
    network_created = False
    image_created = False
    network = name + '-isolated'
    child_name = name + '-node'
    runtime_image = name + ':local'
    stage = 'input-validation'

    def run(args, *, env=None, timeout=90, check=True):
        result = subprocess.run(args, cwd=ROOT, env=env, text=True, capture_output=True, timeout=timeout)
        if check and result.returncode:
            raise RuntimeError('command-failed')
        return result

    try:
        descriptor = os.open(backup, os.O_RDONLY | os.O_NOFOLLOW)
        with os.fdopen(descriptor, 'rb') as source, tempfile.TemporaryDirectory(prefix=name) as directory:
            info = os.fstat(source.fileno())
            if not stat.S_ISREG(info.st_mode) or stat.S_IMODE(info.st_mode) != 0o600 or info.st_uid != os.getuid():
                raise RuntimeError('input-must-be-owned-regular-file-mode-0600')
            if info.st_size > MAX_COMPRESSED_BYTES:
                raise RuntimeError('input-too-large')
            temporary = pathlib.Path(directory)
            private_input = temporary / 'snapshot.json.gz'
            digest = hashlib.sha256()
            with os.fdopen(os.open(private_input, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), 'wb') as target:
                total = 0
                while chunk := source.read(1024 * 1024):
                    total += len(chunk)
                    if total > MAX_COMPRESSED_BYTES:
                        raise RuntimeError('input-too-large')
                    digest.update(chunk)
                    target.write(chunk)
            report['backupSha256'] = digest.hexdigest()
            report['compressedBytes'] = total
            stage = 'snapshot-identity'
            target_stack_id, identity_kind = validate_snapshot_identity(
                private_input, expected_stack_id, allow_legacy_backup)
            report['identity'] = identity_kind
            stage = 'local-docker-check'
            context = os.environ.get('DOCKER_CONTEXT')
            endpoint = (os.environ.get('DOCKER_HOST') if not context else None) or run(['docker', 'context', 'inspect', *([context] if context else []), '--format', '{{.Endpoints.docker.Host}}']).stdout.strip()
            if not endpoint.startswith('unix://'):
                raise RuntimeError('local-unix-socket-required')
            report['candidate'] = run(['git', 'rev-parse', 'HEAD']).stdout.strip()
            report['restoreSourceSha256'] = hashlib.sha256((ROOT/'server/services/system-backup.service.ts').read_bytes()).hexdigest()
            report['migrationFilesSha256'] = migration_files_digest(ROOT)
            report['migrationRunnerSha256'] = hashlib.sha256((ROOT/'server/migrate.ts').read_bytes()).hexdigest()
            stage = 'runtime-preparation'
            if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._/:@-]+', postgres_image):
                raise RuntimeError('invalid-postgres-image')
            runtime = temporary / 'runtime'
            runtime.mkdir()
            prepare_runtime_context(runtime)
            # Network-enabled dependency preparation happens before the isolated
            # rehearsal. No archive or credentials are part of this build context.
            run(['docker', 'build', '-t', runtime_image, str(runtime)], timeout=600)
            image_created = True
            run(['docker', 'pull', postgres_image], timeout=180)
            report['postgresImageId'] = run(['docker', 'image', 'inspect', postgres_image, '--format', '{{.Id}}']).stdout.strip()
            report['runtimeImageId'] = run(['docker', 'image', 'inspect', runtime_image, '--format', '{{.Id}}']).stdout.strip()
            report['dependencyLockSha256'] = hashlib.sha256((ROOT/'package-lock.json').read_bytes()).hexdigest()
            stage = 'database-start'
            run(['docker', 'network', 'create', '--internal', network])
            network_created = True
            report['networkInternal'] = run(['docker', 'network', 'inspect', network, '--format', '{{.Internal}}']).stdout.strip() == 'true'
            if not report['networkInternal']:
                raise RuntimeError('network-not-internal')
            cleanup_required = True
            run(['docker', 'run', '--pull=never', '-d', '--name', name, '--network', network, '--network-alias', 'recovery-db', '-e', 'POSTGRES_USER=recovery', '-e', 'POSTGRES_PASSWORD='+password, '-e', 'POSTGRES_DB=core_backup_recovery', postgres_image])
            deadline = time.monotonic()+30
            while run(['docker', 'exec', name, 'pg_isready', '-U', 'recovery', '-d', 'core_backup_recovery'], check=False).returncode:
                if time.monotonic()>deadline:
                    raise RuntimeError('database-start-timeout')
                time.sleep(.25)
            stage = 'restore-and-compare'
            report['postgresVersion'] = run(['docker', 'exec', name, 'postgres', '--version']).stdout.strip()
            environment = dict(NODE_ENV='test', TZ='UTC', CLIENT_STACK_ID=target_stack_id, RECOVERY_ALLOW_LEGACY='true' if allow_legacy_backup else 'false', DATABASE_URL=f'postgresql://recovery:{password}@127.0.0.1:5432/core_backup_recovery', SESSION_SECRET='synthetic-recovery-only-not-production', SYSTEM_BACKUPS_ENABLED='false', RECOVERY_INPUT='/input/snapshot.json.gz')
            command = ['docker', 'create', '--pull=never', '--name', child_name, '--network', 'container:'+name, '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--tmpfs', '/tmp:rw,nosuid,size=64m', '--mount', 'type=bind,src='+str(private_input)+',dst=/input/snapshot.json.gz,readonly']
            for key, value in environment.items():
                command.extend(['-e', key+'='+value])
            command.append(runtime_image)
            run(command)
            attachments = json.loads(run(['docker', 'container', 'inspect', name, '--format', '{{json .NetworkSettings.Networks}}']).stdout)
            owned_database_id = run(['docker', 'container', 'inspect', name, '--format', '{{.Id}}']).stdout.strip()
            network_mode = run(['docker', 'container', 'inspect', child_name, '--format', '{{.HostConfig.NetworkMode}}']).stdout.strip()
            report['childNetworkVerified'] = isinstance(attachments, dict) and list(attachments) == [network] and bool(re.fullmatch(r'[0-9a-f]{64}', owned_database_id)) and network_mode == 'container:'+owned_database_id
            if not report['childNetworkVerified']:
                raise RuntimeError('unexpected-child-network')
            result = run(['docker', 'start', '--attach', child_name], timeout=300, check=False)
            if result.returncode:
                for marker in ('snapshot-validation','initial-migration','restore-module-load','restore','restored-row-comparison','post-restore-migration','post-migration-comparison'):
                    if 'RECOVERY_FAILURE_STAGE='+marker in result.stdout.splitlines():
                        stage=marker
                for category in ('foreign-key','unique-constraint','not-null','missing-column','missing-table','invalid-input','unsupported-operation','type-mismatch','generated-identity-rejected','module-not-found','native-module','missing-file','unclassified'):
                    if 'RECOVERY_FAILURE_CATEGORY='+category in result.stdout.splitlines():
                        report['failureCategory'] = category
                diagnostics = [line.removeprefix('RECOVERY_FAILURE_DIAGNOSTIC=') for line in result.stdout.splitlines() if line.startswith('RECOVERY_FAILURE_DIAGNOSTIC=')]
                if len(diagnostics) == 1:
                    report['diagnostic'] = safe_failure_diagnostic(json.loads(diagnostics[0]))
                raise RuntimeError('child-failed')
            lines = [line.removeprefix('RECOVERY_RESULT=') for line in result.stdout.splitlines() if line.startswith('RECOVERY_RESULT=')]
            if len(lines)!=1:
                raise RuntimeError('missing-aggregate-result')
            aggregate = json.loads(lines[0])
            report.update(aggregate)
            report['status'] = 'passed'
    except Exception:
        report['failedStage'] = stage
        report['error'] = 'Recovery verification failed; raw subprocess logs intentionally withheld.'
    finally:
        signal.signal(signal.SIGINT, signal.SIG_IGN)
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        if cleanup_required:
            try:
                run(['docker', 'rm', '--force', '--volumes', child_name], check=False)
                inventory = run(['docker', 'container', 'ls', '--all', '--format', '{{.Names}}'], check=False)
                report['childRemoved'] = inventory.returncode == 0 and child_name not in inventory.stdout.splitlines()
                inspected = run(['docker', 'container', 'inspect', name], check=False)
                if inspected.returncode == 0:
                    report['fixtureRemoved'] = run(['docker', 'rm', '--force', '--volumes', name], check=False).returncode == 0
                else:
                    inventory = run(['docker', 'container', 'ls', '--all', '--format', '{{.Names}}'], check=False)
                    report['fixtureRemoved'] = inventory.returncode == 0 and name not in inventory.stdout.splitlines()
            except Exception:
                report['fixtureRemoved'] = False
            if not report['fixtureRemoved'] or not report.get('childRemoved'):
                report['status'] = 'failed'
        if network_created:
            try:
                report['networkRemoved'] = run(['docker', 'network', 'rm', network], check=False).returncode == 0
            except Exception:
                report['networkRemoved'] = False
            if not report['networkRemoved']:
                report['status'] = 'failed'
        if image_created:
            try:
                report['runtimeImageRemoved'] = run(['docker', 'image', 'rm', runtime_image], check=False).returncode == 0
            except Exception:
                report['runtimeImageRemoved'] = False
            if not report['runtimeImageRemoved']:
                report['status'] = 'failed'
        output.parent.mkdir(parents=True, exist_ok=True)
        with os.fdopen(os.open(output, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600), 'w') as target:
            os.fchmod(target.fileno(), 0o600)
            json.dump(report, target, indent=2)
            target.write('\n')
        print(json.dumps(report, indent=2))
    return 0 if report['status'] == 'passed' else 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backup', type=pathlib.Path, required=True)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    provenance = parser.add_mutually_exclusive_group(required=True)
    provenance.add_argument('--expected-stack-id', help='Reviewed stack ID; must exactly match snapshot provenance.')
    provenance.add_argument('--allow-legacy-backup', action='store_true', help='Explicitly acknowledge a snapshot without stack provenance.')
    parser.add_argument('--postgres-image', default='postgres:18-alpine', help='Reviewed production-compatible PostgreSQL image, optionally digest-pinned.')
    args = parser.parse_args()
    if args.expected_stack_id is not None and not args.expected_stack_id.strip():
        parser.error('--expected-stack-id must not be blank')
    def interrupted(_number, _frame):
        raise RuntimeError('interrupted')
    signal.signal(signal.SIGINT, interrupted)
    signal.signal(signal.SIGTERM, interrupted)
    raise SystemExit(main(args.backup, args.output, args.expected_stack_id, args.allow_legacy_backup, args.postgres_image))
