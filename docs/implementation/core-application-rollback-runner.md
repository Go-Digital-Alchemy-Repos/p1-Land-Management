# Isolated Core application rollback runner

September 19, 2026. Independently reviewed runner and genuine isolated execution completed with **partial** acceptance, detailed in evidence04 below. Published-content recovery remains unverified because the archive content table is empty. This does not establish media/provider/authenticated workflow recovery or admin retirement.

## Inputs and preparation

`platform/p1-core/script/rehearse-application-rollback.py` accepts four already-local immutable `sha256:<64hex>` image IDs: current Core, prior Core, recovery runtime, PostgreSQL18. No pull/build/install happens during this runner. The parent prepares exact source images separately; a rebuilt source image is not represented as the original Railway deployment image. Caller-supplied revision labels are recorded, not independently inferred from unlabeled image bytes.

Prepare the recovery runtime using `prepare_runtime_context()` from `verify-backup-recovery.py`, then build that context before supplying its immutable image ID. The context includes real restore code and its migration runner, never the archive or provider environment. Both app images must contain their compiled client-site manifest. The PostgreSQL image must provide the official entrypoint, postgres user, psql and pg_isready.

Example invocation (replace placeholders with privately verified values):

```sh
python3 platform/p1-core/script/rehearse-application-rollback.py \
  --current-image sha256:<current-image-id> --current-revision <source-sha> \
  --previous-image sha256:<previous-image-id> --previous-revision <source-sha> \
  --recovery-image sha256:<prepared-recovery-runtime-id> \
  --postgres-image sha256:<local-postgres18-image-id> \
  --backup /private/path/core.json.gz --expected-stack-id p1-land-management \
  --content-route <known-published-route-id> \
  --content-component <known-published-component-key> \
  --output /private/path/application-rollback-evidence.json
```

Archive input must be an owned regular mode0600 file; exact stack identity and decompressed limits are checked with the recovery helper. Input/output aliases are rejected. OpenSSL must already exist locally and support `-addext`.

## Isolation and ordering

The runner verifies a local Docker socket respecting selected-context precedence. A fresh internal-only network has no published ports. A synthetic short-lived certificate with a recovery-db SAN is generated locally; PostgreSQL enables TLS and both real production app images use `DATABASE_TLS_MODE=verify-full` with that certificate as their trust anchor. No production TLS guard is altered. Rehearsal provider secrets are never supplied; two synthetic notification recipients satisfy startup validation. Backups/federation are disabled. Restored provider settings remain confined by no external network egress.

A separately prepared recovery runtime restores into `baseline` through the existing application function and must report successful row, sequence and post-migration verification. No full app starts against that baseline. SQL database cloning creates `candidate`; current Core boots there, potentially running bootstrap writers and scheduled/form workers. After probes, it stops and must report exit code0 before the post-current database is cloned to `rollback`. The previous image boots against that resulting schema without down-migration. The original baseline fingerprint must remain unchanged.

Applications run read-only with temporary uploads owned by UID1000 and temporary runtime space; there is no host Docker socket or provider credential mount. Only the recovery container receives the private archive read-only. Synthetic TLS keys are mounted only into PostgreSQL. Container network attachments and port bindings are inspected. SIGINT/SIGTERM trigger protected cleanup; repeated signals are ignored during cleanup. Cleanup requires successful container inventory confirming absence and network removal, not merely a failed inspect.

## Evidence and limits

Containerized probes make GET requests only: health, readiness, unauthenticated auth rejection, setup status, a known published content contract with ETag/304, and bounded identity projection shape. They do not submit setup, forms, passwords, mail, publication or provider operations. Response content is reduced to revision/hash; raw bodies and child logs are withheld.

Aggregate before/after row totals, changed table names, database/migration fingerprints and current/prior published content parity are recorded. These expose bootstrap/worker changes without declaring them acceptable automatically. Current/prior content parity is not a direct archive-to-API content comparison. Setup status does not prove login or account reconciliation. Exit code0 is required after stop; forced termination is not accepted as a graceful application stop.

