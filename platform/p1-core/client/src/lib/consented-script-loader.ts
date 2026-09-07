import { hasCookieConsent, type CookieConsentCategory } from "@/lib/cookie-consent";

type NonEssentialConsentCategory = Exclude<CookieConsentCategory, "essential">;

interface ConsentedScriptOptions {
  id: string;
  src: string;
  category: NonEssentialConsentCategory;
  async?: boolean;
  defer?: boolean;
  attributes?: Record<string, string>;
}

function findScriptById(id: string) {
  return typeof document === "undefined"
    ? null
    : document.querySelector<HTMLScriptElement>(`script[data-consent-script-id="${id}"]`);
}

export function canLoadConsentedCategory(category: NonEssentialConsentCategory): boolean {
  return hasCookieConsent(category);
}

export async function loadScriptWithConsent(
  options: ConsentedScriptOptions,
): Promise<HTMLScriptElement | null> {
  if (typeof document === "undefined") return null;
  if (!canLoadConsentedCategory(options.category)) return null;

  const existing = findScriptById(options.id);
  if (existing) return existing;

  const script = document.createElement("script");
  script.src = options.src;
  script.async = options.async ?? true;
  script.defer = options.defer ?? true;
  script.dataset.consentScriptId = options.id;
  script.dataset.consentCategory = options.category;

  if (options.attributes) {
    for (const [key, value] of Object.entries(options.attributes)) {
      script.setAttribute(key, value);
    }
  }

  const loaded = new Promise<HTMLScriptElement>((resolve, reject) => {
    script.addEventListener("load", () => resolve(script), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error(`Failed to load script: ${options.src}`)),
      { once: true },
    );
  });

  document.head.appendChild(script);
  return loaded;
}
