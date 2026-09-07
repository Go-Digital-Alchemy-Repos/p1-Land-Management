# Ecommerce Coupons

The ecommerce coupon system supports fixed discounts, percentage discounts, and free-shipping promotions. Coupon codes are normalized to uppercase, validated server-side against the priced cart, and recorded only after an order is successfully marked paid.

## Data Model

Coupons store the public code, optional internal name, description, notes, discount type, value, subtotal thresholds, maximum discount, start and end windows, active state, global usage limit, per-customer usage limit, customer eligibility, product/category inclusion rules, product/category exclusion rules, stacking behavior, tax timing metadata, archived state, and creator/updater references.

Orders keep the applied coupon code, discount amount, and a coupon metadata snapshot so historical reporting does not depend on later coupon edits.

Coupon redemptions link the coupon to the paid order, customer, customer email, coupon code, discount amount, and redemption time.

## Admin Workflow

Use `Ecommerce > Coupons` to create, edit, duplicate, archive, filter, and report on coupon codes.

Status badges are derived from the coupon lifecycle:

- `Active`: enabled and inside the configured date window.
- `Inactive`: disabled by an admin.
- `Scheduled`: start date is in the future.
- `Expired`: end date is in the past.
- `Usage limit reached`: total usage has reached the configured limit.
- `Archived`: removed from active management without deleting historical reporting.

## Checkout Flow

Checkout sends product IDs, quantities, and the coupon code. The server reloads products from the database, calculates line totals, evaluates coupon eligibility, and returns the final totals. The client never provides trusted prices.

Coupon usage is not recorded during validation or PaymentIntent creation. Usage is recorded when the order is marked paid by the payment success path.

## Known Limits

BOGO campaigns are not yet implemented as a first-class discount type. The current system is structured so a future `bogo` type can be added without replacing coupon validation.
