import { z } from "zod";
export const WEBSITE_SCRIPT_CATEGORY = "website_script_management";
export const websiteScriptKeys = {
  source: "google_analytics_source",
  measurementId: "google_analytics_measurement_id",
} as const;
export const websiteScriptKeyRules = Object.fromEntries(
  Object.values(websiteScriptKeys).map((key) => [key, false]),
);
export const GOOGLE_ANALYTICS_SCRIPT_URL = "https://www.googletagmanager.com/gtag/js";
export const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
export const googleAnalyticsScriptSettings = z
  .object({
    source: z.enum(["deployment", "managed", "disabled"]),
    measurementId: z
      .string()
      .max(64)
      .regex(/^(?:G-[A-Z0-9]+)?$/),
  })
  .strict();
export const websiteScriptWrite = z
  .object({
    expectedVersion: z.string().regex(/^[a-f0-9]{64}$/),
    googleAnalytics: googleAnalyticsScriptSettings,
  })
  .strict();
export type GoogleAnalyticsScriptSettings = z.infer<typeof googleAnalyticsScriptSettings>;
export type EffectiveGoogleAnalyticsScript = {
  source: GoogleAnalyticsScriptSettings["source"];
  measurementId: string | null;
};
export interface WebsiteScriptConfiguration {
  version: string;
  googleAnalytics: GoogleAnalyticsScriptSettings;
  effectiveGoogleAnalytics: EffectiveGoogleAnalyticsScript;
  turnstile: { enabled: boolean; siteKey: string | null; scriptUrl: string };
  scriptUrls: { googleAnalytics: string; turnstile: string };
  rawMarkupConflict: boolean;
}
export interface PublicWebsiteScriptConfiguration {
  schemaVersion: 1;
  googleAnalytics: EffectiveGoogleAnalyticsScript;
}
export function isWebsiteScriptSetting(key: unknown, category?: unknown) {
  return (
    category === WEBSITE_SCRIPT_CATEGORY ||
    Object.values(websiteScriptKeys).some((value) => value === key)
  );
}
