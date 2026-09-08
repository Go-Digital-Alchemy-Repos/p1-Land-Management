# Public website production record

The P1 public CMS gateway is live. This document retains the pre-release evidence below and records the subsequent exact-source releases; it is not evidence that the broader project, CMS initialization, shared identity, or owner acceptance is complete.

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

The initial gateway release subsequently activated the reviewed runtime configuration. Later exact-source artifacts embed their reviewed source revision in the packaged client manifest, while the existing service variables, private-network origin, cache volume, domains, region, and replicas remain in place. Shared CMS identity and authorized owner access remain release gates.

After release, verify private Core routing, same-origin preview, published HTML/hydration parity, publication refresh and last-valid cache recovery, all public routes/redirects/metadata, mobile inquiry flow and exact deployed source. Do not roll back or erase durable Core receipts when rolling back public code. The separate production backend synthetic receipt proves delivery processing, not public-form or owner acceptance.

## Production CMS gateway release — c7b5186

On September 7, the full P1 public gateway was deployed as Railway deployment `1b981fca-666a-4956-814d-641dab76c8f1` to production service `72d588fd-c963-4e0f-944b-1cb8c5c2fa19`. It used a bounded prebuilt public artifact from committed source `c7b51864b267a167af64f8d78b288fab18d95b00`; the release archive manifest was SHA-256 `cccc2fb90163ec92b335e6efb6014152fb2fe96a5e300cc6761c8ad13b8e0b6d` and its packaged client manifest was SHA-256 `dddd1df82971a7322b2efcdb18b87b273e4c069f90d8490044625464de668f6f`. Railway reported image digest `sha256:dc6284fbdc010e2b14a05d83c7fc96713d39f68f73b4f0bac617fa4d93d57239` and a successful deployment.

Before release, a dedicated production cache volume `fdf81937-89b9-43c8-9209-1d6a4320df49` was mounted at `/app/data`. Railway automatically redeployed the previous runtime as `87786151-f259-4eed-ae40-d9a362550a1b` to establish that mount; it reached SUCCESS and remains the immediate rollback candidate. The new artifact runs as UID1000 and its cache directory is writable by that user.

Live production checks passed: `/healthz` is `200` with `no-store`; `/`, `/commercial`, and `/service-areas/york-county-sc` return crawler-visible HTML; `/favicon.ico` is `200 image/x-icon`; an unknown route returns a genuine `404` with `X-Robots-Tag: noindex`; apex and `.html` variants redirect canonically while retaining query strings; `/sitemap.xml` has 35 URL elements; and hashed assets are immutable. `/api/health/ready` returns Core readiness through the same-origin gateway, while `/admin` redirects to and serves the Core admin shell. The public Content Security Policy, HSTS, referrer and permissions policies are present. The production commercial page includes the approved exterior-site-management positioning, and public HTML contains no dashboard bundle.

This release activates the public CMS gateway and preserves the existing public content fallback while production CMS records are imported. It does **not** establish a P1 administrator account, publish unverified proof, enable shared Core/Dashboard identity, or complete owner acceptance, physical-device testing, or external-provider activation. Those gates remain required before project closeout.

## Commercial copy correction — a8e608a

On September 7, Railway deployment `1489bff6-272b-42ad-96d3-231b34e3a421` replaced the public artifact on service `72d588fd-c963-4e0f-944b-1cb8c5c2fa19` with a bounded build from reviewed source `a8e608ae08e1f93b72b6efa98d26c8f9fd50cabf`. The package Dockerfile SHA-256 was `56f1f4bbe0b01169f2667b17c69c5afd7875df9ce010e758acf939b2461a294e`; the packaged client-site manifest SHA-256 was `ac8e1c1ec3f609955385ff7b22c39e6a2971cf5a255d966f15d1d1f239229e5d`.

The release removes unsupported commercial licensing and insurance claims. The page now directs prospective clients to confirm documentation and procurement requirements during qualification. Its generated CMS manifest preserves the established field identifiers for the revised copy, so existing stored edits continue to apply. The public service, Core service, database, and durable cache volume retain their existing boundaries.

Railway reported SUCCESS. Live checks passed for the commercial service page (`200`, corrected copy present and unsupported credential claim absent), the commercial landing page (`200`), `/healthz` (`200`, `no-store`), `/admin` proxy redirect, and an unknown public path (`404`, `X-Robots-Tag: noindex`). This remains a public-content correction; it does not change the outstanding administrator, shared-identity, CMS-import, or owner-acceptance gates above.

