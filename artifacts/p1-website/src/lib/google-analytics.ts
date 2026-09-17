/** Public-site traffic only. Never pass inquiry contents or arbitrary URL parameters. */
export function createGoogleAnalytics(measurementId: string | undefined) {
  let initialized = false;
  let lastPage = "";
  return function trackPage() {
    if (typeof window === "undefined" || !/^G-[A-Z0-9]+$/.test(measurementId || "")) return;
    const url = new URL(window.location.href);
    if (url.protocol !== "https:" || !["www.p1landmanagement.com", "p1landmanagement.com"].includes(url.hostname)) return;
    if (url.searchParams.has("cmsPreview") || /^\/(admin|api|setup)(\/|$)/.test(url.pathname)) return;
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
