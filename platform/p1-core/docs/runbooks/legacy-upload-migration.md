# Existing upload namespace migration

The pure planning helper is `server/services/legacy-upload-migration-plan.ts`. The separately
injected executor in `legacy-upload-migration.ts` and S3 adapter in `legacy-upload-storage.ts`
implement verified, create-only copies. Separate built read-only and apply operator commands
now exist (documented below); their preparation is not deployment or copy approval. No actual
production media migration has been performed.

Existing installations may have objects at bucket-root logical keys; current Core prefixes
uploads with `clients/<public-domain>/uploads`, or the stack ID before a domain is assigned.
Changing the domain can also change that prefix. Resolve compatibility explicitly; never
add an arbitrary root lookup or cross-stack fallback to the serving path.

## Required plan evidence

Supply the stable stack ID, exact current public origin when configured, bucket name,
exact source prefix and current destination prefix, and an ownership attestation reference.
The reference is an operator assertion, **not verified ownership**. A later apply tool must
independently establish authoritative evidence that the source and destination belong to
the same stack. Historical domain prefixes require that same explicit evidence.

An empty source prefix is allowed only with an explicit dedicated-same-stack-bucket
attestation. A shared bucket's root is not an acceptable implicit source. Each approved
source key must be enumerated; do not discover work by listing the bucket. Entries record
actual content SHA256 and byte length, plus version ID and ETag when available. ETag alone
is not a content digest. Plans contain references and object metadata, never credentials
or object contents; operators must avoid embedding secrets in references or key names.

Destination keys derive from source-relative paths. The destination prefix must equal
Core's current computed stack upload prefix. Paths, ownership scope, duplicates and
source/destination overlaps are validated before a deterministic SHA256 plan ID is created.
Plan output is recursively frozen, but freezing and the digest are not authorization or
security boundaries. Revalidate serialized plans and bind a separately approved plan ID
when executing later; an attacker can recalculate a digest.

## Execution and remaining operational requirements

The executor defaults to dry-run, validates the active target and exact approved plan ID,
awaits an independent ownership-verification callback before storage access, hashes current
bytes, and awaits the supplied durable result sink before continuing. The adapter binds one
bucket and uses `PutObject` with `IfNoneMatch: "*"`; existing destinations are never overwritten.
Resumes re-read both objects. Source changes and destination conflicts stop the plan.
The adapter limits object bytes and applies a 30-second abort deadline across each GET including
its body, or each PUT (configurable up to five minutes). A timed-out PUT may already have been
accepted remotely; recovery must re-read and verify the destination. Actual R2 conditional-create behavior was verified on 2026-09-06 (see provider evidence below);
that probe does not establish the writer barrier or verify a production media copy.

The operator commands implement the library requirements below; retain these invariants when
running the still-pending real migration:

1. Default to dry-run; require an explicit apply action and the separately approved exact
   plan ID. Revalidate its serialization, current stack/bucket/prefix and ownership proof.
2. Read only the approved source keys. Bind observations to exact bucket/key identities;
   verify actual bytes against the approved digest/length and pinned version/ETag. Stop
   on changed or missing sources, even when the destination happens to match.
3. Preserve every source. Copy only to an absent destination; never overwrite differing
   content. Close the destination check/write race with supported atomic create-only
   semantics or a reviewed equivalent. A preflight HEAD followed by unconditional COPY
   is insufficient. Pin the source version or apply a source precondition when supported.
4. Read and hash the destination after copying; recheck the source identity when needed
   to detect concurrent replacement. Record verified results in a durable ledger bound
   to the plan ID and exact key pair. Resume by re-verifying matching bytes, not by trusting
   an old success marker. Different destination version IDs/ETags are expected for copies.
5. Verify application media reads, stored references and deletion targeting before cutover.
   Determine whether database references need changes; this helper changes none. Retain
   originals and a rollback path. Cleanup is a separate approved operation, never part of
   migration apply. Coordinate writers/cutover so no uploads are missed after planning.

`decideLegacyUploadCopy` returns `copy`, `already-verified`, `source-changed`, or
`destination-conflict` from supplied observations. It cannot verify that those observations
are genuine, current or race-free. It does not grant write authority or guarantee successful
copy. Application integration must enforce the requirements above and preserve cross-stack
isolation throughout.

