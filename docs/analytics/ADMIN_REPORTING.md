# P1 admin Google Analytics reporting

The CMS route `/admin/analytics` provides Overview, Acquisition, Content, Audience & technology, and Events reports. It shares the admin shell and requires the existing CRM permission on both page and API. Confirmed CRM leads and wins remain separate from Google events.

## Connection

Google project: `p1-land-management`. GA4 property: `554712298`. Public measurement ID: `G-YX69CJ1QNJ` (not a Data API property ID).

Enable Google Analytics Data API. Give `p1-analytics-reports@p1-land-management.iam.gserviceaccount.com` **Viewer** access on this Analytics property only. No Google Cloud project IAM role is required. Store its JSON credential as `P1_GA_SERVICE_ACCOUNT_JSON` on the P1 Core Railway backend only, and set `P1_GA_PROPERTY_ID=554712298`. Never put this credential in client variables, the repository, logs, or this document. Alternatively the backend accepts `P1_GA_CLIENT_ID`, `P1_GA_CLIENT_SECRET`, and `P1_GA_REFRESH_TOKEN` for a read-only OAuth grant. Service-account configuration takes precedence.

Connection provisioning and production verification are still pending. The implementation must not be described as live until a real authenticated report succeeds.

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
