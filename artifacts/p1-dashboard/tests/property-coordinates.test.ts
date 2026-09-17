import assert from "node:assert/strict";
import test from "node:test";
import { propertyCoordinates } from "../src/property-coordinates";

test("property map coordinates reject missing, blank, and invalid values without coercing them to zero", () => {
  assert.deepEqual(
    propertyCoordinates({ latitude: "34.8378", longitude: "-80.6106" }),
    { latitude: 34.8378, longitude: -80.6106 },
  );
  for (const point of [
    { latitude: null, longitude: null },
    { latitude: "", longitude: "" },
    { latitude: " ", longitude: "-80.61" },
    { latitude: "91", longitude: "-80.61" },
    { latitude: "34.8", longitude: "181" },
    { latitude: "not-a-coordinate", longitude: "-80.61" },
  ])
    assert.equal(propertyCoordinates(point), null);
});
