# Ecommerce Bolt-On App — Master Prompt

Append this prompt to [00 — Universal Bolt-On App Contract](./00-universal-bolt-on-app-contract.md).

---

Build the complete **Ecommerce** bolt-on app described below.

## App Registration

- App id/slug: `ecommerce`
- Display name: configurable, default `Ecommerce`
- Core Platform feature key: `ecommerceEnabled`
- Core Platform persisted setting: `system_configuration.enable_ecommerce`
- Core Platform default: enabled; use disabled for a fresh external installation unless explicitly configured otherwise
- Public routes: `/shop`, `/products/:slug`, `/cart`, `/checkout`, `/order-success`, `/orders/status`
- Authenticated customer routes: `/account`, `/account/orders`, `/account/orders/:id`, `/account/profile`, `/account/addresses`, `/account/security`, `/account/preferences`
- Admin route family: `/admin/ecommerce`
- Public API family: `/api/ecommerce`
- Admin API family: `/api/admin/ecommerce`
- Core permission: administrator-only; map catalog, orders, fulfillment, refunds, integrations, and settings to least-privilege host permissions when available

## Product Goal

Provide a complete storefront and store-operations app: normalized catalog, products and variants, media, categories/collections, cart pricing, coupons, checkout, customers, orders, payment reconciliation, fraud controls, inventory, refunds, shipping, fulfillment, integrations, and customer self-service.

The server is authoritative for prices, discounts, tax, shipping, inventory, customer ownership, payment state, refund limits, and fulfillment state. Never trust values submitted by the cart UI.

## Domain Model

Implement host-equivalent, namespaced models for:

### Catalog

- products with title, unique slug, descriptions, type/vendor, publish/active/visibility state, scheduling, base/sale/compare-at/cost prices in minor units, taxability, SKU fallback, SEO, featured state, physical/digital behavior, shipping dimensions, badges, tags, included/features content, related products, and upsells;
- product options, ordered values, variants, option-value snapshots, variant SKU/barcode, price overrides, cost, image, active/archive state, inventory behavior, low-stock threshold, and backorder rule;
- ordered product media with primary state, alt text, optional variant assignment, external URL, and shared-media linkage;
- categories with hierarchy and product assignments;
- collections and product assignments;
- inventory adjustments with reason, actor, quantity delta, resulting quantity, and reference.

### Customers And Orders

- customers linked to host users where available, normalized email/contact/preferences, and provider customer ids;
- reusable customer addresses with ownership and default states;
- orders with public lookup token, customer and guest identity, billing/shipping snapshots, consent, currency, subtotal, discount, shipping, tax, total, status, payment status, provider ids, fraud state, and timestamps;
- order-item snapshots of product/variant id, title, SKU, selected options, quantity, unit price, discount, tax, and totals so later catalog edits do not rewrite history;
- order notes/events with actor and private/public visibility as needed;
- processed webhook events for idempotency.

### Promotions, Risk, Refunds, And Fulfillment

- coupons and redemptions;
- fraud events, decisions/review state, and blocks where supported;
- payment requests when manual/admin payment links are supported;
- refunds with full/partial type, amount, reason, provider id, status, actor, and timestamps;
- shipping zones, rates, shipments, tracking, fulfillment locations, providers, fulfillments, and fulfillment items;
- integration settings and masked operational status.

Use transactions and constraints for money, inventory, redemption, and fulfillment invariants.

## Public Storefront And Cart

Build:

- searchable/filterable/paginated shop showing active published products only;
- product detail with media gallery, accessible alt text, category/collection context, options, variant resolution, live availability, pricing, related/upsell content, SEO, and structured product data;
- persistent cart with product and optional variant id plus quantity, while treating displayed client prices as estimates;
- mini-cart/drawer only if it matches host navigation behavior;
- server pricing endpoint that reloads product/variant records and calculates subtotal, eligible discount, shipping, tax, and total;
- clear handling for inactive/unpublished products, invalid variants, price changes, insufficient inventory, backorders, coupon failures, and cart reconciliation.

## Coupons

Support:

- fixed-amount, percentage, and free-shipping coupons;
- normalized case-insensitive codes;
- active/scheduled/expired/inactive/usage-limit/archived lifecycle;
- start/end windows, subtotal threshold, maximum discount, total/per-customer limits, customer eligibility, product/category inclusion and exclusion, stacking policy, and tax timing metadata;
- server-side evaluation against the priced cart;
- redemption recording only after the order is successfully paid, never during validation or payment-intent creation;
- historical coupon snapshots on the order.