## WebP-only public media and homepage copy — eff1e04

On September 7, Railway deployment `bbaa3cad-9488-433a-93d8-fa0f3b03fda2` reached SUCCESS on the production public service. It used reviewed source `eff1e04ea1569e7163c9b9d8b0a1b1ab7e2ce962` and image digest `sha256:1b5625cc6c271756b91eaea372f1c798fe7c7957bae75147e04236649e821ff7`. The bounded artifact Dockerfile SHA-256 was `56f1f4bbe0b01169f2667b17c69c5afd7875df9ce010e758acf939b2461a294e`; its client-site manifest SHA-256 was `4a96a1d246006c639aa866744332ebbfd13d2532241da1a5072566264e1a0eb6`.

The image pipeline now emits responsive WebP variants only and no longer packages unused AVIF variants. Original local PNG/JPEG masters remain solely as source material for the reproducible optimizer; vector logo/favicon assets and the JPEG social-share compatibility image remain outside rendered page imagery. The build fails if rendered public raster images or responsive candidates regress to PNG, JPEG, or AVIF. Image budgets remain within their limits, and the highest initial public JavaScript route is 131.7 KiB gzip.

Live verification fetched all 35 sitemap routes: every rendered raster image URL is WebP, the homepage contains the corrected singular headline “Your first impression start at the curb,” and `/healthz` returns success. This deployment does not change CMS content, Core data, authentication, or outstanding owner-acceptance gates.

## About-page claim qualification — f936fbb

On September 7, Railway deployment `9bf162b1-1dce-44a8-9403-9832ce1f93a6` reached SUCCESS on the production public service from reviewed source `f936fbb9b53bf43b022cc9d14fd9d5cd90acafcc`; Railway reported image digest `sha256:2e123d8dc7e9bb15ba8799e578abf9189687407a9faffe19fdea13ba131ff768`. The bounded artifact retained Dockerfile SHA-256 `56f1f4bbe0b01169f2667b17c69c5afd7875df9ce010e758acf939b2461a294e` and used client-site manifest SHA-256 `5eea0cad669b74e19856d3a312ad9be6c1ea06b0af9739171844061cb0492cf3`.

The About page now describes coordinating the agreed scope with one accountable team rather than promising that customers will never need another provider. It also says assessment availability is confirmed during review. Live `/about` and `/healthz` verification passed, including absence of the replaced broad claims. No CMS records, Core data, authentication, or provider configuration changed.

## Heading accessibility correction — b9681fd

On September 7, exact-source Railway deployment `63c1bf45-2702-4565-860b-259f78a2b4ad` reached SUCCESS from reviewed source `b9681fd8c093465c14e7fdd518183ddaa287d6c1`. It corrects Contact FAQ headings and adds section headings for Services and Gallery card groups without changing their visual presentation. It also replaces the unsupported Services tagline “One contractor. No gaps.” with scope-qualified language.

The public build now verifies the skip link, main landmark, heading order, and image alternatives for every route. Live verification fetched all 35 sitemap routes and passed those landmark and heading checks. An immediately preceding deployment `39f2b714-5935-432d-ad71-8b540adaf0c2` had an abbreviated source-provenance value in its packaged metadata; Railway removed it when the full-hash artifact was uploaded. It introduced no distinct public behavior and is not a rollback candidate. No CMS records, Core data, authentication, or provider configuration changed.

## Gateway malformed-request handling — b6e35dd

On September 7, exact-source Railway deployment `bd566935-a610-40e4-ba22-41dc9ae9a835` reached SUCCESS from reviewed source `b6e35ddb8072805d322a0452dd4d2684aac079b6`, with image digest `sha256:065b94a624ab331d0ada78cc6f7dfe949d86b35aa2df041ae9cb1c994b007993`.

The public gateway now rejects invalid percent-encoded request paths with `400 Bad request` before route normalization or any upstream proxy attempt. Its regression test proves absolute targets, network-path targets, and malformed encodings cannot forward cookies or authorization headers. The public server suite passed 22 tests; TypeScript, the production build, and all 35 route SSR/SEO/CMS checks passed before packaging. Live `/healthz` and homepage checks passed, and malformed UTF-8 path variants return the intended `400` from the deployed gateway. No CMS records, Core data, authentication, or provider configuration changed.

