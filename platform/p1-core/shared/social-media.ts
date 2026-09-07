export const SOCIAL_ICON_STYLES = ["brand", "outline", "solid"] as const;
export type SocialIconStyle = (typeof SOCIAL_ICON_STYLES)[number];

export type SocialPlatformKey =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "x"
  | "tiktok"
  | "youtube"
  | "pinterest"
  | "houzz"
  | "yelp"
  | "nextdoor";

export interface SocialPlatform {
  key: SocialPlatformKey;
  label: string;
  settingKey: `social_${SocialPlatformKey}_url`;
  brandColor: string;
}

export interface SocialMediaLink {
  platform: SocialPlatformKey;
  label: string;
  url: string;
  brandColor: string;
}

export const SOCIAL_MEDIA_PLATFORMS: SocialPlatform[] = [
  { key: "facebook", label: "Facebook", settingKey: "social_facebook_url", brandColor: "#1877F2" },
  {
    key: "instagram",
    label: "Instagram",
    settingKey: "social_instagram_url",
    brandColor: "#E4405F",
  },
  { key: "linkedin", label: "LinkedIn", settingKey: "social_linkedin_url", brandColor: "#0A66C2" },
  { key: "x", label: "X", settingKey: "social_x_url", brandColor: "#000000" },
  { key: "tiktok", label: "TikTok", settingKey: "social_tiktok_url", brandColor: "#000000" },
  { key: "youtube", label: "YouTube", settingKey: "social_youtube_url", brandColor: "#FF0000" },
  {
    key: "pinterest",
    label: "Pinterest",
    settingKey: "social_pinterest_url",
    brandColor: "#BD081C",
  },
  { key: "houzz", label: "Houzz", settingKey: "social_houzz_url", brandColor: "#4DBC15" },
  { key: "yelp", label: "Yelp", settingKey: "social_yelp_url", brandColor: "#D32323" },
  { key: "nextdoor", label: "Nextdoor", settingKey: "social_nextdoor_url", brandColor: "#8ED500" },
];

export function normalizeSocialIconStyle(value: string | null | undefined): SocialIconStyle {
  return SOCIAL_ICON_STYLES.includes(value as SocialIconStyle)
    ? (value as SocialIconStyle)
    : "brand";
}

export function getSocialMediaLinks(
  settings: Record<string, string | null | undefined>,
): SocialMediaLink[] {
  return SOCIAL_MEDIA_PLATFORMS.map((platform) => {
    const url = settings[platform.settingKey]?.trim();
    if (!url) return null;
    return {
      platform: platform.key,
      label: platform.label,
      url,
      brandColor: platform.brandColor,
    };
  }).filter((link): link is SocialMediaLink => Boolean(link));
}
