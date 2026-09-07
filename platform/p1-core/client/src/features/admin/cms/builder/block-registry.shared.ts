export type PropType =
  | "text"
  | "textarea"
  | "richtext"
  | "image-url"
  | "url"
  | "page-select"
  | "gallery-select"
  | "team-select"
  | "select"
  | "form-select"
  | "boolean"
  | "number"
  | "color"
  | "array-items";

export interface PropDef {
  key: string;
  label: string;
  type: PropType;
  placeholder?: string;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  itemSchema?: Omit<PropDef, "itemSchema">[];
}

export type BlockCategory =
  | "layout"
  | "hero"
  | "content"
  | "media"
  | "social-proof"
  | "conversion"
  | "data"
  | "dynamic";

export interface BlockDef {
  type: string;
  label: string;
  iconName: string;
  description: string;
  category: BlockCategory;
  defaultProps: Record<string, unknown>;
  propDefs: PropDef[];
  isDynamic?: boolean;
}

export interface BlockInstance {
  id: string;
  type: string;
  props: Record<string, unknown>;
}

export interface BuilderContent {
  blocks: BlockInstance[];
}

export const LEGACY_BLOCK_TYPE_ALIASES: Record<string, string> = {
  "call-to-action": "cta",
  "cta-banner": "cta",
  "blog-feed": "blog-post-feed",
  "blog-archive": "blog-post-feed",
  "featured-articles": "blog-preview",
  "articles-preview": "blog-preview",
  "events-feed": "events-preview",
  "upcoming-events": "events-preview",
  "portfolio-archive": "portfolio-grid",
};

export const ALIGN_OPTIONS = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
];

export const IMAGE_POSITION_OPTIONS = [
  { label: "Image Right", value: "right" },
  { label: "Image Left", value: "left" },
];

export const CTA_VARIANT_OPTIONS = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "Accent", value: "accent" },
];

export const COLUMNS_OPTIONS = [
  { label: "2 columns", value: "2" },
  { label: "3 columns", value: "3" },
  { label: "4 columns", value: "4" },
];

export const FEATURE_LIST_COLUMNS_OPTIONS = [
  { label: "1 column", value: "1" },
  { label: "2 columns", value: "2" },
  { label: "3 columns", value: "3" },
];

export const SPACING_OPTIONS = [
  { label: "Extra Small (16px)", value: "xs" },
  { label: "Small (32px)", value: "sm" },
  { label: "Medium (64px)", value: "md" },
  { label: "Large (96px)", value: "lg" },
  { label: "Extra Large (128px)", value: "xl" },
];

export const BUTTON_VARIANT_OPTIONS = [
  { label: "Primary", value: "default" },
  { label: "Outline", value: "outline" },
  { label: "Ghost", value: "ghost" },
  { label: "Secondary", value: "secondary" },
];

export const BUTTON_ACTION_OPTIONS = [
  { label: "Internal Link", value: "internal-link" },
  { label: "Custom Link", value: "custom-link" },
  { label: "Modal Form", value: "form-modal" },
];

export const VIDEO_ASPECT_OPTIONS = [
  { label: "16:9 (Widescreen)", value: "16/9" },
  { label: "4:3 (Classic)", value: "4/3" },
  { label: "1:1 (Square)", value: "1/1" },
];

export const IMAGE_WIDTH_OPTIONS = [
  { label: "Full width", value: "full" },
  { label: "Contained (max-w-4xl)", value: "contained" },
  { label: "Narrow (max-w-2xl)", value: "narrow" },
];

export const MOBILE_IMAGE_FIT_OPTIONS = [
  { label: "Cover", value: "cover" },
  { label: "Contain", value: "contain" },
];

export const MOBILE_IMAGE_HEIGHT_OPTIONS = [
  { label: "Auto", value: "auto" },
  { label: "Short (240px)", value: "sm" },
  { label: "Medium (320px)", value: "md" },
  { label: "Tall (420px)", value: "lg" },
  { label: "Extra Tall (520px)", value: "xl" },
];

