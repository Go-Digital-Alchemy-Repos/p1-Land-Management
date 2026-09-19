# Verified next implementation boundaries — September 19

## Public identity delivery

Header/footer literals and image imports already pass through `cms-layout-jsx-runtime.ts` and published `site-chrome`; the separate Design Branding settings do not drive those values. Favicon links in public `index.html` and identity in `site.ts`/`structured-data.ts` remain separate.

Next implementation should project only validated public identity into the existing content snapshot before SSR and serialize that same identity/revision for hydration and navigation. Explicit precedence must preserve configured Design identity, then published chrome, then bundled P1 defaults. Do not silently delete existing chrome values. Derive visible phone and tel links together; retain service-area-only address semantics. Use revisioned same-origin assets via known media/storage references, never an arbitrary URL-fetch proxy or widened image CSP. Preserve last-valid identity across outages/restarts; existing public-settings cache drops expired overrides on failures and cannot be reused unchanged.

Evidence needed: published edit updates HTML, header/footer/contact/JSON-LD/favicon without deployment; hydration revision matches; existing defaults survive; invalid assets/private objects/traversal are rejected; outage recovery preserves last-valid content; desktop/mobile rendering.

## Native Backups and recovery

Retained operations are status, manual run (snapshot upload and retention pruning), and restore by key (database replacement). Native parity must retain all three with Owner enforcement, exact stack/provenance checks, storage-prefix checks, shared advisory lock 880120441, transactional rollback, cache invalidation and no replay on uncertain response. Restore requires an explicit destructive confirmation; do not perform a production restore for acceptance. Manifest media counts are references, not backed-up object bytes.

Read-only Railway metadata identified service Postgres `7913729e-39e9-45a9-ac58-ceb18711a0a6`, successful deployment `335faa38-fd8a-46cc-a615-4a942c2df1b9`, image `ghcr.io/railwayapp-templates/postgres-ssl:18`. Confirm Core actually references this service before treating it as Core's major. The current isolated runner uses PostgreSQL16. Trusted Core archive/provenance and media manifest/object copies are not yet available in the documented local backup directory. Authenticated backup status can provide manifest metadata without database rows or credentials; a Railway snapshot UUID alone is insufficient.

CRM/account reconciliation, agreement/crew/offline acceptance and safe retained-admin retirement remain governed by consolidation-acceptance.md. QuickBooks/Twilio remain deferred.
