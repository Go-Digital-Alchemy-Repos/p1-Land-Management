# Website managed scripts and Head Tags

Head Tags is the owner-facing inventory and configuration surface for public website scripts.

- Google Analytics: deployment default `G-YX69CJ1QNJ` (overridable by Core `WEBSITE_GA_MEASUREMENT_ID`), managed measurement ID, or disabled. Changes apply on the next page load without rebuilding. The browser resolves `/api/p1/website-script-config` once per document and fails closed if unavailable. SPA page views remain explicit, deduplicated, query-free and targeted to one measurement ID. Admin, preview and nonproduction hosts are excluded. Reporting property IDs remain separate from tracking IDs.
- Cloudflare Turnstile: displays authoritative runtime status, public site key and loader. Its secret and paired key rotation remain in deployment configuration; the editor never exposes the secret or independently changes verification enforcement.
- Custom markup: existing versioned editor remains available. CSP still blocks inline JavaScript and unapproved script origins. Managed Google/Turnstile snippets belong in the structured controls, not duplicate raw loaders.

Owner GET/PUT `/api/v1/marketing/cms/website-system/scripts` bridges to Core `/api/business-center/website-system/scripts`. PUT requires `expectedVersion` and `googleAnalytics` settings. Generic settings writes cannot bypass this category. No database migration is needed. Concurrent edits require reloading saved state.

External Google Fonts CSS and OpenFreeMap map resources are managed by Typography/map components; they are not custom executable head scripts.

Rollback: restore the previous application revision. Saved managed configuration remains additive; previous builds use their prior build-time tracking configuration. Avoid rolling back after intentionally disabling tracking without reviewing that previous configuration.

Validation: five browser-loader unit tests cover route deduplication, sensitive URL stripping, disabled/unavailable configuration, replacement IDs and pending-preview cancellation. Eight adapter tests cover raw and managed editor recovery. Core route/service tests cover owner restrictions, versioning, generic-route bypass prevention and reserved script rejection. Website, dashboard and Core production builds pass. Deployment/live verification follows the feature commit.
