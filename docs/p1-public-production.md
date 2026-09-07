# Public website production preparation

The full CMS gateway migration has not been released. A focused [favicon hotfix](p1-favicon-hotfix.md) is live as deployment `fd023a7a-73ec-4e81-863a-5ce86199d0f1` (patch `79ac680` over the captured original production runtime). It preserves existing page content and Vite preview behavior. The sections below describe the separate full gateway candidate and preparation, not acceptance of that migration.

## Reviewed candidate

Source `03ba5b800937e32140170e68641d15a7326e786d`, production origins `https://www.p1landmanagement.com`. Root independently verified all472 packaged hashes, archive and manifest after the author froze the final artifact.

- Runtime `/tmp/p1-production-runtime-03ba5b8-dvhnu141`.
- Archive28,906,249 bytes, SHA256 `031542881e7944d49e2f35c51b3860f81b926f9905d1da7c2ac6187386f993e3`.
- ManifestSHA256 `f6f69168506f08d1187b0ee6893d082c430bf096fe7d9dc3e091bceb68532d72`.
- Metadata `/tmp/p1-production-03ba5b8-candidate.json` and embedded validation logs.

LinuxAMD64 build, TypeScript,35-route content/SEO checks,50 image budgets, five form tests and21 server tests passed. Packaged local smoke verified UID1000, indexable production pages, canonical/variant redirects and404s. These are local candidate checks; live production gateway, cache and owner acceptance remain required.

## Prepared runtime variables

On September7 the Orchestrator set seven reviewed values on production public service `72d588fd-c963-4e0f-944b-1cb8c5c2fa19` with deployment skipped and verified their readback. Project `e83f79dd-d901-4ab1-836b-bdf272b58dc2`, environment `6126e9ca-b071-4c41-b7c0-aa945fa37067`.

`PORT=8080`, `NODE_ENV=production`, `P1_CORE_ORIGIN=http://p1-core.railway.internal:5000`, `P1_CONTENT_CACHE_DIR=/app/data/cms`, both P1 public/admin origins `https://www.p1landmanagement.com`, and `P1_SOURCE_REVISION=03ba5b800937e32140170e68641d15a7326e786d`. Existing unrelated configuration was retained. No credentials are required in the public artifact.

The next deployment will activate these values. Do not treat preparation as a live gateway. Before upload, select Dockerfile builder/root Dockerfile and `/healthz`, provision a dedicated production `/app/data` volume, and verify mounted cache ownership/writes as UID1000. Existing apex/www domains already target8080. Preserve region/replicas and the previous public deployment for rollback. Shared CMS identity and authorized owner access remain release gates.

After release, verify private Core routing, same-origin preview, published HTML/hydration parity, publication refresh and last-valid cache recovery, all public routes/redirects/metadata, mobile inquiry flow and exact deployed source. Do not roll back or erase durable Core receipts when rolling back public code. The separate production backend synthetic receipt proves delivery processing, not public-form or owner acceptance.
