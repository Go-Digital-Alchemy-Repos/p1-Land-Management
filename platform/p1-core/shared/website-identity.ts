import { isSafeSocialUrl } from "./social-media";
export const WEBSITE_IDENTITY_FIELDS = [
  { key: "company_name", label: "Company name", max: 255 },
  { key: "company_address", label: "Address", max: 2000 },
  { key: "company_phone_numbers", label: "Phone numbers", max: 2000 },
  { key: "company_google_business_url", label: "Google Business URL", max: 2048 },
  { key: "frontend_logo_url", label: "Website logo URL", max: 2048 },
  { key: "favicon_url", label: "Favicon URL", max: 2048 },
] as const;
export type WebsiteIdentityKey = (typeof WEBSITE_IDENTITY_FIELDS)[number]["key"];
export function isWebsiteIdentityKey(value: unknown): value is WebsiteIdentityKey {
  return WEBSITE_IDENTITY_FIELDS.some((field) => field.key === value);
}
export function validWebsiteIdentityValue(key: WebsiteIdentityKey, value: string): boolean {
  const field = WEBSITE_IDENTITY_FIELDS.find((field) => field.key === key)!;
  if (value.length > field.max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))
    return false;
  if (!key.endsWith("_url") || value === "") return true;
  if (key !== "company_google_business_url" && /^\/uploads\/cms\/[a-zA-Z0-9_./-]+$/.test(value)) {
    return value
      .slice(1)
      .split("/")
      .every((part) => part !== "" && part !== "." && part !== "..");
  }
  return isSafeSocialUrl(value);
}
