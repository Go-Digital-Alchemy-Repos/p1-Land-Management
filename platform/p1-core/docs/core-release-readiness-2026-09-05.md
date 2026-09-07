# Core release readiness — 2026-09-05

Later live evidence is recorded in [Core live storage and recovery](release-evidence/core-live-storage-2026-09-05.md):
actual R2 object read, a missing local asset, zero relevant paid-inventory duplicate groups,
and successful recovery of the latest deployed database backup. The original bounded review
below remains historical; its unverified items should be read alongside that checkpoint.

Bounded source and recorded-evidence review of remediation `745cde6` against
`origin/main` `f09e9d4199ffca634c0bc1df5c4e48d3c63bb762`. No production configuration,
credentials, objects or data were accessed or changed. This report proposes a release
partition for Orchestrator review; it does not authorize deployment.

## Release partition

The current candidate changes 260 files (25,483 insertions and 2,573 deletions) relative
to main and introduces migrations 0044–0059. It combines client onboarding/runtime
contracts, ecommerce transaction changes, forms, storage, CRM and runtime reliability.
Merging this candidate is a **Core integration release**, not a narrow CRM/admin patch.
Feature flags do not remove startup migrations or shared storage behavior from that release.

Better Farms public-site deployment, domains, content approval and launch remain a
separate release boundary. The pilot example manifest is draft and references older
candidate revisions. The client manifest contract describes client-stack/site acceptance;
`server/scripts/check-client-release-readiness.ts` evaluates a supplied record and does
not deploy anything. Neither Core startup nor the hosted workflow invokes that pilot
readiness command. Its pending client-specific gates should not be mislabeled as proof
that independent Core maintenance cannot ship. Applicable Core recovery, migration,
security and operational gates still require evidence.

A genuinely smaller alternative is extracting CRM-1 onto main: labels, colors and order
use the existing settings store and immutable stage keys rather than new CRM tables.
That is a proposed extraction, not a validated patch. Shared route/access dependencies,
settings cache recovery and tests must be reviewed on the resulting branch. Backup,
upload and lifecycle changes would also require deliberate extraction and independent
validation; cherry-picking the combined checkpoint is not evidence of isolation.

## Confirmed namespace compatibility change; live impact unverified

Main passed logical object keys directly to R2. Candidate
`server/services/r2.service.ts` introduces `qualifyKey` (lines 65–67), derives an upload
prefix in `getR2Config` (line 112), and applies it in `uploadFile` (line 182),
`deleteFile` (line 210) and `downloadFile` (line 235). `getPublicObjectUrl` (lines 77–85)
also qualifies public object URLs; `normalizePublicUrl` (lines 307–308) strips only the
current namespace before generating the new URL.

Thus an existing logical key such as `cms/images/example.jpg` formerly read from that
bucket-root key is now read from `<current-client-prefix>/uploads/cms/images/example.jpg`.
No legacy read fallback or object relocation is present in those functions. If the
production installation has such objects, the old app-served URL will no longer resolve
them and deletion will target a different object. This is a confirmed behavioral change,
with production prevalence and impact still unverified. Existing public URLs that bypass
Core may continue working; that does not verify app-served reads or deletion.

`shared/client-backup-policy.ts:15–36` derives namespaces from public domain, then stack
ID, then `system-backups`; changing from the pre-domain identity to a domain can also
change storage location. Backup prefix can be explicit; the upload service has no
corresponding legacy-prefix option. Backup namespace compatibility must therefore be
verified separately from upload compatibility.

The inspected deployment runbook explicitly requires dedicated media storage or scoped
client namespaces (`docs/runbooks/client-stack-deployment.md:119–125`). It describes the
new namespace and duplicate-environment recovery checks, but no migration of existing
media objects. Repository searches of docs and server scripts found no explicit legacy
media migration procedure. The backup policy test called “preserves an explicit backup
prefix for a controlled migration” tests prefix resolution only. The documented
`--allow-legacy-backup` option concerns snapshot identity and does not authorize legacy
media access or bypass a mismatched stack.

Do **not** solve this by arbitrary bucket-root or cross-prefix fallback. First establish
sanitized evidence of the active stack, bucket ownership, current prefix and affected
references. Any compatibility handling or migration needs an explicit, bounded source
namespace owned by that same stack, isolation tests, verified destination references and
a recovery path. No object movement or compatibility policy is authorized by this report.

## Remaining Core release evidence

- [ ] Exact candidate passes required hosted Verify, independent review and the new
  reproducible compiled Linux production-start gate. Existing recorded Linux/TLS smoke
  success proves its tested artifact; later candidate changes need traceable evidence.
- [ ] Rehearse main-to-candidate migrations on a representative disposable database,
  including populated-data constraints and compatibility with the old release during
  replacement. Migration 0049 adds a unique paid-order inventory index; existing
  duplicates could reject startup. Fresh/repeated migrations alone do not establish
  populated production compatibility.
- [ ] Record current backup availability, retention, stack identity, namespace and a
  successful duplicate-environment recovery appropriate to the deployed installation.
  Synthetic restore tests establish implementation behavior, not current production
  recovery. Shared-R2 policy in the ledger is not verified live storage configuration.
- [ ] Establish upload R2 availability independently. `cms-media-upload.service.ts:102`
  and `upload.routes.ts:156` now fail closed in production. Upload R2 reads application
  `cloudflare_r2` settings, whereas backups also accept dedicated `BACKUP_R2_*` variables;
  backup configuration alone does not prove uploads work.
- [ ] Resolve the namespace compatibility evidence above, including existing media reads,
  references, deletion behavior and old-backup access without weakening stack isolation.
- [ ] Record rollback procedure and observability for the complete integration surface,
  including enabled ecommerce behavior; provider acceptance gaps cannot be dismissed by
  calling the full merge an admin-only release. Code rollback does not undo migrations.
- [ ] After a gated deployment, verify actual Railway config adoption: direct Node start,
  45-second grace against the 30-second application deadline, readiness and signal drain.
  Verify affected admin journeys and existing media on the deployed revision.

These gaps constrain release acceptance, not continued authorized implementation.
Better Farms-specific launch evidence remains tracked separately in its manifest and
canonical program ledger.
