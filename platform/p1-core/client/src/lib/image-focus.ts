import type { CSSProperties } from "react";

function normalizePercentage(value: unknown, fallback = 50) {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numericValue)) return fallback;
  return Math.max(0, Math.min(100, numericValue));
}

export function getImageObjectPosition(positionX?: unknown, positionY?: unknown) {
  return `${normalizePercentage(positionX)}% ${normalizePercentage(positionY)}%`;
}

export function getImageObjectPositionStyle(
  positionX?: unknown,
  positionY?: unknown,
): CSSProperties {
  return {
    objectPosition: getImageObjectPosition(positionX, positionY),
  };
}