export const DIVIDER_STYLE_OPTIONS = [
  { label: "Horizontal line", value: "line" },
  { label: "Spacer (invisible)", value: "spacer" },
  { label: "Dots", value: "dots" },
];

export const HERO_LAYOUT_OPTIONS = [
  { label: "Stacked (centered)", value: "stacked" },
  { label: "Split (text left, image right)", value: "split" },
];

export const HERO_MIN_HEIGHT_OPTIONS = [
  { label: "Small (320px)", value: "320" },
  { label: "Medium (420px)", value: "420" },
  { label: "Large (560px)", value: "560" },
  { label: "Extra Large (700px)", value: "700" },
  { label: "Full Screen", value: "100vh" },
];

export const LINK_LIST_COLUMNS_OPTIONS = [
  { label: "1 column", value: "1" },
  { label: "2 columns", value: "2" },
];

export const CALLOUT_VARIANT_OPTIONS = [
  { label: "Accent", value: "accent" },
  { label: "Neutral", value: "neutral" },
  { label: "Outline", value: "outline" },
];

export const COLUMNS_EXTENDED_OPTIONS = [
  { label: "2 columns", value: "2" },
  { label: "3 columns", value: "3" },
  { label: "4 columns", value: "4" },
  { label: "5 columns", value: "5" },
];

export const BENEFIT_LAYOUT_OPTIONS = [
  { label: "Stack", value: "stack" },
  { label: "Timeline", value: "timeline" },
];

export const EXPERIENCE_LEVEL_OPTIONS = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

export const HEADING_LEVEL_OPTIONS = [
  { label: "H2 (Section Heading)", value: "h2" },
  { label: "H1 (Main Page Heading)", value: "h1" },
];

export const RADIAL_GRADIENT_POSITION_OPTIONS = [
  { label: "Top of Section", value: "top" },
  { label: "Bottom of Section", value: "bottom" },
];

export const SECTION_PADDING_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Extra Small", value: "xs" },
  { label: "Small", value: "sm" },
  { label: "Default", value: "md" },
  { label: "Large", value: "lg" },
  { label: "Extra Large", value: "xl" },
];

export const SHARED_SECTION_STYLE_DEFAULTS = {
  sectionBackgroundColor: "#ffffff",
  sectionBackgroundImageUrl: "",
  sectionBackgroundPositionX: 50,
  sectionBackgroundPositionY: 50,
  sectionBackgroundOverlayColor: "#000000",
  sectionBackgroundOverlayOpacity: 0,
  sectionShowRadialGradient: false,
  sectionRadialGradientColor: "#89cda1",
  sectionRadialGradientPosition: "top",
  sectionBorderTopWidth: 0,
  sectionBorderTopColor: "#d9e2dc",
  sectionBorderBottomWidth: 0,
  sectionBorderBottomColor: "#d9e2dc",
  sectionPaddingTop: "md",
  sectionPaddingBottom: "md",
};

export const SHARED_SECTION_STYLE_PROP_DEFS: PropDef[] = [
  {
    key: "sectionBackgroundColor",
    label: "Background Color",
    type: "color",
    placeholder: "#ffffff",
  },
  {
    key: "sectionBackgroundImageUrl",
    label: "Background Image",
    type: "image-url",
    placeholder: "Upload or select image",
  },
  {
    key: "sectionBackgroundPositionX",
    label: "Image Position X (%)",
    type: "number",
    min: 0,
    max: 100,
  },
  {
    key: "sectionBackgroundPositionY",
    label: "Image Position Y (%)",
    type: "number",
    min: 0,
    max: 100,
  },
  {
    key: "sectionBackgroundOverlayColor",
    label: "Background Image Overlay Color",
    type: "color",
    placeholder: "#000000",
  },
  {
    key: "sectionBackgroundOverlayOpacity",
    label: "Background Image Overlay Opacity (%)",
    type: "number",
    min: 0,
    max: 100,
  },
  { key: "sectionShowRadialGradient", label: "Show Radial Gradient Overlay", type: "boolean" },
  {
    key: "sectionRadialGradientColor",
    label: "Radial Gradient Color",
    type: "color",
    placeholder: "#89cda1",
  },
  {
    key: "sectionRadialGradientPosition",
    label: "Radial Gradient Position",
    type: "select",
    options: RADIAL_GRADIENT_POSITION_OPTIONS,
  },
  {
    key: "sectionBorderTopWidth",
    label: "Top Border Thickness (px)",
    type: "number",
    min: 0,
    max: 24,
  },
  {
    key: "sectionBorderTopColor",
    label: "Top Border Color",
    type: "color",
    placeholder: "#d9e2dc",
  },
  {
    key: "sectionBorderBottomWidth",
    label: "Bottom Border Thickness (px)",
    type: "number",
    min: 0,
    max: 24,
  },
  {
    key: "sectionBorderBottomColor",
    label: "Bottom Border Color",
    type: "color",
    placeholder: "#d9e2dc",
  },
];

