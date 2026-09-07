# Membership Access & Subscriptions

The membership module is a feature-gated paid-access layer for public users. It is separate from therapist directory subscriptions and ecommerce checkout, even though it also uses Stripe.

## Primary Surfaces

| Surface                  | Path                      | Purpose                                                                                                      |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Public membership page   | `/membership`             | Lists active public plans and lets authenticated users start checkout.                                       |
| Public API               | `/api/membership/*`       | Plan listing, current-user membership state, checkout session creation, and Stripe customer portal sessions. |
| Admin membership manager | `/admin/membership`       | Plan, price, entitlement, member, access-rule, payment, and activity management.                             |
| Admin API                | `/api/admin/membership/*` | Admin CRUD and manual subscription operations.                                                               |

The module is controlled by the `membership` site feature flag. Public and admin routes should remain unavailable when that feature is disabled.

## Core Concepts

- **Plan**: A purchasable or manually assignable membership product. Plans have slugs, public/draft/active status, display copy, and entitlements.
- **Price**: A billing option attached to a plan. Paid active plans must have at least one active paid price before publishing.
- **Subscription**: A user's current membership state. Active access includes `active`, `trialing`, `manual`, and `past_due` unless suspended or expired.
- **Entitlement**: A string capability assigned through a plan and checked by resource access rules.
- **Access rule**: A resource-level rule for content gating. Supported levels are public, logged-in users, any member, specific plans, or specific entitlements.
- **Audit event**: Membership actions such as manual assignment, status changes, and admin updates.

## Important Services

| Service                              | Responsibility                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `membership-plan.service.ts`         | Validates plan payloads, normalizes slugs, enforces paid-plan publish rules, and replaces entitlements. |
| `membership-access.service.ts`       | Evaluates whether a user can access a protected resource.                                               |
| `membership-subscription.service.ts` | Manual assignment and subscription status updates.                                                      |
| `membership-stripe.service.ts`       | Checkout, customer portal, masked settings status, and Stripe connection tests.                         |
| `membership-webhook.service.ts`      | Stripe webhook reconciliation for membership subscription events.                                       |

## Access Evaluation

Access checks flow through `canAccessResource(user, resourceType, resourceId)`.

1. Missing rule or `public` allows access.
2. Admins and editors can preview all protected resources.
3. Anonymous users fail non-public rules with `login_required`.
4. `logged_in` rules allow any authenticated user.
5. Membership rules require an active current subscription.
6. Plan rules require the current subscription plan to match a configured plan id.
7. Entitlement rules require at least one matching entitlement on the user's active plan.

When access is denied, callers should use the rule teaser and reason to render an upgrade or login prompt instead of exposing protected content.

## Admin Operations

- Create plans as draft first, then activate after price and entitlement setup.
- Use manual member assignment for comps, internal testing, offline payments, or migration support.
- Use activity logs when auditing why a user gained or lost access.
- Keep Stripe settings under the membership payment panel. Do not reuse ecommerce or directory subscription Stripe configuration unless the service explicitly supports it.
- Blank Stripe credential fields preserve the stored value. Replacing a credential requires a nonblank value; clearing one requires the explicit administrative API clear flag.
- Checkout success, cancellation, and customer-portal return URLs must use `APP_URL` or an origin listed in `TRUSTED_ORIGINS`.

## Stripe Webhook Recovery

Membership webhook deliveries are claimed atomically before subscription side effects begin. Successful deliveries are marked `processed`; failures are marked `failed` and remain eligible for a Stripe retry. A processing claim can be recovered after five minutes, and attempt tokens prevent an expired worker from completing or failing a newer retry.

The delivery record prevents concurrent duplicate handling and preserves failure details for operations. Subscription updates use existing upsert/update paths, but the business effects and audit insert are not yet one database transaction. Operators should inspect membership state and audit history before manually replaying an event that may have failed after a partial effect.

## Related Files

- `shared/schema/membership.ts`
- `server/routes/membership.routes.ts`
- `server/routes/admin/membership.routes.ts`
- `server/storage/membership.storage.ts`
- `client/src/features/public/membership-page.tsx`
- `client/src/features/admin/membership-page.tsx`
