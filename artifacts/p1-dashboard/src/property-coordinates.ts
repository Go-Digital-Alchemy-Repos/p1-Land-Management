export type PropertyCoordinates = {
  latitude: number;
  longitude: number;
};

type CoordinateSource = {
  latitude?: number | string | null;
  longitude?: number | string | null;
};

function coordinate(value: number | string | null | undefined, limit: number) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && !value.trim()) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) && Math.abs(numeric) <= limit ? numeric : null;
}

/**
 * Coordinates arrive from PostgreSQL as numbers or numeric strings. Do not use
 * Number(value) directly: null and an empty string both coerce to zero.
 */
export function propertyCoordinates(
  property: CoordinateSource,
): PropertyCoordinates | null {
  const latitude = coordinate(property.latitude, 90);
  const longitude = coordinate(property.longitude, 180);
  return latitude === null || longitude === null ? null : { latitude, longitude };
}
