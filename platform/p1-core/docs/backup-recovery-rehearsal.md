# Existing backup recovery rehearsal

`script/verify-backup-recovery.py` accepts an already downloaded backup. It never fetches
production data or calls a provider. The Orchestrator controls obtaining and retaining the
input separately. Treat the file as sensitive: an owned regular gzip file with mode `0600`
is required. Do not place it in the repository or CI artifacts.

```sh
python3 script/verify-backup-recovery.py --backup /private/tmp/approved-backup.json.gz --output /private/tmp/recovery-evidence.json
```

The runner copies the input into an automatically removed private temporary directory,
records the exact compressed SHA256, and provisions its own PostgreSQL 16 container on a
local Docker Unix socket with a random loopback-only port and generated credentials.
There are no host mounts or existing database connections. Candidate migrations run first;
the actual `restoreBackupSnapshot` then restores the schema-1 snapshot using explicit
`allowLegacyBackup: true`. Identified-stack snapshots are rejected: this bounded tool is
only for the known legacy installation without stack identity. The local target uses the
synthetic `disposable-backup-recovery` stack ID required by the restore guard; this does
not manufacture production provenance for the legacy snapshot.

Every snapshot table and restore-order entry is validated against the fresh schema.
Every snapshot row is compared after restore using its original columns, preserving
multiplicity, JSON structure and timestamps. Table counts and manifest totals must match.
Candidate migrations run again and the same comparison repeats. New columns may take
candidate defaults. Sequence metadata must identify actual serial sequences for snapshot
tables. A failed insert, constraint, comparison or migration fails the rehearsal.

No application server, polling worker, email or Stripe operation starts. The migration/
restore child receives only allowlisted shell essentials and synthetic local configuration.
The production encryption secret is deliberately unavailable: encrypted database values
are restored and compared as ciphertext; this does not verify provider decryption or live
integrations. Media references are compared as database values, not downloaded objects.

Raw subprocess output is captured and withheld even on failure because SQL errors could
contain records or credentials. Reports contain only revision/source hashes, file hash,
aggregate counts, check booleans and generic failure stage. Both successful and failed runs
remove their exact owned container and anonymous volumes; cleanup failure fails the gate.
The original input remains untouched for the Orchestrator's retention/cleanup decision.
A forced process/host kill can bypass cleanup; the aggregate report names the generated
fixture so an operator can remove that fixture only. No row values or secrets belong in
reports or chat. This is recovery evidence, not production restore authorization.
