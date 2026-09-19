# Website System operation inventory

Source inspection: September 18, 2026, application checkpoint `6365dd9`.
This is an implementation inventory, not proof of completed parity. No production writes, provider changes, backup restore or email sends were performed for this review.

## Existing consolidated boundary

`artifacts/api-server/src/dashboard/marketing-cms.transport.ts` allowlists exact method/path pairs. `marketing-cms.ts` checks the Dashboard actor and issues a short-lived grant. Core `business-center-cms.routes.ts` resolves that grant to the linked identity; `business-center-website-system.routes.ts` applies `requireWebsiteOwner` and currently implements only head tags and module switches.

The document and email-template editor-lock paths are already allowlisted, with Owner-only gates at both applications. This does not expose their CRUD operations. Do not remove either boundary or mount a legacy authenticated router unchanged.

## Required retained operations

| Destination | Existing source and operations | Consolidation requirement |
| --- | --- | --- |
| Developer Resources | `server/routes/docs.routes.ts`: GET collection, GET slug, POST create, PUT ID, DELETE ID, POST sync. `client/src/features/admin/docs-page.tsx`: category/search, deep links, Markdown rendering, heading navigation, create/edit, preview, visibility, ordering, deletion and locks. | Native Owner-only destination plus all six operations; keep current store and slugs. Reject arbitrary body fields; preserve author provenance. Implement server-side stale-write checks and coordination with locks. Preserve internal Markdown links/deep links and safe rendering. |
| Email Templates | `server/routes/settings.routes.ts`: GET `/email-templates`, POST `/email-templates/restore`, PUT `/email-templates/:slug`, POST preview, POST test. Browser editor also toggles activation and uses locks. | Owner-only native editor with list, subject/body/activation, variables, preview, default restore, and explicit test action. Preserve site/email branding and current recipients; website templates remain distinct from Dashboard transaction mail. No automated real test sends. |
| Integrations | Same settings router: GET `/settings`, PUT `/settings`, DELETE `/settings/:key`, POST `/settings/test-connection`. Current tests support Mailgun, Mailchimp and R2. | Do not bridge the entire generic settings API. Define allowed website provider keys/categories; write-only secret inputs, redacted read-back, audit and stale-write protection. Preserve existing credentials and deferred QuickBooks/Twilio. Connection tests must state whether they write or send anything. |
| System Backups | `server/routes/admin/system-backups.routes.ts`: GET status, POST run, POST restore. Browser lists storage/configuration/manifests and initiates run/restore. | Owner-only native status/history/manual backup and controlled restore workflow. Preserve identity validation and operation lock. A status page alone is not parity. Restore must remain an explicit destructive operation, with backup identification and concrete recovery evidence; never run it against production as an acceptance test. |
| Client Stack Onboarding | `server/routes/admin/client-stack-onboarding.routes.ts`: POST domain-plan, POST dns-verification, POST readiness, GET `/:stackId/evidence`. Browser generates plans, checks DNS, evaluates readiness and retrieves persisted evidence. | Owner-only native page within Dashboard shell; preserve all four operations and stored attribution. DNS verification is read-only to DNS providers but records evidence in Core. Planning must not mutate DNS or ask for provider credentials. |

Paths in this table are relative to the existing router mounts. Canonical new bridge paths and generated client contracts must be added together with their implementations and authorization tests. At the original inspection all five destinations were missing. Developer Resources and Client Stack Onboarding now have consolidated destinations; remaining gaps are recorded in the acceptance tracker.

## Findings that change implementation

### Google configuration has two different stores

The legacy `settings-page.tsx` Google Analytics card saves `ga4_measurement_id`, `ga4_property_id`, `ga4_reporting_client_email` and `ga4_reporting_private_key` through generic system settings. Its description explicitly calls this reserved configuration for future reporting.

The live consumers are already implemented: `server/services/google-reporting-auth.ts` reads `P1_GA_SERVICE_ACCOUNT_JSON` or the three `P1_GA_CLIENT_*`/refresh-token environment values; `p1-google-analytics.service.ts` reads `P1_GA_PROPERTY_ID`; `p1-search-console.service.ts` reads `P1_GSC_SITE_URL`. Copying the legacy card would create a settings screen that cannot configure the active reports. Resolve this ownership explicitly: show the active configuration source and coverage; never silently rotate working OAuth or display an unrelated stored setting as active.

Search Console's configured domain property returned 403 in the prior provider diagnostic, while the authorized site list showed only the apex URL-prefix property. This is not proof of canonical `www` coverage. Changing the property solely to make the screen green is not accepted completion.

