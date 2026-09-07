# Orchestrator infrastructure and engineering review — 2026-09-05

Read-only implementation review; no production settings, records, deployments, or branches were changed. This report is a bounded review, not a complete security audit or launch certification.

## Baseline and checks

- Reviewed integration worktree `/Users/mike/.codex/worktrees/323e/Core Platform` at `6a74c6d01baf65a728766cbbcfd70da03f14bff7`.
- GitHub main was `e2ba0481863d329cfab1566c994262bb2bb92aad`. Integration is 143 commits ahead, with 216 changed files. The user's primary checkout remains at `b73006e`; preserve its untracked `test-results/`.
- GitHub quality run 33996168178 succeeded for the integration revision, including migrations, types, lint, formatting, tests, build, and bundle budget. These results were inspected, not rerun locally.
- Public production `/api/health/ready` returned ready/database connected at 2026-09-05T22:35:32Z. This does not identify the deployed revision or verify recovery, providers, or client workflows.
- GitHub main reports `protected: false`; repository rulesets endpoint returned an empty list.

## Priority findings

### P1 — Backup exports do not capture a consistent database snapshot

`server/services/system-backup.service.ts:230` reads each table through a standalone pool query; lines 299–300 repeat this across tables without one snapshot transaction. Concurrent application writes can yield a backup whose related records represent different points in time, causing restore failures or inconsistent business state.

Use a dedicated connection and consistent snapshot for the complete export, or a proven database-native backup mechanism. Validate by restoring a backup taken during concurrent related writes into a disposable database and reconciling relationships and totals.

### P1 — Backup advisory locks are not pinned to a database session

`server/services/system-backup.service.ts:264` acquires a session advisory lock with `pool.query`; line 273 releases through another pool query. Pool allocation does not guarantee those operations use the same session. The lock can remain held, and a concurrent operation using the owning pooled session can acquire the same lock reentrantly.

Hold one checked-out client for acquisition, protected work, and release; inspect unlock results and release the client in a finally block. Test simultaneous operations and failure recovery with multiple pool connections.

### P1 — Form retries can permanently skip downstream work

`server/services/forms.service.ts:443–451` persists an idempotent submission before executing Mailchimp, contact-message, CRM, and notification effects. Those effects run only when the submission was newly created. A crash or thrown failure after persistence leaves the retry returning the existing submission without completing missing effects. `server/storage/forms.storage.ts:105–133` confirms the existing submission is returned with `created: false`.

Persist durable effect jobs atomically with the submission, then process them with retry and effect-level deduplication. Test crashes and failures between each step; retaining the submission alone is not proof that the workflow completed.

### P1 — Release acceptance is not enforced on main

GitHub main has no branch protection or rulesets. The integration branch is 143 commits ahead and has no corresponding open integration PR in the inspected PR list. Passing branch CI does not enforce review or prevent a different, unverified revision reaching main.

Reconcile the exact integration candidate, use a reviewable PR, enforce required quality checks, and verify Railway's deployed revision and deployment approval behavior before release. Railway settings were not inspected in this review; automatic deployment behavior is not asserted here.

### P2 — CI does not verify real browser workflows

`.github/workflows/quality.yml:58–65` runs unit tests/build/budgets but not Playwright. The sole `e2e/admin-responsive.spec.ts` replaces the document body with synthetic HTML at lines 6 and 29. It tests layout CSS, not actual login, CMS editing/publishing, form delivery, or checkout. `playwright.config.ts:31` starts Vite rather than the complete backend/database stack.

Add isolated real application journeys to the release gates, prioritizing the Better Farms edit-preview-publish and form-to-CRM flows. Add commerce journeys when commerce is in client scope.

## Additional engineering concerns

- Attachment uploads fall back to local disk when R2 is unconfigured or returns no URL (`server/routes/upload.routes.ts:147–159`), including in production. Without verified persistent storage and file recovery, a replacement container can lose accepted uploads. Fail closed for missing durable production storage; actual Railway volume configuration was not inspected.
- Ecommerce notification batches reuse one timestamp across all claims (`server/services/ecommerce-notification-jobs.service.ts:54–60`). A batch longer than the lease duration can assign already-stale claims to later jobs, permitting concurrent reclamation. Refresh the clock per claim and verify slow-batch behavior with competing workers.
- `server/db.ts:18–19` disables TLS certificate verification in the production fallback when the connection URL omits sslmode. Define and test explicit database connection policy for the actual hosting network; this review did not inspect production credentials or assert the active TLS mode.
- Runtime shutdown handling was not found in server source. Add and exercise graceful request/job draining before relying on rolling replacements for critical work.
- Event reminders read pending registrations, send email, then mark the batch sent (`server/services/event-reminder.service.ts:35–77`). Concurrent workers or a restart after send can duplicate delivery. Establish database-backed ownership and delivery retry semantics before scaling background workers.
- Configurable commerce providers include non-operational adapters (`server/services/ecommerce-integration-adapter.service.ts:330–332`). Release scope must be tied to verified provider capabilities, not saved credentials alone.

## Open launch evidence

The Better Farms release example remains draft, uses example domains, and records database, backup, restore, health, security, monitoring, and content gates as pending. This is an evidence gap, not proof that live backups or monitoring are absent. Better Farms is a no-WooCommerce-import pilot; the generic commerce/import program should not silently broaden its scope.

## Recommended sequence

1. Repair and verify backup consistency/locking and durable form effects.
2. Reconcile branch ownership and the exact candidate; enforce review/checks on main.
3. Exercise real pilot workflows in an isolated complete stack.
4. Collect restore, provider, monitoring, domain, and deployment evidence against that candidate.
5. Release only after applicable gates pass; develop the reusable website deployment playbook after the pilot.

## Owner-approved program additions

On 2026-09-05, the Project Owner requested adding this review's recommended fixes to the Orchestrator goal, together with assessment and adaptation of CRM settings and useful capabilities from `https://github.com/Go-Digital-Alchemy-Repos/DigitalAlchemyCRM`.

The active program goal now includes all findings above. Backup and form reliability lead remediation. The CRM workstream will inspect the source project, compare its settings and workflows with Core Platform, record a prioritized capability gap analysis, and adapt compatible improvements with appropriate tests. Specific source capabilities have not yet been verified. Preserve Core's architecture, authorization, data isolation, and existing contracts; escalate material scope or architecture changes under the existing governance rules. Do not copy client records or secrets.

These additions supplement the canonical client-migration plan and execution ledger; they do not replace the Better Farms pilot or authorize bypassing release gates. The reusable website-build prompt and deployment playbook remain deferred until after the system and pilot are complete.
