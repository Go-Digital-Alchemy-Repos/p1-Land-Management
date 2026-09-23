type CensusAddressMatch = {
  coordinates?: { x?: unknown; y?: unknown };
};

export type PropertyCoordinates = {
  latitude: number;
  longitude: number;
};

export type StructuredPropertyAddress = {
  addressLine1: string | null;
  city: string | null;
  state: string | null;
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

const normalizeStreet = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/** A provider may silently change a ZIP code; only trust an exact street, city, and state match. */
export function coordinatesFromGeoapifyResponse(
  body: unknown,
  expected: StructuredPropertyAddress,
): PropertyCoordinates | null {
  if (!expected.addressLine1 || !expected.city || !expected.state) return null;
  const results = (body as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) return null;
  for (const result of results) {
    if (!result || typeof result !== "object") continue;
    const match = result as Record<string, unknown>;
    const street = [match.housenumber, match.street].filter((part) => typeof part === "string").join(" ");
    const rank = match.rank as { match_type?: unknown } | undefined;
    if (
      rank?.match_type !== "full_match" ||
      match.country_code !== "us" ||
      normalizeStreet(street) !== normalizeStreet(expected.addressLine1) ||
      typeof match.city !== "string" ||
      match.city.toLowerCase() !== expected.city.toLowerCase() ||
      match.state_code !== expected.state.toUpperCase() ||
      !valid(match.lat, 90) ||
      !valid(match.lon, 180)
    ) continue;
    return { latitude: match.lat, longitude: match.lon };
  }
  return null;
}

/**
 * Resolve a US street address without exposing a map-provider credential in the
 * browser. This is best-effort: property creation remains available if an
 * address is new, rural, non-US, or the provider is temporarily unavailable.
 */
export async function geocodePropertyAddress(
  address: string,
  structured?: StructuredPropertyAddress,
  fetcher: typeof fetch = fetch,
  geoapifyKey = process.env.GEOAPIFY_API_KEY,
): Promise<PropertyCoordinates | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
    url.search = new URLSearchParams({
      address,
      benchmark: "Public_AR_Current",
      format: "json",
    }).toString();
    const response = await fetcher(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (response.ok) {
      const coordinates = coordinatesFromCensusResponse(await response.json());
      if (coordinates) return coordinates;
    }
  } catch {
    // Try the configured address provider when Census cannot locate the street.
  } finally {
    clearTimeout(timeout);
  }
  if (!structured?.addressLine1 || !structured.city || !structured.state || !geoapifyKey) return null;
  try {
    const url = new URL("https://api.geoapify.com/v1/geocode/search");
    url.searchParams.set("text", address);
    url.searchParams.set("format", "json");
    url.searchParams.set("filter", "countrycode:us");
    url.searchParams.set("limit", "5");
    url.searchParams.set("apiKey", geoapifyKey);
    const response = await fetcher(url, {
      signal: AbortSignal.timeout(5_000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return coordinatesFromGeoapifyResponse(await response.json(), structured);
  } catch {
    return null;
  }
}
