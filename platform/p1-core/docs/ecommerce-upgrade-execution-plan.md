# Approved ecommerce upgrade execution plan

Owner authorization: implement the final ecommerce plan after integrating recent completed updates into main. Keep GitHub Actions disabled. Preserve isolated client stacks and existing data.

## Release scope

US/USD small and midsize stores. Standard providers: Stripe, PayPal, Authorize.net, Square. EasyPost plus manual shipping. Physical, variable, virtual/service, protected downloadable, and subscription products. Shared payments support ecommerce, paid events, and memberships.

## Ordered work packages and acceptance

1. **Reliability review:** maintain evidence-backed findings; test prices, coupon limits, inventory/capacity races, duplicate submissions, delayed/replayed webhooks, uncertain payments/refunds, credentials, authorization, and recovery. Physical checkout must require an explicit eligible shipping method; zero-total eligible orders must complete without a provider charge. Independent security scan remains outstanding because its managed filesystem profile was unavailable.
2. **Payment connections:** encrypted named connections, multiple accounts per provider, isolated test/live credentials and capability/readiness status. Routing: event/plan override, module default, platform default. Persist original connection/environment on payments and subscriptions. Default changes never reroute historic operations. Prevent unsafe disconnects and automatic provider switching after uncertain outcomes. Shared create/status/void/refund/webhook/subscription contracts; additive legacy Stripe mapping with ambiguous records flagged.
3. **Providers:** implement Stripe, PayPal, Authorize.net, Square sequentially with hosted/tokenized collection. Validate one-time payments and refund/recovery before activation; separately validate recurring lifecycles before membership/subscription selection. Hide unfinished integrations without deleting saved settings. Wallets are provider capabilities.
4. **Products/editor:** structured Simple, Variable, Downloadable, Virtual/Service and Subscription presets; independent variation/delivery/purchase settings permit combinations. Preserve legacy classification text. Dedicated editor page, type-first creation, conditional fields, sidebar publishing/organization, persistent Save/Preview/status, draft validation and unsaved-change protection. Variation bulk table; catalog thumbnails, pagination, sorting, saved filters, bulk actions and restored list position.
5. **Delivery/tax:** EasyPost rates, package/origin configuration, idempotent labels, tracking and supported cancellation; explicit manual/free rates and partial shipments. Address-aware Stripe Tax across processors, transaction and refund adjustments, no silent zero-tax failure. Authorized downloads with expiring links and item-refund revocation.
6. **Recurring commerce:** shared recurring infrastructure with distinct order vs membership outcomes. Fixed price weekly/monthly/yearly where supported; matching billing/delivery cadence, one subscription configuration per checkout separate from one-time carts. Renewal orders revalidate stock/shipping/tax. Snapshot agreed prices. Cancellation and supported pause/skip, recovery, no duplicate renewal orders. Unsupported configurations remain unavailable. Preserve existing membership access policy during migration; new plans have no unpaid extension beyond paid-through date by default.
7. **Events/customer operations:** paid guest checkout, reserved capacity, verified payment before ticket access, abandonment release and refund/cancellation integrity. Partial returns with approval/receipt/refund/explicit restock; linked replacement orders for exchanges. Unified financial timeline and customer receipts/history/tracking/downloads/subscription management. Durable notifications and reconciliation exceptions.
8. **Setup/release:** guided business/connections/module assignments/tax/delivery/communications/test purchase/readiness flow including website/domain/return URL/webhook setup. Local tests/types/build/migrations plus real sandbox journeys, mobile/keyboard/error-recovery checks. Staging and controlled pilot before production activation. Monitor webhook lag, payment/refund/renewal/notification failures and inventory drift. Do not claim live readiness from mocked/unit tests alone.

Deferred: international, extra processors, marketplaces, POS sync, courses, bookings/rentals, grouped/external products, bundles, gift cards, prepaid or mixed billing schedules and proration.

## Execution ledger

- Completed-update integration candidate: 7745f9e on PR #13. Baseline: 901 tests passed, 24 skipped; TypeScript and production build passed. GitHub rejected direct main push: PR plus Verify from GitHub Actions app 15368 required. Actions remains disabled. Replacing that requirement needs explicit owner approval; no bypass performed.
- Implementation branch: codex/commerce-platform-upgrade.
- Implemented and locally validated: reject physical checkout with no matching shipping rate; shipping quote endpoint distinguishes no-shipping carts from unavailable physical delivery; remove false free-shipping message; hide non-operational integrations from ecommerce setup while retaining definitions/settings.
- Validation: full suite 902 passed / 24 skipped; corrected absent-rate regression rerun passed (83 service tests); TypeScript, changed-file ESLint, and production build passed.
- All remaining work packages above are pending. No production provider operations or migrations have been performed.

## Initial findings

| Finding | Evidence | Status |
| --- | --- | --- |
| Physical checkout silently accepts no eligible shipping rate | ecommerce-order.service.ts only rejected missing selection when rates existed | Fixed locally; regression exercises matching and absent rates |
| Shipping UI promises no charge when rates are missing | checkout-page.tsx empty-rate message | Fixed locally; API rejects unavailable physical delivery |
| Integration catalog offers configuration without transport | integration adapter registry and provider services | Setup hidden locally; provider implementation pending |
| Stripe Tax toggle is disconnected from manual calculation | ecommerce-tax.service.ts | Pending |
| Events/memberships depend on Stripe fields and settings | event registration schema, membership Stripe services | Pending shared connection migration |
| Product type is free text rather than behavior | ecommerce product schema/editor | Pending structured model and editor |
