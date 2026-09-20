/** Public-site traffic only. Never pass inquiry contents or arbitrary URL parameters. */
export function createGoogleAnalytics() {
  // Resolve once per document: a saved replacement takes effect on the next load,
  // without leaving an old Google destination configured in the same document.
  let configuration: Promise<string | null> | undefined;
  let navigation = 0;
  let initialized = false;
  let lastPage = "";
  return async function trackPage() {
    const currentNavigation = ++navigation;
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.protocol !== "https:" || !["www.p1landmanagement.com", "p1landmanagement.com"].includes(url.hostname)) return;
    if (url.searchParams.has("cmsPreview") || /^\/(admin|api|setup)(\/|$)/.test(url.pathname)) return;
    configuration ||= loadMeasurementId();
    const measurementId = await configuration;
    if (!measurementId || currentNavigation !== navigation) return;
    const page = url.origin + url.pathname;
    if (lastPage === page) return;
    const analyticsWindow = window as Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
    analyticsWindow.dataLayer ||= [];
    analyticsWindow.gtag ||= function () { analyticsWindow.dataLayer!.push(arguments); };
    const gtag = analyticsWindow.gtag;
    if (!initialized) {
      gtag("js", new Date());
      gtag("config", measurementId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        page_location: page,
        page_referrer: safeReferrer(document.referrer),
      });
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.appendChild(script);
      initialized = true;
    }
    gtag("event", "page_view", {
      send_to: measurementId,
      page_location: page,
      page_referrer: lastPage || safeReferrer(document.referrer),
      // Route metadata may still be loading. Use the path rather than a stale title.
      page_title: url.pathname === "/" ? "P1 Land & Property Management" : url.pathname,
    });
    lastPage = page;
  };
}

function safeReferrer(value: string): string {
  try { return new URL(value).origin; } catch { return ""; }
}

/** Fail closed when runtime configuration is unavailable; never revive a disabled build-time ID. */
export async function loadMeasurementId(): Promise<string | null> {
  try {
    const response = await fetch("/api/p1/website-script-config", {
      credentials: "omit", cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(5000), headers: { Accept: "application/json" },
    });
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return null;
    if (!response.body) return null;
    const reader = response.body.getReader();
    let body = "", size = 0;
    const decoder = new TextDecoder("utf-8", { fatal: true });
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) { await reader.cancel(); return null; }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
    } finally { reader.releaseLock(); }
    const data = JSON.parse(body);
    if (data?.schemaVersion !== 1 || !["deployment", "managed", "disabled"].includes(data.googleAnalytics?.source)) return null;
    const id = data.googleAnalytics.measurementId;
    return data.googleAnalytics.source !== "disabled" && typeof id === "string" && /^G-[A-Z0-9]+$/.test(id) ? id : null;
  } catch { return null; }
}
