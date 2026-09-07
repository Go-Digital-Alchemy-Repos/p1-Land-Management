# ADR-005: Repeatable Single-Client Deployments

## Status

Accepted as the planning baseline — September 3, 2026

## Context

Digital Alchemy intends to migrate WordPress clients to Core Platform incrementally. Core Platform is
currently single-client software: its database, settings, authentication, storage, integrations, and
feature toggles are global within one deployment. Each client's public experience is a separately built
static React site integrated with that client's Core Platform instance and Puck configuration.

## Decision

Use one independently operated deployment per client:

- one Core Platform dashboard/API and one client;
- one dedicated PostgreSQL database;
- one separately built static React website;
- one unique secrets/configuration set and storage namespace;
- one payment/email/provider configuration;
- one backup, monitoring, release, and rollback boundary.

`CLIENT_STACK_ID` is the stable non-secret operational identity for this single-client
boundary. “Client stack” is deployment shorthand only; it does not represent a tenant in a shared SaaS.

The client's React site is the visual authority. Puck registrations and all bolt-on pages/components
must consume an adapter derived from that site's design system.

The public React site owns the client's normal domain. The dashboard uses a protected admin subdomain.
Where feasible, public browser API requests use the site's same-origin `/api` path, routed to the Core
Platform backend; the dashboard uses its own same-origin API path. Public and admin cookies remain
host-only by default, and preview/authentication behavior is defined explicitly rather than relying on a
shared parent-domain cookie.

Domain onboarding is registrar-agnostic and manual. Core Platform generates exact DNS instructions and
performs read-only ownership, propagation, certificate, and routing verification. The operator applies
the records at the chosen provider. Core Platform does not request or store provider credentials and does
not mutate DNS. Direct provider integrations, including Cloudflare automation, require a future,
separately approved decision.

## Consequences

- Client data and operational failures are contained by deployment and database boundaries.
- Each client has infrastructure overhead, addressed through repeatable manifests, preflight, automation,
  and runbooks.
- Shared cross-client administration and reporting are not platform responsibilities in this phase.
- Provider and restore provenance can be checked against a stable client instance identity.
- Platform modules must remain presentation-neutral and use site-specific theme adapters.
- Domain changes add a staged ownership, DNS, certificate, routing, health, approval, and rollback gate.

## Compatibility Constraint

Future multi-tenancy is out of scope. Avoid needless barriers by using explicit instance/site identity,
versioned contracts, presentation-neutral services, and portable import interfaces. Do not add tenant
tables, tenant-aware authorization, or shared-database scoping without a new approved ADR.

## Alternatives Rejected for the Near Term

- **Shared multi-client runtime/database:** Core Platform does not implement the required isolation.
- **One generic public theme for every client:** conflicts with preserving imported site design.
- **Immediate tenancy or framework rewrite:** adds risk without being required for Better Farms or the
  repeatable deployment model.

## Related Plan

See the canonical [Client Migration Master Plan](../core-project-plan.md).
