# New city-page sidebar — September 17, 2026

Implemented the Owner's request for a right-hand sidebar on the 19 new city pages using the shared LocationPage template. LocationSidebar provides a navy/contour CTA with assessment and phone links, followed by all 30 existing location routes grouped alphabetically under North Carolina and South Carolina. The current city uses aria-current and a visible highlight. The sidebar and interactive service-area map share service-locations.json, which includes the existing city, county, and regional routes.

The 320px sidebar sits beside the content at desktop widths (1024px and up) and stacks below it on smaller screens. No new dependencies, routes, service claims, or backend changes. Production deployment is not part of this change.

Validation: website typecheck, production build/prerender, layout and navigation checks passed. Prerendered HTML verified all 19 city pages include exactly the full set of 30 location routes without duplicates. Browser inspection at 1280px and 390px confirmed no horizontal overflow, mobile stacking, current-city indication, white CTA heading contrast, and navigation to the contact page. The build emits sourcemap warnings for existing UI components but completes successfully.
