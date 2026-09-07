import { canLoadConsentedCategory, loadScriptWithConsent } from "@/lib/consented-script-loader";

export interface AnalyticsRuntimeConfig {
  ga4MeasurementId: string | null;
  metaPixelId: string | null;
  tiktokPixelId: string | null;
  xPixelId: string | null;
}

let analyticsRuntimeConfigPromise: Promise<AnalyticsRuntimeConfig> | null = null;
let loadedGa4MeasurementId: string | null = null;
let loadedMetaPixelId: string | null = null;
let loadedTiktokPixelId: string | null = null;
let loadedXPixelId: string | null = null;

export async function getAnalyticsRuntimeConfig(): Promise<AnalyticsRuntimeConfig> {
  if (!analyticsRuntimeConfigPromise) {
    analyticsRuntimeConfigPromise = fetch("/api/runtime-integrations", {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Analytics runtime config failed: ${response.status}`);
        }
        return response.json() as Promise<AnalyticsRuntimeConfig>;
      })
      .catch(() => ({
        ga4MeasurementId: null,
        metaPixelId: null,
        tiktokPixelId: null,
        xPixelId: null,
      }));
  }

  return analyticsRuntimeConfigPromise;
}

export async function loadMarketingPixelsIfConsented() {
  const config = await getAnalyticsRuntimeConfig();
  if (typeof window === "undefined" || !canLoadConsentedCategory("marketing")) return config;

  if (config.metaPixelId) {
    window.fbq =
      window.fbq ||
      ((...args: unknown[]) => {
        window._fbqQueue = window._fbqQueue || [];
        window._fbqQueue.push(args);
      });

    if (loadedMetaPixelId !== config.metaPixelId) {
      window.fbq("init", config.metaPixelId);
      loadedMetaPixelId = config.metaPixelId;
    }
    window.fbq("track", "PageView");
    await loadScriptWithConsent({
      id: "meta-pixel-js",
      src: "https://connect.facebook.net/en_US/fbevents.js",
      category: "marketing",
    }).catch(() => null);
  }

  if (config.tiktokPixelId) {
    window.ttq =
      window.ttq ||
      ((...args: unknown[]) => {
        window._ttqQueue = window._ttqQueue || [];
        window._ttqQueue.push(args);
      });

    if (loadedTiktokPixelId !== config.tiktokPixelId) {
      window.ttq("load", config.tiktokPixelId);
      loadedTiktokPixelId = config.tiktokPixelId;
    }
    window.ttq("page");
    await loadScriptWithConsent({
      id: "tiktok-pixel-js",
      src: "https://analytics.tiktok.com/i18n/pixel/events.js",
      category: "marketing",
    }).catch(() => null);
  }

  if (config.xPixelId) {
    window.twq =
      window.twq ||
      ((...args: unknown[]) => {
        window._twqQueue = window._twqQueue || [];
        window._twqQueue.push(args);
      });

    if (loadedXPixelId !== config.xPixelId) {
      window.twq("config", config.xPixelId);
      loadedXPixelId = config.xPixelId;
    }
    await loadScriptWithConsent({
      id: "x-pixel-js",
      src: "https://static.ads-twitter.com/uwt.js",
      category: "marketing",
    }).catch(() => null);
  }

  return config;
}

export async function loadGa4IfConsented() {
  const config = await getAnalyticsRuntimeConfig();
  if (
    !config.ga4MeasurementId ||
    typeof window === "undefined" ||
    !canLoadConsentedCategory("analytics")
  ) {
    return null;
  }

  await loadScriptWithConsent({
    id: "ga4-gtag-js",
    src: `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.ga4MeasurementId)}`,
    category: "analytics",
  });

  window.dataLayer = window.dataLayer || [];
  const gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };
  window.gtag = window.gtag || gtag;

  if (loadedGa4MeasurementId !== config.ga4MeasurementId) {
    window.gtag("js", new Date());
    loadedGa4MeasurementId = config.ga4MeasurementId;
  }
  window.gtag("config", config.ga4MeasurementId);

  return config;
}

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    _fbqQueue?: unknown[][];
    ttq?: (...args: unknown[]) => void;
    _ttqQueue?: unknown[][];
    twq?: (...args: unknown[]) => void;
    _twqQueue?: unknown[][];
  }
}
