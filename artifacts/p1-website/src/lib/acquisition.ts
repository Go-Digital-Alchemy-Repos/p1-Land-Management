const STORAGE_KEY = "p1_acquisition";
const CAMPAIGN_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
export type AcquisitionEvent = "page_view" | "form_start" | "form_error" | "call_click" | "email_click" | "estimate_click";

/** Store campaign context only: never form contents or URL query strings. */
export function acquisitionSource(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* Private browsing can disable storage. */ }
  const params = new URLSearchParams(window.location.search);
  const source: Record<string, string> = { landingPath: window.location.pathname };
  for (const key of CAMPAIGN_KEYS) source[key] = params.get(key)?.slice(0, 200) || "";
  try { source.referrer = document.referrer ? new URL(document.referrer).origin : ""; } catch { source.referrer = ""; }
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(source)); } catch { /* Attribution remains optional. */ }
  return source;
}

export function trackAcquisition(event: AcquisitionEvent) {
  void fetch("/api/p1/events", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, path: window.location.pathname, source: acquisitionSource() }),
    keepalive: true,
  }).catch(() => { /* Measurement must never block inquiry handling. */ });
}
