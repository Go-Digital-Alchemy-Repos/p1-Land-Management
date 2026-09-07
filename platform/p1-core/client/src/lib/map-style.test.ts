import { describe, expect, it } from "vitest";
import { applyLightMapStyle, hasMapCoordinates } from "./map-style";
import type { StyleSpecification } from "maplibre-gl";

describe("map coordinates", () => {
  it("rejects missing, malformed and out-of-range coordinates while accepting zero", () => {
    for (const value of [null, undefined, "", " ", "45junk", NaN, Infinity, false]) {
      expect(hasMapCoordinates(value, 0)).toBe(false);
      expect(hasMapCoordinates(0, value)).toBe(false);
    }
    expect(hasMapCoordinates(91, 0)).toBe(false);
    expect(hasMapCoordinates(0, -181)).toBe(false);
    expect(hasMapCoordinates("0", 0)).toBe(true);
    expect(hasMapCoordinates("35.2", "-80.8")).toBe(true);
  });
});

it("applies the Logistics Advisor light palette without changing sources or street detail", () => {
  const style: StyleSpecification = {
    version: 8,
    sources: {},
    layers: [
      { id: "background", type: "background" },
      { id: "water", type: "fill", source: "basemap" },
      { id: "boundary_2", type: "line", source: "basemap", paint: { "line-width": 2 } },
      { id: "road", type: "line", source: "basemap", paint: { "line-color": "white" } },
    ],
  };
  const next = applyLightMapStyle(undefined, style);
  expect(next.sources).toBe(style.sources);
  expect(next.layers[0].paint).toEqual({ "background-color": "#f4f7f4" });
  expect(next.layers[1].paint).toEqual({ "fill-color": "#cce7f4" });
  expect(next.layers[2].paint).toEqual({ "line-width": 2, "line-color": "#b4c7cd" });
  expect(next.layers[3]).toBe(style.layers[3]);
  expect(style.layers[0].paint).toBeUndefined();
});
