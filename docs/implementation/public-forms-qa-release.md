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

All three Railway services reported SUCCESS for `29b292ad16972c1f05b1635e5a33b4e444cb3eab`. Fresh production browser checks confirmed the commercial form's nine service choices, `noindex, follow`, no horizontal overflow, and the preserved homepage hero and service cards. Root submitted exactly one Owner-authorized, clearly labeled internal QA inquiry (`P1-QA-20260921-29b292ad`); the public form displayed its successful receipt. Delivery-job and native Sales correlation remain separate checks. No additional request, replay, or resend was performed.

Existing notification jobs establish transport acceptance, not recipient inbox delivery. Search Console's configured Domain property lacks access for the deployment's as-yet-unidentified Google principal. Indexing remains deferred until the remaining release and QA gates are complete. Broader consolidation and recovery limits remain in `consolidation-acceptance.md`.

## Controlled delivery result

Read-only production SQL correlated QA reference `P1-QA-20260921-29b292ad` with
exactly one submission (`bc1e8cb8-1e2e-4610-b166-c4f1f5ffc277`, 08:57:10Z),
one Core CRM record, one Dashboard receipt, one native Sales lead
(`a27953a8-50e3-4b04-8d9b-fd211ea06145`) and one intake audit event. Root also
confirmed the labeled inquiry in the live Sales UI, New and Unassigned.

Four unique effect jobs completed on their first attempt: one Dashboard handoff,
one Core CRM intake and two admin notifications. No duplicate submission, job
key, CRM record, receipt, native lead or audit event was found. No replay, resend,
retry or deletion was performed. This is persistence and notification transport
evidence; recipient inbox confirmation remains outstanding.

## Follow-up estimate choice repair

Live QA also found empty Services choices on `/forms/p1-estimate`. Scoped commit
`0377fcfab9912fdd945bb283ad4044e3ed09dae1` was independently reviewed, passed
12 system-form tests and Core type checking, and was normal-pushed to main.
All three Railway services reported SUCCESS for that exact revision. A fresh
browser reload confirmed all six existing contact-page service choices render
on the standalone estimate form. No second production inquiry was submitted.
The separate Dispatch/CMS candidate must integrate this newer main before its
remaining combined validation and production promotion.
