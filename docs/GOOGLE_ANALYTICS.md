# Public website Google Analytics

Status: integration prepared; account creation, measurement ID and production collection are not verified yet.

## Enable

1. Finish the existing P1 Analytics account setup after the Owner accepts Google's Analytics Terms and Data Processing Terms. Do not create a duplicate account. Property: P1 Website; time zone Eastern Time; currency USD.
2. Create a web stream for `https://www.p1landmanagement.com`. Turn **Enhanced Measurement off**. The React application sends its own page views; browser-history auto measurement would double count them, and automatic form events must not collect inquiry context.
3. Set the public website Railway build variable `VITE_GA_MEASUREMENT_ID` to the stream's public `G-...` measurement ID, and rebuild/deploy the approved revision. This ID is public, not a credential. Do not set it on the dashboard or Core.
4. Open the production homepage, navigate to a service page and back. Verify a single `page_view` per navigation in GA Realtime/DebugView and successful collection requests. Confirm no duplicate tag is installed through CMS or Tag Manager. Google may take time to update its installation banner.

The ID is embedded at build time through the public Dockerfile. Removing it and rebuilding disables the integration. Local and Railway preview hosts never load GA even when the variable is set. No GA account changes or production deployment are implied by this document.

## Data boundaries

The integration sends page views only, with origin/path and a path-based page title. URL queries, fragments, referrer paths, form values, emails, and property details are not deliberately forwarded. Ads personalization and Google Signals are disabled. GA's normal traffic/session measurement uses its own identifiers; the site's first-party acquisition events remain separate. Call clicks and email clicks are not reported as confirmed leads. CMS previews, admin, API and setup paths are excluded.

CSP permits only Google's tag loader and the standard/regional GA collection origins in addition to existing sources. No inline scripts or broad wildcards are added. Any future advertising, cross-domain measurement, automatic events or conversion reporting requires a separately reviewed change and updated visitor-facing disclosures.

Before launch, check that the site's privacy disclosure accurately covers Google Analytics and the chosen cookie/consent treatment for the audience. Do not claim that GA is live until collection is observed.

## Validation

`pnpm --filter @workspace/p1-website check:analytics` covers initialization, route navigation, duplicate suppression, query/referrer sanitization, invalid IDs and private/nonproduction exclusions. It is included in public CI quality gates.

Google reference: https://developers.google.com/analytics/devguides/collection/ga4/views (manual pageviews and the separate Enhanced Measurement history setting).
