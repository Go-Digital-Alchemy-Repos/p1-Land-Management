# P1 isolated staging API acceptance — 2026-09-07

Target: https://p1-website-staging-website-staging.up.railway.app. Used a synthetic administrator existing only in staging; no credentials, customer records or notification recipients are reproduced here. Original Core Platform and production were untouched. No deployment or source edits were performed by this task.

## Content workflow — passed

All seven representative page families passed authenticated edit/save, anonymous admin-content denial401, public draft privacy, stale restore conflict409, actual historical revision restore as a new draft, and explicit publication of restored original content. Revision history records kind `restore`; restore alone leaves the current publication unchanged. Final public content matches the original values under canonical sorted-field SHA-256 hashing.

| Route family | Baseline saved revision | Final original published revision | Original/final content SHA-256 |
| --- | --- | --- | --- |
| home | 6 | 10 | `6f52c8d4308017b2e5f5b8557bc746ed0ce8533eee96aad3665ac87cddc78aeb` |
| about | 1 | 9 | `4f5c4fc1ce17553b7dfd59f1a5c1f16f3dfc57fa324b505fb10cb130b551150d` |
| contact | 1 | 5 | `88f5235181bbfdd47306f8786204dc775bdd2a847bba893fe21acd381c52e820` |
| gallery | 1 | 5 | `ef9fdcf0cd8c30bf61c036cc238036b18d4c08303d30efd775eae2d09356b250` |
| services-land-clearing | 1 | 5 | `6b4cb715a5f9c761b0e7c7dfe05ff87bec3ee44adf045d697e420d72dfb7b9d3` |
| service-areas-greenville-sc | 1 | 5 | `e337d5d0344eb02735cec4006b1dc36819cb508c988af2522380a7a27649f96d` |
| blog-land-clearing-cost-per-acre-south-carolina | 1 | 5 | `2b0f49bcf73ac142e14fe59c655e69d6fc932219c5f3bb106f1fe267670f6e64` |

About additionally verified changed publication revision7 was visible through the public content API, then restored the original historical content and published revision9. Other test markers were private drafts only. The test leaves synthetic revision-history entries; final published values are original.

Configured preview origin matches the staging gateway. Preview route returned200, `X-Robots-Tag: noindex, nofollow`, and `Cache-Control: private, no-store`. This verifies API privacy and preview routing headers, not staged iframe interaction; the parent/public agent owns the currently changing admin routing/UI deployment. The earlier local deterministic iframe tests are recorded separately.

## Managed inquiry — passed

- Durable acceptance201 and identical-key retry200 returned the same receipt: `eaa45d4e-bced-402a-ba3d-6c9caf2507bd`.
- Forms contains exactly one matching saved submission.
- Worker created exactly one matching CRM lead: `d1eead4c-550a-4825-b733-f413d3ea5bd6`, stage `new`, source `website_form`.
- Contact details, company, address, acreage, property type, requested-services array, project message and first-party attribution were retained.
- CRM was initially empty before the scheduled worker tick and subsequently contained the matching lead; durable acceptance is distinct from worker completion.

## Exclusions — passed

Public/admin API probes for products, directory, membership and portfolio all returned404 (eight endpoints). This is route probing, not an exhaustive staged permission matrix.

## Notification retry and evidence boundary

Staging SMTP is intentionally unconfigured; no real email was requested. The failed-jobs endpoint returns only terminal job IDs/attempt counts/error codes and omits submission linkage. Parent-provided scoped staging database observation confirms this receipt's `crm_intake` job completed on attempt1 with no error, while its synthetic administrator notification remains queued after attempt2 with `last_error_code=effect_delivery_failed`. This establishes observable notification retry without preventing durable receipt or CRM creation. The scoped database read was executed by the parent, not this reviewer. No retry was manually forced and no provider credentials were added.

Reproduction script: `/tmp/p1-staging-acceptance.mjs`; evidence snapshot: `/tmp/p1-staging-evidence.json`. The first harness hash comparison incorrectly depended on JSON property order across PostgreSQL serialization; canonical sorted-field hashing corrected the harness and all comparisons passed. No content defect was inferred from that initial harness failure.
