# Incremental consolidation release — September 17, 2026

The Owner authorized release of completed work and continuation of the full consolidation. This release does not retire `/admin/` or establish complete feature, provider or migration acceptance.

## Source and packaging

- Task branch: `codex/business-center-consolidation`.
- `567dde0` merges production `main` at `23139c2`, preserving recent website content.
- Dashboard/Core application checkpoint: `98c073816cbd97e4627bf066498556e513d61c1a`.
- Public gateway readiness correction: `7e85199`.
- Dashboard uses the allowlisted `scripts/package-dashboard.mjs` output; public uses `scripts/package-website.mjs --prebuilt` after production build/image checks. Core uses the committed `platform/p1-core` archive and explicit source revision.
- Clean staging builds revealed and resolved shared-module/Zod packaging, oversized source uploads and canonical-host health-probe redirects. Core staging needed the current required two-recipient test configuration. No live communication test was sent.

## Backups and migrations

- Production dashboard manual snapshot request hit Railway's quota. Existing snapshots were retained. A fresh private `pg_dump --format=custom --no-owner --no-acl` export was captured, and its archive listing was checked before download. SHA-256: `7d509ebdad328ad5ede44a3baa61e0cce6cf0f6d4c32cbba62976f8941cb9ecc`. Stored outside the repository in the local private backup directory.
- Production Core snapshot: `24612435-f6ab-4b10-915d-eef76ba1d945`.
- Dashboard staging snapshot: `9f609705-4b97-45b1-a93e-9b7032136a7d`.
- Federation staging snapshots: `700c6c95-bc46-4a87-b100-fd805a104570`, `a15ead89-b0a6-4653-87d3-8a582c193760`.
- All 30 current preexisting dashboard migration files matched production checksums. The ledger also retains historical `0019_optional_owner_mfa.sql`; this release neither removes its ledger entry nor replays it.
- Production dashboard now has 50 applied ledger entries through `0046_lead_customer_onboarding.sql`. One Owner remains active and seven existing fixture accounts remain disabled.
- Archive checks and snapshot listings are not a full restore rehearsal. Retain additive schema during application rollback; do not down-migrate or erase records.

## Confirmed deployments

| Surface | Deployment | Result |
| --- | --- | --- |
| Dashboard staging | `dedf9798-06dd-4b09-aad0-642218235184` | SUCCESS; migrations and health passed |
| Production dashboard | `b57a08a0-3523-45eb-9dcb-7f2c4d5cafcb` | SUCCESS; existing Owner session verified |
| Production dashboard with paired transport | `2609669b-c874-4caa-8229-cca765adb1a7` | SUCCESS |
| Production worker | `dc20c68a-d803-49d7-ac95-3922d574f738` | SUCCESS |
| Public staging | `bdba5658-61f6-4f09-b162-943b419caa1f` | SUCCESS; health returned 200 |
| Production public website | `fd94bdd5-6829-40ac-8f06-c82ca10f263b` | SUCCESS; home, service areas, health and public social endpoint returned 200 |
| Core federation staging | `f6871809-f007-41da-a38a-da8674136dfa` | SUCCESS; database migrations and readiness passed |

Production Core `578c4dd8-e634-475f-89fb-9aa8c60a2551` reached SUCCESS. Its public readiness endpoint confirms a connected database and the federation status endpoint confirms enabled. The one-time existing-account link form is open for the Owner; authenticated Marketing acceptance remains pending that proof.

## Access and remaining acceptance

The production dashboard has Marketing above Settings, User Manager, appearance controls, CRM notes/tasks and the reusable agreement template library. The existing Owner browser session loaded these screens without creating records or changing accounts. The template library has no saved templates yet; no synthetic legal content was published.

Paired federation and confidential Marketing keys are configured outside source. Existing CMS identities must be explicitly linked through the browser proof/confirmation flow; matching emails never create links. No automatic account or grant reconciliation was performed. Canonical form-notification delivery remains disabled, preserving current notification recipients until reviewed subscription reconciliation.

Remaining full-goal work is tracked in `consolidation-acceptance.md`. This includes missing Website System tools, public identity delivery, full CMS/CRM and capability parity, real provider results, crew/offline agreement acceptance and restoration/retirement rehearsal.

Post-deployment access checks: Core reached the dashboard introspection endpoint using its configured confidential client and received the expected `401 Federation grant is inactive` for a synthetic nonexistent grant. No credentials were printed. The real Owner Analytics screen renders its controls and fails closed with `Website reporting access is unavailable` until account linking; no demo data is substituted. The link form is open for the Owner to prove the existing CMS credentials and confirm the dashboard identity. This is the remaining user-dependent live-access step, not a claim that all feature work is blocked.

Next Website System review confirmed email-template list, edit, activation, restore, preview and test-send operations remain in the legacy settings router. Its browser editor also uses editing locks. Migration must preserve these operations, separate website templates from dashboard transaction emails, enforce Owner authority at both boundaries and retain drafts/stale-write protection; merely adding a navigation link is insufficient. No new template or email was created during this review.

## Unlinked sign-in recovery

An Owner screenshot exposed the normal Dashboard sign-in callback returning raw `federation_link_required` JSON. The callback now redirects that specific failure to the fixed `/admin/login?federation=link-required` route, clears temporary flow cookies and retains no-store/no-referrer headers. It never copies state, codes or user-controlled return URLs. The page explains that Dashboard authentication succeeded and opens the existing CMS credential-proof form. Explicit proof and confirmation remain required; no account is linked automatically. Other callback failures retain their original denial behavior.

Validation: 12 focused server/client tests passed, including fixed redirects, cookie cleanup, invalid-state/conflict denials, explicit confirmation and visible expanded recovery form; Core type checking and production build passed. An initial UI test needed the repository's React test-global setup; it passed after adding it. Deployment verification is pending.
