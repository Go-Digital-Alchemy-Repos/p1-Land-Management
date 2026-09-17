/** Retained website branding keys; dashboard themes are independent. */
export const WEBSITE_COLOR_KEYS = [
  "brand_primary_color",
  "brand_secondary_color",
  "brand_tertiary_color",
  "brand_quaternary_color",
  "text_h1_color",
  "text_h2_color",
  "text_h3_h6_color",
  "text_body_color",
  "text_heading_subtext_color",
  "text_supporting_copy_color",
  "text_helper_text_color",
  "text_meta_color",
  "text_link_color",
  "text_link_hover_color",
  "text_inverse_color",
  "text_primary_foreground_color",
  "text_secondary_foreground_color",
  "text_tertiary_foreground_color",
] as const;
export function isWebsiteColorKey(key: unknown): boolean {
  return typeof key === "string" && (key === "text_muted_color" || (WEBSITE_COLOR_KEYS as readonly string[]).includes(key));
}
