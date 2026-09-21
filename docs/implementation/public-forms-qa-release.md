# Public forms and performance release — September 21, 2026

The release adds public `/forms/:slug` pages using the existing form API and renderer. Required fields are checked before final submission. Route-generation guards prevent an old request from changing a newly opened form. No database migrations, recipient changes, or form-effect contract changes are included.

Image delivery metadata is projected at build time, location pages bundle only their own canonical record, and the homepage omits a contextual-links dependency that renders no homepage content. Projection checks run in prebuild. Existing image variants, CMS field identities, visible copy, and layouts are preserved. Form pages are no-index and excluded from the sitemap.

## Reviewed validation

- Root independently reran seven real-component/router navigation and idempotency tests and nine verification tests.
- Integrated Core typecheck and five required-field/host tests passed.
- Integrated public production build and 98 HTTP/runtime tests passed.
- Public QA passed all 54 static routes, CMS overrides, metadata, links, image consistency, and the unchanged 150 KiB initial-JavaScript budget (largest: Contact, 149.5 KiB gzip).
- Projection checks preserve all 81 image records and 19 generated location records.
- Local browser mock evidence covers required-field rejection, retained entries after failure, retry receipt, and a fresh second request. Mock/component evidence is not production delivery evidence.

## Release and rollback

The candidate integrates current main `a557e8bddcb3263bbb44a905cd0206e15abfef01`, preserving its Dashboard navigation and onboarding retirement. Prior healthy Railway deployments: website `54f31a2f-a61a-41a4-adf6-5b153a8b6a06`, Dashboard `9e58b103-251f-4804-a116-da0197b82b1d`, Core `57250a61-7aab-42d0-a6e3-8c14f4860f76`. Those exact source revisions remain in Git; provider image retention is time limited.

Rollback uses reviewed revert commits restoring the public/form-renderer changes, retaining unrelated subsequent work. This slice needs no data restore or reverse migration. Never reset or force-push main. Deployment success and fresh live-route verification must be recorded separately; local passes do not establish deployment.

## Open acceptance

The one labeled production inquiry awaits the browser tool's action-time Owner confirmation. Existing notification jobs establish transport acceptance, not recipient inbox delivery. Search Console's configured Domain property lacks access for the deployment's as-yet-unidentified Google principal. Indexing remains deferred until the remaining release and QA gates are complete. Broader consolidation and recovery limits remain in `consolidation-acceptance.md`.
