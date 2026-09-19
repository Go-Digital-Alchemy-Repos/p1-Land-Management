#!/usr/bin/env python3
"""Restore a private dashboard archive in network-isolated, temporary PostgreSQL.

Never connects to production. No host ports, application processes or mail workers
are started. Reports contain counts/checksums only; database contents stay in RAM.
"""
import argparse
import hashlib
import json
import pathlib
import subprocess
import time
import uuid


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dump', type=pathlib.Path, required=True)
    parser.add_argument('--expected-sha256', required=True)
    parser.add_argument('--image', default='postgres:18-alpine')
    args = parser.parse_args()
    archive = args.dump.read_bytes()
    digest = hashlib.sha256(archive).hexdigest()
    if digest != args.expected_sha256:
        raise SystemExit('Backup checksum mismatch; nothing restored.')
    root = pathlib.Path(__file__).resolve().parents[2]
    migrations = root / 'artifacts/api-server/migrations/dashboard'
    name = 'p1-isolated-restore-' + uuid.uuid4().hex[:12]

    def run(argv, data=None):
        result = subprocess.run(argv, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.returncode:
            # SQL errors can contain private row data. Never echo provider output.
            raise RuntimeError('Isolated restore command failed: ' + argv[0])
        return result.stdout

    def pg(command, database='dashboard', data=None):
        return run(['docker', 'exec', '-i', name, command, '-U', 'postgres', '-d', database,
                    *(['-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'] if command == 'psql' else [])], data)

    def sql(query, database='dashboard'):
        return pg('psql', database, query.encode()).decode().strip()

    def ident(value):
        return '"' + value.replace('"', '""') + '"'

    def literal(value):
        return "'" + value.replace("'", "''") + "'"

    def structure(database='dashboard'):
        return json.loads(sql("""SELECT coalesce(json_object_agg(table_name, columns), '{}')
          FROM (SELECT table_name, json_agg(column_name ORDER BY ordinal_position) AS columns
          FROM information_schema.columns WHERE table_schema='public'
          GROUP BY table_name) t;""", database))

    def fingerprints(tables, database='dashboard'):
        values = {}
        for table, columns in sorted(tables.items()):
            # Sort complete row representations to include duplicate multiplicity.
            rows = sql('SELECT coalesce(json_agg(r ORDER BY r::text), \'[]\') FROM '
                       '(SELECT row_to_json(t) AS r FROM (SELECT '
                       + ','.join(map(ident, columns)) + ' FROM public.' + ident(table) + ') t) s;', database)
            values[table] = hashlib.sha256(rows.encode()).hexdigest()
        return values

    def schema_fingerprint(database):
        dump = run(['docker', 'exec', name, 'pg_dump', '-U', 'postgres', '-d', database,
                    '--schema-only', '--no-owner', '--no-acl']).decode()
        # pg_dump emits random psql restrict tokens; they are not schema objects.
        stable = '\n'.join(line for line in dump.splitlines()
                           if line and not line.startswith(('--', '\\restrict', '\\unrestrict')))
        return hashlib.sha256(stable.encode()).hexdigest()

    def sequences(database):
        names = json.loads(sql("SELECT coalesce(json_agg(sequencename ORDER BY sequencename), '[]') "
                               "FROM pg_sequences WHERE schemaname='public';", database))
        return {item: sql('SELECT last_value, is_called FROM public.' + ident(item), database)
                for item in names}

    started = False
    try:
        run(['docker', 'run', '-d', '--rm', '--name', name, '--network', 'none',
             '--tmpfs', '/var/lib/postgresql:rw,noexec,nosuid,size=1024m',
             '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-e', 'POSTGRES_DB=dashboard', args.image])
        started = True
        for _ in range(60):
            result = subprocess.run(['docker', 'exec', name, 'pg_isready', '-U', 'postgres'],
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if result.returncode == 0:
                break
            time.sleep(1)
        else:
            raise RuntimeError('Isolated PostgreSQL did not become ready')
        run(['docker', 'exec', '-i', name, 'pg_restore', '-U', 'postgres', '-d', 'dashboard',
             '--exit-on-error', '--single-transaction', '--no-owner', '--no-acl'], archive)
        original = structure()
        before = fingerprints(original)
        ledger = json.loads(sql("SELECT coalesce(json_object_agg(name, checksum), '{}') FROM dashboard_migration;"))
        planned = []
        for path in sorted(migrations.glob('*.sql')):
            raw = path.read_bytes()
            checksum = hashlib.sha256(raw).hexdigest()
            if path.name in ledger:
                if ledger[path.name] != checksum:
                    raise RuntimeError('Migration checksum mismatch: ' + path.name)
            else:
                planned.append((path.name, checksum, raw.decode()))
        if not list(migrations.glob('*.sql')):
            raise RuntimeError('No source migrations found')
        # Same ordered, checksum-guarded transaction as dashboard/migrate.ts.
        batch = ['BEGIN;', 'SELECT pg_advisory_xact_lock(918277);']
        for filename, checksum, content in planned:
            batch += [content, 'INSERT INTO dashboard_migration(name, checksum) VALUES ('
                      + literal(filename) + ',' + literal(checksum) + ');']
        batch.append('COMMIT;')
        sql('\n'.join(batch))
        after = fingerprints(original)
        changed = [table for table in original if table != 'dashboard_migration' and before[table] != after[table]]
        if changed:
            raise RuntimeError('Existing records changed during migration in: ' + ', '.join(changed))
        current = structure()
        migrated = fingerprints(current)
        # Re-dump/re-restore proves the migrated candidate itself is recoverable.
        new_archive = run(['docker', 'exec', name, 'pg_dump', '-U', 'postgres', '-d', 'dashboard',
                           '--format=custom', '--no-owner', '--no-acl'])
        sql('CREATE DATABASE recovered;')
        run(['docker', 'exec', '-i', name, 'pg_restore', '-U', 'postgres', '-d', 'recovered',
             '--exit-on-error', '--single-transaction', '--no-owner', '--no-acl'], new_archive)
        if current != structure('recovered') or migrated != fingerprints(current, 'recovered'):
            raise RuntimeError('Migrated backup round trip did not preserve schema columns and rows')
        if schema_fingerprint('dashboard') != schema_fingerprint('recovered') or sequences('dashboard') != sequences('recovered'):
            raise RuntimeError('Restored schema objects or sequence states differ')
        # A no-op rerun is checked against the full current migration ledger.
        applied = json.loads(sql("SELECT json_object_agg(name,checksum) FROM dashboard_migration;"))
        if not all(applied.get(p.name) == hashlib.sha256(p.read_bytes()).hexdigest() for p in migrations.glob('*.sql')):
            raise RuntimeError('Final migration ledger does not match source')
        print(json.dumps({'status': 'passed', 'sourceBackupSha256': digest, 'image': args.image,
                          'sourceTables': len(original), 'migratedTables': len(current),
                          'sourceLedgerEntries': len(ledger), 'candidateLedgerEntries': len(applied),
                          'appliedMigrations': [item[0] for item in planned],
                          'originalRowsPreserved': True, 'migratedRestoreMatches': True,
                          'currentMigrationChecksumsMatch': True, 'schemaAndSequencesMatch': True, 'network': 'none', 'hostPorts': []}, indent=2))
    finally:
        if started:
            run(['docker', 'rm', '-f', name])


if __name__ == '__main__':
    main()
