import type { StyleSpecification } from "maplibre-gl";

export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

// Logistics Advisor's worldMapPalette("light"), applied to a street-level basemap.
export function applyLightMapStyle(
  _previous: StyleSpecification | undefined,
  next: StyleSpecification,
): StyleSpecification {
  return {
    ...next,
    layers: next.layers.map((layer) => {
      if (layer.type === "background")
        return { ...layer, paint: { ...layer.paint, "background-color": "#f4f7f4" } };
      if (layer.id === "water" && layer.type === "fill")
        return { ...layer, paint: { ...layer.paint, "fill-color": "#cce7f4" } };
      if (layer.id === "waterway" && layer.type === "line")
        return { ...layer, paint: { ...layer.paint, "line-color": "#8eb4c4" } };
      if (layer.id.startsWith("boundary_") && layer.type === "line")
        return { ...layer, paint: { ...layer.paint, "line-color": "#b4c7cd" } };
      return layer;
    }),
  };
}

export function hasMapCoordinates(latitude: unknown, longitude: unknown): boolean {
  const valid = (value: unknown, limit: number) =>
    (typeof value === "number" || (typeof value === "string" && value.trim() !== "")) &&
    Number.isFinite(Number(value)) &&
    Math.abs(Number(value)) <= limit;
  return valid(latitude, 90) && valid(longitude, 180);
}