The execution checkpoint below records runtime results, changed-column review and source-image provenance. Remaining gates include original deployment-image availability, verified media object recovery, provider decryption/delivery, authenticated capabilities, preview/intake and job retry acceptance. No production operations are performed by this runner.

## Empty archive content exception

The verified September18 archive contains zero `client_site_content` rows. The runner derives this from the privately read archive; callers cannot enable an empty-content bypass. Only exactly one named content table with an empty rows array enables the exception. A specified absent route must return404; a200 fails that branch. Archives with content rows retain the required200/revision/ETag/304 path. Successful empty-content runs report `passed-partial`, `contentRecoveryVerified:false`, and an explicit remaining populated-content recovery gap. This establishes narrow startup/rollback evidence only. Seven synthetic test methods cover the branch, including200/404 mismatches; no private content appears in output.

## Genuine isolated rehearsal checkpoint

Attempt03 completed with `passed-partial` on PostgreSQL18.6 using rebuilt current source `a8dbf0cecd5df1bdadb5d3ade7407bec3a7953c6` and previous source `06acff2f7901be42e7ea88d247e5cb6cd59e4c81`. Private aggregate evidence: `~/.codex/backups/p1-core-recovery-20260919/application-rollback-evidence-03.json`, mode0600. Original archive SHA256: `44e36f45d1a172657e6e7b5124fe10913846a2d9de47976115d7b80f841e8cbc`.

Both images passed health/readiness, unauthenticated auth rejection, setup-status, absent-content404 and identity shape/parity checks. Both stopped with exitcode0. The restored baseline had53 tables including migration metadata and522 total rows; current and previous boot retained522 rows and the same migration fingerprint. Only `public.cms_forms` fingerprints changed during each boot; this is a table-level mutation observation, not a field-level review or blanket acceptance of bootstrap changes. The baseline remained unchanged. Owned containers, PostgreSQL volumes and network cleanup were verified.

Attempt01 failed before restore because socket readiness could observe the official PostgreSQL image's temporary initialization server; TCP readiness now waits for the final server. Attempt02 booted both apps but failed identity parity because the runner generated different synthetic session secrets: settings versions use a secret-dependent HMAC. Attempt03 uses one unchanged synthetic environment across both apps except database clone URL; a regression assertion enforces this. Earlier failure evidence remains private and retained.

`contentRecoveryVerified` remains false: the archive has no published P1 content rows, so successful200/revision/ETag/304 recovery is still untested. `publishedContentParity:true` in this partial report compares matching absent-content state plus identity hash; it does not override the explicit recovery gap. Media, real-provider recovery, authenticated workflow acceptance and historical Railway-image rollback remain open. These are rebuilt source images, not proof of original deployment-image availability.

### Corrected evidence04

A fresh genuine run produced `application-rollback-evidence-04.json` with corrected labels: `publishedContentParity:false`, `contentAbsenceParity:true`, `identityParity:true`, `contentRecoveryVerified:false`, and `status:passed-partial`. Historical evidence03 was not rewritten;04 supersedes its misleading positive published-parity label.

This run additionally verified why baseline totals exceed archive totals: the archive's52 tables/519 rows exclude the migration ledger; candidate initialization adds `drizzle.__drizzle_migrations` with3 rows, producing53 tables/522 rows. No unexplained business-row increase occurred. Private SQL comparisons of per-column hashes found only `cms_forms.updated_at` changed during each app boot; no substantive form column changed. No column values or raw row content were exported. Baseline remained unchanged and cleanup passed again.

Parent re-ran seven offline tests successfully and verified evidence04 mode0600 and SHA256 `1fc40069e69f2941d4b7ed60ea8b03b209c23117145e168bc98e8125a9b0422c`.
