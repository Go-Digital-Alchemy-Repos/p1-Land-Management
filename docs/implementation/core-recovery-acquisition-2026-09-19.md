# Core recovery source acquisition — September 19

Read-only acquisition; no production backup, pruning, restore, or database write was performed.

The verified Core deployment stack is `p1-land-management`. Its database connection components matched the PostgreSQL service `7913729e-39e9-45a9-ac58-ceb18711a0a6` in memory without recording credentials. Railway reports that service on `ghcr.io/railwayapp-templates/postgres-ssl:18`, successful deployment `335faa38-fd8a-46cc-a615-4a942c2df1b9`. This resolves the earlier uncertainty about the Core binding and supports a PostgreSQL 18 rehearsal fixture; no direct server-version query was completed because the service has no public database route.

The scheduled September 18 archive was copied read-only from configured P1 backup storage to private workstation storage outside the repository. The exact deployment stack and archive provenance matched before retention. Original compressed bytes were preserved.

- Archive timestamp: `2026-09-18T12:17:38.509Z`.
- Compressed size: 16182 bytes.
- SHA-256: `44e36f45d1a172657e6e7b5124fe10913846a2d9de47976115d7b80f841e8cbc`.
- Manifest: 52 tables, 519 rows, zero media records.
- Private file: `~/.codex/backups/p1-core-recovery-20260919/core-20260918.json.gz`, mode `0600`, owned local directory mode `0700`.
- Separate acquisition metadata remains in that private directory; no archive, credentials or database rows are committed.

A complete paginated read of the configured Core `uploads` namespace returned zero objects. That is scoped evidence for that namespace at acquisition time, not proof that all historical/local/public/dashboard media is covered or recoverable. Public bundled assets remain separate from CMS object storage. The prior archive is not a fresh freeze-window export.

The final isolated archive result is recorded below. Application startup, prior-image rollback, media recovery and admin retirement remain separate gates.

## Initial isolated executions

The first genuine-archive execution built the Linux runtime, verified PostgreSQL 18.6 and internal networking, then stopped during initial migration. Source inspection identified that the container hostname selected production-style TLS verification in the test database configuration. The second attempt used loopback via the database container's network namespace but stopped before the child started because Docker normalized the namespace reference to a container ID. Both attempts recorded failure and verified removal of the child, PostgreSQL fixture/volumes, internal network and runtime image. No original archive bytes or production rows were changed. Their private evidence files end in `-a.json` and `-b.json`; neither is successful recovery evidence.

## Verified archive recovery and defects corrected

Final private evidence: `~/.codex/backups/p1-core-recovery-20260919/core-recovery-evidence-g.json`. PostgreSQL 18.6 restored all 52 tables and 519 rows, compared the complete archived row values, and independently verified both actual catalog sequences. Current migrations replayed and rows still matched. The internal network and exact child namespace were inspected before restoration. Child, database/volumes, network and runtime image were all removed successfully.

The archive bytes/hash above are unchanged. Recovery source SHA-256 is `c48d3fca84210e0f78bfc4c5cdf12b09f14f88f32bf5da6174a1fb3c5aa4072f`; current migration source digest is `2296648d6aa247b8491623600626cac1f60eb9c03a8c10acc90c7298005591a5`. The evidence records base commit `ac98f45` plus these exact uncommitted candidate source hashes; it must not be described as a test of unmodified `ac98f45`.

The real rehearsal exposed SQLSTATE `428C9`: normal inserts cannot restore explicit generated-always identity IDs. Restore now uses `OVERRIDING SYSTEM VALUE`, preserving original IDs and relationships. A database regression then showed that earlier archives omitted identity sequences because they lack a `nextval` default. Capture now includes identities, and restore independently discovers sequences for restored tables so historical archives remain usable. No archive rewriting or database-schema weakening was used. PostgreSQL's [INSERT documentation](https://www.postgresql.org/docs/18/sql-insert.html) describes the identity override.

Attempts `-c`, `-d`, and `-e` failed during restoration; all cleaned up. Attempt `-f` verified rows after the insertion fix but only checked sequences represented in the old archive, so it is superseded by `-g` and is not complete sequence evidence. This distinction is intentional.

Validation: 11 runner safety/privacy tests; 18 service unit tests; 10 real disposable PostgreSQL 18 database tests, including original IDs/FKs/next IDs, an empty identity table, and failed-restore row/sequence rollback. Core typecheck and production build passed. Existing build warnings about PostCSS source metadata and large bundles remain. Independent source review found no blocking defect.

This establishes archive-level row/sequence recovery for this historical snapshot, not an application-startup rehearsal, previous-image rollback, provider decryption/delivery, fresh source freeze, full media recovery, real CRM migration or admin retirement. The migration replay repeats the current ledger established before restore; it does not test an older image.
