# Membership Bolt-On App — Master Prompt

Append this prompt to [00 — Universal Bolt-On App Contract](./00-universal-bolt-on-app-contract.md).

---

Build the complete **Membership** bolt-on app described below.

## App Registration

- App id/slug: `membership`
- Display name: configurable, default `Membership`
- Core Platform feature key: `membershipEnabled`
- Core Platform persisted setting: `system_configuration.enable_membership`
- Core Platform default: enabled; use disabled for a fresh external installation unless explicitly configured otherwise
- Public route: `/membership`
- Authenticated public API family: `/api/membership`
- Admin route family: `/admin/membership`
- Admin API family: `/api/admin/membership`
- Core permission: administrator-only; map plan, member, access-rule, payment, and settings actions to least-privilege host permissions when available

## Product Goal

Provide paid and manually assigned membership plans, prices, entitlements, subscription lifecycle, customer checkout/portal, resource-level access rules, payment reconciliation, member administration, and audit history.

Membership is a general paid-access layer for host users. Keep it separate from Directory listing subscriptions, Events registration payments, and Ecommerce checkout even when they share a payment provider.

## Domain Model

Implement host-equivalent, namespaced models for:

- plans with name, unique slug, description/display copy, draft/active/public state, sort order, and provider product metadata;
- plan prices with amount in minor units, currency, interval/interval count or one-time/manual semantics, active state, provider price id, and display order;
- plan entitlements as stable namespaced capability keys with optional descriptions;
- user subscriptions with plan, selected price, provider customer/subscription ids, status, manual/provider source, start, trial, current period, cancellation, expiry, suspension, and timestamps;
- resource access rules with resource type/id, public/logged-in/member/plan/entitlement access level, allowed plan ids, allowed entitlement keys, teaser/upgrade copy, and timestamps;
- processed webhook events for idempotency;
- audit events for plan, entitlement, access-rule, assignment, status, suspension, cancellation, and reconciliation actions;
- membership payment/settings records with environment/mode and masked provider status.

Use Core Platform's active-access statuses as the default: `active`, `trialing`, `manual`, and `past_due` grant access unless suspended or expired. Define behavior for incomplete, paused, canceled, unpaid, and ended states explicitly.

## Public And Member Experience

Build:

- public membership page listing active public plans and active prices in configured order;
- clear benefits/entitlements, billing interval, price/currency, CTA, current-plan state, and accessible comparison layout;
- authenticated checkout-session creation after the server reloads the selected plan and active price;
- current-user membership state;
- payment-provider customer-portal session;
- success/cancel return handling that re-reads server subscription state;
- upgrade/login teaser behavior for protected resources without exposing protected content;
- host-native loading, empty, already-member, payment-unavailable, and error states.

Do not expose provider secrets, other members, private audit data, hidden plans, inactive prices, or protected resource content.

## Access Evaluation

Create one authoritative service equivalent to:

`canAccessResource(user, resourceType, resourceId)`

Evaluate in this order:

1. Missing rule or `public` allows access.
2. Authorized administrators/editors may preview protected content if host policy allows.
3. Anonymous users fail non-public rules with a machine-readable `login_required` reason.
4. `logged_in` allows any authenticated eligible user.
5. `member` requires a current active-access subscription.
6. `plan` requires the current subscription's plan in the rule's allowed plan set.
7. `entitlement` requires at least one matching entitlement on the active plan.
8. Suspension or expiry overrides otherwise active access.

Return a minimal decision object with allowed state, reason, and safe teaser/CTA information. Never return the protected resource as part of a denial response.

Enforce access in the server resource endpoint or service that loads protected content. A client-only paywall is insufficient.

## Admin Experience

Create a Membership workspace for:

- plan list and create/edit;
- active prices and provider synchronization;
- entitlement editing;
- publish validation: an active paid plan cannot become public without at least one active paid price;
- members/subscriptions list and detail;
- manual assignment for comps, migration, offline payment, or internal use;
- subscription status/suspension/expiry changes with explicit reasons;
- access-rule list/editor by resource type/id and access level;
- payments/provider status and connection test;
- membership settings and public copy;
- searchable audit/activity history.

Use confirmation and audit for access-removing or billing-impacting changes.

## Payments And Webhooks

- Keep Membership provider settings in a membership-specific namespace.
- Store secrets encrypted; expose configured flags and masked identifiers only.
- Create checkout/portal sessions server-side using verified host user identity.
- Reconcile subscription create/update/delete, checkout completion, and payment-state events through verified idempotent webhooks.
- Store processed event ids and tolerate delivery order/retries.
- Make manual assignment independent of provider availability.
- Do not cancel provider subscriptions merely because the feature app is disabled. Continue the narrow reconciliation needed to preserve accurate billing state and give administrators a documented operational path.

## Cross-App Integration

- CMS, Blog, Events, downloads, or other resource apps may call Membership through the access-evaluation adapter.
- Membership must not import those apps' internal route/page code.
- A protected app being disabled takes precedence over membership access.
- If Membership is disabled, dependent resources must follow a product-approved fallback—normally deny member-only content safely or remove the protected entry point, never silently make paid content public.
- Search, sitemap, feeds, previews, and server rendering must not leak protected bodies.

## Membership Acceptance Criteria

- Administrators can create a plan, add an active price and entitlements, publish it, and configure resource access.
- An authenticated user can start checkout, return, have a verified webhook reconcile the subscription, view current membership, and open the provider portal.
- Manual assignment and status changes work without the payment provider and create audit events.
- Access decisions are correct for anonymous, logged-in, member, plan, entitlement, administrator-preview, suspended, and expired states.
- Protected content is enforced on the server and excluded from public discovery/snippets.
- Disabling Membership removes plan/checkout/portal/admin surfaces and new membership operations while preserving plans, members, rules, audit history, provider ids, and narrow billing reconciliation. It never converts protected content to public.

---
