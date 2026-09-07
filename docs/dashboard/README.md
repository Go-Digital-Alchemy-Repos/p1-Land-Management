# P1 Property Operations Dashboard

Implementation status: **preview deployed at https://dashboard.p1landmanagement.com; not accepted for a crew/client pilot**. The marketing website and Core CMS remain separately deployed. This directory is the canonical dashboard documentation. The approved scope is the user's P1 Property Operations Dashboard plan; implementation does not reduce that scope.

## Implemented and locally exercised

- Invitation-gated Better Auth accounts, verified email, session-specific owner MFA, permanently consumed transactional bootstrap, client/crew authorization.
- Office site/billing/primary contacts with optimistic edits, archival/restoration, audit records and role checks (follow-up implemented; deployment pending).
- Clients, properties, work orders, prerequisites, versioned field submissions, review and explicit publication, assessment-slot collision prevention.
- Estimate decisions, lead conversion, estimate revisions/change orders, retry-safe billing drafts and cumulative estimate caps.
- Recurring occurrence generation with month-end anchoring, pauses, independent billing-mode metadata, and New York daylight-saving conversion.
- Responsive role-aware web UI, supplied P1 symbol, private image upload pipeline, IndexedDB day downloads and operation/photo queues.
- QuickBooks OAuth/import/posting/reconciliation and Twilio adapters are implemented but **not verified against real providers**. Mailgun owner-setup delivery is verified; broader notification retry/delivery workflows still need acceptance.

## Remaining release work

- Physical iPhone and Android offline/restart/low-storage/interrupted-upload acceptance; installed PWA and private S3 end-to-end tests.
- Complete contract/renewal management, fixed-monthly/per-visit automatic billing preparation, project phase/prerequisite and progress accounting workflows, equipment readiness UI, usable schedule day/week interactions and full report publication workflows. Existing simple forms/data structures do not constitute completion of these requirements.
- Assessment availability currently uses explicit slots. Configurable availability rules, blackout generation, travel buffers and duration management still need implementation.
- Broaden permission/integration coverage. The six original scoped security findings and two follow-ups have independent accepted rechecks; these are not an exhaustive security certification.
- Full OpenAPI coverage and generation for office routes, component decomposition, accessibility/mobile acceptance, support action queues and operational alerts.
- Connect Core website inquiry intake durably with deduplication; public marketing intake must not be duplicated.
- Owner completion of password/MFA setup, Intuit sandbox proof and production approval, Twilio registration/consent/callback proof. Mailgun credentials, domain and initial owner-setup delivery are verified.
- Backup restoration against deployed infrastructure, rollback rehearsal, complete one-crew/invited-client billing pilot. Native Expo implementation follows web acceptance.

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
