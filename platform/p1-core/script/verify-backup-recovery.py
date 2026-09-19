#!/usr/bin/env python3
"""Verify a trusted P1 backup in a fresh owned local database; never fetch backups."""
from __future__ import annotations
import argparse
import hashlib
import gzip
import json
import os
import pathlib
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
  for(const sequence of snapshot.sequences) {
    check(names.includes(sequence.tableName) && typeof sequence.columnName==='string' && typeof sequence.sequenceName==='string');
    const known=await pool.query('SELECT pg_get_serial_sequence($1,$2) AS name',['public.'+quote(sequence.tableName),sequence.columnName]);
    check(known.rows[0]?.name===sequence.sequenceName);
  }
  childStage='restore';
  const {restoreBackupSnapshot}=await load('server/services/system-backup.service.ts');
  await restoreBackupSnapshot(snapshot,{allowLegacyBackup:process.env.RECOVERY_ALLOW_LEGACY==='true'});
  async function verify() {
    for(const table of snapshot.tables) {
      const count=await pool.query('SELECT count(*)::text AS count FROM public.'+quote(table.name));
      check(count.rows[0].count===String(table.rowCount));
      if(!table.rows.length) continue;
      const columns=Object.keys(table.rows[0]);
      const result=await pool.query('SELECT '+columns.map(quote).join(',')+' FROM public.'+quote(table.name));
      const expected=table.rows.map(row=>JSON.stringify(canonical(row))).sort();
      const actual=result.rows.map(row=>JSON.stringify(canonical(row))).sort();
      check(JSON.stringify(actual)===JSON.stringify(expected));
    }
  }
  childStage='restored-row-comparison';
  await verify();
  childStage='post-restore-migration';
  await runMigrations();
  childStage='post-migration-comparison';
  await verify();
  process.stdout.write('\nRECOVERY_RESULT='+JSON.stringify({tableCount:names.length,rowCount,restoredRowsVerified:true,postRestoreMigrationsVerified:true,identity:identity.kind,legacyIdentityAcknowledged:identity.kind==='legacy-explicit'})+'\n');
} catch {
  process.stdout.write('\nRECOVERY_FAILURE_STAGE='+childStage+'\n');
  process.exitCode=1;
} finally {
  if(pool) await pool.end();
}
'''


def main(backup, output, expected_stack_id=None, allow_legacy_backup=False):
    if backup.resolve() == output.resolve() or (backup.exists() and output.exists() and os.path.samefile(backup, output)):
        print(json.dumps({'status': 'failed', 'error': 'Input and report must be different files.'}))
        return 1
    name = 'core-recovery-' + uuid.uuid4().hex[:12]
    password = secrets.token_hex(24)
    report = {'status': 'failed', 'fixture': name}
    cleanup_required = False
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
            stage = 'database-start'
            cleanup_required = True
            run(['docker', 'run', '-d', '--name', name, '-p', '127.0.0.1::5432', '-e', 'POSTGRES_USER=recovery', '-e', 'POSTGRES_PASSWORD='+password, '-e', 'POSTGRES_DB=core_backup_recovery', 'postgres:16-alpine'])
            port = run(['docker', 'port', name, '5432']).stdout.strip().rsplit(':', 1)[1]
            deadline = time.monotonic()+30
            while run(['docker', 'exec', name, 'pg_isready', '-U', 'recovery', '-d', 'core_backup_recovery'], check=False).returncode:
                if time.monotonic()>deadline:
                    raise RuntimeError('database-start-timeout')
                time.sleep(.25)
            stage = 'restore-and-compare'
            environment = {key: os.environ[key] for key in ('PATH', 'HOME', 'TMPDIR') if key in os.environ}
            environment.update(NODE_ENV='test', TZ='UTC', CLIENT_STACK_ID=target_stack_id, RECOVERY_ALLOW_LEGACY='true' if allow_legacy_backup else 'false', DATABASE_URL=f'postgresql://recovery:{password}@127.0.0.1:{port}/core_backup_recovery', SESSION_SECRET='synthetic-recovery-only-not-production', SYSTEM_BACKUPS_ENABLED='false', RECOVERY_INPUT=str(private_input))
            result = run(['node', '--import', 'tsx', '--input-type=module', '-e', CHILD], env=environment, timeout=300, check=False)
            if result.returncode:
                for marker in ('snapshot-validation','initial-migration','restore','restored-row-comparison','post-restore-migration','post-migration-comparison'):
                    if 'RECOVERY_FAILURE_STAGE='+marker in result.stdout.splitlines():
                        stage=marker
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
                inspected = run(['docker', 'container', 'inspect', name], check=False)
                if inspected.returncode == 0:
                    report['fixtureRemoved'] = run(['docker', 'rm', '--force', '--volumes', name], check=False).returncode == 0
                else:
                    inventory = run(['docker', 'container', 'ls', '--all', '--format', '{{.Names}}'], check=False)
                    report['fixtureRemoved'] = inventory.returncode == 0 and name not in inventory.stdout.splitlines()
            except Exception:
                report['fixtureRemoved'] = False
            if not report['fixtureRemoved']:
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
    args = parser.parse_args()
    if args.expected_stack_id is not None and not args.expected_stack_id.strip():
        parser.error('--expected-stack-id must not be blank')
    def interrupted(_number, _frame):
        raise RuntimeError('interrupted')
    signal.signal(signal.SIGINT, interrupted)
    signal.signal(signal.SIGTERM, interrupted)
    raise SystemExit(main(args.backup, args.output, args.expected_stack_id, args.allow_legacy_backup))