## Version 2: one legacy CMS object

Version 1 retains its original fields, validation and canonical plan hashes for explicit
bucket/prefix ownership. Version 2 is selected by `ownership.scope: "exact-object"` and
requires exactly one entry with an empty source prefix. This is an exact-key claim, not
an assertion that the whole bucket or `cms/images` directory belongs to Core.

V2 ownership retains `reference`, `stackId` and `sourcePrefix`, and adds:

- `sourceIdentity`: Railway project, environment, service and deployment IDs; full
  40-character `gitCommitSha`; and an opaque `databaseIdentityReference`.
- `record`: `table: "cms_media"`, record `id`, exact `r2Key`, content `sha256` and
  `byteLength`. Key, digest and length must match the single planned entry.

Connection URLs and credentials are not plan inputs. Source connections must be obtained
independently by the operator integration. The executor additionally requires an independent
`expectedSourceIdentity` matching all six identity fields and a `readSourceRecord` callback
that reads that exact row from an authoritatively source-bound connection. The callback must
establish the actual service/deployment/database binding, rather than simply echoing its
arguments or trusting identifiers in the plan. It returns the current ID, R2 key and byte
length. The executor compares those fields before storage access and again immediately
before creating an object; missing, moved or changed rows abort. The existing independent
`verifyOwnership` callback remains mandatory as well. Byte hashing and post-copy source/
destination verification remain unchanged. Existing matching copies are verified on resume.

The exact-object flow rejects `clients/` and `system-backups/` source namespaces, including
case variants and ambiguous encoded path separators/dot segments. Ordinary S3 keys retain
exact case; the planner does not normalize them into a different object. Historical client
namespace changes still require the version-1 explicit-prefix ownership contract. A CMS row
pointing at a different client's qualified object does not establish ownership of that object.

For the current Core maintenance release, `core-platform` is the planned stable target stack
identity, with destination `clients/core-platform/uploads` and the explicit legacy backup
prefix `system-backups` retained separately. This records an Orchestrator target decision;
it does not claim any environment changes or production copies have occurred. New client
activation retains its own namespace/preflight policy. No production inventory belongs in
synthetic tests or committed fixtures.

## Read-only operator verification command

Run the candidate tooling inside the independently verified source Railway runtime:

```sh
node --import tsx server/scripts/verify-legacy-upload-migration.ts --plan /private/plan.json --approval /private/approval.json
```

The source deployment IDs in both reviewed inputs must describe that actual source runtime,
not the tooling revision or a previously replaced deployment. No apply flag exists. This
command cannot copy objects: its executor adapter rejects writes and only exact GETs are
available along the execution path. This does not establish conditional PUT permission.

The independent approval file has exactly `schemaVersion: 1`, `planId`,
`ownershipReference`, `sourceIdentity`, and `target` (`stackId`, `bucketName`, `uploadPrefix`).
It must be separately reviewed operator input. Merely copying assertions from the plan into
a second file is not independent proof. Both files must be owned regular files with mode
`0600`, at most 64 KiB, with no symlinks. The command rejects shared file identity, FIFOs,
extra arguments and apply requests.

The verifier compares all five Railway runtime environment identity values with the
accepted source identity before making database/storage queries. It queries
`current_database()` and requires `databaseIdentityReference` to equal `sha256:` followed
by SHA256 of `projectId|DATABASE_URL.hostname|current_database`. This is a deployment/
connection binding, not a database-content fingerprint or proof against spoofed environment
variables. Platform-injected environment provenance and the independently reviewed approval
remain operational trust boundaries. Do not invoke it with invented Railway variables on a
local machine and claim that proves production identity.

Database access uses only independently provided runtime `DATABASE_URL` and the existing
TLS policy. Exact CMS record reads verify ID, R2 key and size before object access and again
after inspection. Source R2 settings are read from the verified database; encrypted values
require the actual runtime `SESSION_SECRET`. Decryption fails closed. The account ID creates
only the Cloudflare R2 endpoint; no endpoint or connection is accepted from a plan. Runtime
credentials remain in memory and are never included in output. No application server,
migrations, polling workers, email or Stripe client starts.

