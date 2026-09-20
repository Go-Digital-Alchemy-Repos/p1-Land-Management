import {
  WEBSITE_SCRIPT_CATEGORY,
  websiteScriptKeys,
  websiteScriptKeyRules,
  GOOGLE_ANALYTICS_SCRIPT_URL,
  TURNSTILE_SCRIPT_URL,
  googleAnalyticsScriptSettings,
  type WebsiteScriptConfiguration,
  type PublicWebsiteScriptConfiguration,
} from "@shared/website-script-management";
import { storage } from "../storage";
import { turnstile } from "./turnstile.service";
import { AppError } from "../middleware/error-handler";

export function hasReservedWebsiteScriptMarkers(html: string) {
  return /googletagmanager\.com|google-analytics\.com|\bgtag\s*\(|\bdataLayer\b|challenges\.cloudflare\.com|turnstile/i.test(
    html,
  );
}

type Snapshot = { values: Record<string, string>; version: string };
export function createWebsiteScriptManagement(
  read: () => Promise<Snapshot> = () =>
    storage.settings.getCategorySnapshot(WEBSITE_SCRIPT_CATEGORY, false, websiteScriptKeyRules),
  readHead: () => Promise<Snapshot> = () =>
    storage.settings.getCategorySnapshot("head_tag_additions", true),
  readTurnstile = () => turnstile.publicConfiguration(),
  env: NodeJS.ProcessEnv = process.env,
) {
  async function resolve() {
    try {
      const snapshot = await read();
      const googleAnalytics = googleAnalyticsScriptSettings.parse({
        source: snapshot.values[websiteScriptKeys.source] ?? "deployment",
        measurementId: snapshot.values[websiteScriptKeys.measurementId] ?? "",
      });
      const candidate =
        googleAnalytics.source === "disabled"
          ? ""
          : googleAnalytics.source === "managed"
            ? googleAnalytics.measurementId
            : (env.WEBSITE_GA_MEASUREMENT_ID ?? "G-YX69CJ1QNJ");
      const effective = googleAnalyticsScriptSettings.parse({
        source: googleAnalytics.source,
        measurementId: candidate,
      });
      return {
        snapshot,
        googleAnalytics,
        effectiveGoogleAnalytics: {
          source: effective.source,
          measurementId: effective.measurementId || null,
        },
      };
    } catch {
      throw new AppError("Website script configuration is unavailable", 503);
    }
  }
  return {
    async publicConfiguration(): Promise<PublicWebsiteScriptConfiguration> {
      const { effectiveGoogleAnalytics } = await resolve();
      return { schemaVersion: 1, googleAnalytics: effectiveGoogleAnalytics };
    },
    async ownerConfiguration(): Promise<WebsiteScriptConfiguration> {
      const { snapshot, googleAnalytics, effectiveGoogleAnalytics } = await resolve();
      const [head, challenge] = await Promise.all([
        readHead(),
        Promise.resolve().then(readTurnstile),
      ]).catch(() => {
        throw new AppError("Website script configuration is unavailable", 503);
      });
      return {
        version: snapshot.version,
        googleAnalytics,
        effectiveGoogleAnalytics,
        turnstile: {
          enabled: challenge.enabled,
          siteKey: challenge.siteKey,
          scriptUrl: TURNSTILE_SCRIPT_URL,
        },
        scriptUrls: {
          googleAnalytics: GOOGLE_ANALYTICS_SCRIPT_URL,
          turnstile: TURNSTILE_SCRIPT_URL,
        },
        rawMarkupConflict: hasReservedWebsiteScriptMarkers(head.values.public_head_html || ""),
      };
    },
  };
}
export const websiteScriptManagement = createWebsiteScriptManagement();
