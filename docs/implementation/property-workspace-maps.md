# Property workspace and client portfolio maps

Property maps use the same OpenFreeMap Positron grayscale style and blue, white-outlined pins as the public service-area map. The property workspace starts at neighborhood scale and no longer asserts a fixed one-mile context as users pan or zoom.

The client command center's Properties card contains a full-width, 288px-high map directly above its property list. Pins use only the properties already returned by the authorized client workspace endpoint; each pin opens that property's profile. Multiple locations fit into the viewport; a single location is centered. No new API, geocoding, provider, credential or permission is introduced. The property list remains the accessible navigation alternative.

Missing/invalid coordinates are excluded rather than coerced to zero. An account without mapped properties gets an explicit empty state. Required map attribution and zoom controls remain. The map stays lazy-loaded.

Validation: Dashboard type check and production build passed; coordinate-validation regression test passed. Live verification follows deployment; no property data changes are needed for map rendering.