export const SHARED_SECTION_ACCENT_PROP_DEFS: PropDef[] = [
  {
    key: "sectionBackgroundColor",
    label: "Background Color",
    type: "color",
    placeholder: "#ffffff",
  },
  { key: "sectionShowRadialGradient", label: "Show Radial Gradient Overlay", type: "boolean" },
  {
    key: "sectionRadialGradientColor",
    label: "Radial Gradient Color",
    type: "color",
    placeholder: "#89cda1",
  },
  {
    key: "sectionRadialGradientPosition",
    label: "Radial Gradient Position",
    type: "select",
    options: RADIAL_GRADIENT_POSITION_OPTIONS,
  },
  {
    key: "sectionBorderTopWidth",
    label: "Top Border Thickness (px)",
    type: "number",
    min: 0,
    max: 24,
  },
  {
    key: "sectionBorderTopColor",
    label: "Top Border Color",
    type: "color",
    placeholder: "#d9e2dc",
  },
  {
    key: "sectionBorderBottomWidth",
    label: "Bottom Border Thickness (px)",
    type: "number",
    min: 0,
    max: 24,
  },
  {
    key: "sectionBorderBottomColor",
    label: "Bottom Border Color",
    type: "color",
    placeholder: "#d9e2dc",
  },
];

export const SHARED_SECTION_PADDING_PROP_DEFS: PropDef[] = [
  {
    key: "sectionPaddingTop",
    label: "Top Padding",
    type: "select",
    options: SECTION_PADDING_OPTIONS,
  },
  {
    key: "sectionPaddingBottom",
    label: "Bottom Padding",
    type: "select",
    options: SECTION_PADDING_OPTIONS,
  },
];

export const SHARED_SECTION_HEADING_DEFAULTS = {
  sectionEyebrow: "",
  sectionHeadingLevel: "h2",
  sectionHeadingAlignment: "center",
};

export const SHARED_SECTION_HEADING_PROP_DEFS: PropDef[] = [
  {
    key: "sectionEyebrow",
    label: "Eyebrow Label",
    type: "text",
    placeholder: "Small label above title",
  },
  {
    key: "sectionHeadingLevel",
    label: "Heading Level",
    type: "select",
    options: HEADING_LEVEL_OPTIONS,
  },
  {
    key: "sectionHeadingAlignment",
    label: "Heading Alignment",
    type: "select",
    options: ALIGN_OPTIONS,
  },
];

export const SHARED_VISIBILITY_DEFAULTS = {
  isActive: true,
};

export const SHARED_VISIBILITY_PROP_DEFS: PropDef[] = [
  { key: "isActive", label: "Active on Public Site", type: "boolean" },
];

export const SHARED_MOBILE_IMAGE_DEFAULTS = {
  mobileImageFit: "cover",
  mobileImageHeight: "auto",
  mobileImagePositionX: 50,
  mobileImagePositionY: 50,
};

