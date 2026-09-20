# Native sales pipeline presentation settings

September 20, 2026. Implementation in progress; not enabled in production.

The retained Core pipeline supports labels, named colors and presentation order for six fixed lifecycle keys. Native inquiries currently hard-code those labels and need this capability before legacy retirement. The keys remain `new`, `contacted`, `qualified`, `proposal`, `won`, `lost`; renaming or reordering must never change lead statuses, conversion/onboarding, filtering values or history.

## Storage and authorization decision

Native Dashboard owns the future sales presentation configuration in additive migration `0048_sales_pipeline_settings.sql`, separate from Core's retained legacy setting. No automatic source overwrite or destructive cutover is included. Prior inventory found no stored source override; recheck before enabling the native editor and explicitly reconcile any subsequently created source configuration. Core remains available until ownership/cutover acceptance.

The singleton starts absent (revision zero/default six stages). Owner writes require the exact current revision, serialize first insert and subsequent updates, and commit configuration plus before/after audit in one transaction. Sales-capable members may read; only Owner may write. Unsupported stored data fails instead of becoming an editable default. Colors come from the retained six-name palette; all keys must occur once, labels must be unique, bounded and free of control characters. No lead row is updated by a configuration save.

The HTTP router is implemented but intentionally not mounted in the application yet. This avoids exposing an incomplete tool or querying a production table that has not been migrated. No production schema change has occurred.

## Verified checkpoint

Three tests ran against a dedicated disposable PostgreSQL database with all migrations: validation; concurrent first writes/stale edits/audit rollback/no lead changes; mounted HTTP authentication and permission matrix (sales read, Owner write, denied ungranted manager/crew/client, unauthenticated rejection). All passed without skips, cleanup succeeded, API typecheck passed. The mounted fixture uses an identity-only auth double; role, activation and grants are resolved from actual database rows. No production settings were written.

## Required next work

- Promote the contract through the existing shared/OpenAPI/generated-client convention; do not create a conflicting frontend schema.
- Build the Owner editor with draft retention, explicit reload on conflict, static color previews and accessible reorder controls.
- Use settings in inquiry filters, cards/status labels and follow-up stage choices; preserve stable keys and Won onboarding semantics.
- Add UI and full-candidate route tests, independent review, and source configuration recheck.
- Back up/apply additive migration before mounting the router; push/release the integrated feature to main and verify live.
- Rollback keeps the additive table/audit; older application can ignore it. Do not drop stored settings or replay legacy configuration blindly.
