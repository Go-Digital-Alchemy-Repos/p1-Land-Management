import type { CSSProperties } from "react";
import { normalizeHexColor } from "./section-style";

export function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function num(v: unknown, fallback = 3): number {
  return typeof v === "number" ? v : fallback;
}

export function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export function colorStyle(value: unknown, fallback?: string) {
  const normalized = normalizeHexColor(str(value)) || fallback || "";
  return normalized ? { color: normalized } : undefined;
}

const MOBILE_IMAGE_HEIGHT_MAP: Record<string, string> = {
  auto: "auto",
  sm: "240px",
  md: "320px",
  lg: "420px",
  xl: "520px",
};

export function getMobileImageStyles(props: Record<string, unknown>): CSSProperties {
  const fit = str(props.mobileImageFit) || "cover";
  const heightKey = str(props.mobileImageHeight) || "auto";
  const height = MOBILE_IMAGE_HEIGHT_MAP[heightKey] ?? MOBILE_IMAGE_HEIGHT_MAP.auto;
  const positionX = Math.max(0, Math.min(100, num(props.mobileImagePositionX, 50)));
  const positionY = Math.max(0, Math.min(100, num(props.mobileImagePositionY, 50)));

  return {
    ["--mobile-image-fit" as string]: fit,
    ["--mobile-image-height" as string]: height,
    ["--mobile-image-position" as string]: `${positionX}% ${positionY}%`,
  };
}

export function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  return match ? match[1] : null;
}

export function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

export const SPACING_MAP: Record<string, string> = {
  xs: "h-4",
  sm: "h-8",
  md: "h-16",
  lg: "h-24",
  xl: "h-32",
};

export const IMAGE_WIDTH_MAP: Record<string, string> = {
  full: "w-full",
  contained: "max-w-4xl mx-auto",
  narrow: "max-w-2xl mx-auto",
};

const LEGACY_CMS_ASSET_MAP: Record<string, string> = {
  "/images/hero-therapy-session.png": "/images/hero-therapy-session-1920w.webp",
};

export function resolveCmsAssetUrl(url: string): string {
  return LEGACY_CMS_ASSET_MAP[url] ?? url;
}
