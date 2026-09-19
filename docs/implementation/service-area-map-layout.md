# Service area directory: map-first layout

Owner request, September 18, 2026: remove the /service-areas hero and show the regional map at full viewport width directly below site navigation.

The map now sits outside the shared content-width container. Its heading is the page H1 beneath the map; filters, location selector, accessible fallback directory, attribution, county cards, FAQs and metadata remain. Map heights stay responsive (440px mobile, 560px larger screens). The CMS manifests remove the retired hero fields. Individual service-area pages are unchanged.

Validation: website typecheck, production build/prerender, shared layout check and diff whitespace check pass. Prerender inspection confirms one H1, no retired hero and map-before-heading order. No database or deployment configuration changes. Rollback is a normal revert of this scoped change on the reconciled main branch.
