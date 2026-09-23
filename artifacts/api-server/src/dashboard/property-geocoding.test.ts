import assert from "node:assert/strict";
import test from "node:test";
import {
  coordinatesFromCensusResponse,
  coordinatesFromGeoapifyResponse,
  geocodePropertyAddress,
} from "./property-geocoding";

test("property coordinate parsing accepts valid Census address matches", () => {
  assert.deepEqual(
    coordinatesFromCensusResponse({
      result: { addressMatches: [{ coordinates: { x: -80.61, y: 34.84 } }] },
    }),
    { latitude: 34.84, longitude: -80.61 },
  );
});

test("property coordinate parsing rejects absent and out-of-range locations", () => {
  assert.equal(coordinatesFromCensusResponse({ result: { addressMatches: [] } }), null);
  assert.equal(
    coordinatesFromCensusResponse({
      result: { addressMatches: [{ coordinates: { x: -181, y: 34.84 } }] },
    }),
    null,
  );
});

const stallings = { addressLine1: "12063 Guion Lane", city: "Stallings", state: "NC" };
const providerResult = {
  results: [{
    housenumber: "12063",
    street: "Guion Lane",
    city: "Stallings",
    state_code: "NC",
    postcode: "28105",
    country_code: "us",
    lat: 35.09989,
    lon: -80.678539,
    rank: { match_type: "full_match" },
  }],
};

test("Geoapify fallback accepts the exact street when its ZIP differs", () => {
  assert.deepEqual(coordinatesFromGeoapifyResponse(providerResult, stallings), {
    latitude: 35.09989,
    longitude: -80.678539,
  });
  assert.equal(coordinatesFromGeoapifyResponse(providerResult, { ...stallings, city: "Charlotte" }), null);
  assert.equal(coordinatesFromGeoapifyResponse(providerResult, { ...stallings, addressLine1: "12064 Guion Lane" }), null);
  assert.equal(coordinatesFromGeoapifyResponse({ results: [{ ...providerResult.results[0], rank: { match_type: "partial_match" } }] }, stallings), null);
});

test("property geocoding falls back to exact Geoapify result only after Census misses", async () => {
  const requests: string[] = [];
  const fetcher = (async (input: string | URL | Request) => {
    const url = String(input);
    requests.push(url);
    return new Response(JSON.stringify(url.includes("census.gov")
      ? { result: { addressMatches: [] } }
      : providerResult), { status: 200 });
  }) as typeof fetch;
  const coordinates = await geocodePropertyAddress(
    "12063 Guion Lane, Stallings, NC 28104", stallings, fetcher, "test-key",
  );
  assert.deepEqual(coordinates, { latitude: 35.09989, longitude: -80.678539 });
  assert.equal(requests.length, 2);
  assert.match(requests[1], /geoapify\.com/);
});
