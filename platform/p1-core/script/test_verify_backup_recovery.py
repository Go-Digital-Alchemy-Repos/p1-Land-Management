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


if __name__ == '__main__':
    unittest.main()
