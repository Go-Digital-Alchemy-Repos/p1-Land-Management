# ADR-004: Stripe Integration for Payments

## Status

Accepted

## Context

The application needs to handle therapist membership subscriptions and one-time recording purchases. We needed a payment processing solution.

## Decision

We chose **Stripe** for all payment processing:

- **Subscriptions**: Managed via Stripe Checkout Sessions and Customer Portal
- **One-time purchases**: Recording purchases via Stripe Checkout
- **Webhooks**: `POST /api/stripe/webhook` processes Stripe events to keep local subscription state in sync
- **Webhook verification**: Events are verified via signature using `STRIPE_WEBHOOK_SECRET`

### Route Structure

- `POST /api/stripe/create-checkout-session` — Creates a Stripe Checkout session for subscription
- `POST /api/stripe/create-portal-session` — Creates a Stripe Customer Portal session
- `POST /api/stripe/webhook` — Handles Stripe webhook events
- Various recording purchase endpoints

### Data Model

- `therapist_subscriptions` table tracks subscription status, Stripe customer ID, and subscription ID
- `membership_tiers` table defines available plans with Stripe price IDs
- `recording_purchases` table tracks one-time purchases

## Consequences

- **Positive**: Industry-standard payment processing with PCI compliance handled by Stripe
- **Positive**: Customer Portal allows users to manage their own subscriptions
- **Positive**: Webhook-driven state sync ensures local data stays current
- **Negative**: Requires `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` environment variables
- **Negative**: Webhook processing must be idempotent (Stripe may retry events)
- **Trade-off**: Stripe fees vs. self-hosted payment processing complexity
