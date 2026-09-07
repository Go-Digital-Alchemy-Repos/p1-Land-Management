const BRANDING_SETTING_KEYS = new Set([
  "frontend_logo_url",
  "favicon_url",
  "frontend_body_font",
  "frontend_heading_font",
  "company_name",
  "company_address",
  "company_phone_numbers",
  "company_google_business_url",
  "social_icon_style",
  "social_facebook_url",
  "social_instagram_url",
  "social_linkedin_url",
  "social_x_url",
  "social_tiktok_url",
  "social_youtube_url",
  "social_pinterest_url",
  "social_houzz_url",
  "social_yelp_url",
  "social_nextdoor_url",
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
]);

export function isDesignEditableBrandingSetting(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const input = body as Record<string, unknown>;
  return (
    input.category === "branding" &&
    input.isSecret === false &&
    typeof input.key === "string" &&
    BRANDING_SETTING_KEYS.has(input.key)
  );
}
