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

## Authorized completion of the missing staging publications

The Orchestrator approved initial publication after the gap above was verified. A fresh scoped Core staging PostgreSQL custom dump was captured before mutations:191247 bytes, SHA-256 `9d2d442aa6fa61438eb4b20d7ea974088ba3a074c77c68de91a4cb33d4eb490d`, captured `2026-09-07T10:30:54.870018Z`, private local file `/tmp/p1-core-before-initial-publication.dump`. PostgreSQL18 `pg_restore --list` read its catalog successfully. This is backup capture/catalog validation, not a new restore rehearsal; prior staging restore evidence remains separate.

Frozen proposal SHA-256 `f29541c6ffa50d5b3aa2640af53bb763a02aa0f478c7075ad6a1959e31a389c5`; exact36-component inventory SHA-256 `38a4beb3f575bd96d45fccc30a9cd4b209dc7f7309d4298db5b3e55332ce61f9`. Files: `/tmp/p1-cms-initial-publication-proposal.md` and `/tmp/p1-core-1869384-publication-inventory.json`.

From10:31:46–10:32:20Z, the retained authenticated CMS API initialized exactly28 previously unpublished components. Each was re-read and required draftRevision0, null publication and exact approved default hash, then saved with expectedRevision0 and published using its returned revision. Each ended at publishedRevision2. All mutations completed without conflict or blind retry. The eight existing publications were excluded and retained their exact revisions/content hashes.

Post-initialization verification passed:

- All36 anonymous component endpoints return200 with expected content and publication revisions.
- All35 crawler HTML documents are byte-identical after removing only the serialized hydration-state script; their page publication revisions match Core, and shared globalRevision is2.
- All35 sitemap lastmod dates exactly match their page publication timestamps.
- No private preview markers, aggregateRating or ratingValue appeared.
- Existing sparse published records retain the supported default-field merge; no existing record was rewritten to fill those fields.
- Representative revision history records show actor-attributed draft-save1 and publish2. A subsequent optional bulk history read hit the existing429 rate limit; no limits were weakened and no mutations were retried.

Execution receipts: `/tmp/p1-cms-initial-publication-execution.json`. Final36-component/35-page evidence: `/tmp/p1-cms-initial-publication-verification.json`; sitemap: `/tmp/p1-cms-initial-publication-sitemap.xml`. The confirmed missing-publication gap is now closed in staging. Production initialization and broader full-editor acceptance remain separate gates. No production publication or deployment was performed.
