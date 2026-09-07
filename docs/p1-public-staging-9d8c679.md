# Public website staging cache release — 9d8c679

Public staging deployment `0c3986a5-32bd-4fee-8218-ef7c665d581a` reached terminal SUCCESS at `2026-09-07T17:00:50.033Z`, source `9d8c679799dccfdc253fc073650d19f06b1c373b`. Only public service `2b3f49c6-af90-41af-b5f7-6cfe9e0e0908`, environment `12ee0f33-fbfb-49b1-8602-f3f8b162670b`, project `e83f79dd-d901-4ab1-836b-bdf272b58dc2` was deployed. No Core, dashboard, authentication, native or production deployment occurred.

## Exact artifact

`/tmp/p1-runtime-9d8c679-nhagpa0z` contains464 runtime files. Archive `/tmp/p1-runtime-9d8c679-nhagpa0z.tar.gz` is28783468 bytes, SHA-256 `55dd61b9f6af2e478e58536a49accef76c65287a9b000210f9133498fefe3768`. `/tmp/p1-public-9d8c679-candidate.json` records all source/runtime hashes and the build recipe/base identity.

An isolated archive verified500 committed files comprising the public website and its existing manifest build helper. The existing approved LinuxAMD64 builder supplied unchanged dependencies; no dependency install or upgrade occurred. Backend/dashboard source was not copied into the runtime. Compared with03ba5b8, all browser bundles, images and rendered page files are byte-identical. Only server/content.mjs, its test, manifest source revision and Docker revision label differ; eight old validation-only files were omitted from the upload.

## Checks and behavior

LinuxAMD64 typecheck/build,35-route SSR/metadata/CMS overrides/internal links/proof/JSON-LD QA, image budgets, five commercial-form tests and11 content-cache tests passed. Largest initial public JavaScript remains140.4KiB gzip. All22 server tests passed; production-origin test fixtures were temporarily configured inside a disposable container and restored, while the frozen artifact retained staging origins.

The packaged artifact passed35 local routes/noindex and UID1000 using the previously verified pinned Node22 base with the artifact mounted read-only. A separate new local runtime-image build stalled at DockerHub base metadata lookup and was stopped; it is not claimed successful. Railway subsequently built and deployed the exact runtime artifact successfully.

Live verification confirmed exact9d8c679 manifest, reviewed cache code SHA-256 `7d18ad8a687aacca25d266384d2c4e97dd86d7aab845a263d0b2a5193233fab2`,225000ms default TTL for36components, PID1 UID1000 and retained cache directory. All35 public pages returned200/noindex and all35 CMS-backed snapshots retained their exact pre-deployment hashes/revisions, including shared globalRevision2. Health/readiness and admin proxy returned200; an unknown route returned404. Main/commercial browser assets matched frozen hashes and retained immutable caching.

A separate synthetic local HTTP test exercised the actual packaged gateway: a repeated visit hit cache; a successful proxied publish invalidated it immediately, refreshing both page/global revision1→2 without waiting225seconds. No staging CMS save/publication was performed for this test. Existing single-process budget evidence establishes144 routine Core reads per15minutes plus explicit publication reads; this is not a multi-replica quota guarantee.

Only the public source-revision marker changed in variables. Digest comparison verified all other public variables unchanged. Existing PORT8080, staging origins, private Core proxy, one replica and `/app/data` cache volume were preserved. Staging authentication gates remain unchanged.

Evidence: `/tmp/p1-public-9d8c679-{build,server-tests}.log`, `/tmp/p1-public-9d8c679-runtime-smoke.json`, `/tmp/p1-public-9d8c679-runtime-live.json`, `/tmp/p1-public-9d8c679-live.json`, `/tmp/p1-public-9d8c679-content-before.json`, `/tmp/p1-public-9d8c679-publish-proxy-evidence.json`. Previous compatible public staging deployment `09298a23-590a-4e6d-9418-8d443c6de3f2` is the rollback candidate; preserve CMS data and cache volume. Production public release remains a separate authorization/gate.
