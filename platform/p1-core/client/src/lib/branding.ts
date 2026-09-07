import type { SocialIconStyle, SocialMediaLink } from "@shared/social-media";

export interface BrandingSettings {
  frontendLogoUrl: string | null;
  faviconUrl: string | null;
  companyName: string | null;
  companyAddress: string | null;
  companyPhoneNumbers: string | null;
  companyGoogleBusinessUrl: string | null;
  socialLinks: SocialMediaLink[];
  socialIconStyle: SocialIconStyle;
  bodyFont: string | null;
  headingFont: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  tertiaryColor: string | null;
  quaternaryColor: string | null;
  h1Color: string | null;
  h2Color: string | null;
  h3ToH6Color: string | null;
  bodyTextColor: string | null;
  headingSubtextColor: string | null;
  supportingCopyColor: string | null;
  helperTextColor: string | null;
  metaTextColor: string | null;
  linkColor: string | null;
  linkHoverColor: string | null;
  inverseTextColor: string | null;
  primaryTextColor: string | null;
  secondaryTextColor: string | null;
  tertiaryTextColor: string | null;
}

export interface BrandingFontOption {
  value: string;
  label: string;
  family: string;
  category: "sans" | "serif";
  preview: string;
}

export const BRANDING_FONT_OPTIONS: BrandingFontOption[] = [
  {
    value: "inter",
    label: "Inter",
    family: "'Inter', sans-serif",
    category: "sans",
    preview: "Clean, modern, and highly readable.",
  },
  {
    value: "roboto",
    label: "Roboto",
    family: "'Roboto', sans-serif",
    category: "sans",
    preview: "Balanced UI type with a familiar feel.",
  },
  {
    value: "open-sans",
    label: "Open Sans",
    family: "'Open Sans', sans-serif",
    category: "sans",
    preview: "Friendly and easy to scan for body copy.",
  },
  {
    value: "lato",
    label: "Lato",
    family: "'Lato', sans-serif",
    category: "sans",
    preview: "Warm shapes with a professional tone.",
  },
  {
    value: "montserrat",
    label: "Montserrat",
    family: "'Montserrat', sans-serif",
    category: "sans",
    preview: "Geometric headings with strong presence.",
  },
  {
    value: "poppins",
    label: "Poppins",
    family: "'Poppins', sans-serif",
    category: "sans",
    preview: "Rounded and contemporary with clear rhythm.",
  },
  {
    value: "source-sans-3",
    label: "Source Sans 3",
    family: "'Source Sans 3', sans-serif",
    category: "sans",
    preview: "Versatile editorial sans for interfaces.",
  },
  {
    value: "nunito-sans",
    label: "Nunito Sans",
    family: "'Nunito Sans', sans-serif",
    category: "sans",
    preview: "Soft, approachable forms for welcoming brands.",
  },
  {
    value: "work-sans",
    label: "Work Sans",
    family: "'Work Sans', sans-serif",
    category: "sans",
    preview: "Practical and crisp across sizes.",
  },
  {
    value: "raleway",
    label: "Raleway",
    family: "'Raleway', sans-serif",
    category: "sans",
    preview: "Elegant sans suited to polished headings.",
  },
  {
    value: "merriweather",
    label: "Merriweather",
    family: "'Merriweather', serif",
    category: "serif",
    preview: "Readable serif designed for long-form copy.",
  },
  {
    value: "playfair-display",
    label: "Playfair Display",
    family: "'Playfair Display', serif",
    category: "serif",
    preview: "High-contrast display serif with personality.",
  },
  {
    value: "lora",
    label: "Lora",
    family: "'Lora', serif",
    category: "serif",
    preview: "Contemporary serif with a literary feel.",
  },
  {
    value: "libre-baskerville",
    label: "Libre Baskerville",
    family: "'Libre Baskerville', serif",
    category: "serif",
    preview: "Classic proportions for timeless editorial tone.",
  },
  {
    value: "cormorant-garamond",
    label: "Cormorant Garamond",
    family: "'Cormorant Garamond', serif",
    category: "serif",
    preview: "Refined and expressive for elegant headings.",
  },
  {
    value: "eb-garamond",
    label: "EB Garamond",
    family: "'EB Garamond', serif",
    category: "serif",
    preview: "Bookish serif with traditional warmth.",
  },
  {
    value: "crimson-text",
    label: "Crimson Text",
    family: "'Crimson Text', serif",
    category: "serif",
    preview: "Humanist serif suited to thoughtful content.",
  },
  {
    value: "pt-serif",
    label: "PT Serif",
    family: "'PT Serif', serif",
    category: "serif",
    preview: "Versatile serif that pairs well with sans headings.",
  },
  {
    value: "bitter",
    label: "Bitter",
    family: "'Bitter', serif",
    category: "serif",
    preview: "Structured slab serif with strong readability.",
  },
  {
    value: "source-serif-4",
    label: "Source Serif 4",
    family: "'Source Serif 4', serif",
    category: "serif",
    preview: "Contemporary serif with dependable text performance.",
  },
];

export const BRANDING_SANS_FONT_OPTIONS = BRANDING_FONT_OPTIONS.filter(
  (option) => option.category === "sans",
);
export const BRANDING_SERIF_FONT_OPTIONS = BRANDING_FONT_OPTIONS.filter(
  (option) => option.category === "serif",
);

export const DEFAULT_BRANDING_SETTINGS: BrandingSettings = {
  frontendLogoUrl: null,
  faviconUrl: null,
  companyName: null,
  companyAddress: null,
  companyPhoneNumbers: null,
  companyGoogleBusinessUrl: null,
  socialLinks: [],
  socialIconStyle: "brand",
  bodyFont: null,
  headingFont: null,
  primaryColor: null,
  secondaryColor: null,
  tertiaryColor: null,
  quaternaryColor: "#A8623A",
  h1Color: null,
  h2Color: null,
  h3ToH6Color: null,
  bodyTextColor: null,
  headingSubtextColor: null,
  supportingCopyColor: null,
  helperTextColor: null,
  metaTextColor: null,
  linkColor: null,
  linkHoverColor: null,
  inverseTextColor: null,
  primaryTextColor: null,
  secondaryTextColor: null,
  tertiaryTextColor: null,
};

export function fontFamilyForBrandingOption(value: string | null | undefined): string | null {
  if (!value) return null;
  return BRANDING_FONT_OPTIONS.find((option) => option.value === value)?.family ?? null;
}

export function normalizeHexColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const normalized = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#([0-9a-fA-F]{6})$/.test(normalized) ? normalized.toUpperCase() : null;
}

export function hexToHslToken(hex: string | null | undefined): string | null {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;

  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  if (delta !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
        break;
    }
  }

  const hue = Math.round(h * 60 < 0 ? h * 60 + 360 : h * 60);
  const saturation = Math.round(s * 100);
  const lightness = Math.round(l * 100);

  return `${hue} ${saturation}% ${lightness}%`;
}
