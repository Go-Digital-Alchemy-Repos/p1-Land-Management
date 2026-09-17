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

export const WEBSITE_FONT_KEYS = ["frontend_body_font", "frontend_heading_font"] as const;
export function isWebsiteFontKey(key: unknown) {
  return typeof key === "string" && (WEBSITE_FONT_KEYS as readonly string[]).includes(key);
}
