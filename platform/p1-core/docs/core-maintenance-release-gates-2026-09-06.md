# Core maintenance release gates — 2026-09-06

Broad integration release remains held. Production is `a006f36`, with the upload guard deployed
but disabled. Better Farms site launch is a separate decision; no live checkout or DNS cutover
is authorized for that pilot. This record updates the earlier historical readiness review.

| Gate                           | Current evidence                                                                                                                                                                                                        | Remaining work                                                                                                                                                                                                                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reviewed baseline              | Deployed main merged into remediation; exact candidate `1d9cd8c` received independent bounded 310-file review                                                                                                           | Review subsequent fixes and exact release diff; reviewer did not claim exhaustive line-by-line audit                                                                                                                                                                                                                   |
| Hosted validation              | `59af4a4` run 34004914446 and `517a88d` run 34005497636 passed both 22-case pilot acceptance and required Verify                                                                                                        | Required Verify and dependent pilot acceptance for final immutable release head; no final-head pass asserted here                                                                                                                                                                                                      |
| Production runtime             | Compiled Linux/TLS/start/shutdown evidence and CI gate exist                                                                                                                                                            | Final artifact gate and actual post-deploy start/drain configuration adoption                                                                                                                                                                                                                                          |
| Populated upgrade              | Actual-main `a006f36` rehearsal preserved synthetic records and rejected duplicate paid history; added two restarts preserving every value of all four notification job types after fixing historical constraint replay | Recheck final migration hashes and current duplicate predicate before deployment                                                                                                                                                                                                                                       |
| Real recovery                  | Actual production backup restore preserved 94 tables/391 rows, including ciphertext                                                                                                                                     | Retain/recheck accessible backup and recovery configuration at cutover; ciphertext preservation does not recover the encryption secret                                                                                                                                                                                 |
| Source media                   | Actual deployment-bound dry run verified one CMS object and returned would-copy                                                                                                                                         | Final inventory after writer barrier; retain missing local asset as an explicit unresolved record, without guessing replacement                                                                                                                                                                                        |
| Conditional copy primitive     | Actual R2 probe rejected second conditional write with 412, preserved first bytes and was removed                                                                                                                       | Approved exact-plan execution and destination hash/read verification                                                                                                                                                                                                                                                   |
| Writer barrier                 | Admission guard deployed, flag absent                                                                                                                                                                                   | Freeze, replace/drain old writers, resolve ambiguous writes, refresh inventory; flag alone is insufficient                                                                                                                                                                                                             |
| Namespace cutover              | Target direction is clients/core-platform/uploads; explicit legacy backup prefix system-backups                                                                                                                         | Apply/reconcile approved copies and verify application URLs/deletion targeting while frozen                                                                                                                                                                                                                            |
| Media rollback                 | Isolated candidate `704cabf` ports exact namespace algorithms onto deployed-main code; 403 tests passed, root independently passed 23 focused checks                                                                    | Populated migration rollback/roll-forward preserved original and queue values. Recovery-only `f9036a3` passed hosted Verify run 34004708405, including compiled read-only runtime checks. Actual frozen media reads, deployment command and old-worker termination remain unverified; no full rollback readiness claim |
| Missing provider configuration | Reviewed correction resolves the same validated client before mutations; root passed 72 service and 12 neighboring regressions                                                                                          | Manual desktop/mobile workflow acceptance completed (next row); final immutable-candidate hosted checks remain. Remote provider acceptance is separate                                                                                                                                                                 |
| Manual ecommerce acceptance    | Desktop/mobile offline wizard, concurrent paid retries, inventory/outbox, refund UI feedback and cancellation/fulfillment guards passed against disposable PostgreSQL                                                   | Final hosted browser run for immutable candidate; provider-backed acceptance remains separate                                                                                                                                                                                                                          |
| New provider transactions      | Candidate defaults new Stripe transactions off unless ECOMMERCE_PROVIDER_TRANSACTIONS_ENABLED is exactly true; settings show credentials and activation separately, and historical recovery remains available           | Keep flag false for maintenance; final candidate validation remains. Sandbox/provider acceptance is required before later explicit activation, not to admit this disabled maintenance release                                                                                                                          |
| Better Farms integration       | 22 actual pilot cases pass: seven-route desktop/mobile sweep plus Core image decoding, CMS publish, response-loss retries and corrected mobile focus containment                                                        | Final site build/runtime/manifest origin agreement; content/assets/domains and whole-site launch acceptance separately                                                                                                                                                                                                 |

