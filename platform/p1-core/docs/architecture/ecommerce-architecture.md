# Ecommerce Architecture

The ecommerce module is a feature-gated commerce layer built on the existing Express, Drizzle, Stripe, settings, email, and CMS systems.

## Deployment Boundary

Ecommerce is currently single-client. Under
[ADR-005](../adr/005-isolated-client-stacks.md), every client receives a separate Core Platform
application/database and separately built React site, with its own configuration, storage, providers,
recovery, monitoring, and releases. This is repeatable deployment, not a shared multi-tenant system.

## Client Routes

The storefront is route-level lazy loaded from `client/src/App.tsx`:

- `/shop`
- `/products/:slug`
- `/cart`
- `/checkout`
- `/order/success`
- `/order/status`

Admin management lives under `/admin/ecommerce` and uses tabbed views for products, categories, coupons, orders, shipping, refunds, and Stripe configuration.

## API Routes

Public ecommerce routes are mounted at `/api/ecommerce` and are guarded by the ecommerce site feature middleware.

| Endpoint                                      | Purpose                                          |
| --------------------------------------------- | ------------------------------------------------ |
| `GET /api/ecommerce/products`                 | List public active/published products            |
| `GET /api/ecommerce/products/:slug`           | Fetch a public product by slug                   |
| `GET /api/ecommerce/categories`               | List active public categories                    |
| `GET /api/ecommerce/stripe/config`            | Return ecommerce Stripe publishable key and mode |
| `POST /api/ecommerce/cart/price`              | Price a cart payload                             |
| `POST /api/ecommerce/coupons/validate`        | Validate a coupon for a subtotal                 |
| `POST /api/ecommerce/checkout/payment-intent` | Create an order and Stripe payment intent        |
| `POST /api/ecommerce/orders/status`           | Customer-facing order lookup                     |

Admin ecommerce routes are mounted at `/api/admin/ecommerce` and require admin access. They are also guarded by the ecommerce site feature middleware.

| Area            | Capabilities                                           |
| --------------- | ------------------------------------------------------ |
| Products        | List, create, update, delete                           |
| Categories      | List, create, update, delete                           |
| Coupons         | List, create, update, delete                           |
| Orders          | List, detail, update status/notes, create manual order |
| Refunds         | Create full or partial refunds                         |
| Shipping        | Manage zones, rates, and shipments                     |
| Stripe settings | Read masked status, save settings, test connection     |

## Data Model

The ecommerce schema includes:

- `ecommerce_products`
- `ecommerce_categories`
- `ecommerce_product_categories`
- `ecommerce_customers`
- `ecommerce_orders`
- `ecommerce_order_items`
- `ecommerce_coupons`
- `ecommerce_coupon_redemptions`
- `ecommerce_refunds`
- `ecommerce_shipping_zones`
- `ecommerce_shipping_rates`
- `ecommerce_shipments`
- `ecommerce_integration_settings`
- `ecommerce_processed_webhook_events`

The schema stores money in integer cents. Product slugs, category slugs, order lookup tokens, Stripe payment intent IDs, Stripe refund IDs, and processed webhook event IDs have unique indexes where appropriate.

## Service Layer

The module uses focused services:

- `ecommerce-pricing.service.ts` prices carts and validates coupons.
- `ecommerce-order.service.ts` creates payment-intent orders and marks paid orders.
- `ecommerce-stripe.service.ts` resolves configured Stripe mode, clients, publishable keys, and webhook secrets.
- `ecommerce-refund.service.ts` creates refund records and integrates with Stripe refund behavior.
- `ecommerce-email.service.ts` sends order-status email.
- `system-ecommerce.service.ts` seeds starter categories and products.

Storage is centralized in `server/storage/ecommerce.storage.ts`.

## Webhook Processing

