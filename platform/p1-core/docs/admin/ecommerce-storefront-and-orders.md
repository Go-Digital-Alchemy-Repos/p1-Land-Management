# Ecommerce Storefront And Orders

The ecommerce app adds a public shop, product detail pages, cart checkout, order lookup, and an admin management area for catalog and order operations.

## Where To Find It

- Public shop: `/shop`
- Product pages: `/shop/:slug`
- Cart: `/cart`
- Checkout: `/checkout`
- Order success: `/order/success`
- Order lookup/status: `/order/status`
- Admin ecommerce: `Admin > Ecommerce`
- Feature toggle: `Admin > Settings > System Configuration > Enable Ecommerce`

If ecommerce is disabled in system configuration, the storefront, checkout, and ecommerce admin API return unavailable responses. Existing catalog, order, and customer data is preserved.

## Catalog Management

The admin ecommerce area includes tabs for:

- Products
- Categories
- Coupons
- Orders
- Shipping
- Refunds
- Stripe settings

The **Settings** menu opens Store origin and shipping markets, Customer accounts, Security Center,
Stripe settings, and Tax settings. Their direct paths are `/admin/ecommerce/settings/store`,
`/admin/ecommerce/settings/customer-accounts`, `/admin/ecommerce/settings/security`,
`/admin/ecommerce/settings/stripe`, and `/admin/ecommerce/settings/tax`.

Wait for the saved values to load before editing. If loading fails, use **Retry**; the form remains
unavailable until the load succeeds. If saving fails, the page keeps your entries and displays a
failure message so you can retry. Background refreshes preserve edits already in progress.

Products support draft or published status, active/inactive visibility, price and sale price, SKU, tags, feature lists, included-item lists, images, URL slug, and SEO metadata. Public product listings only show products that are both active and published.

Categories support active/inactive state, slug, description, image, parent ID, and sort order. Products can be associated to one or more categories.

## Checkout And Pricing

The cart pricing service calculates:

- Subtotal
- Discounts
- Shipping
- Tax calculated from the configured manual rate and taxable lines, with optional shipping tax
- Total

Coupons support fixed amount, percentage, and free-shipping types. Coupon rules include minimum order amount, maximum discount amount, maximum redemptions, per-customer limit, active windows, and optional guardrail fields for affiliate/VIP/margin handling.

Checkout creates ecommerce orders and Stripe payment intents. Stripe confirmation is handled through the ecommerce Stripe webhook flow before orders are marked paid.

The **Prepare Stripe Tax** setting records future provider intent. It does not activate automatic
Stripe Tax calculations; current tax calculation uses the configured manual rate.

## Orders, Refunds, And Shipping

Orders store customer, billing, shipping, marketing consent, line-item, payment, and lookup-token data. Admins can view orders, change status, create manual orders, issue full or partial refunds, and add shipments.

Order statuses:

- Pending
- Paid
- Shipped
- Delivered
- Cancelled

Payment statuses:

- Unpaid
- Paid
- Refund pending
- Partially refunded
- Refunded
- Refund failed

Creating a shipment moves the order to `shipped`. Order status changes can trigger ecommerce order-status email notifications.

## Stripe Settings

Ecommerce uses its own Stripe settings category. Admins can configure:

- Active mode: test or live
- Test publishable key
- Test secret key
- Test webhook secret
- Live publishable key
- Live secret key
- Live webhook secret

Secret keys are stored as secret settings. The admin status view masks configured values and exposes booleans for whether secret values are present.

## Seeded Storefront Content

System bootstrap seeds starter shop categories, products, a CMS shop page shell, and a main navigation shop item when they are missing. The bootstrap is additive: it does not overwrite existing products or manually edited menu items.

## Operational Notes

- Keep products in draft until copy, price, image, slug, and SEO metadata are ready.
- Use the site feature toggle to hide ecommerce for non-commerce sites.
- Verify Stripe mode and webhook secret before testing checkout.
- Use order lookup tokens for customer-facing status checks instead of exposing admin order detail routes.
- Do not store live credentials in source files, seed data, screenshots, or documentation.
