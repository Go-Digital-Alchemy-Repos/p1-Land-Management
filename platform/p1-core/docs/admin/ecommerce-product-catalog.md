# Ecommerce Product Catalog

The ecommerce catalog now has a normalized foundation for Shopify-style product management while preserving existing product records and product-only cart behavior.

## Catalog Model

Products keep the existing public fields and add catalog metadata for short descriptions, type, vendor, compare-at price, cost, taxability, featured state, visibility, scheduling, physical/digital fulfillment, shipping dimensions, related products, upsells, and badges.

Each product has variants. Existing products are backfilled with a default variant so older storefront and cart flows continue to work. Future admin screens can add option groups such as size, color, material, or style and generate variant combinations.

Product media is normalized into a gallery table with primary image, sort order, alt text, variant assignment, external URLs, and future CMS media linkage.

## Variants And Inventory

Variants support SKU, barcode, price overrides, sale price, compare-at price, cost, inventory quantity, inventory tracking, low-stock threshold, backorder allowance, image, active state, and option-value snapshots.

Cart items can include `variantId`. If omitted, the server resolves the default variant for the product. Prices are always loaded server-side from the selected variant or product fallback.

Inventory is deducted only after an order is marked paid. Failed or abandoned checkouts do not change inventory.

## Order Snapshots

Order items now store variant ID, variant title, SKU, and option snapshots so product or variant edits do not rewrite historical order context.

## Current Limits

This foundation does not yet replace the admin product UI with the full Shopify-style editor. The next slice should build the admin product list/editor on top of these normalized tables.
