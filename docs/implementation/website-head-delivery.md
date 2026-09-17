# Public website head markup delivery

Status: implemented and verified with synthetic local data. Not deployed. Existing saved production markup has not been inspected or activated.

## Ownership and data flow

Marketing → Website System → Head tag additions is Owner-only. The dashboard and Core independently enforce current identity, with attested canonical ownership at Core. Version-checked saves and their audit entries commit together. Source storage remains `system_settings`, category `head_tag_additions`, key `public_head_html`. Nothing is copied into dashboard business preferences.

Core exposes `GET /api/p1/website-head-tags` as an intentionally public, minimal projection:

```json
{"schemaVersion":1,"stackId":"p1-land-management","html":"<meta name=\"verification\" content=\"example\">"}
```

It returns no category, secret, version token or operator information. Query parameters are rejected. Private-category errors, unavailable storage and values over 100,000 characters return a generic 503. Responses are JSON, no-store and nosniff. The anonymous reader cannot modify anything.

The public gateway fetches this fixed path from configured `P1_CORE_ORIGIN`; visitor headers/cookies and authorization are never forwarded. It coalesces simultaneous reads, refreshes cached markup on page requests roughly every 30 seconds, uses a 1.8-second network deadline, disallows redirects and caps streamed responses at 1 MiB. Strict UTF-8, JSON shape, stack identity, schema version and markup length checks reject unexpected data. No disk copy or stale executable fallback is kept. Expired markup becomes empty on failure; the website still serves its ordinary content. Each gateway instance has its own short-lived cache.

## Where markup appears

Only normal public documents rendered from the configured website route manifest receive the markup. Insertion occurs after the page's own SEO/body rendering, before the document's closing head boundary, using a literal replacement function so authored `$&` and similar characters are preserved.

Admin/proxied pages, APIs, static assets, editor builder documents and public routes carrying `cmsPreview` do not receive it. The dashboard only displays source in a textarea. An already-open browser document is not rewritten when markup changes; refresh or a new document load is required. Client-side navigation keeps the global markup from the document's initial load.

This is Owner-authored raw HTML, not visitor input. It is not sanitized into a different document. As with any global website edit, malformed markup or conflicting metadata can affect the public page. Existing title/canonical/SEO tags remain emitted by their current renderer; head additions do not resolve duplicates or override those settings deliberately.

## Security and consent boundaries

The gateway CSP is unchanged. The feature does not add nonces, script hashes, external origins or `unsafe-inline` to script policy. Inline scripts and unapproved external script origins remain blocked. Scripts already permitted by deployment policy remain governed by that policy. Arbitrary vendor-script execution is not promised by this editor; any requested CSP change needs its own reviewed requirement and release validation.

Raw allowed scripts are not automatically connected to consent state. Use the existing structured GA4 integration for analytics to preserve its consent behavior and avoid duplicate tracking. Do not treat a successful settings save as proof that a vendor tag executed or that metadata is accepted by a provider.

## Release and rollback

Before a separately authorized release, review the actual saved markup and its intended effect: the previous editor persisted this field, but neither Core nor the gateway consumed it. This change can make previously inert markup appear publicly. Reconcile duplication with page SEO, consent-managed analytics and vendor/CSP expectations. This is a real activation gate, not evidence that a live setting has been reviewed here.

Deploy the Core public projection before (or together with) the gateway and dashboard UI. A gateway pointed at older/unavailable Core omits additions instead of breaking pages. Verify the intended production metadata, exclusion paths and security headers after authorized rollout. Clear the value explicitly through the versioned Owner editor to stop delivery after the cache refresh interval. Rolling back the gateway removes delivery while preserving stored markup and audit history; no destructive migration is required.

## Evidence

Local tests verify source projection/private failure behavior; streamed size/encoding/shape bounds; request coalescing; refresh/clear/failure recovery; literal insertion; real gateway public/admin/preview separation and unchanged CSP. A local browser verifies metadata in the actual document head and that an injected synthetic inline script remains blocked by CSP, with all external networking denied. The dashboard editor's stale/uncertain-save and draft-recovery browser regression also passes. These results do not establish live vendor connectivity or authorize production activation.
