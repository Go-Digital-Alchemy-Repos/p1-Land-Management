# Ecommerce UX Backlog

This note captures the next ecommerce experience passes so visible improvements can keep landing in small, verified slices.

## Next Passes

- Order drawer UX polish: keep the wide slide-out drawer, but organize it around customer, shipping, items, payment, notes, status, and fulfillment.
- Tracking and fulfillment history: show carrier, tracking number, tracking URL, timestamps, notification status, and fulfillment events clearly.
- Customer-facing order detail improvements: mirror shipment status, tracking links, shipping address, and invoice actions in the customer account area.
- Checkout address and store markets: replace free-text regions with country-aware state/province selectors and saved address selection.
- CMS-grade ecommerce content controls: use authenticated CMS upload/drop-zone/media library selectors for editable ecommerce media and the standard rich text editor for long-form product content.

## Implementation Defaults

- Keep media values URL-compatible for the current ecommerce schema.
- Prefer existing CMS upload, media library, and rich text components over ecommerce-specific duplicates.
- Treat deeper media identity linking through `mediaId` as a future hardening pass.