Configuration-before-write and manual commerce browser corrections are implemented and locally
verified. Next work is final immutable hosted acceptance and the live operational sequence below. Do not freeze production uploads merely to
wait for unrelated development. Storage copying remains gated and no historical orders are
assumed to be demos. Historical webhook reconciliation/recovery must be considered separately
from allowing new provider transactions.

Evidence sources are linked from the canonical execution ledger and `docs/release-evidence/`.
No checkbox here substitutes for the underlying artifact, runtime result or final review.

## Ordered maintenance cutover evidence

This is the remaining operating sequence, not a record that these actions occurred. Current
review checkpoint is `fbdd0a3`; subsequent changes require their own immutable checks. Finish
code, artifact delivery preparation and checks before starting a production freeze. Better Farms
content/assets/domain/checkout approval and isolated CRM-2 work are separate from Core maintenance.

1. Pin the reviewed Core release and recovery `f9036a3` artifacts, hashes, start commands and
   configuration snapshots. Confirm final hosted results, accessible backup/restore materials
   and the actual encryption secret's availability without printing it. Deliver the reviewed
   dry-run/apply artifacts through a hash-verified operational path; they must execute in the
   actual source runtime with genuine deployment identity, not fabricated local Railway values.
2. Inventory every relevant Railway service, replica, deployment and separate worker that can
   mutate this installation's uploads. Set upload admission freeze on the existing `a006f36`
   application and replace its writers while preserving the old upload namespace. Verify the
   new admission guard rejects mutations and record each previous writer's terminal `REMOVED`
   state, deployment IDs and shutdown logs. Include separately running services/workers; a new
   healthy deployment alone does not establish that all old writers stopped.
3. Reconcile operations admitted before freeze or terminated with an uncertain result. A killed
   client may have sent a successful remote write: re-read exact relevant CMS records and R2
   objects and resolve uncertainty before closing the barrier. Only then refresh the exact-object
   inventory, source deployment/database identity and independent approval/drain attestations.
4. Execute the read-only dry-run, then the separately authorized exact-plan conditional copy
   with a new durable ledger. Verify destination bytes and retained source bytes through direct
   R2 reads. On timeout or incomplete evidence, preserve objects and ledger and reverify before
   retry; never overwrite or delete originals. Keep the missing local-media record explicitly
   unresolved, without inventing a replacement.
5. Prepare `CLIENT_STACK_ID=core-platform`, leave `PUBLIC_SITE_ORIGIN` absent, and explicitly retain
   `BACKUP_R2_PREFIX=system-backups` for the recovery deployment in the next step, with uploads
   still frozen. Apply these together with its reviewed artifact/start command; do not interpret
   a read from the old root-key application as namespace acceptance. Preserve logical CMS/career
   keys; the copy does not rewrite database references. Verify deletion targeting through
   non-destructive evidence; do not test deletion on the retained production object.
6. Exercise the prepared recovery command `node dist/rollback-maintenance.cjs` with that namespace
   configuration in a controlled interval: verify actual process command, read-only readiness,
   exact application URL and namespaced media bytes, and business
   API/webhook 503 responses, and prove replacement/termination of previous business workers.
   Record the interrupted webhook interval and eventual provider retry/reconciliation obligation.
   This is a media/readiness maintenance endpoint, not a functioning old storefront/dashboard.
7. Immediately before the upgrade, recheck the accessible backup, current duplicate-payment
   predicate and final migration hashes. Deploy the final reviewed Core normal entrypoint with
   namespace settings retained, upload freeze still true and
   `ECOMMERCE_PROVIDER_TRANSACTIONS_ENABLED=false`. Verify actual start command, readiness,
   migration outcome, shutdown configuration, media, administration and historical queue/provider
   reconciliation. Do not restore an old database or delete source objects for ordinary fallback.
8. Reopen upload admission only after those checks and writer transitions are evidenced. Retain
   source objects, copy ledger, backup materials and recovery artifact. New Stripe activation and
   any later cleanup remain separate decisions; historical transactions are preserved throughout.

Railway documents replacement shutdown as SIGTERM followed by SIGKILL after the configured drain,
with a default of zero seconds. The candidate requests 45 seconds; verify the adopted runtime
setting instead of assuming repository configuration changed production.
[Deployment teardown](https://docs.railway.com/deployments/deployment-teardown) describes the
shutdown lifecycle; [deployment reference](https://docs.railway.com/deployments/reference)
identifies Remove as stopping a running deployment and the final REMOVED state. These provider
semantics support, but do not replace, actual service/replica inventory, terminal-state/log evidence
and reconciliation of ambiguous remote writes. A freeze flag alone is never a writer barrier.
