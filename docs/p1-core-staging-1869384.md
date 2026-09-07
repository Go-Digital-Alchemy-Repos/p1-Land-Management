# P1 Core staging release — 1869384

Scoped TLS/regression release passed staging verification on September 7, 2026. This is not full CMS import or production acceptance.

- Source: `18693848dc592739c6e6c834f4f4dd4c91605074`; all 904 Core Git blobs verified. Only the two TLS files and two admin test fixtures differ from prior Core `bc3f414`.
- Upload: `/tmp/p1-core-1869384-upload-ueqrn0pz`; archive SHA-256 `83f66cf55bcdbfe694efde12349a0ef939c5af58ff73b60c98d58f08b020eab6`. File hashes and source metadata: `/tmp/p1-core-1869384-context.json`.
- Staging project `e83f79dd-d901-4ab1-836b-bdf272b58dc2`, environment `12ee0f33-fbfb-49b1-8602-f3f8b162670b`, Core service `faa1114f-678e-414e-b227-e2f1ecac7755`.
- Deployment `155bea13-4d3f-44ae-ab8d-59e3862ab9df` reached terminal SUCCESS at `2026-09-07T10:25:31.304Z`. Previous compatible staging deployment: `1bbbe2b6-16c3-47b9-a47c-2d5b164998b0`.
- Only `P1_SOURCE_REVISION` was updated, with deployment suppressed before exact-source upload. Existing origins, private database mode, port5000, providers, secrets and data were preserved. No CMS saves/publications, new inquiries, production changes or original Core changes occurred.

## Validation

Fresh isolated committed source: full Core suite650 passed, zero failed,26 pre-existing environment-gated skips; typecheck and native production build passed. Railway's LinuxAMD64 Docker typecheck/build also passed. A separate local AMD64 emulation build passed typecheck/client build but failed in esbuild's Go runtime with `lfstack.push invalid packing`; this local run is not claimed successful and did not alter the deployed source.

Read-only runtime SSH verified full source revision, same staging public/admin origin, PID1 UID1000, included IPv6 identity check and exact deployment ID. Gateway checks passed readiness200, admin/login200, authenticated synthetic CMS list200, anonymous CMS/private-proof401 and excluded APIs404. All35 public routes returned200/noindex; their content snapshots were unchanged. All36 checked CMS component endpoint status/revision/content hashes were unchanged.

Evidence: `/tmp/p1-core-1869384-{full,type,build,docker}.log`, `/tmp/p1-core-1869384-runtime-verified.log`, `/tmp/p1-core-1869384-live.json`, and before-state JSON files. No full database integration, new lead delivery or browser-editing acceptance is claimed for this TLS release.

## Confirmed pre-existing CMS completion gap

Authenticated CMS inventory defines36 editable components across35 routes. Eight have published snapshots. The other27 page components plus shared `home/site-chrome` return draftRevision0 and publishedRevision null. Their public CMS endpoint404 means no stored publication; the website currently renders matching manifest defaults at revision0. Thus unchanged404 responses establish parity only, not completed content import.

The exact Core defaults match the currently deployed public03ba5b8 manifest defaults for all36 components. `/tmp/p1-core-1869384-publication-inventory.json` records exact keys, revisions, field counts and both default hashes. Initial publication of the28 eligible components remains a separate reviewed staging action. Existing eight publications must not be overwritten. Source/config migration of the retained railway.toml is also deferred; Railway reports its deprecation deadline as December1,2026.
