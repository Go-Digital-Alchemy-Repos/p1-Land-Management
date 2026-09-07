# Better Farms Content Publishing Runbook

This runbook prepares the runtime publishing slice. Following it changes production, so execute it only during
an approved deployment window.

## Deployment order

1. Run `npm run release:readiness -- docs/pilots/better-farms/client-release-manifest.json`. Proceed only
   when it reports `ready: true`; the repository example is intentionally a draft and must fail this check.
2. Back up the Railway PostgreSQL database and verify the restore artifact.
3. Deploy Core Platform with `CLIENT_SITE_MANIFEST_PATH` pointing to the approved production manifest and
   `CLIENT_SITE_CORE_VERSION` matching the release.
4. Confirm startup created `client_site_content` and `client_site_content_revisions`; both changes are additive.
5. Verify an authenticated content editor can open
   `/admin/cms/client-sites/better-farms/fund-a-farm`, save a draft, and preview it without publishing.
6. Set Better Farms `CORE_PLATFORM_API_ORIGIN` to the Core Platform HTTPS origin and
   `VITE_CORE_PLATFORM_ADMIN_ORIGIN` to the exact Core admin origin. When public forms are enabled, set
   Better Farms `CORE_PLATFORM_FORM_PROXY_TOKEN` and the matching Core
   `CLIENT_FORM_PROXY_TOKEN` as server-only variables, then deploy Better Farms.
7. Request `/api/client-site-content/fund-a-farm/fund-a-farm-page` through Better Farms. A `404` before the
   first publish is expected; the page must render its built-in fallback.
8. Publish the approved draft, verify a `200` response and `ETag`, then reload `/fund-a-farm` and confirm the
   published content appears.
9. Send `If-None-Match` with the returned ETag and confirm `304`. Restore an earlier revision as a draft and
   confirm the public response stays unchanged until that restored draft is published.

## Rollback

- Application rollback: redeploy the previous Core and Better Farms artifacts. The new tables can remain; old
  code does not reference them.
- Content rollback: restore an earlier immutable revision in the editor, review its preview, and publish it.
- API outage: remove or correct `CORE_PLATFORM_API_ORIGIN`; Better Farms continues rendering built-in content.
- Do not drop the content tables during an application rollback. Retain their history for recovery.
