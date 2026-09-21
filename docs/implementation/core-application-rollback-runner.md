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

### Railway image-availability observation — September 21

A read-only Railway production inspection found active Core deployment
`57250a61-7aab-42d0-a6e3-8c14f4860f76` at terminal `SUCCESS`, sourced from
`a557e8bddcb3263bbb44a905cd0206e15abfef01`, with its image digest recorded in
deployment metadata. The same deployment history retains image digests for recent
removed deployments. This is provenance, not retrievability evidence: the available
Railway CLI only offers a redeploy operation for the service's latest deployment and
does not expose a read-only image-pull or an older-deployment/digest selection path.
No redeploy or recovery action was attempted. Until an owned exact historical image
can be selected and recovered in isolation, source rebuilds remain the only tested
application-image input and the historical Railway-image gate stays open.

### Corrected Railway rollback-eligibility observation — September 21

The CLI limitation above is not a Railway platform limitation. An authenticated,
read-only production Dashboard check opened the actions for removed Core deployment
`ddbfece9-5ba7-476e-8118-19711099fede` (the immediately previous deployment at the
time of review) and found `View logs`, `Redeploy`, and `Rollback`. Railway's
[rollback guide](https://docs.railway.com/guides/roll-back-bad-deploy) documents
120-hour image retention on the observed Pro plan. This proves the UI currently
recognizes that particular recent removed deployment as rollback-eligible; no action
was selected.

It does **not** prove a rehearsal, an image pull, safe compatibility with the current
database, or availability after the retention period. Production rollback would be a
state-changing action, so an Orchestrator-approved isolated recovery route is still
required before the exact-image recovery gate can close. The UI check also does not
extend the retention guarantee to older releases.

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

## Populated Blog v2 acceptance extension

The runner now checks `/api/website/blog-publication` independently of the legacy
`client_site_content` endpoint. It reads the archive's publication states, routes,
immutable revisions and permanent import receipts before starting fixtures. The
expected post identities use **published** revision pointers, never later private
drafts. Missing tables, duplicate identities or inconsistent pointers reject.

After verified restoration, a separate read-only baseline transaction runs the
existing public Blog media resolver and projection in the prepared recovery image.
This performs database reads, not object downloads. Its post identities and permanent
ownership must match the archive. Only bounded public-projection digests/identities
leave that child; no raw post content or receipt provenance is printed. Candidate
and prior HTTP responses must have schemaVersion2, the exact P1 stack, a valid
self-consistent collection revision, identical permanent ownership, and an exact
full-post digest for every archived published article. This includes body, aside,
SEO, cover metadata and revision identity, not merely counts or titles.

`blogRecoveryVerified` and `blogPublicationParity` report this evidence separately.
An empty legacy content table still yields `contentRecoveryVerified:false` and
absence404 checks. A populated, verified Blog can produce `status:passed` for this
bounded application rehearsal; that does not establish legacy populated-content,
media-byte delivery, provider recovery, authenticated workflows or retirement.
Historical archives without Blog tables retain partial behavior. Empty Blog
collections alone cannot close the populated recovery gate.

For the September19 post-import candidate, prepare already-local images from exact
current source `9978d9dba6d2f1db0297bbff291c33fdfff88aa4` and prior source
`b3dca73283edfa75c85470f8146b26631aa36cb5`. Both include permanent ownership and
Blog v2 support. Do not use the earlier pre-ownership rollback images; their inability
to satisfy the new contract is a failure, not a reason to omit the check. Image IDs
must be resolved from those separately built images, not guessed from source SHAs.
A source rebuild still does not establish availability of the historical Railway image.

```sh
python3 platform/p1-core/script/rehearse-application-rollback.py \
  --current-image "$P1_CURRENT_IMAGE_ID" \
  --current-revision 9978d9dba6d2f1db0297bbff291c33fdfff88aa4 \
  --previous-image "$P1_PREVIOUS_IMAGE_ID" \
  --previous-revision b3dca73283edfa75c85470f8146b26631aa36cb5 \
  --recovery-image "$P1_CURRENT_RECOVERY_IMAGE_ID" \
  --postgres-image sha256:6c538e7206ea40ff740ef27883529390a690b6ead6ba96b44c67a9f7c638e8fd \
  --backup /private/tmp/p1-post-blog-backup-4toox0yp/snapshot.json.gz \
  --expected-stack-id p1-land-management \
  --content-route home --content-component hero \
  --output /private/path/populated-blog-application-recovery.json
```

Preparation prerequisite: rebuild the recovery image with the current restore, Blog
and verifier sources. The verifier now uses captureTable-equivalent query-local raw
PostgreSQL temporal parsers. It casts archived expected date/timestamp values through
PostgreSQL (parameterized and cached) for legacy ISO compatibility; actual values
are never rounded. Twelve offline recovery tests pass, including six-digit precision,
a one-microsecond mismatch, legacy ISO expectations and unchanged non-temporal
parsers. An image built before this correction still contains the old comparison.
Do not remove identity/receipt metadata to force a pass.

Nine offline test methods pass, including Node-executed five-post probes rejecting
changed fifth-post content, missing ownership, a draft revision, an empty collection,
wrong schema and503. Mocked lifecycle checks cover populated Blog success while the
legacy content endpoint remains empty, alongside prior isolation/cleanup/failure
regressions. No genuine application rehearsal was executed for this extension.

### Genuine populated application rehearsal — September19

`/private/tmp/p1-blog-app-images-aar7h839/populated-blog-application-recovery-03.json`
(mode0600) records a successful isolated run using the exact source rebuilds above.
Current image `sha256:f3e8e5e2e422b35b81c6461f333e4cdae3c2bcd4c717c2a92a0c028ac83ae72c`
and previous image `sha256:beb46653b9003c5ada615d93184efce5b7a0f92dd2b4f99caffb7a36cce68f45`
both passed health/readiness, unauthenticated rejection, setup-status and identity
checks, plus exact baseline comparisons for five full public Blog snapshots and
five permanent ownership records. `blogRecoveryVerified` and
`blogPublicationParity` are true. Legacy content remains absent404 and separately
reports `contentRecoveryVerified:false`/`publishedContentParity:false`.

Baseline58 tables/652 rows equal the57-table/645-row archive plus the migration
ledger table with seven rows. Both app boots retained652 rows and identical
migration fingerprints. Only `cms_forms.updated_at` changed; the untouched
baseline remained unchanged. Containers, database volumes and internal network
cleanup all passed. No provider request or production mutation was made. This is
source-image rollback evidence, not historical Railway image availability or
media-byte delivery through the application.

The first two attempts failed before the baseline Blog script could run: `tsx`
preload needs a writable `/tmp` cache on the read-only recovery image. A synthetic
`--network none` reproduction confirmed the missing directory failure. The Blog
baseline child now receives the same bounded64MiB temporary filesystem as the
restore child; root filesystem, mounts and network restrictions remain intact.
Attempts01/02 are retained and their cleanup passed. Fixed allowlisted stage names
are the only baseline failure diagnostic exported; raw exceptions are withheld.
Ten offline rollback tests now pass, including temporary-filesystem and diagnostic
privacy regressions. No application image rebuild was required for this fix.
