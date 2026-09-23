export type AddressSuggestion = {
  id: string;
  label: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  businessName: string | null;
};

type GeoapifyResult = {
  place_id?: unknown;
  formatted?: unknown;
  address_line1?: unknown;
  name?: unknown;
  housenumber?: unknown;
  street?: unknown;
  city?: unknown;
  state_code?: unknown;
  postcode?: unknown;
  country_code?: unknown;
};

const string = (value: unknown, max = 200) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/** Keep the provider's untrusted response inside a small, US-only dashboard contract. */
export function normalizeAddressSuggestions(
  results: unknown,
): AddressSuggestion[] {
  if (!Array.isArray(results)) return [];
  return results
    .slice(0, 8)
    .flatMap((raw: GeoapifyResult, index) => {
      if (
        !raw ||
        typeof raw !== "object" ||
        string(raw.country_code).toLowerCase() !== "us"
      )
        return [];
      const street = [string(raw.housenumber, 20), string(raw.street)]
        .filter(Boolean)
        .join(" ");
      const line1 = street || string(raw.address_line1);
      const city = string(raw.city, 100);
      const state = string(raw.state_code, 10)
        .replace(/^US-/i, "")
        .toUpperCase();
      const postalCode = string(raw.postcode, 10);
      const label = string(raw.formatted, 300);
      if (!label || !line1) return [];
      return [
        {
          id: string(raw.place_id, 120) || String(index),
          label,
          line1,
          city,
          state: /^[A-Z]{2}$/.test(state) ? state : "",
          postalCode: /^\d{5}(?:-\d{4})?$/.test(postalCode) ? postalCode : "",
          businessName: string(raw.name, 160) || null,
        },
      ];
    })
    .slice(0, 5);
}

export async function searchAddressSuggestions(
  query: string,
  apiKey: string,
  fetcher: typeof fetch = fetch,
): Promise<AddressSuggestion[]> {
  const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
  url.searchParams.set("text", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("filter", "countrycode:us");
  url.searchParams.set("bias", "proximity:-80.89,35.23");
  url.searchParams.set("limit", "5");
  url.searchParams.set("apiKey", apiKey);
  const response = await fetcher(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("Address suggestion provider unavailable");
  const payload = (await response.json()) as { results?: unknown };
  return normalizeAddressSuggestions(payload.results);
}
