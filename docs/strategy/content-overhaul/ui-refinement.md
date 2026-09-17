# Public Website UI Refinement

Owner request: improve the related-link sections at the bottom of service pages and use title case throughout the public website.

- Shared related links now separate service/resource cards from compact location navigation on a subtly tinted background. Whole-card targets, visible keyboard focus, mobile stacking, and reduced-motion-aware arrows are retained.
- Repetitive location descriptions are removed from this navigation. All prescribed destinations and meaningful anchor wording remain, with title-case labels.
- Commercial landscaping and pond management specialist links are consolidated into their related-services cards, removing competing standalone sections.
- Public headings use a shared editorial title-case formatter after CMS resolution, retaining content keys and body copy. Browser/social titles and shared location/grid headings use the same formatter. FAQ question text and customer names remain unchanged. Acronyms, contractions and brand names are preserved.
- No new dependencies, database changes, form changes, or generated images are required.

Validation: title formatter tests, TypeScript, 54-route SSR/CMS/metadata/FAQ checks, required linking checks, navigation/layout checks, and 28 server tests. Desktop and 390px mobile commercial landscaping sections inspected in the browser. CMS manifests regenerated together. Existing production-release authorization applies.
