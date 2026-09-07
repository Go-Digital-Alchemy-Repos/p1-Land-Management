import type { CSSProperties, ReactNode } from "react";

export const DEFAULT_SECTION_LINEAR_GRADIENT = "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)";
export const DEFAULT_SECTION_PADDING = "md";

const SECTION_PADDING_CLASS_MAP: Record<string, string> = {
  none: "0",
  xs: "4 sm:6",
  sm: "6 sm:8",
  md: "8 sm:14",
  lg: "10 sm:16",
  xl: "14 sm:20",
};

interface SectionStyleConfig {
  backgroundColor: string;
  backgroundImageUrl: string;
  backgroundPositionX: number;
  backgroundPositionY: number;
  backgroundOverlayColor: string;
  backgroundOverlayOpacity: number;
  showRadialGradient: boolean;
  radialGradientColor: string;
  radialGradientPosition: "top" | "bottom";
  borderTopWidth: number;
  borderTopColor: string;
  borderBottomWidth: number;
  borderBottomColor: string;
  paddingTop: string;
  paddingBottom: string;
}

interface SectionStyleWrapperProps {
  props: Record<string, unknown>;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  resolveAssetUrl?: (url: string) => string;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function num(v: unknown, fallback = 50): number {
  return typeof v === "number" ? v : fallback;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function clampBorderWidth(value: number) {
  return Math.max(0, Math.min(24, value));
}

function normalizePaddingValue(value: unknown): string {
  const normalized = str(value).trim().toLowerCase();
  return SECTION_PADDING_CLASS_MAP[normalized] ? normalized : DEFAULT_SECTION_PADDING;
}

export function normalizeHexColor(value: string): string {
  const trimmed = value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    return trimmed.length === 4
      ? `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
      : trimmed;
  }
  return "";
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return `rgba(137, 205, 161, ${alpha})`;
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getSectionStyleConfig(
  props: Record<string, unknown>,
  options?: { resolveAssetUrl?: (url: string) => string },
): SectionStyleConfig {
  const resolveAssetUrl = options?.resolveAssetUrl ?? ((url: string) => url);
  const backgroundImageUrl = resolveAssetUrl(str(props.sectionBackgroundImageUrl));

  return {
    backgroundColor: normalizeHexColor(str(props.sectionBackgroundColor)),
    backgroundImageUrl,
    backgroundPositionX: clampPercent(num(props.sectionBackgroundPositionX, 50)),
    backgroundPositionY: clampPercent(num(props.sectionBackgroundPositionY, 50)),
    backgroundOverlayColor:
      normalizeHexColor(str(props.sectionBackgroundOverlayColor)) || "#000000",
    backgroundOverlayOpacity: clampPercent(num(props.sectionBackgroundOverlayOpacity, 0)),
    showRadialGradient: Boolean(props.sectionShowRadialGradient),
    radialGradientColor: normalizeHexColor(str(props.sectionRadialGradientColor)) || "#89cda1",
    radialGradientPosition:
      str(props.sectionRadialGradientPosition) === "bottom" ? "bottom" : "top",
    borderTopWidth: clampBorderWidth(num(props.sectionBorderTopWidth, 0)),
    borderTopColor: normalizeHexColor(str(props.sectionBorderTopColor)) || "#d9e2dc",
    borderBottomWidth: clampBorderWidth(num(props.sectionBorderBottomWidth, 0)),
    borderBottomColor: normalizeHexColor(str(props.sectionBorderBottomColor)) || "#d9e2dc",
    paddingTop: normalizePaddingValue(props.sectionPaddingTop),
    paddingBottom: normalizePaddingValue(props.sectionPaddingBottom),
  };
}

export function hasSectionStyleConfig(config: SectionStyleConfig) {
  return Boolean(
    config.backgroundColor ||
    config.backgroundImageUrl ||
    config.showRadialGradient ||
    config.borderTopWidth > 0 ||
    config.borderBottomWidth > 0 ||
    config.paddingTop !== DEFAULT_SECTION_PADDING ||
    config.paddingBottom !== DEFAULT_SECTION_PADDING,
  );
}

export function getRadialGradientStyle(
  color: string,
  position: "top" | "bottom" = "top",
): CSSProperties {
  const anchor = position === "bottom" ? "50% 100%" : "50% 0%";
  return {
    background: `radial-gradient(ellipse at ${anchor}, ${hexToRgba(color, 0.28)} 0%, ${hexToRgba(color, 0.16)} 36%, transparent 72%)`,
  };
}

export function getSectionPaddingClasses(props: Record<string, unknown>) {
  const topValue = SECTION_PADDING_CLASS_MAP[normalizePaddingValue(props.sectionPaddingTop)];
  const bottomValue = SECTION_PADDING_CLASS_MAP[normalizePaddingValue(props.sectionPaddingBottom)];

  const expandPaddingTokens = (value: string, axis: "pt" | "pb") =>
    value.split(" ").map((token) => {
      const [breakpoint, size] = token.split(":");
      return size ? `${breakpoint}:${axis}-${size}` : `${axis}-${breakpoint}`;
    });

  return [...expandPaddingTokens(topValue, "pt"), ...expandPaddingTokens(bottomValue, "pb")].join(
    " ",
  );
}

export function SectionStyleWrapper({
  props,
  children,
  className,
  contentClassName,
  resolveAssetUrl,
}: SectionStyleWrapperProps) {
  const config = getSectionStyleConfig(props, { resolveAssetUrl });

  if (!hasSectionStyleConfig(config)) {
    return <>{children}</>;
  }

  const defaultBackgroundColor =
    !config.backgroundColor && !config.backgroundImageUrl && config.showRadialGradient
      ? "#ffffff"
      : "";

  const wrapperStyle: CSSProperties = {
    ...(config.backgroundColor || defaultBackgroundColor
      ? { backgroundColor: config.backgroundColor || defaultBackgroundColor }
      : {}),
    ...(config.backgroundImageUrl
      ? {
          backgroundImage: `url(${config.backgroundImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: `${config.backgroundPositionX}% ${config.backgroundPositionY}%`,
          backgroundRepeat: "no-repeat",
        }
      : !config.backgroundColor && !defaultBackgroundColor
        ? { background: DEFAULT_SECTION_LINEAR_GRADIENT }
        : {}),
    ...(config.borderTopWidth > 0
      ? {
          borderTopStyle: "solid",
          borderTopWidth: `${config.borderTopWidth}px`,
          borderTopColor: config.borderTopColor,
        }
      : {}),
    ...(config.borderBottomWidth > 0
      ? {
          borderBottomStyle: "solid",
          borderBottomWidth: `${config.borderBottomWidth}px`,
          borderBottomColor: config.borderBottomColor,
        }
      : {}),
  };
  const overlayOpacity = config.backgroundImageUrl ? config.backgroundOverlayOpacity / 100 : 0;

  return (
    <section
      className={`relative overflow-hidden rounded-2xl ${className ?? ""}`.trim()}
      style={wrapperStyle}
    >
      {overlayOpacity > 0 && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: hexToRgba(config.backgroundOverlayColor, overlayOpacity) }}
        />
      )}
      {config.showRadialGradient && (
        <div
          className="pointer-events-none absolute inset-0"
          style={getRadialGradientStyle(config.radialGradientColor, config.radialGradientPosition)}
        />
      )}
      <div className={`relative z-10 ${contentClassName ?? ""}`.trim()}>{children}</div>
    </section>
  );
}