## Operational-route indexing exclusion — de99078

On September 7, exact-source Railway deployment `99180447-8b47-4f22-aab1-8a1e96de282a` reached SUCCESS on public service `72d588fd-c963-4e0f-944b-1cb8c5c2fa19` from reviewed source `de9907859b9d021b8843816cec17c1831abf3ed9`, with image digest `sha256:938e53a84ad6b57822334aa4175b48cc494e5a82e662ddb28ac8820b2159e563`.

The public proxy now overrides any upstream indexing policy for `/admin`, `/api`, `/uploads`, and `/r2` with `X-Robots-Tag: noindex, nofollow`. This keeps the public sitemap and crawl surface confined to visitor-facing pages while retaining normal dashboard and API behavior. The gateway test suite passed all 22 checks, including the new proxy assertions, and 35 public routes passed SSR, metadata, CMS, link, proof, JSON-LD, and React-warning QA. Live `/admin`, `/api/setup/status`, and `/api/health/ready` responses all returned the expected exclusion header; the homepage and its corrected singular headline remained available. No CMS records, Core data, authentication, or provider configuration changed.

## Site-service claim qualification — 8ecf03b

On September 7, exact-source Railway deployment `bb12dcb9-27dd-46ef-8f8f-7995f75bc09a` reached SUCCESS on public service `72d588fd-c963-4e0f-944b-1cb8c5c2fa19` from committed source `8ecf03bf14a82df18b6e2790acf554d4f42d95f9`, with image digest `sha256:b4b6ec427b3d50dcdd8e49192f17e015221d5ede1bf4e27e7caed61b8190e2f1`.

The homepage and service pages now describe drainage, grading and turf work in terms of confirmed scope and explicitly identify engineering, permitting and specialist responsibilities for separate confirmation where applicable. The corresponding P1 CMS client-site manifests were regenerated so those qualified defaults remain editable without invalidating stored field mappings. The production build, TypeScript check, 35-route public QA suite and 22 gateway/server tests passed before release. Live checks returned `200` for the home page, the three affected service pages and `/healthz`; the homepage continues to render “Your first impression start at the curb.” No CMS records, Core data, authentication or provider configuration changed.

## Capability and compliance claim qualification — 9e95d39

On September 7, exact-source Railway deployment `e2117a33-6b5e-4c23-991d-072183bdc8f1` reached SUCCESS on public service `72d588fd-c963-4e0f-944b-1cb8c5c2fa19` from committed source `9e95d395a858a0d2eaf1bb67347e6615a5846ccc`, with image digest `sha256:2e606c8f5f50a0f51c38cf1268e6014cdda64d89f5cb17adeb10d6748aeb0ca9`.

The public service, location and reference content now distinguishes planned work from verified commitments. Drainage, grading, stormwater, compliance, equipment and storm-response copy directs visitors to confirm property-specific scope, approvals, availability and specialist responsibilities during qualification. The fixed public frame remains the homepage-aligned 1,240px responsive `site-shell`. TypeScript, the production build, the 35-route public QA suite, performance budget and 22 gateway/server tests passed before release. Live verification returned `200` for Drainage, Grading, Industrial & Agricultural, Tree Services, Gastonia and `/healthz`, and confirmed the replaced unsupported claims are absent. No CMS records, Core data, authentication or provider configuration changed.

## Paired Core/public provenance alignment — 7a116c8

On September 7, public deployment `efb2184a-a47a-4102-9619-911ecbd45042` reached SUCCESS on service `72d588fd-c963-4e0f-944b-1cb8c5c2fa19` from committed source `7a116c8bc67141fbeaa7184f098578ab789d81cf`, with image digest `sha256:fdaa53f202b982aa2f0eafdcd2041cba34095ed50ad2cb73ae394b73c35ea349`. Its paired Core deployment is recorded in `p1-core-production.md`.

This bounded redeploy aligns the public gateway and Core manifest provenance after the Core federation lint correction. Live verification passed for the public homepage, `/healthz`, Core readiness and protected setup status. The gateway retained its CSP, HSTS and `nosniff` headers; `/api` responses remained `noindex`. All excluded module routes—eCommerce, Directory, Membership, Portfolio, Events and Careers—returned `404`. No customer inquiry, CMS content record, administrator, provider setting or public design changed.
