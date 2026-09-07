# Ecommerce Production Implementation Backlog

This supporting backlog converts the September 3, 2026 readiness audit into ecommerce-specific delivery
phases under the canonical [Client Migration Master Plan](core-project-plan.md) and
[ADR-005](adr/005-isolated-client-stacks.md). It does not declare the current module a general
WooCommerce replacement or define a shared multi-tenant architecture.

## Verified offline-commerce acceptance — September 6, 2026

The actual desktop/mobile app workflow now verifies cash order creation, concurrent payment retries
with one inventory effect, visible refund success/error feedback, over-refund rejection without a
second refund record, duplicate fulfillment rejection, and paid/refunded cancellation boundaries.
The browser test exposed and led to corrections for refund HTTP500 validation and notification
constraint replay on restart. These candidate results do not establish Stripe sandbox acceptance
or production readiness; see the current execution ledger and release gate matrix.

## Status Language

- **Gate:** must pass before the stated launch.
- **Pilot constraint:** capability may remain limited only when the client intake explicitly excludes it.
- **Later:** client-dependent enhancement that does not block an otherwise compatible pilot.

## Phase 0 — Single-Client Deployment Baseline

Deliverables:

- [x] Adopt one application/database/config/storage/provider/operations boundary per client.
- [x] Add a secret-safe deployment configuration preflight.
- [x] Add stack identity to newly created backup manifests.
- [x] Exercise a synthetic restore into a disposable duplicate environment and verify stack identity.
- [ ] Add a checked, versioned infrastructure provisioning workflow when the first client's inputs exist.

Launch gate: deployment preflight, migration, backup creation, restore drill, rollback drill, health
checks, and domain/origin checks pass for that client's isolated environment.

## Phase 1 — Money and Stock Correctness

- [x] Atomically claim Stripe webhook events before side effects, with retryable failure and stale-claim recovery state.
- [x] Commit Stripe paid-order status, coupon redemption, and inventory deduction in one order-locked database transaction.
- [x] Move paid-order receipt delivery to a durable, idempotent job with retry and dead-letter visibility.
- [x] Move refund notifications to the durable delivery model.
- [x] Move shipment notifications to the durable delivery model.
- [x] Move order-status notifications to the durable delivery model.
- [x] Add Stripe webhook reconciliation, delivery inspection, and explicit replay tooling.
- [x] Make checkout creation idempotent for client retries.
- [x] Add inventory reservation/expiry or document and enforce a client-approved oversell policy.
- [x] Serialize inventory and coupon effects by order; add database-enforced side-effect keys and database-backed concurrency coverage.
- [x] Serialize refundable-balance reservations and use the local refund ID as the provider idempotency key.
- [x] Require captured payments to be fully refunded before cancellation; retain paid orders for fulfillment or explicit refund reconciliation.

Launch gate: production-like tests prove duplicate, reordered, delayed, and concurrent requests cannot
double-charge, double-refund, double-deduct, over-redeem, or silently strand paid orders.

## Phase 2 — Migration and Cutover

- [x] Freeze the versioned WooCommerce source, planner, target-port, mapping/run/checkpoint/audit/quarantine,
      authority, reconciliation, and rollback contract.
- [x] Build the Phase 1 catalog importer with dry-run and resumable rehearsal execution.
- Define source-to-target mappings for products, variants, media, customers, orders, coupons, taxes,
  stock, and statuses.
- Define which historical sensitive data will not be imported.
- Generate legacy URL redirects and validate canonical, sitemap, structured-data, and product-feed output.
- Reconcile source/target counts and monetary totals with explicit accepted exclusions.
- Rehearse freeze, final delta, DNS/domain cutover, rollback, and customer-support response.

Launch gate: two dry runs and one final rehearsal reconcile to signed acceptance thresholds, with a
timed rollback that does not require destructive guesswork.

## Phase 3 — Client Capability Acceptance

For each client, classify and verify:

- tax jurisdictions, nexus, product tax codes, exemptions, commits, and refund adjustments;
- shipping zones, live/manual rates, address validation, labels, tracking, and partial fulfillment;
- returns, exchanges, cancellation, restocking, and disputes;
- guest/account/privacy/retention/consent requirements;
- transactional email deliverability, retry, suppression, and support visibility;
- catalog size, variants, bulk operations, media, feeds, and search performance;
- fraud, shared rate-limit state, accessibility, responsive behavior, and security review.

Launch gate: every required capability is operational and tested. A provider shown in configuration is
not evidence that its adapter is implemented.

## Phase 4 — Quality and Operations

- [x] Add CI gates for lint, types, unit/integration tests, migrations, build, and bundle budgets.
- Add Stripe sandbox checkout/refund/webhook E2E and concurrency coverage.
- Add WCAG 2.2 AA keyboard, screen-reader, contrast, zoom, and mobile checkout verification.
- Add domain metrics and alerts for checkout, payment, webhook lag/failures, refunds, inventory, email,
  backups, restores, and error budgets.
- Add support timelines, payment reconciliation, webhook replay, finance/tax reports, and safe exports.

Launch gate: named responders can detect, diagnose, reconcile, communicate, and recover from the defined
failure scenarios within agreed service targets.

## Phase 5 — Deferred Capabilities

Implement only for clients that require them: gift cards/store credit, subscriptions and dunning,
multi-currency, multi-location carrier automation, marketplace sync, advanced promotions, and shared
cross-client analytics.

## Better Farms Pilot Application

Better Farms is the named first pilot, with approved scope limited to seven website routes and no
WooCommerce import or live checkout cutover. The catalog-only WooCommerce planner and rehearsal adapter
are a separate program workstream. Future clients that require commerce must map their actual catalog,
transactions, shipping, tax, fulfillment, memberships and plugin behavior to this backlog; each required
capability becomes a launch gate. Passing the Better Farms content pilot does not establish ecommerce
payment, import or fulfillment readiness.
