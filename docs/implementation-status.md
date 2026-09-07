# P1 implementation status — 2026-09-07

Branch: `codex/p1-cms-crm`. Public baseline: `5303da0`; copied Core source: `aad2057ca53e0a55a873bcbe9c62a73e267be541`.

## Implemented locally; release acceptance pending

- Public React website renders published CMS content before JavaScript. Thirty-four routes and shared navigation/business content have structured controls (35 components). Preview, revision conflicts, publish and restore are provided by the copied P1 Core.
- P1 Core is isolated at `platform/p1-core`; excluded applications, integrations, credentials and imported uploads were removed. Fresh database migration creates46 tables; the disabled Careers compatibility relation is documented in its operations guide.
- Estimate requests are durably accepted and queued for independent CRM and email processing. Browser retries deduplicate by submission; separate projects remain separate leads.
- Images have responsive WebP/AVIF variants. Initial public JavaScript maximum139.2KiB gzip, below150KiB budget. Actual field Core Web Vitals remain unmeasured.
- Exact owner-provided P1 Symbol.svg is the public favicon and compact dashboard icon, including fallback branding. No generated replacement artwork.
- Latest navigation request implemented for desktop and mobile: Blog/Gallery removed from main navigation; Service Areas moved to the final Services item with bold blue styling. Public routes remain available.

## Evidence obtained

- Public build, prerender and34-route quality checks passed after navigation change.
- Nineteen server tests cover publication caching/recovery, ETags, draft exclusion, exact HTML/hydration revision, redirects,404s, favicon, dashboard separation, proxy destination isolation and client-IP handling.
- Real local gateway checks passed for seven page families: private drafts, stale-write409, publication visible in HTML, and restoration of original content via save/publish.
- Real local gateway estimate returned201, duplicate retry returned200 with the same receipt; one CRM lead reached New with website_form source. Worker cadence is30seconds; an initial15second observation window was too short. Email intentionally remains queued without a local provider.
- Core focused permission/form tests, disposable database tests, fresh production-container migration and non-root runtime passed. Full suite reported601passing with one inherited fail-closed IPv6 certificate fixture failure; this is not an all-tests-pass claim.
- Scoped independent review found and fixed executable uploaded documents and CRM editor media mutation overreach. Twenty-four focused upload/security tests passed. Separate public proxy credential-forwarding flaw was fixed with a regression test.
- Public production Docker build passed for linux/amd64 (Railway target); the initial native ARM build exposed intentionally excluded platform binaries in existing workspace overrides. Core production Docker build and UID1000 startup passed. Images must be rebuilt for any subsequent source changes.
- Dedicated P1 Railway S3 bucket passed a live synthetic write/read/delete roundtrip; only that test object was removed.

## Infrastructure and remaining gates

Dedicated P1 production resources exist: Core service45646c66-c173-4e23-81ab-64ca4d545bbe, Postgres7913729e-39e9-45a9-ac58-ceb18711a0a6 and bucket3e9a9791-9237-40a6-a45b-cc1d19380256. Core has fresh session/setup secrets and private database/storage settings. The original Core repository, database and deployment are untouched.

The CMS/public implementation is being saved as an implementation checkpoint on `codex/p1-cms-crm`; GitHub push receipts are separate from deployment evidence. It has not been deployed to production. Production still serves the prior public release. Remaining gates include final frozen-source checks, staging/live gateway validation, actual owner admin setup, email provider delivery, backup/restore rehearsal, and exact-revision deployment/rollback receipts. Do not mark the approved plan complete from this local evidence.

Mailgun DNS task owns DNS/SMTP credential provisioning; existing Google mailbox records are retained. CMS remains at www.p1landmanagement.com/admin. The separately authorized business dashboard uses dashboard.p1landmanagement.com with its own service, database and cookies; its staging preview is not pilot acceptance. Independent dashboard security review is in progress. Public estimate intake remains authoritative; any downstream business-dashboard lead bridge requires an explicit idempotent delivery contract.

## Proxy trust boundary

Railway production uses its validated X-Real-IP edge header, then sends a single reconstructed X-Forwarded-For to the private Core. Local/direct servers ignore supplied forwarding headers. This avoids grouping every visitor under one proxy IP while keeping arbitrary forwarded chains untrusted. Reference: [Railway public networking headers](https://docs.railway.com/networking/public-networking/specs-and-limits). This depends on the public service being accessed through Railway's edge; private project services remain a trusted deployment boundary.

## Separate dashboard security recheck

The dashboard task's frozen v2 security fixes passed bounded independent review: six original findings and two subsequent edge cases were resolved in reviewed snapshots. Parent independently ran `node scripts/test-dashboard.mjs` against a fresh disposable database:5passed,0failed,0skipped, migration replay passed. Reviewers also executed synthetic pending-upload disconnect and settled-invoice reconciliation checks. Evidence and hashes are in `docs/dashboard/security-recheck-auth-files.md` and `docs/dashboard/security-recheck-api-qbo.md`. This is acceptance of scoped fixes, not full platform, provider, device, production or pilot acceptance. Dashboard task owns its authorized preview release and remaining gates.

Dashboard preview receipt verified by Orchestrator: production web `34c4634a-8148-4ffd-a602-80c8558151fe` and worker `28a3cb2b-9c33-45b0-92b6-2c98b7e077e6` both reached Railway SUCCESS. Live dashboard health returned200. Preview source manifest SHA-256 `73b231fbf24132e4db951ca84f2e8f9d2eea12490f2e50c9c53eed228e619be8` matched the delivered file. This is a source-manifest receipt, not a Git-revision deployment claim. Owner setup/provider activation and device/pilot gates remain pending. Public website/CMS release status above is separate and unchanged.

## Commercial initiative addition

Owner-requested Commercial / Industrial Sales scope is registered in [the master plan](MASTER_PLAN.md) and [detailed initiative](initiatives/commercial-industrial-sales.md), with CMS, domain, assessment, durable handoff and future target-account pursuit phases. Documentation is complete for this planning request; the commercial page and new workflows are not yet implemented. Owner requested all completed work pushed to GitHub; reviewed preview/code slices are being preserved as a branch checkpoint with unfinished scope explicitly retained. Imported legacy Core screenshots/avatars were excluded from the P1 source; copied fallback layouts now use the supplied P1 icon.
