# Production Reconciliation

Date: 2026-06-12

## Release Baseline

- Production was healthy on Railway at `c6434d5` (`Add Affirm to system integrations`).
- `origin/main` was reconciled forward to include the production commit and UI polish commit `ffa2623` (`Polish developer nav and portfolio cards`).
- Railway production deployment for `ffa2623` reached `SUCCESS`.
- Live health check passed: `GET /api/health` returned `200`.

## Pre-Release Gates

Before the `ffa2623` release:

- `npm run check` passed.
- `npm run lint -- --quiet` passed.
- `npm test` passed with 346 tests.
- `npm run build` passed with non-blocking build warnings for Browserslist data age, PostCSS `from`, and Vite chunk-size notice.
- `npm run budget` passed.

## Stabilization Cleanup Scope

- Public and demo content was neutralized away from legacy domain-specific positioning.
- Obsolete pasted prompt transcripts were removed from `attached_assets`; referenced image/logo assets remain.
- Compatibility-sensitive directory identifiers remain in place for now and are covered by the compatibility neutralization plan.
- Branch cleanup was conservative: merged local branches were deleted, while `codex/collapsible-admin-nav` and `codex/live-sync-main` remain for human review.
