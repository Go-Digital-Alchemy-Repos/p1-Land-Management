import assert from "node:assert/strict";
import test from "node:test";
import { coordinatesFromCensusResponse } from "./property-geocoding";

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
