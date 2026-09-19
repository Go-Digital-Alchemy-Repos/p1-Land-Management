import React, {
  type ComponentType,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { Palette } from "lucide-react";

export type BrandingColorSettingKey =
  | "brand_primary_color"
  | "brand_secondary_color"
  | "brand_tertiary_color"
  | "brand_quaternary_color"
  | "text_h1_color"
  | "text_h2_color"
  | "text_h3_h6_color"
  | "text_body_color"
  | "text_heading_subtext_color"
  | "text_supporting_copy_color"
  | "text_helper_text_color"
  | "text_meta_color"
  | "text_link_color"
  | "text_link_hover_color"
  | "text_inverse_color"
  | "text_primary_foreground_color"
  | "text_secondary_foreground_color"
  | "text_tertiary_foreground_color";

const BRANDING_CORE_COLOR_FIELDS: Array<{
  key: BrandingColorSettingKey;
  label: string;
  description: string;
}> = [
  {
    key: "brand_primary_color",
    label: "Primary Color",
    description: "Main brand and button color.",
  },
  {
    key: "brand_secondary_color",
    label: "Secondary Color",
    description: "Support color for secondary UI states.",
  },
  {
    key: "brand_tertiary_color",
    label: "Tertiary Color",
    description: "Accent color used across highlights and links.",
  },
  {
    key: "brand_quaternary_color",
    label: "Quaternary Color",
    description: "Fourth core brand color for additional featured accents and visual variety.",
  },
];

const BRANDING_TYPOGRAPHY_COLOR_FIELDS: Array<{
  key: BrandingColorSettingKey;
  label: string;
  description: string;
}> = [
  { key: "text_h1_color", label: "H1 Color", description: "Primary color for main page headings." },
  {
    key: "text_h2_color",
    label: "H2 Color",
    description: "Color for section-level headings and major titles.",
  },
  {
    key: "text_h3_h6_color",
    label: "H3-H6 Color",
    description: "Color for smaller heading levels and card titles.",
  },
  {
    key: "text_body_color",
    label: "Paragraph Text",
    description: "Default reading color for paragraphs, excerpts, and body copy.",
  },
  {
    key: "text_heading_subtext_color",
    label: "Heading Sub-Text",
    description: "Color for subtitle lines directly beneath major headings.",
  },
  {
    key: "text_supporting_copy_color",
    label: "Supporting Copy",
    description: "Use for section introductions, lead-in copy, and supporting editorial text.",
  },
  {
    key: "text_helper_text_color",
    label: "Helper Messaging",
    description: "Use for empty states, helper notes, and guidance text around UI and content.",
  },
  {
    key: "text_meta_color",
    label: "Meta Text",
    description: "Use for dates, authors, categories, labels, and small metadata.",
  },
  {
    key: "text_link_color",
    label: "Link Color",
    description: "Default color for editorial links and linked text actions.",
  },
  {
    key: "text_link_hover_color",
    label: "Link Hover Color",
    description: "Hover color for links and lightweight text actions.",
  },
  {
    key: "text_inverse_color",
    label: "Inverse Text",
    description: "Text shown on dark surfaces, image overlays, and high-contrast areas.",
  },
];

const BRANDING_UI_TEXT_COLOR_FIELDS: Array<{
  key: BrandingColorSettingKey;
  label: string;
  description: string;
}> = [
  {
    key: "text_primary_foreground_color",
    label: "Primary Text on Color",
    description: "Text shown on primary-colored buttons and badges.",
  },
  {
    key: "text_secondary_foreground_color",
    label: "Secondary Text on Color",
    description: "Text shown on secondary-colored UI surfaces.",
  },
  {
    key: "text_tertiary_foreground_color",
    label: "Tertiary Text on Color",
    description: "Text shown on tertiary/accent-colored UI surfaces.",
  },
];

export const BRANDING_COLOR_FIELDS = [
  ...BRANDING_CORE_COLOR_FIELDS,
  ...BRANDING_TYPOGRAPHY_COLOR_FIELDS,
  ...BRANDING_UI_TEXT_COLOR_FIELDS,
] as const;

export type BrandingColorField = (typeof BRANDING_COLOR_FIELDS)[number];
type Container = ComponentType<HTMLAttributes<HTMLDivElement>>;
const Div = (props: HTMLAttributes<HTMLDivElement>) => <div {...props} />;

/** Retained BrandingTab color groups and preview, shared across authenticated hosts. */
export function ColorEditor({
  components = {},
  previewValues,
  previewHeadingStyle,
  previewBodyStyle,
  renderControls,
  toolbar,
  notices,
}: {
  components?: Partial<
    Record<"Card" | "CardHeader" | "CardTitle" | "CardDescription" | "CardContent", Container>
  >;
  previewValues: Partial<Record<BrandingColorSettingKey, string>>;
  previewHeadingStyle?: CSSProperties;
  previewBodyStyle?: CSSProperties;
  renderControls: (field: BrandingColorField) => ReactNode;
  toolbar: ReactNode;
  notices?: ReactNode;
}) {
  const {
    Card = Div,
    CardHeader = Div,
    CardTitle = Div,
    CardDescription = Div,
    CardContent = Div,
  } = components;
  const previewPaletteStyle = {
    backgroundColor: previewValues.brand_primary_color || undefined,
    color: previewValues.text_primary_foreground_color || undefined,
  };
  const previewLinkStyle = { color: previewValues.text_link_color || undefined };
  const previewLinkHoverStyle = {
    color: previewValues.text_link_hover_color || previewValues.text_link_color || undefined,
  };
  return (
    <Card className="color-editor">
      <CardHeader className="color-header">
        <CardTitle className="color-title flex items-center gap-2 text-base">
          <Palette className="h-4 w-4 text-primary" />
          Color Palette
        </CardTitle>
        <CardDescription className="color-description">
          Set the core frontend brand colors, typography colors, and UI foreground colors. This
          keeps headings, body copy, supporting text, metadata, and links distinct without needing
          one-off overrides.
        </CardDescription>
      </CardHeader>
      <CardContent className="color-content space-y-5">
        {notices}
        {[
          {
            title: "Core Colors",
            description:
              "These power the main brand accents, buttons, and highlighted interface states on the public site.",
            fields: BRANDING_CORE_COLOR_FIELDS,
          },
          {
            title: "Typography Colors",
            description:
              "Use these to separate major headings, paragraph copy, section subtext, metadata, and editorial links.",
            fields: BRANDING_TYPOGRAPHY_COLOR_FIELDS,
          },
          {
            title: "Text on Color Surfaces",
            description:
              "These colors are used when text appears on branded buttons, badges, and other colored UI surfaces.",
            fields: BRANDING_UI_TEXT_COLOR_FIELDS,
          },
        ].map((group) => (
          <div key={group.title} className="color-group space-y-4">
            <div>
              <h4 className="color-group-title text-sm font-semibold">{group.title}</h4>
              <p className="color-help mt-1 text-xs text-muted-foreground">{group.description}</p>
            </div>
            <div className="color-fields grid gap-4 md:grid-cols-2">
              {group.fields.map((field) => (
                <div key={field.key} className="color-field space-y-1.5 rounded-xl border p-4">
                  <div>
                    <label
                      htmlFor={field.key}
                      className="color-label text-sm font-medium leading-none"
                    >
                      {field.label}
                    </label>
                    <p
                      id={`${field.key}-description`}
                      className="color-help mt-1 text-xs text-muted-foreground"
                    >
                      {field.description}
                    </p>
                  </div>
                  <div className="color-controls flex items-center gap-3">
                    {renderControls(field)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <section
          aria-label="Palette Preview"
          className="color-preview rounded-xl border bg-muted/10 p-5"
        >
          <p className="color-preview-title text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Palette Preview
          </p>
          <div className="color-preview-actions mt-4 flex flex-wrap gap-3">
            <div
              className="color-action rounded-lg px-4 py-2 text-sm font-medium"
              style={previewPaletteStyle}
            >
              Primary Action
            </div>
            <div
              className="color-action rounded-lg px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: previewValues.brand_secondary_color || undefined,
                color: previewValues.text_secondary_foreground_color || undefined,
              }}
            >
              Secondary Action
            </div>
            <div
              className="color-action rounded-lg px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: previewValues.brand_tertiary_color || undefined,
                color: previewValues.text_tertiary_foreground_color || undefined,
              }}
            >
              Tertiary Action
            </div>
            <div
              className="color-action rounded-lg px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: previewValues.brand_quaternary_color || "#A8623A",
                color:
                  previewValues.text_inverse_color ||
                  previewValues.text_primary_foreground_color ||
                  undefined,
              }}
            >
              Quaternary Action
            </div>
          </div>
          <div className="color-preview-copy mt-5 rounded-xl border bg-background p-5 space-y-3">
            <p
              className="color-preview-h1 text-3xl font-semibold"
              style={{
                ...previewHeadingStyle,
                color: previewValues.text_h1_color || previewValues.text_body_color || undefined,
              }}
            >
              H1 headline preview
            </p>
            <p
              className="color-preview-h2 text-2xl font-semibold"
              style={{
                ...previewHeadingStyle,
                color:
                  previewValues.text_h2_color ||
                  previewValues.text_h1_color ||
                  previewValues.text_body_color ||
                  undefined,
              }}
            >
              H2 section heading preview
            </p>
            <p
              className="color-preview-h3 text-lg font-semibold"
              style={{
                ...previewHeadingStyle,
                color:
                  previewValues.text_h3_h6_color ||
                  previewValues.text_h2_color ||
                  previewValues.text_body_color ||
                  undefined,
              }}
            >
              H3-H6 card and supporting heading preview
            </p>
            <p
              className="color-preview-text text-sm"
              style={{
                ...previewBodyStyle,
                color: previewValues.text_heading_subtext_color || undefined,
              }}
            >
              Heading sub-text preview directly beneath a hero or section heading.
            </p>
            <p
              className="color-preview-text text-sm"
              style={{
                ...previewBodyStyle,
                color: previewValues.text_supporting_copy_color || undefined,
              }}
            >
              Supporting copy preview for section introductions, lead-ins, and editorial setup.
            </p>
            <p
              className="color-preview-text text-sm"
              style={{
                ...previewBodyStyle,
                color: previewValues.text_helper_text_color || undefined,
              }}
            >
              Helper messaging preview for empty states, guidance text, and interface hints.
            </p>
            <p
              className="color-preview-text text-sm"
              style={{ ...previewBodyStyle, color: previewValues.text_body_color || undefined }}
            >
              Paragraph text preview for reading content, blog excerpts, and general body copy
              throughout the site.
            </p>
            <p
              className="color-preview-meta text-xs uppercase tracking-wide"
              style={{
                color:
                  previewValues.text_meta_color ||
                  previewValues.text_helper_text_color ||
                  undefined,
              }}
            >
              Meta text preview for dates, authors, categories, and labels
            </p>
            <div className="color-preview-links flex flex-wrap items-center gap-4 text-sm">
              <a
                href="#branding-preview-link"
                onClick={(event) => event.preventDefault()}
                className="underline underline-offset-4"
                style={previewLinkStyle}
              >
                Link color preview
              </a>
              <span className="underline underline-offset-4" style={previewLinkHoverStyle}>
                Link hover preview
              </span>
            </div>
            <div
              className="color-preview-inverse rounded-lg px-4 py-3 text-sm font-medium"
              style={{
                backgroundColor: previewValues.brand_primary_color || "#1F2A44",
                color:
                  previewValues.text_inverse_color ||
                  previewValues.text_primary_foreground_color ||
                  undefined,
              }}
            >
              Inverse text preview on dark or branded surfaces
            </div>
          </div>
        </section>

        <div className="color-toolbar flex gap-2">{toolbar}</div>
      </CardContent>
    </Card>
  );
}
