# Interactive service-area map — September 17, 2026

The Owner requested a large interactive map above the two region cards on `/service-areas`, with pins linking to the corresponding location pages.

## Implementation

- `ServiceAreaMap.tsx` renders the map, state filters, zoom/reset controls, location selector, and a server-rendered list of all location links. Each pin is a real, keyboard-accessible anchor that navigates directly to its corresponding page. Selecting a location zooms to its pin and exposes a labeled page link.
- `service-locations.json` contains all 30 existing location routes (26 communities, three counties, and one regional overview). Both the map and the city-page sidebar consume this directory. Labels, state, coordinates, and destination URLs are maintained together.
- NC pins are blue; SC pins are clay. Hover/focus labels identify locations independently of color. The map uses cooperative gestures so normal page scrolling works, including on mobile.
- County coordinates are representative interior points, Mooresville & Lake Norman uses Mooresville's interior point, and Upstate SC has an explicitly approximate regional marker. Pins are not offices or coverage boundaries. That distinction appears below the map.
- MapLibre GL 6.7.0 matches the version already used by the platform, is BSD-3-Clause licensed, and reuses the existing workspace lockfile dependency graph. No competing map library or API key was introduced. MapLibre, its CSS, and its same-origin worker load when the map nears the viewport; the component disconnects observers and removes the map on unmount.
- The basemap uses the same OpenFreeMap Positron provider as the platform. Attribution remains visible. One narrowly scoped `connect-src` origin (`https://tiles.openfreemap.org`) is added to public document CSP so navigation into the map from other pages works. Script and worker execution remain same-origin; no wildcard or `unsafe-eval` allowance is added.
- A failed import, unavailable WebGL, style failure, or loading timeout exposes the full location directory. Map availability depends on the external tile provider; the server-rendered directory remains usable without it.

## Coordinate and map sources

Retrieved September 17, 2026:

- [Census 2025 Gazetteer](https://www.census.gov/geographies/reference-files/2025/geo/gazetter-file.html): [places](https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_place_national.zip) and [counties](https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_counties_national.zip), using `INTPTLONG` / `INTPTLAT` for the matching state and place.
- [OpenStreetMap Indian Land node 154086916](https://www.openstreetmap.org/node/154086916): community location (35.0018151, -80.8556287), rounded to four decimals. Indian Land is not a separately named place in the downloaded Census file.
- Upstate SC: illustrative regional overview point (-82.12, 34.79), not a geocoded business address.
- [OpenFreeMap setup and attribution](https://openfreemap.org/quick_start/).
- [MapLibre marker API](https://maplibre.org/maplibre-gl-js/docs/API/classes/Marker/).

## Validation

The production HTTP regression test checks the narrow map CSP on the homepage and directory (needed for client-side navigation), confirms map placement before the region cards, compares the location directory against every existing location route, checks coordinate ranges, and verifies server-rendered links.

Browser checks on the production HTTP server confirmed the basemap loads without CSP or console errors, SC filtering displays 16 pins, NC filtering displays 14 pins, the location selector focuses Greer, and clicking the Greer pin opens its correct page. At 390px the map has no horizontal overflow and its filtering and zoom controls work. Existing regional and county cards remain below the map.

Build output includes a MapLibre chunk-size warning (about 265 KB gzip for the lazily loaded library plus its worker/CSS), as well as the existing UI sourcemap warnings. Keep map code lazy; do not move it into the site's startup bundle.

This change is local implementation only; production release is not included.

Final checks: website typecheck, layout and navigation checks, production build with all 54 routes prerendered, and all 29 server tests passed. `git diff --check` passed.
