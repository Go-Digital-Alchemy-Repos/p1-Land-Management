# Production and main reconciliation — September 18, 2026

## Incident and recovery

Website-only commits to main triggered all three Git-connected production services. Main lacked the previously deployed consolidation source, so Dashboard and Core regressed. Dashboard was restored from deployment 2609669b-c874-4caa-8229-cca765adb1a7 to 4660ea46-69e2-42b0-9d95-c4490235d849; Core from cf62d794-940e-44a4-a270-8196dd8e3e03 to a33b5f17-3893-43f4-85d7-eb36b1717435. Both reached SUCCESS; authenticated browser confirmed Marketing and Appearance restored. No database restore or deletion occurred. Worker dc20c68a-d803-49d7-ac95-3922d574f738 was unchanged.

## Source reconciliation

Before new fixes, committed Dashboard/API/lib/package source on consolidation d028c9b was byte-identical to deployed checkpoint 98c0738, and committed Core was identical to recovery checkpoint 78b893f. Dashboard migration files are unchanged from that deployed checkpoint; this is not a new schema rollout. Main public source was merged normally into consolidation, preserving newer images, map, and requested commercial paragraph. The release must promote this combined source, not selectively publish website commits over older backend/dashboard source again.

A patch-equivalence audit covered every origin/codex branch. Analytics, federation, most lifecycle/OpenAPI branches, pilot acceptance and deployment-evidence branches are already incorporated. Work-order lifecycle client exports exist in current generated source; cancellation review/recovery has subsequent implementation and schema evolution. Old property/desk/sidebar artwork experiments are superseded by the current consolidated appearance; do not reapply the removed sidebar paper texture. Shared service cards already lazy-load and decode asynchronously; nineteen added location pages are already present.

Recovered completed public changes: shared location-page sidebar, illustrative marina image and optimized responsive WebP variants, taller wrapping footer assessment button, and removal of the manual-update wording while retaining the dated Google rating disclosure. The map and commercial paragraph were already verified live in release e74fd72.

## Explicitly pending work

Commercial appointment booking on c0b86e8 is not accepted for production: its branch documents outstanding role, booking-race, isolated migration/restore and browser release gates. Its migration number overlaps later consolidation numbering. Do not blindly cherry-pick it or run its migration. Preserve it for additive integration and acceptance. Old staging-only evidence and source manifest revision stamps are historical, not additional runtime features. The full consolidation acceptance tracker remains authoritative for incomplete CMS/system/access/CRM/agreements/retirement work.

## Reporting fix

Google returned a valid analyticsData#runReport with metadata/kind but no columns or rows for the comparison period before data collection. Normalize that explicitly empty response without inventing rows; nonempty/malformed responses remain rejected. Regression and live provider checks passed: all 14 report groups returned, including empty previous totals. Search Console credentials only expose the apex URL-prefix property https://p1landmanagement.com/; the configured sc-domain property returns 403. Do not claim domain/www search coverage or change the property silently.

## Validation

Fresh shared-library/API/dashboard type checks and dashboard/API builds passed. Core typecheck/build and 14 reporting service/route tests passed. Public typecheck/build, 50 server tests, image budgets, layout, navigation and media checks passed. These checks and unchanged deployed source establish reconciliation readiness, not completion of the full project acceptance matrix. Production migrations already existed; no fixture tests or write tests were run against production.

## Future release rule

Main is the production source of truth for every connected service. Before every push to main, enumerate affected services, compare candidate source with each deployed revision, include required shared contracts/build context, and verify each terminal deployment plus live UI. A successful website build alone never certifies dashboard/backend compatibility. Preserve QuickBooks/Twilio deferrals and existing account/data boundaries.

Additional focused checks: 5 access-policy tests and 4 federation/reporting transport tests passed. Two database-backed federation tests were skipped without their isolated database configuration; no claim of fresh database-backed federation acceptance is made.
