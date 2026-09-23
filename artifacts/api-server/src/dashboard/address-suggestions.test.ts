import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizeAddressSuggestions,
  searchAddressSuggestions,
} from "./address-suggestions";

test("normalizes only usable US address results without trusting provider fields", () => {
  assert.deepEqual(
    normalizeAddressSuggestions([
      {
        place_id: "place-1",
        country_code: "us",
        name: "Example Office",
        housenumber: "100",
        street: "North Tryon Street",
        city: "Charlotte",
        state_code: "NC",
        postcode: "28202",
        formatted: "100 North Tryon Street, Charlotte, NC 28202, United States",
      },
      {
        country_code: "ca",
        address_line1: "100 King St",
        formatted: "100 King St, Toronto",
      },
      { country_code: "us", formatted: "North Carolina, United States" },
    ]),
    [
      {
        id: "place-1",
        label: "100 North Tryon Street, Charlotte, NC 28202, United States",
        line1: "100 North Tryon Street",
        city: "Charlotte",
        state: "NC",
        postalCode: "28202",
        businessName: "Example Office",
      },
    ],
  );
});

test("queries the US autocomplete endpoint with a key confined to the server request", async () => {
  let requested: URL | undefined;
  const fetcher = (async (input: URL) => {
    requested = input;
    return {
      ok: true,
      json: async () => ({
        results: [
          {
            country_code: "us",
            address_line1: "100 N Tryon St",
            city: "Charlotte",
            state_code: "NC",
            postcode: "28202",
            formatted: "100 N Tryon St, Charlotte, NC 28202",
          },
        ],
      }),
    } as Response;
  }) as typeof fetch;
  const suggestions = await searchAddressSuggestions(
    "100 N Tryon",
    "test-key",
    fetcher,
  );
  assert.equal(requested?.origin, "https://api.geoapify.com");
  assert.equal(requested?.searchParams.get("filter"), "countrycode:us");
  assert.equal(requested?.searchParams.get("text"), "100 N Tryon");
  assert.equal(requested?.searchParams.get("apiKey"), "test-key");
  assert.equal(suggestions[0]?.postalCode, "28202");
});