export const SHARED_MOBILE_IMAGE_PROP_DEFS: PropDef[] = [
  {
    key: "mobileImageFit",
    label: "Mobile Image Fit",
    type: "select",
    options: MOBILE_IMAGE_FIT_OPTIONS,
  },
  {
    key: "mobileImageHeight",
    label: "Mobile Image Height",
    type: "select",
    options: MOBILE_IMAGE_HEIGHT_OPTIONS,
  },
  {
    key: "mobileImagePositionX",
    label: "Mobile Image Position X (%)",
    type: "number",
    min: 0,
    max: 100,
  },
  {
    key: "mobileImagePositionY",
    label: "Mobile Image Position Y (%)",
    type: "number",
    min: 0,
    max: 100,
  },
];

export const OPTIONAL_SECTION_HEADING_PROP_DEFS: PropDef[] = [
  { key: "title", label: "Section Title", type: "text", placeholder: "Optional section heading" },
  {
    key: "subtitle",
    label: "Subtitle",
    type: "textarea",
    placeholder: "Optional supporting description",
  },
];

export const OPTIONAL_SECTION_HEADING_BLOCKS = new Set([
  "rich-text",
  "button-group",
  "image-block",
  "trust-bar",
  "stats-bar",
]);

export function mergePropDefs(existing: PropDef[], additions: PropDef[]) {
  const seen = new Set(existing.map((prop) => prop.key));
  return [...existing, ...additions.filter((prop) => !seen.has(prop.key))];
}

export function withSharedSectionStyles(
  block: BlockDef,
  options?: { includeImageControls?: boolean; includePaddingControls?: boolean },
): BlockDef {
  const includeImageControls = options?.includeImageControls ?? true;
  const includePaddingControls = options?.includePaddingControls ?? true;
  const sharedPropDefs = includeImageControls
    ? SHARED_SECTION_STYLE_PROP_DEFS
    : SHARED_SECTION_ACCENT_PROP_DEFS;
  const sharedDefaults = includeImageControls
    ? SHARED_SECTION_STYLE_DEFAULTS
    : {
        sectionBackgroundColor: SHARED_SECTION_STYLE_DEFAULTS.sectionBackgroundColor,
        sectionShowRadialGradient: SHARED_SECTION_STYLE_DEFAULTS.sectionShowRadialGradient,
        sectionRadialGradientColor: SHARED_SECTION_STYLE_DEFAULTS.sectionRadialGradientColor,
        sectionRadialGradientPosition: SHARED_SECTION_STYLE_DEFAULTS.sectionRadialGradientPosition,
      };

  const paddingDefaults = includePaddingControls
    ? {
        sectionPaddingTop: SHARED_SECTION_STYLE_DEFAULTS.sectionPaddingTop,
        sectionPaddingBottom: SHARED_SECTION_STYLE_DEFAULTS.sectionPaddingBottom,
      }
    : {};

  return {
    ...block,
    defaultProps: {
      ...sharedDefaults,
      ...paddingDefaults,
      ...block.defaultProps,
    },
    propDefs: mergePropDefs(
      block.propDefs,
      includePaddingControls
        ? [...sharedPropDefs, ...SHARED_SECTION_PADDING_PROP_DEFS]
        : sharedPropDefs,
    ),
  };
}

export function withSharedSectionHeading(block: BlockDef): BlockDef {
  const hasTitle = block.propDefs.some((prop) => prop.key === "title");
  const shouldAddHeading = hasTitle || OPTIONAL_SECTION_HEADING_BLOCKS.has(block.type);
  if (!shouldAddHeading || block.type === "section-header") return block;

  return {
    ...block,
    defaultProps: {
      ...SHARED_SECTION_HEADING_DEFAULTS,
      title: "",
      subtitle: "",
      ...block.defaultProps,
    },
    propDefs: mergePropDefs(block.propDefs, [
      ...OPTIONAL_SECTION_HEADING_PROP_DEFS,
      ...SHARED_SECTION_HEADING_PROP_DEFS,
    ]),
  };
}

export function withSharedVisibility(block: BlockDef): BlockDef {
  return {
    ...block,
    defaultProps: {
      ...SHARED_VISIBILITY_DEFAULTS,
      ...block.defaultProps,
    },
    propDefs: mergePropDefs(block.propDefs, SHARED_VISIBILITY_PROP_DEFS),
  };
}