### Document synchronization is a write and can replace edits

`system-docs.service.ts::ensureSystemDocs` defaults `refreshExisting` to true. It updates title, category, content and sort order of documents with matching slugs, not merely adding missing documentation. The legacy POST `/sync` calls this default. It uses independent storage writes, not one version-protected transaction. `docs.storage.ts` update/delete currently have no optimistic version argument.

Migration must coordinate synchronization with edits and stale-write protection, including cross-surface editors while `/admin` is retained. A reservation banner by itself does not prevent a server write from overwriting an edit. Make synchronization's overwrite behavior visible and verify contention/cancellation/failed refresh cases with retained draft content.

### Preview is not email delivery

Email preview substitutes sample variables and wraps the HTML in the existing branded email shell. Test-send uses the authenticated Core user's email; it is an external side effect. Keep preview isolated from Dashboard execution (sandboxed, sanitized rendering) and preserve this distinction. Do not substitute fake success when no provider is configured. Restoring defaults also changes templates and must be coordinated with other editors.

### Backup restore replaces data

`system-backup.service.ts` validates stack identity before database work and restores via table truncation/repopulation in a transaction. Preserve those safeguards and the operation lock. The completed isolated Dashboard pg_dump rehearsal does not validate this Core JSON/media backup path or authorize production restoration.

## Acceptance evidence required per destination

1. Method/path allowlist tests, Owner/non-Owner/inactive/unlinked denial tests at both boundaries; no arbitrary settings key, URL or actor forwarding.
2. Typed request/response validation, private/no-store responses, secret-safe errors and privileged-action audit.
3. Existing records visible without a second copy; mutations retain identity/provenance, locks and stale-write handling. Test failed writes and response-loss recovery.
4. Native desktop/mobile/keyboard browser journey covering every operation above, with legacy deep links accounted for.
5. Provider and destructive side effects tested against isolated fixtures; real connections checked read-only. Production release requires scoped validation and exact Railway revision evidence.

Next implementation unit: Developer Resources storage/write contract and bridge, followed by the complete native reader/editor. Keep `/admin/docs` available until parity and cross-surface editing checks pass. Then Email Templates, provider configuration ownership, and Backups. Onboarding now has a native Owner-only implementation; release evidence is recorded below. This sequence does not retire or waive the other acceptance requirements.

## Client Stack Onboarding — September 19, 2026

Native `/marketing/system/onboarding` implements the four existing Core operations using the generated dashboard API client. Explicit operation allowlisting and a live, attested Owner check protect the bridge. Existing Core evidence storage and authenticated attribution remain authoritative; no schema or copied evidence store is introduced.

The page stays within the dashboard shell. Saved evidence can be read independently of generating a plan. Plan generation, DNS observation and readiness evaluation append evidence; they do not change provider DNS, hosting, or release authority. ALIAS/ANAME results explicitly require manual verification. Inputs and the last valid plan survive failures, duplicate clicks are guarded, and uncertain writes are never replayed automatically.

Corrected two retained-admin defects alongside migration: DNS requests now project only the strict schema's fields, and apex values and `www` CNAME targets are independent (so an apex IP is never reused as a CNAME hostname). Legacy routes remain available during consolidation.

Validation: Owner/non-owner bridge and attribution tests, exact transport allowlist tests, native UI tests for evidence-only reads, strict DNS projection and uncertain writes, navigation authorization tests, API/Core/dashboard type checks and production builds. Live acceptance uses read-only evidence retrieval; no synthetic production launch evidence is created.

Release evidence: `3c4adbfd3efffef1f0209e8c9522cf28d06ca1d5` reached Railway SUCCESS for Dashboard, Core and public website on September 19. Authenticated Owner browser verification confirmed the native route, Website System navigation, persistent shell, separate apex/www inputs, and a successful read-only evidence request for `p1-land-management` (empty history). No plan/readiness records, DNS writes, or provider changes were made in production.

### Next: Email Templates concurrency foundation

Source inspection of `settings.routes.ts`, `email-template.storage.ts` and `system-email-templates.service.ts` confirms that current template edits and activation toggles are unversioned, and forced default restoration updates templates individually without an atomic collection-version check. The legacy editor and native editor must use one versioned write contract before concurrent availability. Follow the existing document-storage transaction/version/audit pattern; include default restoration as a single version-checked operation. Inspect startup template repairs and all direct writers as well. Preserve explicit test-mail action to the authenticated user, safe preview rendering, branding, variable lists and template activation; never send real test mail automatically during acceptance.