BOGO is not required unless the host already supports it; keep discount strategy extensible.

## Checkout And Payments

Create:

- contact, billing, shipping, delivery/rate selection, consent, order review, and payment flow;
- guest checkout and authenticated customer checkout according to host policy;
- server-created pending order and provider payment object using a server-calculated snapshot;
- verified, signed, idempotent webhook reconciliation before an order becomes paid;
- recovery for duplicate submits, abandoned/expired payment, delayed webhook, provider retry, and post-payment UI reload;
- success page that verifies server order state;
- secure order-status lookup using an unguessable token plus appropriate identity verification;
- payment configuration with test/live modes, publishable identifiers, encrypted secret/webhook values, masked status, and connection test.

Keep Ecommerce payment configuration separate from Directory, Events, and Membership settings even when they use the same provider.

## Inventory, Orders, Refunds, Shipping, And Fulfillment

- Deduct tracked inventory only after confirmed payment; failed or abandoned checkout does not alter stock.
- Make inventory deduction idempotent and record adjustments.
- Provide order statuses at least `pending`, `paid`, `shipped`, `delivered`, and `cancelled`.
- Provide payment statuses at least `unpaid`, `paid`, `refund_pending`, `partially_refunded`, `refunded`, and `refund_failed`.
- Build admin order list/detail, status changes, notes, manual order creation, payment requests where supported, full/partial refund, shipment, tracking, and fulfillment operations.
- Validate refund amount against captured minus already-refunded value and reconcile provider results idempotently.
- Creating a shipment/fulfillment updates order state only when service rules allow.
- Use integration adapters for rates, labels, tracking, tax, and alternate gateways; the app must remain operational with manual shipping when optional providers are absent.
- Send templated order, payment, shipment, delivery, cancellation, and refund notifications according to settings.

## Customer Account

Create authenticated:

- account overview;
- owned order list/detail with no cross-customer access;
- profile and marketing preferences;
- address create/edit/default/delete;
- security handoff to host authentication;
- reorder or saved-payment enhancements only when securely supported by host/provider.

Guest order lookup must not expose the broader customer account.

## Admin Experience

Build a host-native Ecommerce workspace covering:

- overview metrics that are computed from authoritative order data;
- products, options/variants, media, categories, collections, inventory, and publishing;
- coupons and redemption reporting;
- customers and addresses where operationally required;
- orders, notes, payments, fraud review, refunds, shipping, tracking, and fulfillment;
- integrations with masked health/status;
- store settings for currency, tax behavior, checkout, inventory, email, shipping, payments, and public labels.

Use separate list/detail/editor routes or tabs according to host patterns. Do not collapse complex operations into an unmanageable single form.

## Rules And Integrations

- Represent money as integer minor units plus currency; never binary floats.
- Snapshot prices, discounts, addresses, product/variant identity, and selected options on orders.
- Normalize and uniquely enforce product, category, and collection slugs.
- Bound quantities and public list sizes.
- Validate every order/customer nested record against tenant/site and ownership.
- Never log card data, payment secrets, full fraud-sensitive payloads, or unnecessary customer PII.
- Verify webhook signatures against the raw body and store processed event ids.
- Use host adapters for media, email, files/invoices, search, sitemap/product feed, analytics, payments, tax, shipping, and fraud.
- Bootstrap starter categories/products/navigation only when explicitly requested; seed additively and never overwrite edits.

## Ecommerce Acceptance Criteria

- Administrators can publish a product with options/variants/media/categories and accurately managed inventory.
- Visitors can browse, select a variant, reconcile a cart, apply valid/invalid coupons, choose shipping, and complete a server-priced checkout.
- A verified webhook marks an order paid exactly once, records coupon redemption once, and deducts inventory once.
- Customers can securely view only their own orders and addresses; guests can use a safe lookup flow.
- Administrators can manage order lifecycle, issue bounded refunds, create shipments/fulfillments, and inspect masked integration status.
- Public search/feed/sitemap expose only active published products.
- Disabling Ecommerce hides storefront, cart, checkout, account commerce views, admin/API/discovery surfaces, and new checkout work while preserving catalog, customer, order, refund, fulfillment, and necessary payment reconciliation data.

---
