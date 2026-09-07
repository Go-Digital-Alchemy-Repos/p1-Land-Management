# P1 Property Operations Dashboard

Implementation status: **preview deployed at https://dashboard.p1landmanagement.com; not accepted for a crew/client pilot**. The marketing website and Core CMS remain separately deployed. This directory is the canonical dashboard documentation. The approved scope is the user's P1 Property Operations Dashboard plan; implementation does not reduce that scope.

## Implemented and locally exercised

- Invitation-gated Better Auth accounts, verified email, session assurance, permanently consumed transactional bootstrap, client/crew authorization. The owner subsequently approved per-user MFA requirements controlled by the super admin; that policy is in the combined release candidate, while the last verified production checkpoint retains its earlier owner-MFA rule.
- Office site/billing/primary contacts with optimistic edits, archival/restoration, audit records and role checks (deployed checkpoint8039f99).
- Clients, properties, work orders, prerequisites, versioned field submissions, review and explicit publication, assessment-slot collision prevention.
- Estimate decisions, lead conversion, estimate revisions/change orders, retry-safe billing drafts and cumulative estimate caps.
- Recurring occurrence generation with month-end anchoring, pauses, independent billing-mode metadata, and New York daylight-saving conversion.
- Responsive role-aware web UI, supplied P1 symbol, private image upload pipeline, IndexedDB day downloads and operation/photo queues.
- QuickBooks OAuth/import/posting/reconciliation and Twilio adapters are implemented but **not verified against real providers**. Mailgun owner-setup delivery is verified; broader notification retry/delivery workflows still need acceptance.

## Remaining release work

- Physical iPhone and Android offline/restart/low-storage/interrupted-upload acceptance and installed PWA acceptance. Authenticated staging HTTP/S3 upload, immutable retry and publication isolation passed 23 checks; this does not prove physical-device behavior or object recovery.
- Complete project phase/progress accounting workflows, crew availability conflict checks and selective report publication workflows beyond the implemented inspection-report path. Fixed-monthly/per-visit automatic draft preparation is deployed to isolated staging with durable scan/job/retry records and a worker-created draft rehearsal; production release and pilot acceptance remain open. Agreement creation, activation, cancellation, successor creation and explicit charge preparation are reviewed in04ef3ad; combined staging acceptance remains on hold. Equipment/access/materials/permit/deposit readiness editing and override invalidation are reviewed and included in productionbc7d3a6. These bounded features do not establish end-to-end operational acceptance.
- Assessment weekly windows, configurable duration/travel buffers, blackout management and retry-safe generation are deployed and independently reviewed (checkpoint4079996, migration0009). Multi-assessor allocation and booking-change/cancellation workflows still need product acceptance.
- Broaden permission/integration coverage. The six original scoped security findings and two follow-ups have independent accepted rechecks; these are not an exhaustive security certification.
- Full OpenAPI coverage and generation for office routes, component decomposition, accessibility/mobile acceptance, support action queues and operational alerts.
- Complete public gateway/browser inquiry and owner acceptance. The durable Core-to-dashboard backend handoff is verified in staging and for one synthetic production submission with exactly one lead, receipt and audit; public intake must remain one system.
- Owner onboarding acceptance under the approved per-user MFA policy (including assurance where required), Intuit sandbox proof and production approval, Twilio registration/consent/callback proof. Mailgun credentials, domain and initial owner-setup delivery are verified.
- Full restoration against deployed infrastructure, application rollback/cutover, object recovery and a complete one-crew/invited-client billing pilot. Populated agreement database restore and retry behavior now have a repeatable synthetic regression; see RECOVERY.md. Native acceptance remains its own post-web milestone.

## Validation

Run `node scripts/test-dashboard.mjs` from the repository root. Requires Node 24, pnpm dependencies and Docker. It starts an isolated temporary PostgreSQL 17 database, removes real provider credentials from the test environment, migrates, starts a local server, executes tests, replays migrations and cleans up only its own container. Tests must not target production.

`pnpm --filter @workspace/p1-dashboard typecheck`

`pnpm --filter @workspace/api-server typecheck`

`pnpm --filter @workspace/p1-dashboard build`

`pnpm --filter @workspace/api-server build:dashboard`

Local tests cover owner bootstrap/MFA stale sessions, client isolation, field replay, review/publication, billing cap and concurrent operation deduplication, QuickBooks ownership refresh and concurrent realm binding without live provider calls, upload access, monthly recurrence/DST and simultaneous booking. Successful local tests do not prove physical-device or provider behavior.

See [architecture](ARCHITECTURE.md), [access and initialization](AUTH.md), [API](API.md), [offline](OFFLINE.md), [integrations](INTEGRATIONS.md), and [deployment](DEPLOYMENT.md).

## Commercial sales addition

The [master plan](../MASTER_PLAN.md) and [Commercial / Industrial Sales initiative](../initiatives/commercial-industrial-sales.md) add a property-centered commercial acquisition path, Commercial Site Assessment and future target-account pursuit. Plan additive prospect company/contact/site/opportunity relationships, durable Core intake handoff, explicit operational promotion and assessment/proposal/onboarding continuity. This addition preserves every remaining requirement above; it does not claim those features are implemented.

Calendar and scheduling follow-up (deployed, reviewed checkpoint1bbe6cd): New York day/week navigation, assignment filters, paginated date-range/backlog loading, versioned rescheduling/assignment edits and direct job detail retrieval beyond the legacy500-record list. Tests exercise every page for client/crew isolation and mounted detail authorization. Phone-width fixture confirms calendar-to-field-action navigation. Crew capacity/duration conflicts and staff availability management remain outstanding.

Property photos follow-up (deployed with scheduling): protected photo gallery, full-image links, manager publication status and explicit per-photo publishing using the reviewed-work guard. Browser fixture verified failed-image feedback and a rejected publication staying private. Real authenticated staging S3 image delivery and publication isolation subsequently passed; full selective report publication and physical-device acceptance remain outstanding.

Commercial inbox and receiver are deployed with migration0010; staging Core-to-dashboard retry/idempotency, phone-only intake and manager follow-up/conflict acceptance passed. Production sender/key activation and a bounded signed backend handoff subsequently passed; see DEPLOYMENT.md. Owner recovery6d1e024/345db82 is independently reviewed and deployed. The newer per-user policy and agreement workspace require the coordinated staging release described in SERVICE_AGREEMENTS_UI.md.
