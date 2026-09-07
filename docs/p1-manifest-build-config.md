# P1 CMS manifest build configuration

The public website and copied Core use the same configuration helper, `platform/p1-core/script/p1-manifest-config.mjs`. It changes only deployment origins and source revision. The public generator writes matching website/Core manifest copies; the standalone Core Docker build applies the helper to its packaged manifest before building.

## Build inputs — set identically on both services

| Build argument | Value |
|---|---|
| `P1_PUBLIC_ORIGIN` | External HTTPS gateway origin, e.g. `https://p1-staging.up.railway.app`. Defaults to `https://www.p1landmanagement.com`. |
| `P1_ADMIN_ORIGIN` | Same external gateway origin. Defaults to `P1_PUBLIC_ORIGIN`; a different origin is rejected. Do not append `/admin`. |
| `P1_SOURCE_REVISION` | Full 40-character Git commit for the source being built. Explicit value takes precedence. |
| `RAILWAY_GIT_COMMIT_SHA` | Source revision fallback when `P1_SOURCE_REVISION` is absent. Ensure Railway supplies it as a Docker build argument. |

Both Dockerfiles declare and forward these arguments in the build stage. For CLI/local-directory Railway builds without Git metadata, explicitly supply `P1_SOURCE_REVISION`; do not assume an automatic Git commit variable exists. A missing/invalid revision fails the build rather than recording the old audit commit. Local builds inside Git can fall back to `git rev-parse HEAD`.

Origins must be bare HTTPS origins. Credentials, non-root paths, query strings, fragments, whitespace, backslashes, encoded host strings and mismatched public/admin origins are rejected. A trailing slash and default HTTPS port are normalized. `/admin`, `/api`, and `same-origin-proxy` remain fixed architecture settings.

For manual Docker builds, supply `--build-arg P1_PUBLIC_ORIGIN=<external-origin> --build-arg P1_ADMIN_ORIGIN=<same-origin> --build-arg P1_SOURCE_REVISION=<full-commit>` to each image build. Public image uses repository-root context and `Dockerfile`; Core image uses `platform/p1-core` context and its `Dockerfile`.

## Runtime alignment

Build arguments do not replace runtime settings. On the Core staging service set `APP_URL`, `PUBLIC_SITE_ORIGIN`, `CORE_PLATFORM_ADMIN_ORIGIN`, and allowed `TRUSTED_ORIGINS` consistently with the external gateway origin. Keep `CLIENT_SITE_MANIFEST_PATH` pointing at the packaged manifest (`/app/dist/config/p1-client-site-manifest.json` in the Core image). On the public service set `P1_CORE_ORIGIN` to the dedicated Core private-network endpoint. Database, setup, session and storage credentials remain separate runtime secrets and are never build arguments.

Use the same Git commit and origins when building both images. The helper does not regenerate editable content inside the Core-only build; changes to page fields require the normal public generator and matching reviewed Core manifest before deployment. An origin change requires rebuilding the images because the manifest is packaged at build time.

The root Docker context includes exactly the helper from the Core tree through narrowly scoped `.dockerignore` exceptions; Core sources, dependency directories and environment files remain excluded from the public image context.

## Verification

Run `node --test platform/p1-core/script/p1-manifest-config.test.mjs` for origin validation, revision handling, transformation preservation, and Core CLI/public helper parity. The configuration task does not modify generated workspace manifests. Check the packaged public and Core manifests have equal `origins` and `client.source.revision` before staging release.
