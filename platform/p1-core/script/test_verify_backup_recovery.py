"""Synthetic, offline provenance/fingerprint checks; no database or provider access."""
import gzip
import hashlib
import importlib.util
import json
import pathlib
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('recovery', pathlib.Path(__file__).with_name('verify-backup-recovery.py'))
recovery = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(recovery)


class RecoveryProvenanceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)

    def snapshot(self, identity=None):
        path = self.root / 'snapshot.json.gz'
        manifest = {'schemaVersion': 1}
        if identity is not None:
            manifest['clientStackId'] = identity
        path.write_bytes(gzip.compress(json.dumps({'manifest': manifest, 'tables': [], 'sequences': []}).encode()))
        path.chmod(0o600)
        return path

    def test_exact_match_keeps_original_snapshot_bytes(self):
        path = self.snapshot('p1-land-management')
        original = hashlib.sha256(path.read_bytes()).hexdigest()
        self.assertEqual(recovery.validate_snapshot_identity(path, 'p1-land-management'), ('p1-land-management', 'exact-match'))
        self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), original)

    def test_legacy_flag_never_overrides_identified_mismatch(self):
        path = self.snapshot('other-stack')
        for legacy in (True, False):
            with self.assertRaises(ValueError):
                recovery.validate_snapshot_identity(path, 'p1-land-management', legacy)
        with self.assertRaises(ValueError):
            recovery.validate_snapshot_identity(path, allow_legacy_backup=True)

    def test_legacy_requires_explicit_acknowledgement(self):
        path = self.snapshot()
        with self.assertRaises(ValueError):
            recovery.validate_snapshot_identity(path)
        with self.assertRaises(ValueError):
            recovery.validate_snapshot_identity(path, 'p1-land-management')
        self.assertEqual(recovery.validate_snapshot_identity(path, allow_legacy_backup=True), ('disposable-backup-recovery', 'legacy-explicit'))

    def test_mismatch_fails_before_docker_or_database(self):
        path = self.snapshot('other-stack')
        output = self.root / 'report.json'
        with patch.object(recovery.subprocess, 'run') as subprocess, patch.object(recovery.signal, 'signal'), patch('builtins.print'):
            self.assertEqual(recovery.main(path, output, 'p1-land-management'), 1)
        subprocess.assert_not_called()
        report = json.loads(output.read_text())
        self.assertEqual(report['failedStage'], 'snapshot-identity')
        self.assertNotIn('other-stack', output.read_text())

    def test_fingerprints_p1_sql_and_journal_not_upstream_migrations(self):
        folder = self.root / 'p1-migrations'
        (folder / 'meta').mkdir(parents=True)
        sql = folder / '0000_p1_foundation.sql'
        sql.write_text('SELECT 1;')
        journal = folder / 'meta' / '_journal.json'
        journal.write_text('{"entries":[]}')
        upstream = self.root / 'migrations'
        upstream.mkdir()
        original = recovery.migration_files_digest(self.root)
        (upstream / 'unrelated.sql').write_text('SELECT 2;')
        self.assertEqual(recovery.migration_files_digest(self.root), original)
        sql.write_text('SELECT 3;')
        changed = recovery.migration_files_digest(self.root)
        self.assertNotEqual(changed, original)
        journal.write_text('{"entries":[{"tag":"0000_p1_foundation"}]}')
        self.assertNotEqual(recovery.migration_files_digest(self.root), changed)

    def test_runtime_context_excludes_environment_archives_and_host_dependencies(self):
        source = self.root / 'source'
        source.mkdir()
        for filename in ('package.json', 'package-lock.json', 'tsconfig.json'):
            (source / filename).write_text('{}')
        for folder in ('server', 'shared', 'p1-migrations', 'node_modules'):
            (source / folder).mkdir()
            (source / folder / 'allowed.ts').write_text('export {};')
            (source / folder / '.env').write_text('DO_NOT_COPY=fixture')
            (source / folder / 'backup.gz').write_bytes(b'fixture')
        target = self.root / 'runtime'
        target.mkdir()
        with patch.object(recovery, 'ROOT', source):
            recovery.prepare_runtime_context(target)
        self.assertTrue((target / 'server/allowed.ts').exists())
        self.assertFalse((target / 'node_modules').exists())
        self.assertFalse(list(target.rglob('.env')))
        self.assertFalse(list(target.rglob('*.gz')))
        self.assertIn('npm ci --ignore-scripts', (target / 'Dockerfile').read_text())
        self.assertIn('node:22', (target / 'Dockerfile').read_text())

    def test_runtime_context_rejects_source_symlinks(self):
        source = self.root / 'source'
        source.mkdir()
        for filename in ('package.json', 'package-lock.json', 'tsconfig.json'):
            (source / filename).write_text('{}')
        (source / 'server').mkdir()
        (source / 'server/leak.ts').symlink_to(source / 'package.json')
        target = self.root / 'runtime'
        target.mkdir()
        with patch.object(recovery, 'ROOT', source), self.assertRaises(ValueError):
            recovery.prepare_runtime_context(target)

    def test_runtime_commands_use_internal_network_without_host_environment(self):
        path = self.snapshot('p1-land-management')
        calls = []
        def fake_run(args, **kwargs):
            calls.append((args, kwargs))
            stdout = ''
            if args[:3] == ['docker', 'context', 'inspect']:
                stdout = 'unix:///fixture/docker.sock'
            if args[:3] == ['docker', 'network', 'inspect']:
                stdout = 'true'
            if args[:3] == ['docker', 'container', 'inspect'] and '--format' in args:
                stdout = ('container:'+'a'*64) if args[-1] == '{{.HostConfig.NetworkMode}}' else ('a'*64 if args[-1] == '{{.Id}}' else json.dumps({args[3]+'-isolated': {}}))
            if args[:3] == ['docker', 'start', '--attach']:
                stdout = 'RECOVERY_RESULT={"restoredRowsVerified":true,"sequencesVerified":true}\n'
            return recovery.subprocess.CompletedProcess(args, 0, stdout, '')
        with patch.object(recovery.subprocess, 'run', side_effect=fake_run), patch.object(recovery.signal, 'signal'), patch('builtins.print'):
            self.assertEqual(recovery.main(path, self.root / 'report.json', 'p1-land-management'), 0)
        self.assertTrue(any(args[:4] == ['docker', 'network', 'create', '--internal'] for args, _ in calls))
        containers = [args for args, _ in calls if args[:2] in (['docker', 'run'], ['docker', 'create'])]
        self.assertEqual(len(containers), 2)
        self.assertTrue(all('--network' in args and '-p' not in args and '--pull=never' in args for args in containers))
        child = next(args for args in containers if '--read-only' in args)
        self.assertIn('--cap-drop=ALL', child)
        self.assertTrue(child[child.index('--network')+1].startswith('container:core-recovery-'))
        self.assertTrue(any('@127.0.0.1:5432/' in arg for arg in child))
        self.assertFalse(any('node_modules' in arg or '.env' in arg for arg in child))
        self.assertFalse(any('MAILGUN' in arg or 'R2_SECRET' in arg for arg in child))

    def test_wrong_or_unresolved_database_namespace_never_starts_child(self):
        path = self.snapshot('p1-land-management')
        for database_id, mode in [('a'*64, 'container:'+'b'*64), ('', 'container:'), ('a'*64, 'host')]:
            calls = []
            def fake_run(args, **kwargs):
                calls.append(args)
                stdout = ''
                if args[:3] == ['docker', 'context', 'inspect']:
                    stdout = 'unix:///fixture/docker.sock'
                if args[:3] == ['docker', 'network', 'inspect']:
                    stdout = 'true'
                if args[:3] == ['docker', 'container', 'inspect'] and '--format' in args:
                    stdout = mode if args[-1] == '{{.HostConfig.NetworkMode}}' else (database_id if args[-1] == '{{.Id}}' else json.dumps({args[3]+'-isolated': {}}))
                return recovery.subprocess.CompletedProcess(args, 0, stdout, '')
            with self.subTest(mode=mode), patch.object(recovery.subprocess, 'run', side_effect=fake_run), patch.object(recovery.signal, 'signal'), patch('builtins.print'):
                self.assertEqual(recovery.main(path, self.root / 'report.json', 'p1-land-management'), 1)
            self.assertFalse(any(args[:2] == ['docker', 'start'] for args in calls))

    def test_diagnostic_parent_rejects_extra_fields_and_unknown_paths(self):
        frame = '/runtime/server/services/system-backup.service.ts:540:11'
        value = {'name': 'Other', 'sqlState': '428C9', 'frames': [frame, '/runtime/server/SYNTHETIC_SECRET.ts:1:1', '/runtime/server/../../private/secret.ts:1:1']}
        self.assertEqual(recovery.safe_failure_diagnostic(value)['frames'], [frame])
        with self.assertRaises(ValueError):
            recovery.safe_failure_diagnostic({**value, 'message': 'SYNTHETIC_SECRET'})
        with self.assertRaises(ValueError):
            recovery.safe_failure_diagnostic({**value, 'sqlState': 'SYNTHETIC_SECRET'})

    def test_failure_diagnostic_never_exports_error_message_or_details(self):
        # Execute only the current catch body with synthetic errors, not imports,
        # the restore child, Docker, a database or any archived data.
        catch_body = recovery.CHILD.split('} catch (error) {', 1)[1].split('} finally {', 1)[0]
        fixture = {
            'name': 'Error',
            'code': '23503',
            'message': 'SYNTHETIC_PRIVATE_CREDENTIAL must not leave catch',
            'detail': 'SYNTHETIC_PRIVATE_ROW contains customer data',
            'cause': {'message': 'SYNTHETIC_PRIVATE_CAUSE'},
            'stack': 'Error: SYNTHETIC_PRIVATE_CREDENTIAL\n    at fn (/runtime/server/services/system-backup.service.ts:520:10)\n    at caller (/private/SYNTHETIC_PRIVATE_PATH/file.ts:1:1)',
        }
        script = 'const error='+json.dumps(fixture)+"; const childStage='restore';\n"+catch_body
        result = recovery.subprocess.run(['node', '--input-type=module', '-e', script], capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertNotIn('SYNTHETIC_PRIVATE', result.stdout + result.stderr)
        lines = [line.removeprefix('RECOVERY_FAILURE_DIAGNOSTIC=') for line in result.stdout.splitlines() if line.startswith('RECOVERY_FAILURE_DIAGNOSTIC=')]
        self.assertEqual(len(lines), 1)
        self.assertEqual(json.loads(lines[0]), {'name': 'Error', 'sqlState': '23503', 'frames': ['/runtime/server/services/system-backup.service.ts:520:10']})
        self.assertIn('RECOVERY_FAILURE_CATEGORY=foreign-key', result.stdout)


if __name__ == '__main__':
    unittest.main()
