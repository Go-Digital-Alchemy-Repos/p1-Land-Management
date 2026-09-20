# Public website form verification

Owner requested Cloudflare Turnstile on all public-facing P1 forms on September 19,
2026. This supplements existing validation, rate limits, honeypots and durable form
receipt/job handling; it does not replace them.

## Cloudflare and deployment

The P1 domain belongs to the Digital Alchemy Cloudflare account. A dedicated managed
widget named **P1 Land Management public forms** is provisioned for
`p1landmanagement.com` and `www.p1landmanagement.com`, with no clearance cookie.
Its secret is stored only in private deployment configuration. It is never placed
in public source, payloads, logs or this document.

Core configuration uses `TURNSTILE_ENABLED`, `TURNSTILE_SITE_KEY`,
`TURNSTILE_SECRET_KEY` and `TURNSTILE_ALLOWED_HOSTNAMES`. Configuration is initially
staged disabled while both applications are released; enable only after the public
client and CSP are available. The public client reads runtime configuration from
`GET /api/forms/turnstile-config` with no-store caching, so no embedded secret or
build-time site-key replacement is needed. Enabled but incomplete configuration
must fail closed. No localhost or arbitrary-host exception is enabled in production.

## Submission contract

All public website renderers use a shared widget: Contact, Commercial Site Assessment
and CMS-managed menu forms (including any configured newsletter form). Verification
uses action `public_form`; the client sends `X-Turnstile-Token` separately from
submission data. The token does not affect payload identity or idempotency keys.
Each HTTP submission attempt requires fresh verification. After failure the widget
refreshes while form data and the same unchanged-request idempotency key remain.
The server validates success, action and exact approved hostname before accepting
new form work. Provider failure rejects safely without claiming durable acceptance.

Canonical managed form submission and alternate contact/client-form routes share
verification. Other anonymous comment, guest registration and career application
write routes are covered or explicitly disabled; authenticated operational editing
and private crew file uploads are outside public-form scope. Read-only form and
comment retrieval does not require a challenge.

Existing durable receipt reuse matches form and idempotency key; this addition does
not claim a new stored payload-hash or historical verification marker. No tokenless
receipt exception is introduced. Broader duplicate-content semantics remain separate.

## Release acceptance

Required evidence: missing/invalid/expired/wrong-host/wrong-action tokens denied,
provider failure denied before writes, fresh-token duplicate retries reuse receipts,
client retry/expiry keeps inputs, all public form renderers covered, production CSP
allows only Cloudflare's required script/frame origin, and live configuration/widget
loads. Never use synthetic always-pass keys in production. Browser challenge solving,
if requested by the provider, requires user interaction/confirmation under tool policy.
Do not submit fabricated production leads merely to test the integration.

Rollback keeps widget credentials intact and reverts the coordinated client/server
release; disabling enforcement is a deliberate operational security change, not an
automatic fallback during an outage. Keep phone contact available when verification
cannot complete.

## Implementation validation

Parent review ran 10 Core verification/boundary tests, nine client lifecycle/retry
tests and 21 production gateway tests successfully. Core production build passed;
frontend typecheck and production build passed with existing bundler warnings.
The domain-specific Cloudflare widget is provisioned and all four Core variables
are configured, with enforcement enabled after coordinated deployment.
Career partner placeholders now return unavailable rather than falsely acknowledging
applications they do not store. They are not browser-CAPTCHA integrations.

## Production closeout — September 19, 2026

Implementation `f19a17beba62b2e7d49b956299d028998c4a9345` deployed successfully:
website `b45b7ca4-5633-40f6-9dc8-7d5e6bc49c90`, Core
`c9654c65-71f6-4f0a-aa11-d977b62e4724`, followed by enabled Core configuration
release `59920e0a-e2cf-4d3a-bdd1-e2eb5b0e6d94`. Runtime public configuration
reports enabled with the dedicated P1 site key. Contact and Commercial browser
widgets loaded and their submit buttons became ready without entering or sending
lead data. The live menu contains no configured modal form; shared renderer
coverage is established by source and focused tests.

Origin-valid empty requests without a token to estimate, commercial assessment
and newsletter managed endpoints each returned403 with the verification-required
message. Initial requests without Origin were denied earlier by the existing
origin guard; these were not counted as Turnstile proof. No fabricated customer
records or notification jobs were created. A successful real customer submission
was not manufactured for verification; server success/retry behavior is covered
by the recorded focused tests.
