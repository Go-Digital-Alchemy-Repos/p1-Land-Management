type CensusAddressMatch = {
  coordinates?: { x?: unknown; y?: unknown };
};

export type PropertyCoordinates = {
  latitude: number;
  longitude: number;
};

const valid = (value: unknown, limit: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;

/**
 * Extract a usable point from the Census geocoder's documented response shape.
 * Keeping parsing separate makes the network boundary easy to test and ensures
 * a malformed provider response can never write invalid coordinates.
 */
export function coordinatesFromCensusResponse(body: unknown): PropertyCoordinates | null {
  const match = (body as { result?: { addressMatches?: CensusAddressMatch[] } } | null)?.result
    ?.addressMatches?.[0];
  const longitude = match?.coordinates?.x;
  const latitude = match?.coordinates?.y;
  return valid(latitude, 90) && valid(longitude, 180) ? { latitude, longitude } : null;
}

/**
 * Resolve a US street address without exposing a map-provider credential in the
 * browser. This is best-effort: property creation remains available if an
 * address is new, rural, non-US, or the provider is temporarily unavailable.
 */
export async function geocodePropertyAddress(address: string): Promise<PropertyCoordinates | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
    url.search = new URLSearchParams({
      address,
      benchmark: "Public_AR_Current",
      format: "json",
    }).toString();
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return coordinatesFromCensusResponse(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
