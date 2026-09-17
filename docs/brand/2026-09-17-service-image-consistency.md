# Service Hero and Grid Consistency

Owner requested that service hero replacements also update service-grid imagery.

Added canonical named image exports in `src/lib/service-images.ts`, used by all 10 service detail heroes, the shared homepage/services grid, and the 9 service images in the gallery. Fixed the stale Industrial & Agricultural grid image and the gallery's Industrial, Commercial, Grading, and Pond image mismatches. Updated the agricultural gallery label to fit the estate scene.

Existing responsive WebP handling, lazy loading, image accessibility, and CMS editing remain in place. Both CMS manifests are regenerated. The affected production pages had no published CMS overrides (page/global revisions 0) before release. Independent future CMS image overrides still require review; source hero replacements now share one reference across these surfaces.

Public QA now includes a rendered-output check comparing all 10 heroes against homepage and services cards, plus the 9 gallery images. Build, typecheck, 54-route public QA, content-overhaul checks, and hero/card equality checks passed. Initial JavaScript remains within its 150 KiB gzip budget at 145.1 KiB maximum. No new assets or dependencies were needed.
