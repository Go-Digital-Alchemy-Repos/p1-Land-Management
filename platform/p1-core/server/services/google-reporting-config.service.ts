import { createHmac, randomBytes } from "node:crypto";
import {
  GOOGLE_REPORTING_CATEGORY,
  googleReportingKeys,
  googleReportingKeyRules,
  googleReportingFields,
  googlePropertyId,
  googleSearchConsoleSite,
} from "@shared/google-reporting-config";
import { storage } from "../storage";
import { createGAService } from "./p1-google-analytics.service";
import { createSearchConsoleService } from "./p1-search-console.service";
import { GAError } from "./google-reporting-error";

type Snapshot = { values: Record<string, string>; version: string };
const credentialKeys = [
  "P1_GA_SERVICE_ACCOUNT_JSON",
  "P1_GA_CLIENT_ID",
  "P1_GA_CLIENT_SECRET",
  "P1_GA_REFRESH_TOKEN",
] as const;
/** Fresh category/version reads intentionally bypass per-process settings TTL. */
export function createGoogleReportingConfiguration(
  read: () => Promise<Snapshot> = () =>
    storage.settings.getCategorySnapshot(GOOGLE_REPORTING_CATEGORY, false, googleReportingKeyRules),
  env: NodeJS.ProcessEnv = process.env,
  factories = { analytics: createGAService, searchConsole: createSearchConsoleService },
) {
  const privateKey = randomBytes(32);
  let cached:
    | {
        key: string;
        value: {
          analytics: ReturnType<typeof createGAService>;
          searchConsole: ReturnType<typeof createSearchConsoleService>;
        };
      }
    | undefined;
  async function resolve() {
    const snapshot = await read();
    const fields = googleReportingFields.parse({
      targetSource: snapshot.values[googleReportingKeys.targetSource] || "deployment",
      propertyId: snapshot.values[googleReportingKeys.propertyId] || "",
      searchConsoleSite: snapshot.values[googleReportingKeys.searchConsoleSite] || "",
    });
    const runtime: NodeJS.ProcessEnv = Object.fromEntries(
      credentialKeys.map((key) => [key, env[key]]),
    );
    runtime.P1_GA_PROPERTY_ID =
      fields.targetSource === "managed" ? fields.propertyId : env.P1_GA_PROPERTY_ID || "554712298";
    runtime.P1_GSC_SITE_URL =
      fields.targetSource === "managed" ? fields.searchConsoleSite : env.P1_GSC_SITE_URL;
    const view = {
      version: snapshot.version,
      targetSource: fields.targetSource,
      managedTargets: {
        propertyId: fields.propertyId,
        searchConsoleSite: fields.searchConsoleSite,
      },
      effectiveSource: fields.targetSource === "managed" ? "settings" : "deployment",
      configurationManagement: "report-targets",
      credentialManagement: "deployment",
      credentialMode: runtime.P1_GA_SERVICE_ACCOUNT_JSON
        ? "service-account"
        : runtime.P1_GA_CLIENT_ID && runtime.P1_GA_CLIENT_SECRET && runtime.P1_GA_REFRESH_TOKEN
          ? "oauth"
          : "missing",
      propertyId: googlePropertyId.safeParse(runtime.P1_GA_PROPERTY_ID).success
        ? runtime.P1_GA_PROPERTY_ID ?? null
        : null,
      searchConsoleConfigured: googleSearchConsoleSite.safeParse(runtime.P1_GSC_SITE_URL).success,
      searchConsoleSite: googleSearchConsoleSite.safeParse(runtime.P1_GSC_SITE_URL).success
        ? runtime.P1_GSC_SITE_URL ?? null
        : null,
      publicTrackingSource: "website-build-VITE_GA_MEASUREMENT_ID",
      note: "Report targets are managed here. Credentials remain deployment-managed and are never changed by this form. Presence does not verify property access. Public website tracking remains build-configured.",
    };
    return { snapshot, runtime, view };
  }
  return {
    async view() {
      return (await resolve()).view;
    },
    async services() {
      let resolved: Awaited<ReturnType<typeof resolve>>;
      try {
        resolved = await resolve();
      } catch {
        throw new GAError("not_configured");
      }
      // Secret-dependent identity stays private and is process-keyed, never returned.
      const key = createHmac("sha256", privateKey)
        .update(JSON.stringify([resolved.snapshot.version, resolved.runtime]))
        .digest("hex");
      if (cached?.key === key) return cached.value;
      const value = {
        analytics: factories.analytics(resolved.runtime),
        searchConsole: factories.searchConsole(resolved.runtime),
      };
      cached = { key, value };
      // In-flight requests retain their own instance; their caches cannot fill this one.
      return value;
    },
  };
}
export const googleReportingConfiguration = createGoogleReportingConfiguration();
