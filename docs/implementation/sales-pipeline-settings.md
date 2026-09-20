# Native sales pipeline presentation settings

September 20, 2026. Integrated and verified in production.

The retained Core pipeline supports labels, named colors and presentation order for six fixed lifecycle keys. Native inquiries now consume the shared presentation configuration in the pending integration candidate. The keys remain `new`, `contacted`, `qualified`, `proposal`, `won`, `lost`; renaming or reordering must never change lead statuses, conversion/onboarding, filtering values or history.

## Storage and authorization decision

Native Dashboard owns the future sales presentation configuration in additive migration `0048_sales_pipeline_settings.sql`, separate from Core's retained legacy setting. No automatic source overwrite or destructive cutover is included. Prior inventory found no stored source override; recheck before enabling the native editor and explicitly reconcile any subsequently created source configuration. Core remains available until ownership/cutover acceptance.

The singleton starts absent (revision zero/default six stages). Owner writes require the exact current revision, serialize first insert and subsequent updates, and commit configuration plus before/after audit in one transaction. Sales-capable members may read; only Owner may write. Unsupported stored data fails instead of becoming an editable default. Colors come from the retained six-name palette; all keys must occur once, labels must be unique, bounded and free of control characters. No lead row is updated by a configuration save.

The integration candidate mounts the HTTP router and provides the Owner editor. It must not be promoted to main until migration 0048 is applied and verified. Migration 0048 and the integrated application are released and verified.

## Verified checkpoint

Three tests ran against a dedicated disposable PostgreSQL database with all migrations: validation; concurrent first writes/stale edits/audit rollback/no lead changes; mounted HTTP authentication and permission matrix (sales read, Owner write, denied ungranted manager/crew/client, unauthenticated rejection). All passed without skips, cleanup succeeded, API typecheck passed. The mounted fixture uses an identity-only auth double; role, activation and grants are resolved from actual database rows. No production settings were written.

## Integrated candidate

The canonical validator/defaults live in `lib/api-zod/src/pipeline-settings.ts`; the existing OpenAPI generator supplies the client contract. The Drizzle schema mirrors migration 0048. Sales inquiry filters, row labels and follow-up choices consume presentation settings while submitting unchanged lifecycle keys.

The Owner editor supports labels, named colors and accessible up/down ordering. Saves use the loaded revision. Failed or uncertain saves retain the draft and require reload before another attempt; discarding edits requires explicit confirmation. Unsaved changes use the existing navigation guard. Failed initial reads cannot enable editing. Clients viewing estimates do not request sales settings.

Five UI tests pass, covering saves/consumer updates, failed-save draft retention, failed initial reads, duplicate labels and client request isolation. Dashboard and API production builds pass. The local browser fixture verified rename, reorder and save with consumer updates; the themed 390px mobile layout had no horizontal overflow. Independent review identified the client-access warning, which was corrected and regression-tested. These checks do not substitute for production acceptance.

## Required release work

- Recheck source Core configuration and reconcile any new override before enabling the native editor.
- Capture a fresh database backup, apply additive migration 0048 using the migration ledger and checksum checks, then verify it.
- Push/release the integrated feature to main and verify the live Owner editor without changing real configuration for testing.
- Rollback keeps the additive table/audit; older application can ignore it. Do not drop stored settings or replay legacy configuration blindly.

## Production migration checkpoint

Fresh read-only custom-format backup captured September 20 at 04:39 UTC: 319,848 bytes, SHA-256 `94fd189d7f0d45058a710f4b1361c8f7be026464bf9c4eeb036398b62b4a906f`. Exact Dashboard/database connection binding was checked without publishing credentials. Core recheck found no `crm_pipeline_config` override.

Initial migration preflight stopped without changes on the documented ledger-only `0019_optional_owner_mfa.sql`. After confirming its historical checksum against existing release records, that entry was preserved without replay or policy changes. All current migration checksums matched. Migration 0048 was committed under advisory lock 918277 and its ledger read-back matched SHA-256 `2fca3028410d0f5b244e5ad977ae04226489e74688b344d7e601c1bd8163c1b4`. The settings table is empty, preserving revision-zero defaults; no lead, account or settings values were changed.

## Release acceptance

Revision `b7a56cc064e07046e6e932f2d367049487da53b5` was pushed to task branch and main. Railway terminal SUCCESS was observed for Dashboard `7acd07b2-8d7a-45d3-ac30-3185b97fa0d3`, Core `2de5ccea-0067-43d0-b3ee-16dba5cb3aec`, and Website `a38d5342-4bf2-46f8-8bfb-2acbcfaabadb`. The authenticated live Owner Sales page loaded settings without errors, displayed six default stages in both inquiry filters, and opened the editor with six label/color fields and bounded reorder controls. Save was disabled for the unchanged draft. Existing inquiries remained visible. No production configuration was changed by this browser check. Local write/conflict/permission tests provide mutation evidence; this live check was read-only.
