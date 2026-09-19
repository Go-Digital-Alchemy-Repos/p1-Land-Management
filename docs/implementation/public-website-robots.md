# Public website robots delivery

Released at code revision `ec899b3`, followed by evidence revision `550534b`. Canonical live GET/HEAD and projection equality verified read-only.

GET `/api/p1/website-robots` exposes exactly schemaVersion 1, stackId `p1-land-management`, SHA-256 version of effective UTF-8 content, and content. It reads existing SEO settings without exposing generic settings. Queries, invalid Unicode/control characters and text over 32 KiB UTF-8 fail closed; unavailable data returns a fixed 503. Headers are no-store/nosniff.

Existing SEO saves remain immediate publication operations: there is no separate draft/publish lifecycle. Native and retained writes still require `marketing.content.seo`; storage/auth contracts are unchanged. Projection-invalid saved content leaves the public last-valid policy intact. This slice does not add write-time validation or optimistic concurrency.

The Orchestrator approved preserving authored custom semantics: nonblank custom text replaces generated text verbatim. No crawler groups are appended. Generated defaults retain `/admin` and `/api` disallows, configured sitemap and global noindex behavior. Custom text may override those generated restrictions. Robots is not authorization; infrastructure authentication/noindex headers remain unchanged.

Public GET/HEAD `/robots.txt` now consumes this projection. Non-indexable deployments (determined by the existing manifest-origin gate, not NODE_ENV alone) always disallows all before any lookup. Production refreshes on demand every 30 seconds with a 1.8-second timeout and request coalescing. Save makes content eligible immediately; propagation requires a request after refresh expiry. Responses use text/plain and no-cache. A 200,000-byte JSON response cap accommodates escaped 32 KiB text; the parser also enforces the decoded UTF-8 limit and hash.

Timeouts/invalid responses retain last-valid content. The validated `website-robots.json` cache resides under `P1_CONTENT_CACHE_DIR`, default `/tmp/p1-public-content`. Restart recovery requires the same filesystem; replacement containers without durable storage may lose this cache. Cold failure uses generated P1 defaults with reserved-path disallows and canonical sitemap. Visitor cookies/authorization are never forwarded; upstream redirects are rejected.

Focused validation covers defaults/custom/reset/noindex, deterministic version, Unicode/byte limits, sanitized errors, canonical GET/HEAD, staging disallow, refresh/outage/restart behavior. No production SEO mutation is part of testing. Release verification should compare Core projection to canonical robots after refresh, check HEAD/content type/cache headers, and verify staging disallow. This does not certify crawler indexing behavior or complete SEO parity.

## Live release evidence

At `550534b`, website deployment `1c3e3855-60e3-4059-9f58-89f7c73952fc` and Core deployment `d270146b-9aab-4333-bddb-3282802aacbb` reached SUCCESS. Canonical projection and `/robots.txt` returned200 with identical effective text after rollout/refresh; projection hash matched content. HEAD returned200 and zero body bytes with text/plain UTF-8 and no-cache. An earlier during-rollout sample still returned the old static robots; the later equality check is the acceptance result. Current saved default allows public indexing while disallowing admin/api. No SEO setting was modified. Non-indexable behavior passed isolated HTTP tests; no separate live staging website was verified.
