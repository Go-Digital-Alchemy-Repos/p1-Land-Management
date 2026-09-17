# P1 admin Google Analytics reporting

The CMS route `/admin/analytics` provides Overview, Acquisition, Content, Audience & technology, and Events reports. It shares the admin shell and requires the existing CRM permission on both page and API. Confirmed CRM leads and wins remain separate from Google events.

## Connection

Google project: `p1-land-management`. GA4 property: `554712298`. Public measurement ID: `G-YX69CJ1QNJ` (not a Data API property ID).

Enable Google Analytics Data API. Give `p1-analytics-reports@p1-land-management.iam.gserviceaccount.com` **Viewer** access on this Analytics property only. No Google Cloud project IAM role is required. Store its JSON credential as `P1_GA_SERVICE_ACCOUNT_JSON` on the P1 Core Railway backend only, and set `P1_GA_PROPERTY_ID=554712298`. Never put this credential in client variables, the repository, logs, or this document. Alternatively the backend accepts `P1_GA_CLIENT_ID`, `P1_GA_CLIENT_SECRET`, and `P1_GA_REFRESH_TOKEN` for a read-only OAuth grant. Service-account configuration takes precedence.

Google organization policy `iam.managed.disableServiceAccountKeyCreation` blocked key creation; no key was issued and the policy was not changed. The active connection path is an internal OAuth app named P1 Website Reports, using the owner’s read-only grant. App setup is paused at acceptance of the Google API Services User Data Policy. The service-account instructions above remain an alternative only where existing policy permits. Connection provisioning and production verification are still pending. The implementation must not be described as live until a real authenticated report succeeds.

## API and behavior

- `GET /api/p1/google-analytics?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`: up to 93 days, with an equally long preceding comparison period.
- `GET /api/p1/google-analytics/realtime`: active users in the last 30 minutes, including country and device reports.
- Reports are fetched server-side with `analytics.readonly`. Historical cache is five minutes; realtime cache is 30 seconds. Responses are private/no-store. Refresh may reuse the server cache.
- Fixed reports, bounded concurrency, timeouts, and row limits protect API quotas. No arbitrary property or metric query is exposed to callers.
- GA totals are authoritative; distinct users must not be summed across dates or segments. The interface exposes thresholding, sampling, omitted rows, timezone, data freshness, empty results, and provider failures.
- Presets end on yesterday in UTC. Report dates are interpreted by Google in the property timezone; custom dates are available. Recent data may be incomplete.
- Search, sorting, pagination and CSV export operate on loaded rows. Reports capped at 10,000 rows disclose truncation. CSV strings are escaped against spreadsheet formula execution.
- Demographics, search terms, paid-media costs, revenue and CRM attribution are not invented. They require separate linked sources or event setup.

## Verification and release

Run TypeScript checking, the Google Analytics service/route tests, frontend format/sidebar tests, and the Core production build. Browser-check the admin shell, chart display, date controls, report tabs, table search/sort, and empty/error states. Local QA fixtures are not production data and must never ship as a fallback.

After deploying Core, verify unauthenticated APIs reject access, a permitted admin receives real reports for property 554712298, and no credential appears in browser responses or bundles. Check all fixed report combinations against the live API. The public website proxy already serves the Core `/api` namespace; no browser-to-Google Data API request is needed.

No database migration is introduced. Rollback restores the previous Core deployment; remove the dedicated server credential and revoke its Google grant if retiring the integration. Existing public GA tagging remains independent. Record deployment revision and verification evidence before closeout.

## Search Console tab

A separate source tab under Analytics uses `/api/p1/google-analytics/search-console` with the same CRM authorization and date controls. It operates independently of GA4 availability. Reports include provider totals and prior-period totals, daily trends, search queries, pages, countries and devices. Search type is Web; only finalized data is requested. Google uses Pacific time for Search Console dates. These clicks are not interchangeable with GA sessions.

Set `P1_GSC_SITE_URL` on Core to the exact authorized property. The signed-in owner's existing property was observed as `https://p1landmanagement.com/`; this is an apex URL-prefix property, not proof of coverage for the canonical www host. Confirm the intended property coverage before interpreting results; a verified domain property would include both hosts. Accepted configuration values are that apex property, `https://www.p1landmanagement.com/`, or `sc-domain:p1landmanagement.com`.

Enable Search Console API in the P1 Google project and grant the dedicated reporting service account Restricted property access for reporting, subject to API verification. The token requests only `webmasters.readonly`. It shares the existing server-side credential but uses a separate scoped token. OAuth alternatives require consent including this scope; an existing Analytics-only refresh token does not automatically gain access. No Google property ownership or indexing mutations are requested.

The integration is implemented but not connected or deployed yet. The owner authorized connecting live reports; OAuth policy acceptance and credential provisioning remain pending. Do not label local fixture metrics as live results. Each breakdown is limited to 10,000 top rows and exposes truncation. Google may omit anonymized queries and other rows; exports are not an exhaustive search log. Totals are never computed by summing breakdowns, and missing dates are not fabricated as zero. The API does not provide the full Search Console indexing-coverage or Core Web Vitals reports through this endpoint.

Reference: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
