# Dashboard usability pass (WP5)

This branch adds role-scoped Overview priorities and global search without changing
the underlying grants or record lifecycle. It is review work; deployment is
separate and requires the Owner's release approval.

## Read contracts

- `GET /api/v1/overview/needs-you` returns at most six
  `{kind,count,href}` rows. Counts are calculated server-side and only after
  the same grant/row boundary as the destination. Clients see only their sent
  estimates. Crew are routed to My Day and receive no office queue rows.
- `GET /api/v1/search?q=` requires 2–120 trimmed characters, returns at most
  20 `{kind,id,title,subtitle,href}` rows, and is limited to 30 requests per
  authenticated user per minute on each API instance. Searches are parameterized.
  Crew search only assigned active work and properties attached to that work;
  clients search only their authorized properties and requests. Recent results
  are held in memory in the browser and rechecked against the server before
  display after reopening search.
- Both responses are private, `no-store`. Search and queue errors must not
  disclose underlying database or provider messages.

Overview metric and queue destinations use URL filters so direct links and Back
preserve the selected view. Search results use the existing record routes. My
Day keeps its device-local snapshot and pending operations in the existing
IndexedDB stores; automatic refresh/sync does not discard pending entries.

## Operational limits

- The current `GET /work-orders` list returns at most 500 rows. Overview's
  scheduled-work metric is based on that list and may undercount a larger
  installation. The Needs-you server count is independent and exact within
  its scope. A separate count contract would be needed before promising an
  exact scheduled-work total above that cap.
- The search throttle is process-local. A distributed limiter would be needed
  for a strict global quota across multiple API replicas.
- No schedule-move Undo is exposed: its inverse reschedule endpoint emits
  another notification, which conflicts with WP5's prohibition on Undo for
  notification actions. Other specified actions have no verified safe inverse
  endpoint in this branch; no misleading Undo button is shown.

## Validation

Run `node scripts/test-dashboard.mjs` for API, migration and contract tests;
`pnpm --filter @workspace/p1-dashboard typecheck` and
`pnpm --filter @workspace/p1-dashboard build` for the Dashboard; and
`pnpm exec vitest run --config vitest.dashboard.config.ts` from
`platform/p1-core` for UI tests. The new focused UI tests live in
`tests/dashboard/global-search.test.tsx` and
`tests/dashboard/overview-actions.test.tsx`.
Run `node scripts/test-wp5-browser.mjs` for a synthetic 375px Chromium
smoke of filtered navigation and Back, search, and My Day online/offline/
syncing/failure states. It writes screenshots to an OS temporary directory
and prints that path. Set `P1_CHROME_PATH` if Chromium is not installed in
Playwright's cache or the default macOS Chrome location. No real account,
customer record, or production endpoint is used.
