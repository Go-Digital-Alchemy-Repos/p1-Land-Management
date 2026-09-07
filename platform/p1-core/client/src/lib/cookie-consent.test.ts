import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  COOKIE_CONSENT_DURATION_DAYS,
  DEFAULT_COOKIE_CONSENT_PREFERENCES,
  buildCookieConsentRecord,
  getCookieConsentPreferences,
  hasCookieConsent,
  subscribeToCookieConsent,
  writeCookieConsentRecord,
} from "@/lib/cookie-consent";

describe("cookie consent utilities", () => {
  const originalWindow = global.window;
  const originalDocument = global.document;

  beforeEach(() => {
    const storage = new Map<string, string>();
    const listeners = new Map<string, Set<(event: Event) => void>>();

    const mockWindow = {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
      },
      addEventListener: (name: string, callback: (event: Event) => void) => {
        if (!listeners.has(name)) listeners.set(name, new Set());
        listeners.get(name)?.add(callback);
      },
      removeEventListener: (name: string, callback: (event: Event) => void) => {
        listeners.get(name)?.delete(callback);
      },
      dispatchEvent: (event: Event) => {
        listeners.get(event.type)?.forEach((callback) => callback(event));
        return true;
      },
    };

    const mockDocument = {
      cookie: "",
    };

    class MockCustomEvent<T> extends Event {
      detail: T;
      constructor(name: string, params: CustomEventInit<T>) {
        super(name);
        this.detail = params.detail as T;
      }
    }

    vi.stubGlobal("window", mockWindow);
    vi.stubGlobal("document", mockDocument);
    vi.stubGlobal("CustomEvent", MockCustomEvent);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalWindow) vi.stubGlobal("window", originalWindow);
    if (originalDocument) vi.stubGlobal("document", originalDocument);
  });

  it("defaults to essential-only when no active consent exists", () => {
    expect(getCookieConsentPreferences()).toEqual(DEFAULT_COOKIE_CONSENT_PREFERENCES);
    expect(hasCookieConsent("essential")).toBe(true);
    expect(hasCookieConsent("analytics")).toBe(false);
  });

  it("writes consent, persists 60-day cookie state, and notifies subscribers", () => {
    const record = buildCookieConsentRecord(
      {
        analytics: true,
        marketing: false,
        preferences: true,
      },
      new Date("2099-04-15T12:00:00.000Z"),
    );

    const listener = vi.fn();
    const unsubscribe = subscribeToCookieConsent(listener);

    writeCookieConsentRecord(record);

    expect(getCookieConsentPreferences()).toEqual(record.preferences);
    expect(hasCookieConsent("analytics")).toBe(true);
    expect(hasCookieConsent("marketing")).toBe(false);
    expect(document.cookie).toContain(`max-age=${COOKIE_CONSENT_DURATION_DAYS * 24 * 60 * 60}`);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toEqual(record);

    unsubscribe();
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_CHANGED_EVENT, { detail: record }));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