Output is one aggregate JSON result: plan ID, dry-run mode, completion, object count and
statuses, with no keys, row values, credentials or raw errors. Failure is generic and exits
nonzero. Database statements and storage operations have deadlines. Database idle and
shutdown errors are contained so raw connection errors cannot escape through those paths.
The source entrypoint requires candidate sources and `tsx`; the built command below does not.
No production invocation or copy is implied by artifact tests.

### Built command

`npm run build` emits `dist/operations/verify-legacy-upload-migration.mjs`. Run it with
`node dist/operations/verify-legacy-upload-migration.mjs --plan /private/plan.json --approval /private/approval.json`.
The bundle includes application helpers and resolves `pg` and AWS SDK from installed production
dependencies; it does not require TypeScript sources or `tsx` on the service. The built artifact
must still be delivered through a reviewed operational path; its existence locally is not a
claim that this tool is available on the current production deployment.

CI checks missing-input rejection from a detached temporary directory through both the real
file and a symlink entrypoint. This catches silent entrypoint skips caused by path normalization.
It proves packaging and sanitized rejection, not a valid live source/provider dry run.

### Provider conditional-write verification

On 2026-09-06 the actual configured R2 provider accepted a new random temporary test object
under Core's target upload namespace, rejected a second `IfNoneMatch: "*"` write with HTTP412,
and returned the original payload unchanged. The test object was then deleted and its absence
verified by GET404. Existing CMS objects and database rows were untouched. Aggregate evidence:
`docs/release-evidence/core-r2-conditional-write-2026-09-06.json`.

Cloudflare documents [PutObject conditional headers](https://developers.cloudflare.com/r2/api/s3/api/)
and [strong read-after-write consistency through the S3 API](https://developers.cloudflare.com/r2/reference/consistency/).
The latter does not establish consistency through a cached public domain. These provider facts
support the selected copy primitive, but do not establish a writer barrier or authorize a
production media copy. The final migration still requires fresh source verification and
post-copy destination hashing through the direct S3 API.

### Separate explicit apply tooling

The reviewed preparation now includes `dist/operations/apply-legacy-upload-migration.mjs`.
Its [operator contract](../legacy-upload-apply-command.md) specifies separate copy approval,
operator drain attestation and a new durable ledger for each attempt. The read-only verifier
remains separate. Building or testing the apply tool grants no production-copy authority; all
writer-barrier, refreshed inventory, exact-plan and post-copy/cutover gates above still apply.
Both operator commands reject database URL query parameters other than centrally validated
sslmode so URL values cannot disable their session policy or query deadlines.

### Maintenance operating sequence and writer barrier

Follow the ordered [Core maintenance cutover evidence](../core-maintenance-release-gates-2026-09-06.md#ordered-maintenance-cutover-evidence):
finish final immutable checks and prepare recovery/tool artifacts; freeze admissions on current
Core without changing its upload namespace; inventory and terminate every previous writer;
reconcile uncertain admitted writes; refresh deployment-bound exact inventory and independent
approval; dry-run then conditional-copy and hash both objects; adopt the stable namespace while
frozen; verify the recovery entrypoint and final application; reconcile historical work before
reopening admission. Do not wait for unrelated Better Farms launch approvals during the freeze.

Railway's [teardown lifecycle](https://docs.railway.com/deployments/deployment-teardown) sends
SIGTERM and ultimately SIGKILL after its configured drain. Its
[deployment reference](https://docs.railway.com/deployments/reference) documents a zero-second
default and identifies Remove as stopping the running deployment. The candidate's 45-second
configuration must be checked on the actual deployment. Inventory all relevant services,
replicas and workers and retain final REMOVED states and logs for old deployments. Termination
does not undo remote writes already accepted; reconcile their exact records/objects before final
inventory. Neither elapsed time, one healthy new replica nor a flag alone proves this barrier.

For current-Core maintenance, retain logical database references and original objects, use
`clients/core-platform/uploads`, keep the public origin absent, and retain the explicit legacy
backup namespace `system-backups`. This exception is the existing installation's maintenance
contract, not a future-client preflight waiver or a root-key serving fallback. The recovery-only
artifact preserves media access while business APIs/webhooks return 503; record and reconcile
that interval rather than treating old transactions as demo data or restarting incompatible workers.
