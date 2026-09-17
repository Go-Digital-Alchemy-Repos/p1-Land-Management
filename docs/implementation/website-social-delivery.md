# Website social-profile delivery

Core's public `GET /api/p1/website-social` reads a public-only branding snapshot and emits the known platform identifiers, normalized safe HTTP(S) URLs and retained icon style, with fixed stack/schema identity. Unusable stored URLs are omitted without changing storage. The normalized URL must also fit the 2048-character limit, preventing Unicode expansion from exceeding the public contract. Credentials, company fields, audit/revision metadata and arbitrary settings are never projected. Private/unavailable storage returns a generic 503.

The gateway owns read-only `/api/p1/social-links`, rejecting queries and mutation methods. It fetches the fixed Core projection without visitor cookies/authorization, checks exact shape and identity, known unique platforms, style and safe bounded URLs, and emits only links/style. A shared public-settings reader now handles fonts, colors and social data with strict JSON/UTF-8, byte bounds, redirect rejection, timeout, coalescing and 30-second in-memory refresh. Social data has a 32 KiB bound. Failures drop expired data; clearing/removing all URLs yields no social links. No stale disk fallback is used.

The public footer requests this same-origin projection with credentials omitted after hydration. It validates the response again, supplies platform labels/colors and SVG data from the existing shared catalogs, and renders accessible named links with safe new-tab attributes. Brand, outline and solid styles have 44px targets and wrap. Brand icons use a white surface for dark-footer legibility. No requests are sent to social providers until a visitor follows a link. Empty or failed data omits the social navigation while leaving the rest of the footer intact.

This is client-rendered footer content; the prerendered HTML remains unchanged until hydration. Already-open pages do not receive live updates. A new page load/footermount after the gateway cache expires receives current settings. CSS/scripts/CSP permissions were not broadened for this feature. The dashboard editor now describes delivery timing.

## Rollout and rollback

Deploy Core's projection before the gateway reader and public bundle, coordinated with the editor copy. Review the actual stored profile destinations and publication permission before production activation. No production profiles were inspected, changed or activated here. Roll back the gateway/public footer component to stop display while retaining the underlying settings. No database migration is needed.

## Evidence and remaining visual issue

Core tests prove safe minimal projection, clearing/defaults, private failure and query/mutation rejection. Gateway tests cover credential stripping, shape/URL validation, limits, coalescing, clearing and failure, with existing font/color regression suites covering the shared reader. Browser checks observe all ten actual SVGs, styles, mobile wrapping, safe link attributes and empty/invalid/unavailable behavior with external networking blocked.

The mobile homepage has an existing grid overflow in the `col-span-12 lg:col-span-7` image column: document width is 464px at a 390px viewport, unchanged when the social navigation is hidden. The new social row's scroll width fits its client width. The overall homepage overflow remains a visual acceptance issue; this checkpoint does not claim a full mobile-layout pass.
