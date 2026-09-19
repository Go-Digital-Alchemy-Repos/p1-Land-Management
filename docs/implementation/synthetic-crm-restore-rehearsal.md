# Synthetic CRM import and restore rehearsal

This rehearsal exercises the existing reviewed-import and independent-verification tools with generated fixtures only. It does not establish a real Owner mapping, approve a production import, confirm source freeze, or satisfy production migration acceptance.

## Run

Prerequisites: local Docker using a Unix socket context, installed workspace dependencies, and cached `postgres:18-alpine` and `node:22-alpine` images. Download those public images separately if needed. The runner uses `--pull=never` and records their exact local image IDs in its evidence.

```sh
node --test scripts/consolidation/rehearse-crm-import.test.mjs
node scripts/consolidation/rehearse-crm-import.mjs \
  --approve-synthetic-fixture \
  --output /absolute/new/private/synthetic-crm-rehearsal
```

The evidence directory must not exist. The explicit approval applies only to the generated test fixture and its synthetic Owner. No source-export path, database URL, real review file, provider credential or backup path can be supplied. Existing evidence is never overwritten.

## Sequence and evidence

1. Copy an allowlist of fixture/import/verifier code and current dashboard migrations to a temporary staging directory. Record each file's SHA-256. No application configuration or `.env` files are copied.
2. Start disposable PostgreSQL with `--network none`, no published ports, and tmpfs database storage. Start a read-only Node worker in that same isolated network namespace, with only its fixture approval environment variable and bounded memory/CPU.
3. Apply dashboard migrations and their checksum ledger. Generate the existing CRM fixture, preserving its complete source records, target inventory and precision-sensitive timestamps in `full-source-fixture.json`.
4. Create a synthetic reviewed manifest, dry-run, apply, and independently verify the import. The generated Owner is explicitly labeled as fixture provenance rather than a real reviewed identity decision.
5. Update an imported native task through the database's ordinary revision trigger. Replay the original import and assert that the native edit and version remain intact. Independently verify against the original full export again.
6. Fingerprint every public table's complete rows, create a custom-format `pg_dump`, and restore into a second fresh, network-isolated PostgreSQL container. No app, mail worker or scheduler runs.
7. Verify the restored database using the exact original full export and its saved file hash. Compare all public table row counts and hashes, including imported archives, task revisions and audit history. Preserve the later native edit.
8. Remove only the two containers created by this invocation and the staged code. Keep evidence in the requested directory and record cleanup results.

`result.json` records the dump hash, full-export hash, verification counts and successful native-edit preservation. `verification-initial.json`, `verification-replayed.json`, and `verification-restored.json` retain independent verifier evidence. `provenance.json` identifies the fixture-only scope, copied-code checksums, and image IDs. Evidence files use mode `0600`; the directory uses `0700`.

A nonzero exit means the rehearsal or cleanup did not complete. Partial evidence may remain; do not treat it as acceptance. Docker and SQL error bodies are suppressed. Failed cleanup records the exact generated container names in `cleanup.json` for recovery.

## Limits and remaining acceptance

- This is a full-source **fixture export**, not an export from actual Core CRM records. The unresolved historical identity and real account mapping decisions remain separate Owner-reviewed inputs.
- The import is replayed against changed native data; that does not authorize editing immutable source archives or rewriting real task history.
- The restore verifies all public table rows, not external media bytes, provider services, or a production recovery-time objective.
- No role-separated browser/API acceptance is claimed; no application server runs.
- `sourceFreezeVerified`, `realOwnerMappingVerified`, `productionVerified`, and `releaseApproval` remain false even on success.
- Production acceptance still requires the reviewed full source export and matching identity/account reconciliation, source freeze evidence, approved cutover/rollback procedures, and a separately authorized real-data recovery rehearsal.

## Recorded local validation — September 19, 2026

The runner completed against two disposable local PostgreSQL containers. Evidence was verified from `/tmp/p1-synthetic-crm-rehearsal-20260919-b/` and copied to private workstation storage at `~/.codex/backups/p1-synthetic-crm-rehearsal-20260919/` (directory mode `0700`, files `0600`). It is synthetic development evidence, not a production acceptance archive.

- Six source records were expected, archived and independently verified; four native records were checked.
- One later native task edit survived import replay and restoration.
- Restored public-table row counts and hashes exactly matched the pre-dump database. Independent verification reported zero issues.
- Three expected synthetic reconciliation findings remain visible; they were not waived or converted into real identity approvals.
- Both generated containers were removed, as recorded in `cleanup.json`.
- The runner safety, payload preparation and reconciliation suites passed: 26 tests.

Full fixture SHA-256: `12ae2d57bc277dbbce5acdbc76eac2dd653664b2101cabbfd701b3f810ba35bb`.
Dump SHA-256: `1615cd347524da1bc62449d79f2aaed82fe67f54d4cadef6ca900c887e5c9925`.

An initial attempt failed before fixture creation because nested dependency mount targets did not exist in the read-only staged source. The runner now creates those directories before mounting. Its failed evidence directory ends in `-a`; it records cleanup and does not contain a successful result.