Ecommerce Stripe webhook events are processed separately from the existing subscription Stripe handler. Delivery state is stored in `ecommerce_processed_webhook_events`. An atomic claim prevents concurrent workers from starting the same event, failed attempts remain retryable, stale attempts can be reclaimed after five minutes, and per-attempt tokens keep expired workers from overwriting a newer attempt.

Current webhook behavior:

- `payment_intent.succeeded` validates the PaymentIntent identity and amount against the order, then reconciles paid-order effects.
- `payment_intent.payment_failed` and `payment_intent.canceled` cancel the pending order locally and release its stock reservation.
- `checkout.session.completed` settles a payment request and its linked order atomically. A linked
  request requires a PaymentIntent; if paid-order settlement cannot complete, neither local record is
  marked paid and the webhook remains retryable.
- `refund.created` and `refund.updated` reconcile refund records and order payment status.
- A successful handler marks the delivery `processed`; a thrown failure records bounded diagnostic text and returns an error so Stripe can retry.

Paid-order reconciliation locks the order row and commits the paid status, coupon redemption, coupon usage counter, inventory decrements, inventory adjustment records, and a deduplicated order-confirmation outbox record in one database transaction. Reprocessing the same order observes its existing redemption, inventory adjustments, and notification job. A worker reloads the order after commit and sends the receipt with bounded retry and failed-job visibility. Processed refunds queue a refund-confirmation job in their own create/update transaction; shipment creation and administrative order-status changes each queue their own durable notification job in the transaction that changes the corresponding record.

An administrator can requeue only a terminal failed notification job after reviewing the order history and
mail-provider logs. Requeuing preserves the lifetime attempt count and returns the job to the worker for one
new bounded attempt; it does not create a second job or reset the automatic retry cycle. The job retains the
manual-retry count, timestamp, and initiating administrator as operational evidence. The UI warns that a
provider may have accepted an earlier attempt despite reporting an error, so an operator must treat a manual
retry as potentially customer-visible duplicate delivery.

A captured order remains payable to fulfillment or refund reconciliation. Administrative cancellation is allowed only before capture or after the payment status is `refunded`; a paid, partially refunded, pending-refund, or failed-refund order cannot be marked cancelled as a shortcut around the refund lifecycle.

Tracked, non-backorder variants receive a database-backed stock reservation when checkout creates its
PaymentIntent. Reservations use deterministic variant locking and include every active reservation in their
availability check. They release when payment settles or the order is cancelled. After fifteen minutes, a
worker first cancels the Stripe PaymentIntent and releases inventory only after Stripe confirms cancellation;
this keeps a late provider payment from spending stock reserved by a later checkout.

Refund creation locks the order and reserves refundable balance in a local refund row before calling a payment provider. Only one pending refund is allowed per order, and its local ID becomes Stripe's idempotency key and webhook metadata. An ambiguous provider timeout leaves that reservation pending, blocks another refund, and can be reconciled by the signed Stripe webhook through the local ID. Operators must resolve a pending refund before submitting another one.

In production, an ecommerce Stripe webhook secret is required before unsigned ecommerce webhooks can be accepted.

## Feature Gate

The ecommerce module is controlled by `enable_ecommerce` in the `system_configuration` settings category. The shared default is enabled, and the runtime falls back to defaults if system configuration cannot be read.

The gate currently protects:

- Public ecommerce API routes
- Admin ecommerce API routes
- Public/admin route availability through site configuration-aware navigation and frontend checks

Turning the gate off hides access without deleting ecommerce data.

## Commerce upgrade execution

See [the approved execution plan](../ecommerce-upgrade-execution-plan.md) for scope, dependencies, findings, and validation status. Public physical checkout now requires an eligible, explicitly selected shipping rate. The shipping-rate endpoint returns an error when physical delivery is unavailable; an empty list indicates a cart that does not require shipping. Manual zero-price rates remain explicit free-shipping options. Ecommerce setup only lists integrations marked operational and not requiring an adapter; hidden definitions and saved settings are retained.
