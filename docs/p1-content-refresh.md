# Public CMS content refresh

The public server shares one private-network source IP when reading Core content. Core retains its general API limit of300 requests per15minutes. The previous five-second per-component TTL could issue6,480 routine reads for35 busy routes, exceeding that limit and leaving updates on the last-valid fallback.

The default TTL now divides a150-read budget into complete refresh rounds across the manifest components. With36 components, four rounds give a225-second TTL and144 reads per15minutes. Successful admin publication through the public proxy still invalidates the cache immediately; the next visitor receives the new published revision. ETags, in-flight request coalescing, revision fencing and last-valid disk recovery are preserved.

This is a routine polling budget for the current single public process, not global rate enforcement. Restarts, publication invalidations and other traffic from the same IP consume additional requests. Missed invalidation or recovery after a backend failure can take up to225seconds under traffic. More replicas or substantial route growth require a coordinated cache or a revised read contract before scaling; do not simply disable Core limits.

Validation:11 content tests pass, including35routes visited everyfive seconds for15minutes,144 routine fetches, immediate revision2 publication and two additional fetches after invalidation. The exact prior implementation reproduced6,480 reads. Independent review also exercised Core's actual limiter: the new routine-plus-publication sequence had zero429 responses. These are local tests; staged and production public-server rollout remain required.
