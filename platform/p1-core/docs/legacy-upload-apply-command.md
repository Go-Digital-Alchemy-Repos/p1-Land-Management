# Exact-object upload apply command

This command is prepared for a separately approved operator action. Shipping it does not authorize a copy. The existing `verify-legacy-upload-migration.mjs` remains read-only. No production copy has been validated by the command's unit or artifact tests.

Build with `npm run build`. The separate artifact is `dist/operations/apply-legacy-upload-migration.mjs`; it requires production Node dependencies and never runs as part of normal server startup.

After approval, its argument contract is:

```sh
node dist/operations/apply-legacy-upload-migration.mjs --apply --plan /secure/plan.json --approval /secure/apply-approval.json --writer-drain /secure/writer-drain.json --ledger /secure/new-attempt.jsonl
```

All three inputs must be separate, operator-owned regular files with mode 0600, no final symlinks, and at most 64 KiB each. Hard links to the same inode are rejected. The ledger must be a new path for each attempt; existing files are never truncated or appended to. Use an operator-controlled directory on durable storage. The command does not certify the storage medium's durability beyond awaited filesystem fsync calls.

The source plan must be an existing validated v2 plan for exactly one CMS object, with its authoritative record, byte count, SHA-256, exact source deployment identity, target bucket, and target namespace. Its plan ID binds that content. The apply approval wraps the independently reviewed source approval; passing a dry-run approval alone is rejected.

Synthetic examples below show the envelopes only. Replace every synthetic value with separately reviewed evidence; these examples cannot authorize or execute a real plan.

```json
{
  "schemaVersion": 1,
  "action": "copy-exact-object",
  "sourceApproval": {
    "schemaVersion": 1,
    "planId": "synthetic-plan-id",
    "ownershipReference": "synthetic-review-reference",
    "sourceIdentity": {
      "railwayProjectId": "synthetic-project",
      "railwayEnvironmentId": "synthetic-environment",
      "railwayServiceId": "synthetic-service",
      "deploymentId": "synthetic-deployment",
      "gitCommitSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "databaseIdentityReference": "sha256:synthetic-database-identity"
    },
    "target": {
      "stackId": "synthetic-core",
      "bucketName": "synthetic-media",
      "uploadPrefix": "clients/synthetic-core/uploads"
    }
  },
  "writerDrainAttestationId": "synthetic-drain-1"
}
```

```json
{
  "schemaVersion": 1,
  "id": "synthetic-drain-1",
  "planId": "synthetic-plan-id",
  "sourceIdentity": {
    "railwayProjectId": "synthetic-project",
    "railwayEnvironmentId": "synthetic-environment",
    "railwayServiceId": "synthetic-service",
    "deploymentId": "synthetic-deployment",
    "gitCommitSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "databaseIdentityReference": "sha256:synthetic-database-identity"
  },
  "target": {
    "stackId": "synthetic-core",
    "bucketName": "synthetic-media",
    "uploadPrefix": "clients/synthetic-core/uploads"
  },
  "operatorReference": "synthetic-change-review",
  "attestedAt": "2026-09-05T12:00:00Z",
  "statement": "writers-drained-and-frozen"
}
```

The operator must establish that all relevant old and new writer processes have stopped accepting mutations and their already admitted work has drained, then retain the freeze throughout inventory, copy, and cutover. `UPLOAD_MUTATIONS_FROZEN=true` in this command's environment is required and repeatedly checked, including immediately before PUT. It is not a distributed barrier and cannot observe another process's environment. The drain document is an operator attestation, not platform proof of retired writers, and the output explicitly records `writerDrainVerifiedByCommand: false`. Its timestamp is validated as a datetime, not certified for recency. Independent files do not prove independent human authorship.

The existing source verifier checks configured Railway identity, database identity, and the exact authoritative CMS record repeatedly. DATABASE_URL query parameters other than the centrally validated `sslmode` are rejected before creating the read-only pool. Database reads have bounded connection/query timeouts; no migrations, workers, or database mutations are started. R2 credentials come from the approved source database and must match the approved bucket. The storage adapter offers exact GET and create-only PUT with `If-None-Match: *`, bounded body size, and abortable operation deadlines. There is no object listing, overwriting, deleting, or source removal.

Every attempt fsyncs its header before any PUT and its dispatch intent before sending PUT, then fsyncs results. A failed header or intent persistence stops dispatch. Provider errors are sanitized. After a dispatch error, termination, or missing final result, the destination may already exist: preserve source, destination, and ledger. An interrupted ledger may end with an intent or partial final line and is not a proof of failure or success. A ledger write failure can prevent a final ambiguity record; the earlier durable intent remains evidence of a possible dispatch.

A retry uses a **new** ledger and revalidates the current source identity, authoritative record, source bytes, and destination bytes. An existing destination with the approved bytes is accepted without a second PUT; conflicting destination bytes block progress. No previous result marker bypasses verification. This provides safe create-only retry behavior, not an exactly-once delivery claim. Database records remain unchanged; cutover and any later cleanup require separate release approval.

Local validation:

```sh
npx vitest run server/scripts/apply-legacy-upload-migration.test.ts
python3 script/verify-upload-apply-artifact.py
```

The artifact check runs the actual built Node entry in a temporary directory with dependencies linked, without TypeScript source or TSX loading. It verifies missing/unknown-input rejection only, without database or provider credentials or access.
